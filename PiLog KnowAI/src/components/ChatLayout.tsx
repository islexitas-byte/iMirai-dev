import { useState, useEffect, useRef } from "react";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { askQuestion } from "../api/chat";
import { fetchChatSession, fetchSessionTitle } from "../api/chatHistory";
import type { AskResponse } from "../api/chat";
import type { Message } from "../types/chat";
import type { LoginUser } from "../pages/LoginPage";

type UserUsage = {
  credits: number;
  used: number;
  limit: number;
};

export default function ChatLayout({
  user,
  sessionId,
  isNewChat,
  onExitNewChat,
  onFirstAnswer,
  usage,
  setUsage,
}: {
  user: LoginUser;
  sessionId: string;
  isNewChat: boolean;
  onExitNewChat: () => void;
  onFirstAnswer: (actualSessionId: string, title: string) => void;
  usage: UserUsage | null;
  setUsage: (u: UserUsage) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const titleFetchedRef = useRef(false);
  const [loading, setLoading] = useState(!isNewChat);
  const [isWaiting, setIsWaiting] = useState(false);
  const activeSessionRef = useRef(sessionId);
  const actualSessionIdRef = useRef<string | null>(null); // ✅ Track backend session ID
  const getTimestamp = () => new Date().toISOString();

  const handleSuggestedClick = async (text: string, files: File[] = []) => {
    await sendMessage(text, files);
  };

  /* ===== TABLE DETECTION ===== */
  const hasTable = (html: string) => /<table[\s\S]*?>/i.test(html);

  /* ===== GLOBAL COPY HANDLER ===== */
  useEffect(() => {
    (window as any).__copyTable = (btn: HTMLElement) => {
      const wrapper = btn.closest(".llm-table-wrapper") as HTMLElement;
      if (!wrapper) return;

      const table = wrapper.querySelector("table");
      if (!table) return;

      let text = "";
      for (const row of Array.from(table.rows)) {
        const cells = Array.from(row.cells).map((cell) => cell.innerText.trim());
        text += cells.join("\t") + "\n";
      }

      navigator.clipboard.writeText(text).then(() => {
        const originalHTML = btn.innerHTML;
        btn.innerHTML = "Copied";
        btn.classList.add("text-green-600");
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.classList.remove("text-green-600");
        }, 6000);
      });
    };
  }, []);

  /* ===== WRAP ASSISTANT HTML IF TABLE EXISTS ===== */
  const wrapAssistantHtml = (html: string) => {
    if (!hasTable(html)) return html;

    return html.replace(
      /<table[\s\S]*?<\/table>/gi,
      (tableHtml) => `
        <div class="llm-table-wrapper relative group my-3">
          <button
            class="copy-table-btn absolute -top-3 right-0
                  opacity-0 group-hover:opacity-100
                  transition text-slate-500 hover:text-slate-900"
            onclick="window.__copyTable && window.__copyTable(this)"
            aria-label="Copy table"
            title="Copy table"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4
                      a2 2 0 0 1 2-2h9
                      a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>

          ${tableHtml}
        </div>
      `
    );
  };

  function formatMessage(m: any): Message {
    if (m.role === "user") {
      return {
        role: "user",
        html: `<div>${m.content}</div>`,
      };
    }

    let answerHtml = "";
    let previewHtml = "";

    if (typeof m.content === "string") {
      answerHtml = m.content;
      previewHtml = m.preview_html ?? "";
    } else if (m.content && typeof m.content === "object") {
      answerHtml = m.content.answer || "";
      previewHtml = m.content.preview_html || "";
    }

    return {
      role: "assistant",
      html: wrapAssistantHtml(answerHtml + previewHtml),
      timestamp: m.timestamp,
      suggested_next: m.suggested_next || [],
    };
  }

  useEffect(() => {
    activeSessionRef.current = sessionId;
  }, [sessionId]);

  /* ===== LOAD HISTORY ===== */
  useEffect(() => {
    // ✅ Skip for new chats
    if (isNewChat) {
      setMessages([]);
      setLoading(false);
      titleFetchedRef.current = false;
      return;
    }

    // ✅ DON'T reload if we already have messages (prevents clearing on URL change)
    if (messages.length > 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    titleFetchedRef.current = false;

    fetchChatSession(sessionId)
      .then((res) => {
        const loaded = res.messages.map((m: any) => formatMessage(m));
        setMessages(loaded);
      })
      .catch((err) => {
        console.error("Failed to load session:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [sessionId, isNewChat]);

  /* ===== SEND MESSAGE ===== */
  const sendMessage = async (text: string, files: File[] = []) => {
    if (isWaiting) return;
    setIsWaiting(true);

    if (isNewChat) {
      onExitNewChat();
    }

    setMessages((prev) => [
      ...prev,
      { role: "user", html: `<div>${text}</div>`, files: files },
      {
        role: "assistant",
        html: `
          <div class="thinking-dots text-sm text-slate-500">
            Thinking<span>.</span><span>.</span><span>.</span>
          </div>
        `,
        timestamp: getTimestamp(),
      },
    ]);

    try {
      // ✅ Use actual session ID if we have it, otherwise use temp ID
      const sessionToSend = actualSessionIdRef.current || sessionId;

      const res = await askQuestion({
        question: text,
        sessionId: sessionToSend,
        username: user.username,
        user,
        files,
      });

      // ✅ UPDATE CREDITS
      if (res.usage) {
        setUsage({
          credits: Number(res.usage.credits_left),
          used: Number(res.usage.credits_used),
          limit: Number(res.usage.total_credits),
        });
      }

      // ✅ CAPTURE BACKEND SESSION ID (first time only)
      if (res.sessionId && isNewChat && !actualSessionIdRef.current) {
        actualSessionIdRef.current = res.sessionId;

        // ✅ Fetch title and notify parent to update URL
        if (!titleFetchedRef.current) {
          titleFetchedRef.current = true;
          const titleRes = await fetchSessionTitle(user.username, res.sessionId);
          onFirstAnswer(res.sessionId, titleRes.title);
        }
      }

      // ✅ Replace thinking message with actual response
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = formatMessage({
          role: "assistant",
          content: res.answer,
          preview_html: res.preview_html,
          suggested_next: res.suggested_next,
          timestamp: getTimestamp(),
        });
        return updated;
      });
    } catch (err) {
      console.error("ASK API ERROR:", err);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          html: "<div class='pilog-answer'><p>Sorry, something went wrong.</p></div>",
          timestamp: getTimestamp(),
        };
        return updated;
      });
    } finally {
      setIsWaiting(false);
    }
  };

  /* ===== REGENERATE ===== */
  const regenerateAtIndex = async (aiIndex: number, question: string) => {
    setMessages((prev) => {
      const updated = [...prev];
      updated[aiIndex] = {
        role: "assistant",
        html: `
          <div class="thinking-dots text-sm text-slate-500">
            Thinking<span>.</span><span>.</span><span>.</span>
          </div>
        `,
        timestamp: getTimestamp(),
      };
      return updated;
    });

    try {
      const sessionToSend = actualSessionIdRef.current || sessionId;

      const res: AskResponse = await askQuestion({
        question,
        sessionId: sessionToSend,
        username: user.username,
        user,
      });

      if (res.usage) {
        setUsage({
          credits: Number(res.usage.credits_left),
          used: Number(res.usage.credits_used),
          limit: Number(res.usage.total_credits),
        });
      }

      setMessages((prev) => {
        const updated = [...prev];
        updated[aiIndex] = formatMessage({
          role: "assistant",
          content: res.answer,
          preview_html: res.preview_html,
          suggested_next: res.suggested_next,
          timestamp: getTimestamp(),
        });
        return updated;
      });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[aiIndex] = {
          role: "assistant",
          html: "<div class='pilog-answer'><p>Failed to regenerate.</p></div>",
          timestamp: getTimestamp(),
        };
        return updated;
      });
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-slate-50">
      {/* LOADING STATE */}
      {loading && !isNewChat && <div className="flex-1" />}

      {/* NEW CHAT WELCOME */}
      {isNewChat && !loading && messages.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 px-6 text-center">
          <h2 className="text-2xl font-semibold text-slate-900 mb-6">
            Hi {user.name}, how can I help you today?
          </h2>
          <div className="w-full max-w-3xl">
            <MessageInput onSend={sendMessage} isWaiting={isWaiting} showSuggestions={true} />
          </div>
        </div>
      )}

      {/* NORMAL CHAT VIEW - Show messages regardless of isNewChat if we have them */}
      {messages.length > 0 && (
        <>
          <MessageList
            messages={messages}
            onRegenerate={regenerateAtIndex}
            sessionId={actualSessionIdRef.current || sessionId}
            onSuggestedClick={handleSuggestedClick}
          />
          <MessageInput onSend={sendMessage} isWaiting={isWaiting} showSuggestions={false} />
        </>
      )}
    </div>
  );
}