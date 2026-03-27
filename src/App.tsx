import React, { useState, useEffect, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { Message, Chat, User } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { X, LogOut, Settings, User as UserIcon, Moon, Info, Check, Phone, PhoneOff, Mic, Volume2, Star, Users, Plus, Search, AtSign, Globe } from 'lucide-react';
import { cn } from './lib/utils';
import { translations, Language } from './translations';

const App: React.FC = () => {
  const [username, setUsername] = useState<string | null>(localStorage.getItem('tg_username'));
  const [phoneNumber, setPhoneNumber] = useState<string | null>(localStorage.getItem('tg_phone'));
  const [profilePic, setProfilePic] = useState<string | null>(localStorage.getItem('tg_avatar'));
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('tg_theme') === 'dark');
  const [isPremium, setIsPremium] = useState(localStorage.getItem('tg_premium') === 'true');
  const [premiumCode, setPremiumCode] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Message[]>>(
    JSON.parse(localStorage.getItem('tg_messages') || '{}')
  );

  useEffect(() => {
    localStorage.setItem('tg_messages', JSON.stringify(messagesByChat));
  }, [messagesByChat]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Chat | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Login states
  const [loginStep, setLoginStep] = useState(0); // 0: Language, 1: Phone/Name, 2: Code
  const [tempName, setTempName] = useState('');
  const [tempPhone, setTempPhone] = useState('+998');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '']);
  const [selectedLang, setSelectedLang] = useState<Language>((localStorage.getItem('tg_lang') as Language) || 'O\'zbekcha');

  const t = translations[selectedLang];

  // Favorites and Contacts
  const [favorites, setFavorites] = useState<string[]>(JSON.parse(localStorage.getItem('tg_favorites') || '[]'));
  const [showContacts, setShowContacts] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);

  // Mock chats
  const [chats, setChats] = useState<Chat[]>(JSON.parse(localStorage.getItem('tg_chats') || '[]'));

  useEffect(() => {
    localStorage.setItem('tg_chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('tg_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    if (isCalling) {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [isCalling]);

  const formatCallTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleFavorite = (chatId: string) => {
    const newFavorites = favorites.includes(chatId)
      ? favorites.filter(id => id !== chatId)
      : [...favorites, chatId];
    setFavorites(newFavorites);
    localStorage.setItem('tg_favorites', JSON.stringify(newFavorites));
  };

  const toggleMute = (chatId: string) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, isMuted: !chat.isMuted } : chat
    ));
  };

  const handleApplyPremiumCode = () => {
    if (premiumCode === '2013sila') {
      setIsPremium(true);
      localStorage.setItem('tg_premium', 'true');
      setPremiumCode('');
      alert(t.premiumSuccess);
    } else {
      alert(t.invalidCode);
    }
  };

  const handleAddContact = () => {
    const phone = newContactPhone.trim();
    if (newContactName.trim() && phone) {
      // Check if user is already registered in the system
      const realUser = registeredUsers.find(u => u.phone === phone);
      
      const newChat: Chat = {
        id: realUser ? `user_${realUser.phone}` : Date.now().toString(),
        name: realUser ? realUser.username : newContactName.trim(),
        phone: phone,
        lastMessage: t.contactAdded,
        lastMessageTime: t.now,
        unreadCount: 0,
        online: onlineUsers.some(u => u.phone === phone),
        avatar: realUser?.avatar
      };

      // Prevent duplicate contacts
      if (chats.some(c => c.phone === phone)) {
        alert(t.alreadyInContacts);
        return;
      }

      setChats(prev => [...prev, newChat]);
      setNewContactName('');
      setNewContactPhone('');
      setShowAddContact(false);
      setShowContacts(true);
    }
  };

  const handleCreateGroup = () => {
    if (newGroupName.trim() && selectedMembers.length > 0) {
      const newGroup: Chat = {
        id: `group_${Date.now()}`,
        name: newGroupName.trim(),
        phone: `group_${Date.now()}`,
        lastMessage: t.groupCreated,
        lastMessageTime: t.now,
        unreadCount: 0,
        online: false,
        isGroup: true,
        members: selectedMembers
      };
      setChats(prev => [...prev, newGroup]);
      setNewGroupName('');
      setSelectedMembers([]);
      setShowNewGroup(false);
      setActiveChatId(newGroup.id);
    }
  };

  const toggleMember = (phone: string) => {
    setSelectedMembers(prev => 
      prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]
    );
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setProfilePic(base64);
        localStorage.setItem('tg_avatar', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (username && phoneNumber) {
      const newSocket = io();
      setSocket(newSocket);

      newSocket.emit('join', { username, phone: phoneNumber });

      newSocket.on('history', ({ chatId, history }: { chatId: string, history: Message[] }) => {
        setMessagesByChat(prev => ({
          ...prev,
          [chatId]: history.map(m => ({ ...m, isSelf: m.sender === username }))
        }));
      });

      newSocket.on('new_message', ({ chatId, message }: { chatId: string, message: Message }) => {
        setMessagesByChat(prev => ({
          ...prev,
          [chatId]: [...(prev[chatId] || []), { ...message, isSelf: message.sender === username }]
        }));
      });

      newSocket.on('message_status', ({ chatId, id, status }: { chatId: string, id: string, status: 'delivered' | 'read' }) => {
        setMessagesByChat(prev => ({
          ...prev,
          [chatId]: (prev[chatId] || []).map(m => m.id === id ? { ...m, status } : m)
        }));
      });

      newSocket.on('user_typing', ({ username: typingName, isTyping }: { username: string, isTyping: boolean }) => {
        if (typingName !== username) {
          setTypingUser(isTyping ? typingName : null);
        }
      });

      newSocket.on('users_update', (users: User[]) => {
        setOnlineUsers(users);
        setChats(prev => prev.map(chat => ({
          ...chat,
          online: users.some(u => u.phone === chat.phone)
        })));
      });

      newSocket.on('registered_users', (users: User[]) => {
        setRegisteredUsers(users);
      });

      newSocket.on('message_deleted', ({ chatId, messageId }: { chatId: string, messageId: string }) => {
        setMessagesByChat(prev => ({
          ...prev,
          [chatId]: (prev[chatId] || []).map(m => 
            m.id === messageId ? { ...m, isDeleted: true, text: t.deletedMsg, image: undefined, sticker: undefined, voice: undefined, type: 'text' } : m
          )
        }));
      });

      newSocket.on('user_left', ({ chatId, phone }: { chatId: string, phone: string }) => {
        if (phone === phoneNumber) {
          setChats(prev => prev.filter(c => c.id !== chatId));
          if (activeChatId === chatId) setActiveChatId(null);
        }
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [username]);

  useEffect(() => {
    if (socket && activeChatId && !messagesByChat[activeChatId]) {
      socket.emit('get_history', activeChatId);
    }
  }, [socket, activeChatId, messagesByChat]);

  const handleSendMessage = (text?: string, image?: string, sticker?: string, voice?: string) => {
    if (socket && username && activeChatId) {
      let finalChatId = activeChatId;
      let finalText = text;

      // Handle invisible command /shh
      if (finalText?.startsWith('/shh ')) {
        finalText = `||${finalText.substring(5)}||`;
      } else if (finalText === '/shh') {
        finalText = '||🤫||';
      }

      socket.emit('send_message', {
        chatId: finalChatId,
        text: finalText,
        image,
        sticker,
        voice,
        type: voice ? 'voice' : (sticker ? 'sticker' : (image ? 'image' : 'text')),
        sender: username,
      });
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (socket && activeChatId) {
      socket.emit('delete_message', { chatId: activeChatId, messageId });
    }
  };

  const handleLeaveChat = () => {
    if (socket && activeChatId && phoneNumber) {
      if (window.confirm(t.leaveConfirm)) {
        socket.emit('leave_chat', { chatId: activeChatId, phone: phoneNumber });
        // Optimistic update
        setChats(prev => prev.filter(c => c.id !== activeChatId));
        setActiveChatId(null);
      }
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (socket) {
      socket.emit('typing', isTyping);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tg_username');
    localStorage.removeItem('tg_phone');
    setUsername(null);
    setPhoneNumber(null);
    setShowMenu(false);
    setLoginStep(0);
  };

  const handleRequestCode = () => {
    const phoneDigits = tempPhone.replace(/\D/g, '');
    if (tempName.trim() && phoneDigits.length >= 9) {
      setLoginStep(2);
      // Simulate sending code
      setTimeout(() => {
        alert(t.verificationCodeSent);
      }, 1000);
    } else {
      alert(t.invalidPhoneName);
    }
  };

  const handleVerifyCode = () => {
    const code = verificationCode.join('');
    if (code === '1234') {
      setLoginStep(3);
    } else {
      alert(t.invalidVerificationCode);
    }
  };

  const [activationCode, setActivationCode] = useState('');

  const handleActivateApp = () => {
    if (activationCode === '2013sila') {
      setIsPremium(true);
      localStorage.setItem('tg_premium', 'true');
      alert(t.premiumSuccess);
    }
    
    localStorage.setItem('tg_username', tempName.trim());
    localStorage.setItem('tg_phone', tempPhone.trim());
    setUsername(tempName.trim());
    setPhoneNumber(tempPhone.trim());
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const filteredChats = useMemo(() => {
    return chats.filter(chat => 
      chat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [chats, searchQuery]);

  const activeChat = useMemo(() => {
    return chats.find(c => c.id === activeChatId) || null;
  }, [chats, activeChatId]);

  const activeMessages = useMemo(() => {
    return activeChatId ? (messagesByChat[activeChatId] || []) : [];
  }, [activeChatId, messagesByChat]);

  if (!username) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f4f4f5]">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-8 rounded-2xl shadow-xl w-[400px] text-center"
        >
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" 
            alt="Telegram" 
            className="w-20 h-20 mx-auto mb-6"
          />

          {loginStep === 0 && (
            <>
              <div className="w-20 h-20 bg-tg-active rounded-3xl mx-auto mb-6 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                <Globe className="w-10 h-10" />
              </div>
              <h1 className="text-2xl font-bold mb-2">{t.welcome}</h1>
              <p className="text-tg-text-secondary mb-6">{t.chooseLang}</p>
              <div className="space-y-2 mb-6">
                {['O\'zbekcha', 'English', 'Русский'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setSelectedLang(lang as Language);
                      localStorage.setItem('tg_lang', lang);
                    }}
                    className={cn(
                      "w-full p-3 rounded-lg border transition-all text-left flex justify-between items-center",
                      selectedLang === lang ? "border-tg-active bg-blue-50 text-tg-active" : "border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    {lang}
                    {selectedLang === lang && <Check className="w-5 h-5" />}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setLoginStep(1)}
                className="w-full bg-tg-active text-white font-bold py-3 rounded-lg hover:bg-[#3897d0] transition-colors"
              >
                {t.next}
              </button>
            </>
          )}

          {loginStep === 1 && (
            <>
              <h1 className="text-2xl font-bold mb-4">{t.enterApp}</h1>
              <p className="text-tg-text-secondary mb-6">{t.phoneLabel}</p>
              <div className="space-y-4 text-left">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.nameLabel}</label>
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder={t.placeholderName}
                    className="w-full border border-tg-border rounded-lg p-3 outline-none focus:ring-2 focus:ring-tg-active"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.phoneLabel}</label>
                  <input
                    type="tel"
                    value={tempPhone}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (!val.startsWith('+998')) val = '+998' + val.replace(/^\+998/, '');
                      setTempPhone(val);
                    }}
                    placeholder="+998 90 123 45 67"
                    className="w-full border border-tg-border rounded-lg p-3 outline-none focus:ring-2 focus:ring-tg-active"
                  />
                </div>
              </div>
              <button 
                onClick={handleRequestCode}
                className="w-full bg-tg-active text-white font-bold py-3 rounded-lg hover:bg-[#3897d0] transition-colors mt-6"
              >
                {t.next}
              </button>
              <button 
                onClick={() => setLoginStep(0)}
                className="w-full text-tg-active font-medium py-2 mt-2 hover:underline"
              >
                {t.cancel}
              </button>
            </>
          )}

          {loginStep === 2 && (
            <>
              <h1 className="text-2xl font-bold mb-2">{tempPhone}</h1>
              <p className="text-tg-text-secondary mb-6">{t.codeSent}</p>
              <div className="flex justify-center gap-3 mb-8">
                {verificationCode.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`code-${idx}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(idx, e.target.value)}
                    className="w-12 h-14 border-2 border-tg-border rounded-xl text-center text-2xl font-bold focus:border-tg-active outline-none"
                  />
                ))}
              </div>
              <button 
                onClick={handleVerifyCode}
                className="w-full bg-tg-active text-white font-bold py-3 rounded-lg hover:bg-[#3897d0] transition-colors"
              >
                {t.verify}
              </button>
              <button 
                onClick={() => setLoginStep(1)}
                className="w-full text-tg-active font-medium py-2 mt-2 hover:underline"
              >
                {t.phoneLabel} ({t.cancel})
              </button>
            </>
          )}

          {loginStep === 3 && (
            <>
              <h1 className="text-2xl font-bold mb-2">{t.welcome}</h1>
              <p className="text-tg-text-secondary mb-6 text-sm">{t.premiumDesc}</p>
              <div className="mb-6">
                <input
                  type="text"
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value)}
                  placeholder={t.placeholderCode}
                  className="w-full border border-tg-border rounded-lg p-3 outline-none focus:ring-2 focus:ring-tg-active text-center font-mono"
                />
              </div>
              <button 
                onClick={handleActivateApp}
                className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                {t.enterApp}
              </button>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-tg-bg relative">
      {/* Calling Overlay */}
      <AnimatePresence>
        {isCalling && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center text-white"
          >
            <div className="w-32 h-32 rounded-full bg-tg-active mb-6 flex items-center justify-center text-4xl font-bold overflow-hidden shadow-2xl">
              {activeChat?.avatar ? <img src={activeChat.avatar} className="w-full h-full object-cover" /> : activeChat?.name[0]}
            </div>
            <h2 className="text-3xl font-bold mb-2">{activeChat?.name}</h2>
            <p className="text-xl text-white/60 mb-12">{formatCallTime(callDuration)}</p>
            
            <div className="flex gap-10">
              <button className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                <Mic className="w-8 h-8" />
              </button>
              <button className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                <Volume2 className="w-8 h-8" />
              </button>
              <button 
                onClick={() => setIsCalling(false)}
                className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg shadow-red-500/40"
              >
                <PhoneOff className="w-8 h-8" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Group Modal */}
      <AnimatePresence>
        {showNewGroup && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowNewGroup(false)}
              className="absolute inset-0 bg-black/40"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-tg-bg w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative z-10 border border-tg-border flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-tg-border flex items-center justify-between">
                <h2 className="font-bold text-lg">{t.newGroup}</h2>
                <button onClick={() => setShowNewGroup(false)} className="p-1 hover:bg-tg-hover rounded-full transition-colors"><X className="w-6 h-6" /></button>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-tg-active rounded-full flex items-center justify-center text-2xl text-white">
                    <Users className="w-8 h-8" />
                  </div>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder={t.newGroup}
                    className="flex-1 bg-tg-hover border-none rounded-lg p-3 outline-none focus:ring-2 focus:ring-tg-active transition-all"
                  />
                </div>
                <p className="text-sm text-tg-text-secondary font-medium">{t.members} ({selectedMembers.length})</p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tg-text-secondary" />
                  <input
                    type="text"
                    value={groupSearchQuery}
                    onChange={(e) => setGroupSearchQuery(e.target.value)}
                    placeholder={t.search}
                    className="w-full bg-tg-hover border-none rounded-lg py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-tg-active transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {chats
                  .filter(c => !c.isGroup && c.name.toLowerCase().includes(groupSearchQuery.toLowerCase()))
                  .map(contact => (
                  <div 
                    key={contact.id}
                    onClick={() => toggleMember(contact.phone)}
                    className="flex items-center gap-4 p-3 hover:bg-tg-hover rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-tg-active flex items-center justify-center text-white overflow-hidden">
                      {contact.avatar ? <img src={contact.avatar} className="w-full h-full object-cover" /> : contact.name[0]}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold">{contact.name}</h3>
                      <p className="text-xs text-tg-text-secondary">{contact.phone}</p>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      selectedMembers.includes(contact.phone) ? "bg-tg-active border-tg-active" : "border-gray-300"
                    )}>
                      {selectedMembers.includes(contact.phone) && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-tg-border">
                <button 
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim() || selectedMembers.length === 0}
                  className="w-full bg-tg-active text-white font-bold py-3 rounded-lg hover:bg-[#3897d0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t.create}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Contacts Modal */}
      <AnimatePresence>
        {showContacts && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowContacts(false)}
              className="absolute inset-0 bg-black/40"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-tg-bg w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative z-10 border border-tg-border"
            >
              <div className="p-4 border-b border-tg-border flex items-center justify-between">
                <h2 className="font-bold text-lg">{t.contacts}</h2>
                <button onClick={() => setShowContacts(false)} className="p-1 hover:bg-tg-hover rounded-full transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-4 bg-tg-bg border-b border-tg-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tg-text-secondary" />
                  <input
                    type="text"
                    value={contactSearchQuery}
                    onChange={(e) => setContactSearchQuery(e.target.value)}
                    placeholder={t.search}
                    className="w-full bg-tg-hover border-none rounded-lg py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-tg-active transition-all"
                  />
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto p-2">
                {chats
                  .filter(c => !c.isGroup && c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()))
                  .map(contact => (
                  <div 
                    key={contact.id}
                    onClick={() => { setActiveChatId(contact.id); setShowContacts(false); }}
                    className="flex items-center gap-4 p-3 hover:bg-tg-hover rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-tg-active flex items-center justify-center text-lg font-bold text-white overflow-hidden">
                      {contact.avatar ? <img src={contact.avatar} className="w-full h-full object-cover" /> : contact.name[0]}
                    </div>
                    <div>
                      <h3 className="font-bold">{contact.name}</h3>
                      <p className="text-sm text-tg-online">{contact.online ? t.online : t.offline}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-tg-border">
                <button 
                  onClick={() => { setShowAddContact(true); setShowContacts(false); }}
                  className="w-full flex items-center justify-center gap-2 text-tg-active font-bold py-2 hover:bg-tg-hover rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  {t.addContact}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Contact Modal */}
      <AnimatePresence>
        {showAddContact && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddContact(false)}
              className="absolute inset-0 bg-black/40"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-tg-bg w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative z-10 border border-tg-border"
            >
              <div className="p-4 border-b border-tg-border flex items-center justify-between">
                <h2 className="font-bold text-lg">{t.addContact}</h2>
                <button onClick={() => setShowAddContact(false)} className="p-1 hover:bg-tg-hover rounded-full transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-tg-text-secondary mb-1">{t.name}</label>
                  <input
                    type="text"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder={t.placeholderName}
                    className="w-full bg-tg-hover border-none rounded-lg p-3 outline-none focus:ring-2 focus:ring-tg-active transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-tg-text-secondary mb-1">{t.phone}</label>
                  <input
                    type="tel"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    className="w-full bg-tg-hover border-none rounded-lg p-3 outline-none focus:ring-2 focus:ring-tg-active transition-all"
                  />
                </div>
                <button 
                  onClick={handleAddContact}
                  className="w-full bg-tg-active text-white font-bold py-3 rounded-lg hover:bg-[#3897d0] transition-colors mt-4"
                >
                  {t.add}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/40"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-tg-bg w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative z-10 border border-tg-border"
            >
              <div className="p-4 border-b border-tg-border flex items-center justify-between">
                <h2 className="font-bold text-lg">{t.settings}</h2>
                <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-tg-hover rounded-full transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <div className="w-20 h-20 bg-tg-active rounded-full flex items-center justify-center text-3xl font-bold text-white overflow-hidden shadow-lg">
                      {profilePic ? <img src={profilePic} className="w-full h-full object-cover" /> : username?.[0]}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity">
                      <Plus className="w-6 h-6 text-white" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleProfilePicChange} />
                    </label>
                  </div>
                  <div>
                    <h3 className="font-bold text-xl flex items-center gap-2">
                      {username}
                      {isPremium && <Star className="w-5 h-5 text-purple-500 fill-current" />}
                    </h3>
                    <p className="text-tg-text-secondary">{phoneNumber}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 hover:bg-tg-hover rounded-xl cursor-pointer transition-colors">
                    <div className="flex items-center gap-4">
                      <Settings className="w-5 h-5 text-tg-active" />
                      <span className="font-medium">{t.notifications}</span>
                    </div>
                    <span className="text-tg-active text-sm font-bold">{t.on}</span>
                  </div>
                  <div 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="flex justify-between items-center p-3 hover:bg-tg-hover rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Moon className="w-5 h-5 text-tg-active" />
                      <span className="font-medium">{t.theme} ({isDarkMode ? t.dark : t.light})</span>
                    </div>
                    <div className={cn(
                      "w-10 h-5 rounded-full relative transition-colors",
                      isDarkMode ? "bg-tg-active" : "bg-gray-300"
                    )}>
                      <motion.div 
                        animate={{ x: isDarkMode ? 20 : 4 }}
                        className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm" 
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800 mt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Star className="w-6 h-6 text-purple-500 fill-current" />
                      <h4 className="font-bold text-purple-700 dark:text-purple-400">TelePlus Premium</h4>
                    </div>
                    {isPremium ? (
                      <p className="text-sm text-purple-600 dark:text-purple-300">
                        {t.premiumSuccess} ✨
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-tg-text-secondary">
                          {t.premiumDesc}:
                        </p>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={premiumCode}
                            onChange={(e) => setPremiumCode(e.target.value)}
                            placeholder={t.placeholderCode}
                            className="flex-1 bg-white dark:bg-tg-bg border border-purple-200 dark:border-purple-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-purple-500"
                          />
                          <button 
                            onClick={handleApplyPremiumCode}
                            className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors"
                          >
                            {t.apply}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* About Modal */}
      <AnimatePresence>
        {showAbout && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAbout(false)}
              className="absolute inset-0 bg-black/40"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-tg-bg w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative z-10 text-center p-8 border border-tg-border"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" className="w-24 h-24 mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-2">TelePlus v1.0</h2>
              <p className="text-tg-text-secondary mb-6">{t.about}</p>
              <button 
                onClick={() => setShowAbout(false)}
                className="bg-tg-active text-white font-bold py-2 px-8 rounded-lg hover:bg-[#3897d0] transition-colors"
              >
                {t.cancel}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Menu Drawer Overlay */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMenu(false)}
              className="absolute inset-0 bg-black/30 z-40"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 left-0 h-full w-[280px] bg-tg-sidebar z-50 shadow-2xl flex flex-col"
            >
              <div className="bg-tg-active p-6 text-white">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold mb-4 overflow-hidden">
                  {profilePic ? <img src={profilePic} className="w-full h-full object-cover" /> : username?.[0]}
                </div>
                <h2 className="font-bold text-lg flex items-center gap-1">
                  {username}
                  {isPremium && <Star className="w-4 h-4 text-white fill-current" />}
                </h2>
                <p className="text-white/70 text-sm">{phoneNumber}</p>
              </div>
              
              <div className="flex-1 py-2">
                <button 
                  onClick={() => { setShowNewGroup(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-6 px-6 py-3 hover:bg-tg-hover transition-colors"
                >
                  <Users className="w-6 h-6 text-tg-text-secondary" />
                  <span className="font-medium">{t.newGroup}</span>
                </button>
                <button 
                  onClick={() => { setShowContacts(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-6 px-6 py-3 hover:bg-tg-hover transition-colors"
                >
                  <UserIcon className="w-6 h-6 text-tg-text-secondary" />
                  <span className="font-medium">{t.contacts}</span>
                </button>
                <button 
                  onClick={() => { setShowSettings(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-6 px-6 py-3 hover:bg-tg-hover transition-colors"
                >
                  <Settings className="w-6 h-6 text-tg-text-secondary" />
                  <span className="font-medium">{t.settings}</span>
                </button>
                <button 
                  onClick={() => { setShowSettings(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-6 px-6 py-3 hover:bg-tg-hover transition-colors"
                >
                  <Star className="w-6 h-6 text-purple-500" />
                  <span className="font-medium text-purple-600">TelePlus Premium</span>
                  {isPremium && <Check className="w-4 h-4 text-purple-500 ml-auto" />}
                </button>

                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="w-full flex items-center gap-6 px-6 py-3 hover:bg-tg-hover transition-colors"
                >
                  <Moon className="w-6 h-6 text-tg-text-secondary" />
                  <span className="font-medium">{isDarkMode ? t.light : t.dark} {t.theme}</span>
                </button>
                <button 
                  onClick={() => { setShowAbout(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-6 px-6 py-3 hover:bg-tg-hover transition-colors"
                >
                  <Info className="w-6 h-6 text-tg-text-secondary" />
                  <span className="font-medium">{t.about}</span>
                </button>
              </div>
              
              <div className="border-t border-tg-border p-2">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-6 px-6 py-3 hover:bg-red-50 text-red-500 transition-colors rounded-lg"
                >
                  <LogOut className="w-6 h-6" />
                  <span className="font-medium">{t.logout}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Sidebar 
        chats={filteredChats} 
        activeChatId={activeChatId} 
        onChatSelect={setActiveChatId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onMenuClick={() => setShowMenu(true)}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        isPremium={isPremium}
        t={t}
      />
      <ChatWindow 
        chat={activeChat} 
        messages={activeMessages} 
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        typingUser={typingUser}
        onCallClick={() => setIsCalling(true)}
        isFavorite={activeChat ? favorites.includes(activeChat.id) : false}
        onToggleFavorite={() => activeChat && toggleFavorite(activeChat.id)}
        isMuted={activeChat?.isMuted || false}
        onToggleMute={() => activeChat && toggleMute(activeChat.id)}
        isPremium={isPremium}
        onDeleteMessage={handleDeleteMessage}
        onLeaveChat={() => activeChat && handleLeaveChat()}
        onHeaderClick={() => { setSelectedProfile(activeChat); setShowProfileModal(true); }}
        t={t}
      />

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && selectedProfile && (
          <div className="absolute inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="absolute inset-0 bg-black/40"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-tg-bg w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative z-10 border border-tg-border"
            >
              <div className="relative h-64 bg-tg-active flex items-center justify-center text-white">
                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 rounded-full transition-colors z-20"
                >
                  <X className="w-6 h-6" />
                </button>
                {selectedProfile.avatar ? (
                  <img src={selectedProfile.avatar} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-8xl font-bold">
                    {selectedProfile.isGroup ? <Users className="w-24 h-24" /> : selectedProfile.name[0]}
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
                  <h2 className="text-2xl font-bold">{selectedProfile.name}</h2>
                  <p className="text-white/80 text-sm">
                    {selectedProfile.isGroup ? `${selectedProfile.members?.length || 0} ${t.members}` : (selectedProfile.online ? t.online : t.offline)}
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                      <Phone className="w-5 h-5 text-tg-active" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedProfile.phone}</p>
                      <p className="text-xs text-tg-text-secondary">{t.phone}</p>
                    </div>
                  </div>

                  {!selectedProfile.isGroup && (
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                        <AtSign className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="font-medium">@{selectedProfile.name.toLowerCase().replace(/\s/g, '_')}</p>
                        <p className="text-xs text-tg-text-secondary">{t.username}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-50 dark:bg-gray-900/20 rounded-full flex items-center justify-center">
                      <Info className="w-5 h-5 text-tg-text-secondary" />
                    </div>
                    <div>
                      <p className="font-medium">TelePlus {selectedProfile.isGroup ? t.group : t.user}</p>
                      <p className="text-xs text-tg-text-secondary">{t.about}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => { setIsCalling(true); setShowProfileModal(false); }}
                    className="flex-1 bg-tg-active text-white font-bold py-3 rounded-xl hover:bg-[#3897d0] transition-colors flex items-center justify-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    {t.call}
                  </button>
                  <button 
                    onClick={() => setShowProfileModal(false)}
                    className="flex-1 bg-tg-hover text-tg-active font-bold py-3 rounded-xl hover:bg-tg-border transition-colors flex items-center justify-center gap-2"
                  >
                    {t.send}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
