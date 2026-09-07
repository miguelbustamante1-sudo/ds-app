/**
 * Payload Interfaces for Notification Item Types
 * Each interface defines the required fields for its Metronic component.
 * Event-specific dates are pre-formatted strings (see requirements Section 3.4).
 * Notification age ("X mins ago") is NOT in the payload — it comes from ntf_created_at.
 *
 * Fields NOT included here (injected by the frontend):
 *   - timeDisplay: derived from ntf_created_at via timeAgo()
 *   - actionType: comes from the notification recipient row
 *   - onAccept / onDecline: wired by the item-mapper component
 */

export interface Item1Payload {
  userName: string;
  avatar: string;
  description: string;
  link: string;
  label: string;
  specialist: string;
  text: string;
}

export interface Item2Payload {
  userName: string;
  avatar: string;
  badgeColor: 'online' | 'offline' | 'busy' | 'away' | null;
  description: string;
  link: string;
  info: string;
  tags: Array<{ label: string; variant?: string }>;
}

export interface Item3Payload {
  userName: string;
  avatar: string;
  badgeColor: 'online' | 'offline' | 'busy' | 'away' | null;
  description: string;
  link: string;
  day: string;       // Pre-formatted event date, e.g. "(Jan 15-20)"
  info: string;
}

export interface Item4Payload {
  userName: string;
  avatar: string;
  badgeColor: 'online' | 'offline' | 'busy' | 'away' | null;
  description: string;
  fileSize: string;
  fileIcon: string;
  fileName: string;
  fileEditedTime: string;
}

export interface Item5Payload {
  userName: string;
  avatar: string;
  badgeColor: 'online' | 'offline' | 'busy' | 'away' | null;
  description: string;
  day: string;       // Pre-formatted event date (can be empty)
  link: string;
  info: string;
}

export interface Item6Payload {
  userName: string;
  avatar: string;
  badgeColor: 'online' | 'offline' | 'busy' | 'away' | null;
  description: string;
  info: string;
  fileIcon: string;
  fileName: string;
  fileEditedTime: string;
}

export interface Item7Payload {
  userName: string;
  avatar: string;
  badgeColor: 'online' | 'offline' | 'busy' | 'away' | null;
  description: string;
  info: string;
  meetingTitle: string;
  meetingDate: string;
  meetingTime: string;
  meetingLocation: string;
  meetingLink: string;
  projectName: string;
  teamName: string;
  attendees: Array<{ path?: string; fallback?: string; variant?: string }>;
}

export interface Item8Payload {
  userName: string;
  avatar: string;
  badgeColor: 'online' | 'offline' | 'busy' | 'away' | null;
  description: string;
  info: string;
  files: Array<{ icon: string; fileName: string; fileSize: string }>;
}

export interface Item9Payload {
  userName: string;
  avatar: string;
  badgeColor: 'online' | 'offline' | 'busy' | 'away' | null;
  description: string;
  link: string;
  info: string;
  tasks: Array<{ label: string; variant?: string }>;
  isActionable?: boolean;
  sourceEntity?: string;
  sourceId?: number;
}

export interface Item10Payload {
  userName: string;
  avatar: string;
  badgeColor: 'online' | 'offline' | 'busy' | 'away' | null;
  description: string;
  info: string;
  meetingMonth: string;
  meetingDay: string;
  meetingTitle: string;
  meetingTime: string;
  attendees: Array<{ path?: string; fallback?: string; variant?: string }>;
}

export interface Item11Payload {
  userName: string;
  avatar: string;
  badgeColor: 'online' | 'offline' | 'busy' | 'away' | null;
  description: string;
  info: string;
}

export interface Item12Payload {
  userName: string;
  avatar: string;
  badgeColor: 'online' | 'offline' | 'busy' | 'away' | null;
  description: string;
  link: string;
  info: string;
  messageTitle: string;
  messageBody: string;
  commentCount: number;
  likeCount: number;
}

export interface Item13Payload {
  userName: string;
  avatar: string;
  badgeColor: 'online' | 'offline' | 'busy' | 'away' | null;
  description: string;
  link: string;
  info: string;
  targetUserName: string;
  targetUserEmail: string;
}

export interface Item14Payload {
  message: string;
}

export interface Item15Payload {
  userName: string;
  avatar: string;
  badgeColor: 'online' | 'offline' | 'busy' | 'away' | null;
  description: string;
  info: string;
}

export interface Item16Payload {
  userName: string;
  avatar: string;
  badgeColor: 'online' | 'offline' | 'busy' | 'away' | null;
  description: string;
  link: string;
  info: string;
}

export interface Item17Payload {
  userName: string;
  avatar: string;
  badgeColor: 'online' | 'offline' | 'busy' | 'away' | null;
  description: string;
  info: string;
}

export interface Item18Payload {
  userName: string;
  avatar: string;
  badgeColor: 'online' | 'offline' | 'busy' | 'away' | null;
  description: string;
  link: string;
  info: string;
  works: Array<{ image: string; title: string; id: string }>;
}

export interface Item19Payload {
  userName: string;
  avatar: string;
  badgeColor: 'online' | 'offline' | 'busy' | 'away' | null;
  description: string;
  info: string;
  statusMessage: string;
}

export interface Item20Payload {
  userName: string;
  avatar: string;
  badgeColor: 'online' | 'offline' | 'busy' | 'away' | null;
  description: string;
  info: string;
}
