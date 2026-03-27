import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, Star, Mic, Square, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

interface MessageInputProps {
  onSendMessage: (text?: string, image?: string, sticker?: string, voice?: string) => void;
  onTyping: (isTyping: boolean) => void;
  isPremium: boolean;
  t: any;
}

const STICKERS = [
  { id: 's1', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f600/512.webp', isPremium: false },
  { id: 's2', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.webp', isPremium: false },
  { id: 's3', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f929/512.webp', isPremium: false },
  { id: 's4', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/512.webp', isPremium: false },
  { id: 's5', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f973/512.webp', isPremium: true },
  { id: 's6', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp', isPremium: true },
  { id: 's7', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f48e/512.webp', isPremium: true },
  { id: 's8', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.webp', isPremium: true },
];

export const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, onTyping, isPremium, t }) => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          onSendMessage(undefined, undefined, undefined, base64);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null; // Don't send
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      audioChunksRef.current = [];
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSend = () => {
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
      onTyping(false);
      setShowEmojiPicker(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    
    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setText(prev => prev + emojiData.emoji);
  };

  const handleStickerClick = (stickerUrl: string, isStickerPremium: boolean) => {
    if (isStickerPremium && !isPremium) {
      alert(t.needPremium);
      return;
    }
    onSendMessage(undefined, undefined, stickerUrl);
    setShowStickers(false);
  };

  const handlePaperclipClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (file.type.startsWith('image/')) {
          onSendMessage(undefined, base64);
        } else {
          onSendMessage(`[${t.attach}: ${file.name}]`);
        }
      };
      reader.readAsDataURL(file);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div className="p-3 bg-tg-bg border-t border-tg-border flex flex-col relative">
      {showEmojiPicker && (
        <div className="absolute bottom-full right-4 mb-2 z-50">
          <EmojiPicker 
            onEmojiClick={onEmojiClick} 
            theme={Theme.LIGHT}
            width={350}
            height={400}
          />
        </div>
      )}

      {showStickers && (
        <div className="absolute bottom-full left-4 mb-2 z-50 bg-white rounded-2xl shadow-2xl p-4 border border-tg-border w-[300px]">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-bold text-sm">{t.stickers}</h4>
            {!isPremium && <span className="text-[10px] text-purple-500 font-bold">Premium ✨</span>}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {STICKERS.map(sticker => (
              <button
                key={sticker.id}
                onClick={() => handleStickerClick(sticker.url, sticker.isPremium)}
                className={cn(
                  "relative p-1 hover:bg-gray-100 rounded-lg transition-colors group",
                  sticker.isPremium && !isPremium && "opacity-50"
                )}
              >
                <img src={sticker.url} alt="sticker" className="w-full h-full object-contain" />
                {sticker.isPremium && (
                  <Star className="absolute -top-1 -right-1 w-3 h-3 text-purple-500 fill-current" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-2">
        {isRecording ? (
          <div className="flex-1 flex items-center gap-4 bg-blue-50 px-4 py-2 rounded-full animate-pulse">
            <div className="flex items-center gap-2 text-red-500">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
              <span className="font-mono font-bold">{formatTime(recordingTime)}</span>
            </div>
            <div className="flex-1 text-tg-text-secondary text-sm">{t.voiceMsg}...</div>
            <button onClick={cancelRecording} className="p-2 hover:bg-red-100 rounded-full text-red-500 transition-colors">
              <Trash2 className="w-5 h-5" />
            </button>
            <button onClick={stopRecording} className="p-2 bg-tg-active text-white rounded-full hover:bg-[#3897d0] transition-colors">
              <Send className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
            />
            <button 
              onClick={handlePaperclipClick}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Paperclip className="w-6 h-6 text-tg-text-secondary" />
            </button>

            <button 
              onClick={() => { setShowStickers(!showStickers); setShowEmojiPicker(false); }}
              className={cn(
                "p-2 hover:bg-gray-100 rounded-full transition-colors",
                showStickers && "text-tg-active bg-blue-50"
              )}
            >
              <Smile className="w-6 h-6 text-tg-text-secondary" />
            </button>
            
            <div className="flex-1 relative">
              <input
                type="text"
                value={text}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={t.send + "..."}
                className="w-full bg-transparent border-none outline-none py-2 text-[15px]"
              />
            </div>

            <button 
              onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickers(false); }}
              className={cn(
                "p-2 hover:bg-gray-100 rounded-full transition-colors",
                showEmojiPicker && "text-tg-active bg-blue-50"
              )}
            >
              <Smile className="w-6 h-6 text-tg-text-secondary" />
            </button>

            {text.trim() ? (
              <button 
                onClick={handleSend}
                className="p-2 rounded-full text-tg-active transition-all"
              >
                <Send className="w-6 h-6" />
              </button>
            ) : (
              <button 
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                className="p-2 text-tg-text-secondary hover:text-tg-active rounded-full transition-all"
                title={t.voiceMsgHint}
              >
                <Mic className="w-6 h-6" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
