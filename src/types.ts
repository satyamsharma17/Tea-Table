export type UserStatus = "working" | "designing" | "reviewing" | "break";

export interface StudioMember {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  status: UserStatus;
  online: boolean;
  lastSeen: number;
}

export const STATUS_CONFIG: Record<
  UserStatus,
  { label: string; color: string; emoji: string }
> = {
  working: { label: "Working", color: "#10b981", emoji: "💻" },
  designing: { label: "Designing", color: "#8b5cf6", emoji: "🎨" },
  reviewing: { label: "Reviewing", color: "#f59e0b", emoji: "👀" },
  break: { label: "On Break", color: "#6b7280", emoji: "☕" },
};
