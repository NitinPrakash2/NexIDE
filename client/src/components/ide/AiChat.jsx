import { useState } from 'react';
import api from '../../api/client';
import { Send, Bot, Sparkles } from 'lucide-react';

export default function AiChat({ projectId }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I can help you write, explain, debug, or refactor code. What do you need?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState(null);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/ai/chat', {
        conversationId: convId,
        message: userMsg.content,
        projectId,
      });
      setConvId(data.data.conversationId);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.data.content }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'AI is not configured or unavailable.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800 shrink-0">
        <Bot size={16} className="text-blue-400" />
        <span className="text-sm font-medium text-white">AI Assistant</span>
        <Sparkles size={14} className="text-blue-400 ml-auto" />
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={12} className="text-white" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
              msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
              <Bot size={12} className="text-white" />
            </div>
            <div className="bg-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-400 animate-pulse">Thinking...</div>
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="p-3 border-t border-zinc-800 shrink-0">
        <div className="flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-[#0a0a0b] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            placeholder="Ask AI anything..." disabled={loading} />
          <button type="submit" disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white rounded-xl px-3 py-2 transition">
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}
