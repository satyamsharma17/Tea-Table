import type { StudioMember } from "../types";
import { STATUS_CONFIG } from "../types";
import "./Avatar.css";

interface AvatarProps {
  member: StudioMember;
  size?: "sm" | "md" | "lg";
}

export default function Avatar({ member, size = "md" }: AvatarProps) {
  const statusConfig = STATUS_CONFIG[member.status];
  const initials = member.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`avatar-wrapper avatar-${size}`}>
      <div className="avatar-circle">
        {member.photoURL ? (
          <img
            src={member.photoURL}
            alt={member.displayName}
            className="avatar-img"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="avatar-initials">{initials}</div>
        )}
      </div>
      <div
        className={`avatar-status-dot ${member.online ? "online" : "offline"}`}
        style={{
          backgroundColor: member.online ? statusConfig.color : "#4a4a52",
        }}
        title={member.online ? statusConfig.label : "Offline"}
      />
    </div>
  );
}
