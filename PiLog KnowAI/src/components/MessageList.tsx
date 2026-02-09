import { useEffect, useRef, useState } from "react";
import type { Message } from "../types/chat";
import {
  Copy,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Download,
  FileSpreadsheet, 
  FileArchive, 
  Image as ImageIcon, 
  File as FileIcon,
  ChevronRight
} from "lucide-react";
import FeedbackModal from "./FeedbackModal";
import { saveFeedback } from "../api/chat";

function formatChatTime(input: string) {
  const date = new Date(input);
  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);

  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (date >= startOfToday) return `Today, ${time}`;
  if (date >= startOfYesterday) return `Yesterday, ${time}`;

  const datePart = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return `${datePart}, ${time}`;
}

/* ---------- HELPERS ---------- */
export const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'csv':
    case 'xlsx':
    case 'xls':
      return { icon: <FileSpreadsheet size={20} />, color: "bg-emerald-50 text-emerald-600", border: "border-emerald-100" };
    case 'pdf':
      return { icon: <FileText size={20} />, color: "bg-red-50 text-red-600", border: "border-red-100" };
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'svg':
      return { icon: <ImageIcon size={20} />, color: "bg-purple-50 text-purple-600", border: "border-purple-100" };
    case 'zip':
    case 'rar':
      return { icon: <FileArchive size={20} />, color: "bg-amber-50 text-amber-600", border: "border-amber-100" };
    default:
      return { icon: <FileIcon size={20} />, color: "bg-slate-50 text-slate-600", border: "border-slate-100" };
  }
};

function stripHtml(html?: string) {
  if (!html) return "";

  const text =
    new DOMParser().parseFromString(html, "text/html").body
      .textContent || "";

  return text
    .replace(/\n\s*\n+/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function isThinkingMessage(html?: string) {
  return typeof html === "string" && html.includes("thinking-dots");
}

/* ---------- COMPONENT ---------- */

export default function MessageList({
  messages,
  onRegenerate,
  sessionId,
  onSuggestedClick
}: {
  messages: Message[];
  onRegenerate: (aiIndex: number, question: string) => void;
  sessionId: string;
  onSuggestedClick: (text: string) => void;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const [submittedFeedback, setSubmittedFeedback] = useState<
    Record<number, "UP" | "DOWN">
  >({});
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const [feedbackModal, setFeedbackModal] = useState<{
    open: boolean;
    mode: "UP" | "DOWN";
    messageIndex: number;
  } | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);

  const handleCopy = async (html?: string, idx?: number) => {
    if (!html || idx === undefined) return;

    try {
      await navigator.clipboard.writeText(stripHtml(html));
      setCopiedIndex(idx);

      setTimeout(() => {
        setCopiedIndex(null);
      }, 1500);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  /* ---------- EMPTY STATE ---------- */
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-6">
        <div className="text-center">
          <h2 className="text-lg font-medium text-slate-900 mb-1">
            Welcome
          </h2>
          <p className="text-sm text-slate-600 mb-2">
            Ask anything about PiLog products, services or documentation.
          </p>
          <div className="text-sm text-slate-500">
            Example:
            <strong className="ml-1 text-slate-700">
              What is DQGS?
            </strong>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-6 space-y-6">
      {messages.map((msg, idx) => {
        const isUser = msg.role === "user";

        if (isUser) {
          return (
            <div key={idx} className="flex justify-end items-start gap-3 mb-6 animate-in fade-in slide-in-from-right-4">
              <div className="max-w-[80%] rounded-2xl bg-blue-50 border border-blue-100 px-5 py-3 text-sm shadow-sm order-1">
                <div className="text-slate-800 leading-relaxed mb-3">{stripHtml(msg.html)}</div>

                {msg.files && msg.files.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-blue-200/50">
                    {msg.files.map((file, fIdx) => {
                      const meta = getFileIcon(file.name);
                      const isImage = ['png', 'jpg', 'jpeg', 'svg'].includes(file.name.split('.').pop()?.toLowerCase() || '');
                      const previewUrl = (file instanceof File && isImage) ? URL.createObjectURL(file) : null;

                      return (
                        <div key={fIdx} className="group flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 min-w-[180px] max-w-[240px] shadow-sm hover:border-blue-400 transition-all">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden ${meta.color}`}>
                            {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : meta.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">{file.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                              {file.size ? `${(file.size / 1024).toFixed(0)} KB` : 'Attached'}
                            </p>
                          </div>
                          <button className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-blue-600 transition-opacity">
                            <Download size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-md order-2 flex-shrink-0">
                U
              </div>
            </div>
          );
        }
        const lastUser = [...messages]
          .slice(0, idx)
          .reverse()
          .find((m) => m.role === "user");

        /* ===== AI ===== */
        return (
          <div key={idx} className="space-y-2">
            <div className="flex justify-start items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-semibold mt-1">
                AI
              </div>

              <div className="max-w-[75%] rounded-xl bg-slate-100 border border-slate-200 px-4 py-3">
                {/* Main AI Answer */}
                <div
                  className="pilog-html text-sm"
                  dangerouslySetInnerHTML={{ __html: msg.html || "" }}
                />

                {/* ===== LEFT-ALIGNED HEADER WITH DISTINCTIVE STYLING ===== */}
                {msg.suggested_next && msg.suggested_next.length > 0 && !isThinkingMessage(msg.html) && (
                  <div className="mt-5 pt-4 border-t border-slate-300/60">
                    
                    {/* OPTION 1: Bold Serif with Accent Line */}
                    <div className="mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                        <h4 className="text-sm font-serif font-semibold text-slate-800 tracking-tight">
                          Continue Exploring
                        </h4>
                      </div>
                    </div>

                    {/* OPTION 2: Sans-Serif with Underline Accent */}
                    {/* <div className="mb-3">
                      <h4 className="text-sm font-bold text-slate-800 inline-block border-b-2 border-blue-500 pb-1">
                        Suggested Follow-ups
                      </h4>
                    </div> */}

                    {/* OPTION 3: Condensed Caps with Icon */}
                    {/* <div className="mb-3 flex items-center gap-2">
                      <Sparkles size={14} className="text-blue-500" />
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                        Continue Exploring
                      </h4>
                    </div> */}

                    {/* OPTION 4: Italic Serif with Gradient */}
                    {/* <div className="mb-3">
                      <h4 className="text-sm font-serif italic font-medium bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                        You might also ask...
                      </h4>
                    </div> */}

                    {/* OPTION 5: Modern Sans with Badge */}
                    {/* <div className="mb-3 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded">
                        Next
                      </span>
                      <h4 className="text-sm font-semibold text-slate-800">
                        Suggested Questions
                      </h4>
                    </div> */}
                    
                    {/* Question Buttons - Numbered List Style */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {msg.suggested_next.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => onSuggestedClick(q)}
                          className="
                            group
                            flex items-center justify-between gap-2
                            p-3 text-sm rounded-lg
                            bg-white border border-slate-300
                            hover:border-blue-400 hover:shadow-md
                            hover:bg-gradient-to-br hover:from-blue-50 hover:to-white
                            text-left
                            transition-all duration-200
                          "
                        >
                          <span className="flex-1 text-slate-700 group-hover:text-blue-700 font-medium leading-snug">
                            {q}
                          </span>
                          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                            <ChevronRight 
                              size={14} 
                              className="text-slate-400 group-hover:text-blue-600" 
                            />
                          </div>
                        </button>
                      ))}
                    </div>

                  </div>
                )}
              </div>
            </div>

            {/* ===== ACTION BAR ===== */}
            {msg.html && !isThinkingMessage(msg.html) && (
              <div className="ml-12 flex items-center gap-1">
                <ActionButton
                  title={copiedIndex === idx ? "Copied!" : "Copy response"}
                  active={copiedIndex === idx}
                  onClick={() => handleCopy(msg.html, idx)}
                >
                  {copiedIndex === idx ? (
                    <span className="text-xs font-semibold">✓</span>
                  ) : (
                    <Copy size={16} />
                  )}
                </ActionButton>

                {lastUser && (
                  <ActionButton
                    title="Regenerate response"
                    onClick={() =>
                      onRegenerate(idx, stripHtml(lastUser.html))
                    }
                  >
                    <RotateCcw size={16} />
                  </ActionButton>
                )}

                <ActionButton
                  title="Helpful"
                  disabled={!!submittedFeedback[idx]}
                  active={submittedFeedback[idx] === "UP"}
                  onClick={() =>
                    setFeedbackModal({
                      open: true,
                      mode: "UP",
                      messageIndex: idx,
                    })
                  }
                >
                  <ThumbsUp size={16} />
                </ActionButton>

                <ActionButton
                  title="Not helpful"
                  disabled={!!submittedFeedback[idx]}
                  active={submittedFeedback[idx] === "DOWN"}
                  onClick={() =>
                    setFeedbackModal({
                      open: true,
                      mode: "DOWN",
                      messageIndex: idx,
                    })
                  }
                >
                  <ThumbsDown size={16} />
                </ActionButton>
                {msg.timestamp && (
                  <div className="relative">
                    <ActionButton
                      title="More options"
                      onClick={() =>
                        setOpenMenuIndex(openMenuIndex === idx ? null : idx)
                      }
                    >
                      <span className="text-lg">⋯</span>
                    </ActionButton>

                    {openMenuIndex === idx && (
                      <div className="absolute bottom-full mb-2 right-0 z-50 w-44
                                      bg-white border rounded-md shadow-md text-sm">
                        <div className="px-3 py-2 flex items-center gap-2 text-slate-600">
                          {formatChatTime(msg.timestamp)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div ref={endRef} />

      {/* ===== FEEDBACK MODAL ===== */}
      {feedbackModal?.open && (
        <FeedbackModal
          open
          mode={feedbackModal.mode}
          onClose={() => setFeedbackModal(null)}
          onSubmit={async (data) => {
            const idx = feedbackModal.messageIndex;

            const lastUser = [...messages]
              .slice(0, idx)
              .reverse()
              .find((m) => m.role === "user");

            if (!lastUser) return;

            try {
              await saveFeedback({
                question: stripHtml(lastUser.html),
                thumbsUp: feedbackModal.mode === "UP",
                percentage: data.percentage,
                sessionId,
                reason: data.reason,
              });

              setSubmittedFeedback((prev) => ({
                ...prev,
                [idx]: feedbackModal.mode,
              }));
            } catch (err) {
              console.error("Failed to save feedback", err);
            }

            setFeedbackModal(null);
          }}

        />
      )}
    </div>
  );
}

/* ---------- BUTTON ---------- */

function ActionButton({
  children,
  onClick,
  title,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title: string;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`
        h-8 w-8
        flex items-center justify-center
        rounded-md
        transition
        ${
          active
            ? "bg-blue-100 text-blue-600"
            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"
        }
        ${disabled ? "opacity-60 cursor-not-allowed" : ""}
      `}
    >
      {children}
    </button>
  );
}