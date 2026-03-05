import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAuth } from "../contexts/AuthContext";
import { usePresence } from "../hooks/usePresence";
import "./StudioRoom.css";

export default function StudioRoom() {
  const { user, signOut } = useAuth();
  const { members } = usePresence();
  const floatingOpened = useRef(false);
  const onlineCount = members.filter((m) => m.online).length;

  // Auto-open the floating widget once after login
  useEffect(() => {
    if (user && !floatingOpened.current) {
      floatingOpened.current = true;
      invoke("open_floating_window").catch(() => {});
    }
  }, [user]);

  return (
    <div className="studio-shell">
      <header className="shell-header">
        <span className="shell-logo">☕</span>
        <div>
          <span className="shell-title">Tea Table</span>
          <span className="shell-sub">House of Katha</span>
        </div>
      </header>

      <div className="shell-body">
        <div className="shell-stat">
          <span className="shell-stat-num">{onlineCount}</span>
          <span className="shell-stat-label">in the studio</span>
        </div>
        <p className="shell-hint">
          Your floating widget is always on top. 
          Drag it anywhere on your screen.
        </p>
        <button
          className="shell-btn"
          onClick={() => invoke("open_floating_window").catch(() => {})}
        >
          Show Widget
        </button>
      </div>

      <footer className="shell-footer">
        <span className="shell-user">{user?.email}</span>
        <button className="shell-signout" onClick={signOut}>
          Sign out
        </button>
      </footer>
    </div>
  );
}
