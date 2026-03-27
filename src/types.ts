export interface Message {
  id: string;
  type: 'text' | 'image' | 'sticker' | 'voice';
  text?: string;
  image?: string;
  sticker?: string;
  voice?: string;
  sender: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  isSelf: boolean;
  isDeleted?: boolean;
}

export interface User {
  username: string;
  phone: string;
  online: boolean;
  typing: boolean;
  avatar?: string;
  lastSeen?: string;
  isPremium?: boolean;
}

export interface Chat {
  id: string;
  name: string;
  phone: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  avatar?: string;
  online?: boolean;
  isGroup?: boolean;
  members?: string[]; // Array of phone numbers
  isMuted?: boolean;
}

export interface Sticker {
  id: string;
  url: string;
  isPremium?: boolean;
}
