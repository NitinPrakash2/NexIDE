import { useState, useEffect, useRef } from 'react';
import api from '../../api/client';
import { Send, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function TeamChat({ projectId }) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    api.get(`/projects/${projectId}/chat`).then(({ data }) => setMessages(data.data || [])).catch(() => {});
  }, [projectId]);

  useEffect(() => { endRef.current?.scrollIntoView(); }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    try {
      const { data } = await api.post(`/projects/${projectId}/chat`, { message: input });
      setMessages((prev) => [...prev, data.data]);
      setInput('');
    } catch {}
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800 shrink-0">
        <MessageSquare size={16} className="text-green-400" />
        <span className="text-sm font-medium text-white">Team Chat</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={msg.id || i} className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 mt-0.5 text-xs text-white font-medium">
              {msg.user?.fullName?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="text-xs text-zinc-500">{msg.user?.fullName || 'Unknown'}</p>
              <p className="text-xs text-zinc-300 mt-0.5">{msg.message || msg.content}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={sendMessage} className="p-3 border-t border-zinc-800 shrink-0">
        <div className="flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-[#0a0a0b] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-500"
            placeholder="Type a message..." />
          <button type="submit" disabled={!input.trim()}
            className="bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 text-white rounded-xl px-3 py-2 transition">
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}
