export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export interface Message {
  id: string;
  text: string;
  sender: User;
  timestamp: Date;
  channelId: string;
  attachments?: Attachment[];
  reactions?: Reaction[];
  isEdited?: boolean;
  replyTo?: Message;
}

export interface Attachment {
  id: string;
  type: "image" | "file" | "audio";
  url: string;
  name: string;
  fileName?: string; // Original filename from upload
  size?: number;
  fileSize?: number; // Alternative for size
  mimeType?: string;
  duration?: number; // For audio attachments
  width?: number;
  height?: number;
}

export interface Reaction {
  emoji: string;
  count: number;
  users: string[]; // user IDs who reacted
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  members: User[];
  createdAt: Date;
  lastMessage?: Message;
  unreadCount?: number;
  type: "group" | "direct";
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

export interface ChatContextType {
  channels: Channel[];
  activeChannel: Channel | null;
  messages: Message[];
  setActiveChannel: (channel: Channel) => void;
  sendMessage: (text: string, attachments?: File[]) => Promise<void>;
  editMessage: (messageId: string, newText: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  reactToMessage: (messageId: string, emoji: string) => Promise<void>;
  createChannel: (
    name: string,
    members: User[],
    isPrivate: boolean,
    isDirect?: boolean
  ) => Promise<Channel>;
  loading: boolean;
  channelSwitchLoading: boolean;
  currentlyEditingId?: string | null;
  setCurrentlyEditingId?: (id: string | null) => void;
  activeReplyTo: Message | null;
  setActiveReplyTo: (message: Message | null) => void;
}

export type ThemeMode = "light" | "dark" | "system";

export interface SettingsContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  messageSoundEnabled: boolean;
  setMessageSoundEnabled: (enabled: boolean) => void;
}
