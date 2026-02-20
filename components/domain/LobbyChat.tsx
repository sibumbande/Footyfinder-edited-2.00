
import React, { useRef, useEffect } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { LobbyMessage } from '../../types';

interface LobbyChatProps {
  messages: LobbyMessage[];
  newMessage: string;
  setNewMessage: (val: string) => void;
  onSendMessage: () => void;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  className?: string;
  isLocked?: boolean;
}

export const LobbyChat: React.FC<LobbyChatProps> = ({
  messages,
  newMessage,
  setNewMessage,
  onSendMessage,
  title = "Lobby Chat",
  subtitle,
  placeholder = "Message the lobby...",
  className = "",
  isLocked = false
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={`bg-white rounded-[48px] border border-slate-100 shadow-xl flex flex-col overflow-hidden ${className}`}>
      <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
        <div>
          <h3 className="font-black uppercase text-xs tracking-[0.2em] flex items-center gap-2">
            <MessageSquare size={16} className="text-blue-500" /> {title}
          </h3>
          {subtitle && <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mt-1">{subtitle}</p>}
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto space-y-6 bg-slate-50/20 custom-scrollbar">
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
            <div className="flex items-center gap-2 mb-1 px-1 text-[8px] font-black uppercase tracking-widest text-slate-400">
               <span>{msg.sender}</span>
               <span>•</span>
               <span>{msg.time}</span>
            </div>
            <div className={`px-5 py-3 rounded-[24px] text-xs font-bold max-w-[90%] border shadow-sm ${
              msg.isMe ? 'bg-blue-600 text-white border-blue-500' : 'bg-white border-slate-100 text-slate-800'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <div className="p-6 bg-white border-t border-slate-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !isLocked && newMessage.trim()) { e.preventDefault(); onSendMessage(); } }}
            placeholder={isLocked ? "Pay entry fee to chat..." : placeholder}
            disabled={isLocked}
            className="flex-1 bg-slate-50 border-none rounded-[20px] px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={onSendMessage}
            disabled={isLocked}
            className="p-4 bg-slate-900 text-white rounded-[20px] hover:bg-blue-600 transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
