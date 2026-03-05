import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { ref, set, onDisconnect, serverTimestamp } from "firebase/database";
import { auth, db } from "../lib/firebase";

const writeUserPresence = (uid: string, displayName: string, email: string, photoURL: string | null) => {
  const userStatusRef = ref(db, `presence/${uid}`);
  const userInfoRef = ref(db, `users/${uid}`);

  set(userInfoRef, { displayName, email, photoURL });

  set(userStatusRef, {
    online: true,
    status: "working",
    lastSeen: serverTimestamp(),
  });

  onDisconnect(userStatusRef).set({
    online: false,
    status: "working",
    lastSeen: serverTimestamp(),
  });
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        // Only write presence here for sign-in (not sign-up, which calls writeUserPresence itself
        // after updateProfile to avoid the displayName race condition)
        writeUserPresence(
          firebaseUser.uid,
          firebaseUser.displayName || firebaseUser.email || "Unknown",
          firebaseUser.email || "",
          firebaseUser.photoURL,
        );
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    // Google sign-in via popup is blocked in the desktop webview.
    // This is intentionally a no-op — the Login UI guides users to email instead.
    throw new Error(
      "Google sign-in is not available in the desktop app. Please use email/password.",
    );
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    displayName: string,
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    // Write presence explicitly after profile update — avoids the race where
    // onAuthStateChanged fires before displayName is set.
    writeUserPresence(cred.user.uid, displayName, email, null);
  };

  const signOut = async () => {
    if (user) {
      const userStatusRef = ref(db, `presence/${user.uid}`);
      await set(userStatusRef, {
        online: false,
        status: "working",
        lastSeen: serverTimestamp(),
      });
    }
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
