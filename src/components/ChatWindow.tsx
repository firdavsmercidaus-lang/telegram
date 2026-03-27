import React, { useRef, useEffect } from 'react';
import { MoreVertical, Phone, Search, Star, Users, BellOff, Bell } from 'lucide-react';
import { Message, Chat } from '../types';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { cn } from '../lib/utils';

interface ChatWindowProps {
  chat: Chat | null;
  messages: Message[];
  onSendMessage: (text?: string, image?: string, sticker?: string, voice?: string) => void;
  onTyping: (isTyping: boolean) => void;
  typingUser: string | null;
  onCallClick: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isPremium: boolean;
  onDeleteMessage: (messageId: string) => void;
  onLeaveChat: () => void;
  onHeaderClick: () => void;
  t: any;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  messages,
  onSendMessage,
  onTyping,
  typingUser,
  onCallClick,
  isFavorite,
  onToggleFavorite,
  isMuted,
  onToggleMute,
  isPremium,
  onDeleteMessage,
  onLeaveChat,
  onHeaderClick,
  t,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f4f4f5]">
        <div className="bg-black/10 px-4 py-1 rounded-full text-sm text-tg-text-secondary">
          {t.noChats}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#e7ebf0] relative overflow-hidden">
      {/* Background Pattern (Simplified) */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />

      {/* Header */}
      <div className="h-16 bg-white border-b border-tg-border flex items-center justify-between px-4 z-10">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={onHeaderClick}
        >
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center font-medium overflow-hidden",
            chat.isGroup ? "bg-blue-500 text-white" : "bg-gray-300"
          )}>
            {chat.avatar ? (
              <img src={chat.avatar} alt={chat.name} className="w-full h-full object-cover" />
            ) : (
              chat.isGroup ? <Users className="w-5 h-5" /> : chat.name[0]
            )}
          </div>
          <div>
            <h3 className="font-semibold text-[15px] leading-tight">{chat.name}</h3>
            <p className="text-xs text-tg-active">
              {typingUser ? t.typing : (
                chat.isGroup 
                  ? `${chat.members?.length || 0} ${t.members}` 
                  : (chat.online ? t.online : t.offline)
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isMuted ? (
            <BellOff 
              onClick={onToggleMute}
              className="w-5 h-5 text-red-500 cursor-pointer" 
              title={t.unmute}
            />
          ) : (
            <Bell 
              onClick={onToggleMute}
              className="w-5 h-5 text-tg-text-secondary cursor-pointer" 
              title={t.mute}
            />
          )}
          <Star 
            onClick={onToggleFavorite}
            className={cn(
              "w-5 h-5 cursor-pointer transition-colors",
              isFavorite ? "text-yellow-500 fill-current" : "text-tg-text-secondary"
            )}
          />
          <Search className="w-5 h-5 text-tg-text-secondary cursor-pointer" />
          <Phone 
            onClick={onCallClick}
            className="w-5 h-5 text-tg-text-secondary cursor-pointer" 
          />
          <div className="group relative">
            <MoreVertical className="w-5 h-5 text-tg-text-secondary cursor-pointer" />
            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-tg-border opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
              <button 
                onClick={onLeaveChat}
                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors rounded-lg"
              >
                {t.leaveGroup}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-1 z-10 scroll-smooth"
      >
        <div className="flex-1" /> {/* Spacer */}
        {messages.map((msg) => (
          <MessageBubble 
            key={msg.id} 
            message={msg} 
            onDelete={() => onDeleteMessage(msg.id)}
            t={t}
          />
        ))}
      </div>

      {/* Input Area */}
      <div className="z-10">
        <MessageInput onSendMessage={onSendMessage} onTyping={onTyping} isPremium={isPremium} t={t} />
      </div>
    </div>
  );
};
