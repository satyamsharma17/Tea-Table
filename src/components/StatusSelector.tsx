import type { UserStatus } from "../types";
import { STATUS_CONFIG } from "../types";
import "./StatusSelector.css";

interface StatusSelectorProps {
  currentStatus: UserStatus;
  onStatusChange: (status: UserStatus) => void;
}

const statuses: UserStatus[] = ["working", "designing", "reviewing", "break"];

export default function StatusSelector({
  currentStatus,
  onStatusChange,
}: StatusSelectorProps) {
  return (
    <div className="status-selector">
      {statuses.map((status) => {
        const config = STATUS_CONFIG[status];
        const isActive = currentStatus === status;
        return (
          <button
            key={status}
            className={`status-btn ${isActive ? "active" : ""}`}
            onClick={() => onStatusChange(status)}
            style={{
              borderColor: isActive ? config.color : undefined,
              background: isActive ? `${config.color}15` : undefined,
            }}
          >
            <span className="status-emoji">{config.emoji}</span>
            <span className="status-label">{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}
