import React, { useState, useRef } from 'react';
import { Check, CheckCheck, Play, Pause, Volume2 } from 'lucide-react';
import { Message } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { motion } from 'motion/react';

interface MessageBubbleProps {
  message: Message;
  onDelete?: () => void;
  t: any;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onDelete, t }) => {
  const isSelf = message.isSelf;
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const onAudioEnded = () => {
    setIsPlaying(false);
  };

  const renderText = (text: string) => {
    if (message.isDeleted) return <span className="italic text-gray-400">{t.deletedMsg}</span>;
    
    // Regex for URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    const parts = text.split(/(\|\|.*?\|\|)/g);
    return parts.map((part, i) => {
      if (part.startsWith('||') && part.endsWith('||')) {
        const content = part.slice(2, -2);
        return (
          <span 
            key={i}
            onClick={() => setShowSpoiler(!showSpoiler)}
            className={cn(
              "cursor-pointer rounded px-1 transition-all duration-200",
              !showSpoiler ? "bg-gray-400 text-transparent blur-[4px] select-none" : "bg-black/5"
            )}
            title={t.spoilerHint}
          >
            {content}
          </span>
        );
      }
      
      // Handle URLs in the remaining text
      const subParts = part.split(urlRegex);
      return subParts.map((subPart, j) => {
        if (subPart.match(urlRegex)) {
          return (
            <a 
              key={`${i}-${j}`}
              href={subPart}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {subPart}
            </a>
          );
        }
        return subPart;
      });
    });
  };

  return (
    <div className={cn(
      "flex w-full mb-1 group",
      isSelf ? "justify-end" : "justify-start"
    )}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.1 }}
        className={cn(
          "max-w-[70%] rounded-2xl relative shadow-sm",
          message.image ? "p-1" : "px-3 py-1.5",
          isSelf 
            ? "bg-tg-bubble-self rounded-tr-none" 
            : "bg-tg-bubble-other rounded-tl-none"
        )}
      >
        {message.image && (
          <img 
            src={message.image} 
            alt="Yuborilgan rasm" 
            className="rounded-xl max-w-full h-auto mb-1"
            referrerPolicy="no-referrer"
          />
        )}
        {message.sticker && (
          <div className="p-2">
            <img 
              src={message.sticker} 
              alt="Stiker" 
              className="w-32 h-32 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        {message.voice && (
          <div className="flex items-center gap-3 p-1 min-w-[200px]">
            <button 
              onClick={toggleAudio}
              className="w-10 h-10 bg-tg-active text-white rounded-full flex items-center justify-center hover:bg-[#3897d0] transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
            </button>
            <div className="flex-1">
              <div className="h-1 bg-gray-300 rounded-full relative overflow-hidden">
                <div className={cn("absolute inset-0 bg-tg-active transition-all duration-100", isPlaying ? "w-full" : "w-0")} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-tg-text-secondary">{t.voiceMsg}</span>
                <Volume2 className="w-3 h-3 text-tg-text-secondary" />
              </div>
            </div>
            <audio ref={audioRef} src={message.voice} onEnded={onAudioEnded} className="hidden" />
          </div>
        )}
        {message.text && (
          <p className={cn(
            "text-[15px] leading-tight break-words",
            message.image ? "px-2 pb-1 pr-12" : "pr-12"
          )}>
            {renderText(message.text)}
          </p>
        )}
        
        {isSelf && !message.isDeleted && (
          <button 
            onClick={onDelete}
            className="absolute -left-8 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-500"
            title={t.deleteMsg}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        )}
        
        <div className={cn(
          "absolute flex items-center gap-1",
          message.image && !message.text ? "bottom-2 right-3 bg-black/30 px-1.5 py-0.5 rounded-full" : "bottom-1 right-2"
        )}>
          <span className={cn(
            "text-[10px]",
            message.image && !message.text ? "text-white" : (isSelf ? "text-[#4fae4e]" : "text-tg-text-secondary")
          )}>
            {format(new Date(message.timestamp), 'HH:mm')}
          </span>
          
          {isSelf && (
            <div className="flex items-center">
              {message.status === 'sent' && (
                <Check className={cn("w-3 h-3", message.image && !message.text ? "text-white" : "text-[#4fae4e]")} />
              )}
              {message.status === 'delivered' && (
                <CheckCheck className={cn("w-3 h-3", message.image && !message.text ? "text-white" : "text-[#4fae4e]")} />
              )}
              {message.status === 'read' && (
                <CheckCheck className={cn("w-3 h-3", message.image && !message.text ? "text-white" : "text-[#4fae4e]")} />
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
