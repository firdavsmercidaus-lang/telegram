import React from 'react';
import { Search, Menu, Star, Users, BellOff } from 'lucide-react';
import { Chat } from '../types';
import { cn } from '../lib/utils';

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onChatSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onMenuClick: () => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  isPremium?: boolean;
  t: any;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  activeChatId,
  onChatSelect,
  searchQuery,
  onSearchChange,
  onMenuClick,
  favorites,
  onToggleFavorite,
  isPremium,
  t,
}) => {
  const favoriteChats = chats.filter(c => favorites.includes(c.id));
  const otherChats = chats.filter(c => !favorites.includes(c.id));

  const renderChat = (chat: Chat) => (
    <button
      key={chat.id}
      onClick={() => onChatSelect(chat.id)}
      className={cn(
        "w-full p-3 flex items-center gap-3 hover:bg-tg-hover transition-colors text-left group relative",
        activeChatId === chat.id && "bg-tg-active text-white hover:bg-tg-active"
      )}
    >
      <div className="relative">
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium overflow-hidden",
          chat.isGroup ? "bg-blue-500 text-white" : "bg-gray-300"
        )}>
          {chat.avatar ? (
            <img src={chat.avatar} alt={chat.name} className="w-full h-full object-cover" />
          ) : (
            chat.isGroup ? <Users className="w-6 h-6" /> : chat.name[0]
          )}
        </div>
        {chat.online && !chat.isGroup && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-tg-online border-2 border-white rounded-full" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <div className="flex items-center gap-1 min-w-0">
            <h3 className={cn(
              "font-semibold truncate",
              activeChatId === chat.id ? "text-white" : "text-tg-text"
            )}>
              {chat.name}
            </h3>
            {chat.isMuted && (
              <BellOff className={cn("w-3 h-3 flex-shrink-0", activeChatId === chat.id ? "text-white/70" : "text-tg-text-secondary")} />
            )}
          </div>
          <span className={cn(
            "text-xs",
            activeChatId === chat.id ? "text-white/80" : "text-tg-text-secondary"
          )}>
            {chat.lastMessageTime}
          </span>
        </div>
        <div className="flex justify-between items-center mt-0.5">
          <p className={cn(
            "text-sm truncate",
            activeChatId === chat.id ? "text-white/90" : "text-tg-text-secondary"
          )}>
            {chat.lastMessage}
          </p>
          <div className="flex items-center gap-2">
            {favorites.includes(chat.id) && (
              <Star className={cn("w-3 h-3 fill-current", activeChatId === chat.id ? "text-white" : "text-yellow-500")} />
            )}
            {chat.unreadCount && chat.unreadCount > 0 && (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold",
                activeChatId === chat.id ? "bg-white text-tg-active" : "bg-tg-active text-white"
              )}>
                {chat.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );

  return (
    <div className="w-[350px] h-full border-r border-tg-border flex flex-col bg-tg-sidebar">
      {/* Header */}
      <div className="p-4 flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="p-2 hover:bg-tg-hover rounded-full transition-colors relative"
        >
          <Menu className="w-6 h-6 text-tg-text-secondary" />
          {isPremium && (
            <Star className="absolute top-1 right-1 w-3 h-3 text-purple-500 fill-current" />
          )}
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tg-text-secondary" />
          <input
            type="text"
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-tg-hover border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-tg-active outline-none transition-all"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {favoriteChats.length > 0 && (
          <>
            <div className="px-4 py-2 text-[11px] font-bold text-tg-active uppercase tracking-wider bg-tg-hover/50">
              {t.favoritesTitle}
            </div>
            {favoriteChats.map(renderChat)}
            <div className="h-px bg-tg-border my-2 mx-4" />
          </>
        )}
        {otherChats.map(renderChat)}
      </div>
    </div>
  );
};
