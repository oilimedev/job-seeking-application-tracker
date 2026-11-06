export type ApplicationStatus =
  | "Applied"
  | "Rejected"
  | "Interviewing"
  | "Offer"
  | "Accepted"
  | "Ghosted";

export const ApplicationStatuses: ApplicationStatus[] = [
  "Applied",
  "Rejected",
  "Interviewing",
  "Offer",
  "Accepted",
  "Ghosted",
];

export const ApplicationStatusIcons: Record<ApplicationStatus, string> = {
  Applied: "🕝",
  Interviewing: "👩‍🏫",
  Offer: "📫",
  Rejected: "❌",
  Ghosted: "👻",
  Accepted: "✅",
};
