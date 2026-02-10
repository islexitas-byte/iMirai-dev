import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import Sidebar from "./components/Sidebar";
import ChatLayout from "./components/ChatLayout";
import type { Task } from "./types/task";
import { API_CONFIG } from "./config/api";
import TasksPage from "./pages/TasksPage";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import { Navigate, useNavigate, useParams, useLocation } from "react-router-dom";
import UsersPage from "./pages/UsersPage";
import type { LoginUser } from "./pages/LoginPage";
import { fetchChatSessions } from "./api/chatHistory";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import KnowledgeSources from "./pages/KnowledgeSources";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import { getUserUsage } from "./api/chat";

ModuleRegistry.registerModules([AllCommunityModule]);

export type ChatSession = {
  sessionId: string;
  title: string;
};

export type UserUsage = {
  credits: number;
  used: number;
  limit: number;
};

export default function App() {
  const [user, setUser] = useState<LoginUser | null>(() => {
    const saved = localStorage.getItem("pilog_user");
    return saved ? JSON.parse(saved) : null;
  });

  /* ---- LOGIN ---- */
  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={
            <LoginPage onSuccess={(u) => {
              localStorage.setItem("pilog_user", JSON.stringify(u));
              setUser(u);
            }} />
          } />
          <Route path="/signup" element={
            <LoginPage onSuccess={(u) => {
              localStorage.setItem("pilog_user", JSON.stringify(u));
              setUser(u);
            }} />
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <AuthenticatedApp user={user} onLogout={() => {
        localStorage.removeItem("pilog_user");
        setUser(null);
      }} />
    </BrowserRouter>
  );
}

// ✅ AUTHENTICATED APP
function AuthenticatedApp({ user, onLogout }: { user: LoginUser; onLogout: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [taskCount, setTaskCount] = useState(0);
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  /* ===== LOAD USER USAGE (CREDITS) ===== */
  useEffect(() => {
    setUsageLoading(true);
    getUserUsage(user.username)
      .then((res) => {
        setUsage({
          credits: res.credits_left,
          used: res.credits_used,
          limit: res.total_credits,
        });
      })
      .catch((err) => {
        console.error("Failed to fetch user credits", err);
        setUsage(null);
      })
      .finally(() => {
        setUsageLoading(false);
      });
  }, [user]);

  /* ===== RENAME SESSION (FROM SIDEBAR) ===== */
  const handleRenameSession = (sessionId: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.sessionId === sessionId ? { ...s, title } : s))
    );
  };

  /* ===== DELETE SESSION (FROM SIDEBAR) ===== */
  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
  };

  /* ===== LOAD TASK COUNT ===== */
  useEffect(() => {
    const fetchTasksCount = async () => {
      try {
        const res = await fetch(
          `${API_CONFIG.BACKEND_BASE_URL}/tasks-list?username=${encodeURIComponent(
            user.username
          )}`
        );
        if (!res.ok) return;
        const tasks: Task[] = await res.json();
        setTaskCount(tasks.length);
      } catch (err) {
        console.error("Failed to fetch task count", err);
        setTaskCount(0);
      }
    };

    fetchTasksCount();
    const interval = setInterval(fetchTasksCount, 10000);
    return () => clearInterval(interval);
  }, [user]);

  /* ---- LOAD EXISTING SESSIONS ---- */
  useEffect(() => {
    fetchChatSessions(user.username)
      .then((res) => {
        const mapped = res.sessions.map((s: any) => ({
          sessionId: s.session_id,
          title: s.title || "Chat",
        }));
        setSessions(mapped);
      })
      .catch(console.error);
  }, [user]);

  /* ---- ADD SESSION ONLY AFTER FIRST ANSWER ---- */
  const addSessionIfMissing = (sessionId: string, title: string) => {
    setSessions((prev) => {
      const exists = prev.some((s) => s.sessionId === sessionId);
      if (exists) return prev;
      return [{ sessionId, title }, ...prev];
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        user={user}
        sessions={sessions}
        activeSessionId={null}
        onSelectSession={() => {}}
        onNewChat={() => {}}
        onLogout={onLogout}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        taskCount={taskCount}
        usage={usage}
        usageLoading={usageLoading}
      />

      <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"}`}>
        <Routes>
          {/* ✅ ROOT - Redirect logged in users to /new */}
          <Route path="/" element={<Navigate to="/new" replace />} />

          {/* ✅ CHAT ROUTES - Use single wrapper for both new and existing */}
          <Route path="/new" element={
            <ChatWrapper
              user={user}
              onFirstAnswer={addSessionIfMissing}
              usage={usage}
              setUsage={setUsage}
            />
          } />

          <Route path="/c/:sessionId" element={
            <ChatWrapper
              user={user}
              onFirstAnswer={addSessionIfMissing}
              usage={usage}
              setUsage={setUsage}
            />
          } />

          {/* ✅ KNOWLEDGE SOURCES PAGE */}
          <Route path="/knowledge-sources" element={
            user.CONTENT_AUTHORIZATION === "Y" ? (
              <KnowledgeSources currentUser={user} />
            ) : (
              <Navigate to="/new" replace />
            )
          } />

          {/* ✅ USERS PAGE */}
          <Route path="/users" element={
            user.role?.toLowerCase() === "admin" ? (
              <UsersPage currentUser={user} />
            ) : (
              <Navigate to="/new" replace />
            )
          } />

          {/* ✅ TASKS PAGE */}
          <Route path="/tasks" element={<TasksPage user={user} />} />

          {/* ✅ CATCH ALL */}
          <Route path="*" element={<Navigate to="/new" replace />} />
        </Routes>
      </main>
    </div>
  );
}

// ✅ UNIFIED CHAT WRAPPER - Handles both /new and /c/:sessionId
function ChatWrapper({
  user,
  onFirstAnswer,
  usage,
  setUsage,
}: {
  user: LoginUser;
  onFirstAnswer: (sessionId: string, title: string) => void;
  usage: UserUsage | null;
  setUsage: (u: UserUsage) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  
  // ✅ Determine if this is a new chat or existing
  const isNewChat = location.pathname === "/new";
  
  // ✅ Generate temp session ID for new chats, use URL param for existing
  const [tempSessionId] = useState(() => uuidv4());
  const sessionId = isNewChat ? tempSessionId : (urlSessionId || tempSessionId);

  const handleFirstAnswer = (actualSessionId: string, title: string) => {
    onFirstAnswer(actualSessionId, title);
    
    // ✅ Only navigate if we're on /new
    if (isNewChat) {
      navigate(`/c/${actualSessionId}`, { replace: true });
    }
  };

  return (
    <ChatLayout
      user={user}
      sessionId={sessionId}
      isNewChat={isNewChat}
      onExitNewChat={() => {}}
      onFirstAnswer={handleFirstAnswer}
      usage={usage}
      setUsage={setUsage}
    />
  );
}