import { useEffect, useState, useCallback, useRef } from "react";
import { ref, onValue, set, serverTimestamp } from "firebase/database";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import type { StudioMember, UserStatus } from "../types";

export function usePresence() {
  const { user } = useAuth();
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const [members, setMembers] = useState<StudioMember[]>([]);
  const [myStatus, setMyStatus] = useState<UserStatus>("working");
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  // Track Firebase Realtime Database connection state
  useEffect(() => {
    const connectedRef = ref(db, ".info/connected");
    const unsub = onValue(connectedRef, (snap) => {
      setDbConnected(snap.val() === true);
    });
    return () => unsub();
  }, []);

  // Listen to all presence data
  useEffect(() => {
    const presenceRef = ref(db, "presence");
    const usersRef = ref(db, "users");

    let presenceData: Record<string, any> = {};
    let usersData: Record<string, any> = {};

    const buildMembers = (currentUid?: string) => {
      const memberList: StudioMember[] = [];
      for (const uid of Object.keys(presenceData)) {
        const presence = presenceData[uid];
        const userInfo = usersData[uid] || {};
        const status: UserStatus = presence.status || "working";
        memberList.push({
          uid,
          displayName: userInfo.displayName || "Unknown",
          email: userInfo.email || "",
          photoURL: userInfo.photoURL || null,
          status,
          online: presence.online || false,
          lastSeen: presence.lastSeen || 0,
        });
        // Sync own status from Firebase so it's correct on app restart
        if (uid === currentUid) {
          setMyStatus(status);
        }
      }
      // Sort: online first, then by name
      memberList.sort((a, b) => {
        if (a.online !== b.online) return a.online ? -1 : 1;
        return a.displayName.localeCompare(b.displayName);
      });
      setMembers(memberList);
    };

    const unsubPresence = onValue(presenceRef, (snapshot) => {
      presenceData = snapshot.val() || {};
      buildMembers(userRef.current?.uid);
    });

    const unsubUsers = onValue(usersRef, (snapshot) => {
      usersData = snapshot.val() || {};
      buildMembers(userRef.current?.uid);
    });

    return () => {
      unsubPresence();
      unsubUsers();
    };
  }, []);

  // Heartbeat: keep presence alive
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      const userStatusRef = ref(db, `presence/${user.uid}`);
      set(userStatusRef, {
        online: true,
        status: myStatus,
        lastSeen: serverTimestamp(),
      });
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [user, myStatus]);

  // Update my status
  const updateStatus = useCallback(
    async (status: UserStatus) => {
      if (!user) return;
      setMyStatus(status);
      const userStatusRef = ref(db, `presence/${user.uid}`);
      await set(userStatusRef, {
        online: true,
        status,
        lastSeen: serverTimestamp(),
      });
    },
    [user],
  );

  return { members, myStatus, updateStatus, dbConnected };
}
