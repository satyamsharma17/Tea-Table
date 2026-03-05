import { useRef, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAuth } from "../contexts/AuthContext";
import { usePresence } from "../hooks/usePresence";
import { useVoiceCall } from "../hooks/useVoiceCall";
import { STATUS_CONFIG } from "../types";
import CoolGuy from "../components/CoolGuy";
import { getCharacter } from "../components/getCharacter";
import type { StudioMember } from "../types";
import "./FloatingStudio.css";

// ── Oval table geometry ─────────────────────────────────────────────
const TABLE_W = 240;
const TABLE_H = 130;
const RX = 90;
const RY = 40;

function getOvalPos(index: number, total: number) {
  const angle = (index / Math.max(total, 1)) * 2 * Math.PI - Math.PI / 2;
  return {
    left: TABLE_W / 2 + RX * Math.cos(angle),
    top: TABLE_H / 2 + RY * Math.sin(angle),
  };
}

function SeatAvatar({
  member,
  isMe,
  index,
  total,
}: {
  member: StudioMember;
  isMe: boolean;
  index: number;
  total: number;
}) {
  const cfg = STATUS_CONFIG[member.status];
  const pos = getOvalPos(index, total);
  const Character = getCharacter(member.uid);

  return (
    <div
      className="fl-seat"
      style={{ left: pos.left, top: pos.top }}
      title={`${member.displayName} — ${cfg.label}`}
    >
      <Character size={36} />
      <p className="fl-name">
        {member.displayName.split(" ")[0]}
        {isMe && <span className="fl-you"> ·you</span>}
      </p>
      <p className="fl-chip" style={{ color: cfg.color }}>{cfg.emoji}</p>
    </div>
  );
}

// ── Main floating widget ───────────────────────────────────────
export default function FloatingStudio() {
  const { user } = useAuth();
  const { members, myStatus, updateStatus, dbConnected } = usePresence();
  const { isMuted, callParticipantCount, toggleMic } = useVoiceCall();
  const onlineMembers = members.filter((m) => m.online);
  const onlineCount = onlineMembers.length;

  // ── Music player ──────────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [musicPlaying, setMusicPlaying] = useState(false);

  useEffect(() => {
    const audio = new Audio("/music.mp3");
    audio.loop = true;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicPlaying) {
      audio.pause();
      setMusicPlaying(false);
    } else {
      audio.play().catch(() => {});
      setMusicPlaying(true);
    }
  };

  // ── Work / Break toggle ────────────────────────────────────────
  const isOnBreak = myStatus === "break";
  const toggleWorkBreak = () => {
    updateStatus(isOnBreak ? "working" : "break");
  };

  const startDrag = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    getCurrentWindow().startDragging().catch(() => {});
  };

  return (
    <div className="fl-root">
      {/* Drag bar */}
      <div className="fl-bar" onMouseDown={startDrag}>
        <span className="fl-grip">⠿</span>
        <span className="fl-title">☕ Tea Table</span>
        <span className="fl-online">
          {onlineCount > 0 ? `${onlineCount} in` : "empty"}
        </span>
        <button
          className="fl-hide"
          title="Hide widget"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => invoke("close_floating_window").catch(() => {})}
        >
          ✕
        </button>
      </div>

      {/* DB error */}
      {dbConnected === false && (
        <div className="fl-db-err">⚠️ DB unreachable</div>
      )}

      {/* Oval table */}
      <div className="fl-table-wrap">
        <div className="fl-table" style={{ width: TABLE_W, height: TABLE_H }}>
          <span className="fl-watermark">Tea Table</span>
          {onlineMembers.map((member, i) => (
            <SeatAvatar
              key={member.uid}
              member={member}
              isMe={member.uid === user?.uid}
              index={i}
              total={onlineMembers.length}
            />
          ))}
          {onlineMembers.length === 0 && (
            <div className="fl-coolguy">
              <CoolGuy size={62} />
            </div>
          )}
        </div>
      </div>

      {/* ── Corner buttons ── */}
      <div className="fl-corner">
        {/* Work / Break toggle — above music */}
        <button
          className={`fl-cb fl-cb-work ${isOnBreak ? "fl-cb-break" : "fl-cb-working"}`}
          title={isOnBreak ? "Switch to Working" : "Take a Break"}
          onClick={toggleWorkBreak}
        >
          {isOnBreak ? "☕" : "💻"}
        </button>

        {/* Mic button — left of music */}
        <button
          className={`fl-cb fl-cb-mic ${!isMuted ? "fl-cb-mic-live" : ""}`}
          title={isMuted ? "Unmute — start call" : "Mute — leave call"}
          onClick={toggleMic}
        >
          {isMuted ? "🔇" : "🎤"}
          {callParticipantCount > 0 && (
            <span className="fl-cb-badge">{callParticipantCount}</span>
          )}
        </button>

        {/* Music — corner-most */}
        <button
          className={`fl-cb fl-cb-music ${musicPlaying ? "fl-cb-music-on" : ""}`}
          title={musicPlaying ? "Stop music" : "Play music"}
          onClick={toggleMusic}
        >
          {musicPlaying ? "🔊" : "🎵"}
        </button>
      </div>
    </div>
  );
}
