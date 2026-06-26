import React, { useState, useRef, useEffect } from "react";
import { ChatHistoryMessage } from "../types";
import { Sparkles, Send, HelpCircle, Bot, Landmark, Flame } from "lucide-react";
import { useLanguage } from "./LanguageContext";

interface SevakAssistantProps {
  user: any;
}

const QUICK_PROMPT_KEYS = [
  "prompt.chemical",
  "prompt.highPriority",
  "prompt.simulate",
  "prompt.auditors"
];

export default function SevakAssistant({ user }: SevakAssistantProps) {
  const { t } = useLanguage();
  
  const [messages, setMessages] = useState<ChatHistoryMessage[]>([
    {
      role: "model",
      text: "Namaste! I am SevakAI, your Municipal Advisor and virtual Guide on the NagarSevak platform. How can I help you navigate reporting municipal hazards, sorting division issues, or checking community parameters today?"
    }
  ]);
  
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    setLoading(true);
    setInputText("");

    // Update locally with user's message
    const updatedMessages = [...messages, { role: "user" as const, text: text.trim() }];
    setMessages(updatedMessages);

    try {
      // Clean history for API payload (matches server types)
      const apiHistory = messages.map((msg, index) => ({
        role: msg.role,
        text: index === 0 && msg.role === "model" ? t("assistant.welcome") : msg.text
      }));

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: apiHistory,
          message: text.trim()
        })
      });

      if (!response.ok) {
        throw new Error("Chat assistant rejected queries.");
      }

      const result = await response.json();
      setMessages([...updatedMessages, { role: "model" as const, text: result.response }]);
    } catch (err: any) {
      console.error(err);
      setMessages([
        ...updatedMessages,
        { 
          role: "model" as const, 
          text: t("assistant.error")
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-[#121214] border border-[#27272a] rounded-xl p-4 sm:p-5 shadow-xl flex flex-col h-[600px] relative">
      
      {/* Advisor Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-[#27272a]/60 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl relative">
            <Bot className="w-5 h-5 text-white stroke-[2.5]" />
            <div className="absolute right-0 bottom-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#121214] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-1 px-1.5 py-0.5 bg-blue-950/20 border border-blue-900/30 rounded w-max">
              <Sparkles className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] font-bold text-blue-400 tracking-widest uppercase font-mono">{t("assistant.counselor")}</span>
            </div>
            <p className="text-[10px] text-[#71717a] font-mono">{t("assistant.knowledgeGraph")}</p>
          </div>
        </div>
        <span className="text-xs font-mono text-[#71717a]">{t("assistant.assistantLevel")}</span>
      </div>

      {/* Messages Scrolling Hub */}
      <div className="flex-1 overflow-y-auto py-5 pr-2 space-y-4">
        {messages.map((msg, index) => {
          const isBot = msg.role === "model";
          const msgText = (index === 0 && isBot) ? t("assistant.welcome") : msg.text;
          
          return (
            <div 
              key={index} 
              className={`flex ${isBot ? 'justify-start' : 'justify-end'} animate-fade-in`}
            >
              <div 
                className={`max-w-[85%] rounded-xl p-4 shadow-md text-xs sm:text-sm leading-relaxed ${
                  isBot 
                    ? 'bg-[#09090b] border border-[#27272a] text-zinc-200 rounded-tl-none' 
                    : 'bg-blue-600 border border-blue-500 text-white rounded-tr-none'
                }`}
              >
                {/* Author Label */}
                <div className={`text-[10px] font-bold font-mono uppercase mb-1 ${isBot ? 'text-blue-400' : 'text-blue-200'}`}>
                  {isBot ? t("assistant.title") : user?.displayName || t("assistant.citizen")}
                </div>
                
                {/* Content */}
                <p className="whitespace-pre-wrap font-sans font-medium">{msgText}</p>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#09090b] border border-[#27272a] rounded-xl rounded-tl-none p-4 max-w-[85%] space-y-2.5">
              <span className="text-[10px] font-bold font-mono uppercase text-blue-400">{t("assistant.thinking")}</span>
              <div className="flex space-x-1.5 py-1">
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick suggest Prompts */}
      <div className="pb-3 flex-shrink-0">
        <div className="flex items-center space-x-1.5 mb-2 pl-1">
          <HelpCircle className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">{t("assistant.suggestedQuestions")}</span>
        </div>
        
        <div className="flex flex-wrap gap-2 max-h-[85px] overflow-y-auto pr-1">
          {QUICK_PROMPT_KEYS.map((key, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(t(key))}
              disabled={loading}
              className="text-[11px] font-[#71717a] bg-[#09090b] hover:bg-[#161618] border border-[#27272a] hover:border-blue-500/40 text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl text-left transition truncate max-w-full cursor-pointer font-mono"
            >
              {t(key)}
            </button>
          ))}
        </div>
      </div>

      {/* Inputs box */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputText);
        }}
        className="flex items-center space-x-2 gap-2 mt-2 pt-3 border-t border-[#27272a]/60 flex-shrink-0"
      >
        <input 
          type="text"
          placeholder={t("assistant.placeholder")} 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={loading}
          className="flex-1 bg-[#09090b] border border-[#27272a] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none transition"
          required
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition shadow-md shadow-blue-900/10 active:scale-[0.98] cursor-pointer disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}
