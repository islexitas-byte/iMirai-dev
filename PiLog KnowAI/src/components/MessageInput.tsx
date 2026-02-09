import { useState, useRef, useEffect } from "react";
import { ArrowUp, X, FileText, Plus, Sparkles, Image as ImageIcon } from "lucide-react";
import { API_CONFIG } from "../config/api";

type SuggestedResponse = {
  questions: string[];
};

export default function MessageInput({
  onSend,
  isWaiting,
  showSuggestions = true
}: {
  onSend: (text: string, files: File[]) => void;
  isWaiting: boolean;
  showSuggestions?: boolean;
}) {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- RESTORED SUGGESTIONS LOGIC ---
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/suggested-questions`);
        const data: SuggestedResponse = await res.json();
        setSuggestions(data.questions || []);
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
      }
    };
    fetchSuggestions();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const send = () => {
    if ((value.trim() || files.length > 0) && !isWaiting) {
      onSend(value, files);
      setValue("");
      setFiles([]);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
  };

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3">
      
      {/* 1. SUGGESTED QUESTIONS (ChatGPT Style Chips) */}
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2">
          {suggestions.map((q, i) => (
            <button
              key={i}
              onClick={() => {
                setValue(q);
                textareaRef.current?.focus();
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-full hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm flex items-center gap-2"
            >
              <Sparkles size={12} className="text-blue-500" />
              {q}
            </button>
          ))}
        </div>
      )}

      {/* 2. MAIN INPUT CONTAINER */}
      <div 
        className={`relative bg-white border rounded-2xl transition-all shadow-sm ${
          isFocused ? "border-blue-400 ring-2 ring-blue-50/50" : "border-slate-200"
        }`}
      >
              
      {/* ATTACHMENT PREVIEW STRIP */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 border-b border-slate-50 bg-slate-50/50 rounded-t-2xl">
          {files.map((file, idx) => {
            const ext = file.name.split('.').pop()?.toLowerCase();
            const isImg = ['png','jpg','jpeg'].includes(ext || '');
            return (
              <div key={idx} className="group relative flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-2 pr-10 shadow-sm min-w-[150px]">
                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center overflow-hidden">
                  {isImg ? <ImageIcon size={16}/> : <FileText size={16} />}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-[11px] font-bold text-slate-700 truncate max-w-[100px]">{file.name}</span>
                  <span className="text-[9px] text-slate-400 font-medium">{(file.size / 1024).toFixed(0)} KB</span>
                </div>
                <button 
                  onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-slate-100 text-slate-500 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all"
                >
                  <X size={12} />
                </button>
              </div>
            )
          })}
        </div>
      )}

        {/* TEXT AREA & BUTTONS */}
        <div className="flex items-end gap-2 p-2">
          <input 
            type="file" 
            multiple 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileChange} 
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors mb-0.5"
            title="Attach data"
          >
            <Plus size={22} />
          </button>

          <textarea
            ref={textareaRef}
            className="flex-1 bg-transparent border-none outline-none text-slate-800 py-3 px-1 resize-none text-sm leading-relaxed placeholder:text-slate-400"
            placeholder="Ask PiLog AI or upload data..."
            rows={1}
            value={value}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => {
              setValue(e.target.value);
              autoResize();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />

          <button
            onClick={send}
            disabled={isWaiting || (!value.trim() && files.length === 0)}
            className={`p-2.5 rounded-xl mb-0.5 transition-all active:scale-95 ${
              value.trim() || files.length > 0 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700" 
                : "bg-slate-100 text-slate-300 cursor-not-allowed"
            }`}
          >
            <ArrowUp size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}