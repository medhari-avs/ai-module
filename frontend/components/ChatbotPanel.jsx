import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Loader2, Download } from 'lucide-react';
import { sendMessageToDeepSeek } from '../hooks/deepseekService';

export default function ChatbotPanel({ onClose, externalStream = null, externalMessages = [], isLoadingExternal = false }) {
  const videoRef = useRef(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'AI', text: 'Hello! I am your Shnoor Meeting Assistant. How can I help you today?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  // Combine local and external messages (like system status or download links)
  const allMessages = [...messages, ...externalMessages];

  useEffect(() => {
    if (externalStream && videoRef.current) {
      videoRef.current.srcObject = externalStream;
    }
  }, [externalStream]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [allMessages, isLoading, isLoadingExternal]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isLoadingExternal) return;

    const userMsg = input.trim();
    const newMessages = [...messages, { sender: 'You', text: userMsg }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      let aiResponseText = '';
      setMessages(prev => [...prev, { sender: 'AI', text: '' }]);

      const onChunk = (chunk) => {
        aiResponseText += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].text = aiResponseText;
          return updated;
        });
      };

      const navSystemPrompt = {
        role: 'system',
        content: `You are the Shnoor Meetings Guide. Help users navigate the platform.
CONTROLS: Mic, Video, Share Screen, CC, Raise Hand, Export Recap.
Help them find buttons and features. Be concise.`
      };

      const history = newMessages.map(m => ({
        role: m.sender === 'You' ? 'user' : 'assistant',
        content: m.text
      }));

      await sendMessageToDeepSeek([navSystemPrompt, ...history], onChunk);
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'AI', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col h-[500px] animate-in slide-in-from-bottom-5">
      <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bot size={20} />
          <span className="font-semibold">AI Assistant</span>
        </div>
        <button onClick={onClose} className="hover:bg-blue-700 p-1 rounded transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="bg-gray-900 h-32 relative flex-shrink-0">
        {externalStream ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover mirror"
            style={{ transform: 'scaleX(-1)' }}
          />
        ) : (
          <div className="flex w-full h-full items-center justify-center bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border-b border-white/10">
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-blue-600/20 rounded-full border border-blue-500/30">
                <Bot size={24} className="text-blue-400" />
              </div>
              <span className="text-[10px] text-blue-200/60 font-medium tracking-widest uppercase">AI Assistant Active</span>
            </div>
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {allMessages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.sender === 'AI' || msg.sender === 'System' ? 'items-start' : 'items-end'}`}>
            <span className="text-[10px] text-gray-400 mb-0.5 ml-1">{msg.sender}</span>
            <div className={`text-sm px-3 py-2 rounded-2xl max-w-[85%] whitespace-pre-wrap ${msg.sender === 'AI' || msg.sender === 'System' ? 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm' : 'bg-blue-600 text-white rounded-tr-none'}`}>
              {msg.text || ((isLoading || isLoadingExternal) && i === allMessages.length - 1 ? <Loader2 size={14} className="animate-spin text-blue-600" /> : '')}
              {msg.link && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <a href={msg.link} download="Recap.html" className="text-blue-600 font-bold hover:underline flex items-center gap-1">
                    <Download size={14} /> {msg.linkText || 'Download'}
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2">
        <input
          type="text"
          placeholder="Ask me anything..."
          className="flex-1 text-sm text-black outline-none px-3 py-2 bg-gray-50 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-100"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={!input.trim() || isLoading} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
