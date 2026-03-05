import type { StudioMember } from "../types";
import { STATUS_CONFIG } from "../types";
import Avatar from "./Avatar";
import "./MemberCard.css";

interface MemberCardProps {
  member: StudioMember;
  isMe?: boolean;
}

export default function MemberCard({ member, isMe }: MemberCardProps) {
  const statusConfig = STATUS_CONFIG[member.status];

  return (
    <div className={`member-card ${!member.online ? "offline" : ""}`}>
      <Avatar member={member} size="md" />
      <div className="member-info">
        <div className="member-name">
          {member.displayName}
          {isMe && <span className="member-you">you</span>}
        </div>
        <div
          className="member-status"
          style={{ color: member.online ? statusConfig.color : "#555" }}
        >
          {statusConfig.emoji} {statusConfig.label}
        </div>
      </div>
    </div>
  );
}
