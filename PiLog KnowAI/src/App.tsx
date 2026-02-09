import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import Sidebar from "./components/Sidebar";
import ChatLayout from "./components/ChatLayout";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import TasksPage from "./pages/TasksPage";
import UsersPage from "./pages/UsersPage";
import KnowledgeSources from "./pages/KnowledgeSources";
import type { Task } from "./types/task";
import { API_CONFIG } from "./config/api";
import type { LoginUser } from "./pages/LoginPage";
import { fetchChatSessions } from "./api/chatHistory";
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

// ✅ MAIN APP WRAPPER (handles auth state)
export default function App() {
  const [user, setUser] = useState<LoginUser | null>(() => {
    const saved = localStorage.getItem("pilog_user");
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (u: LoginUser) => {
    localStorage.setItem("pilog_user", JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem("pilog_user");
    setUser(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* ✅ PUBLIC ROUTES */}
        <Route path="/login" element={
          user ? <Navigate to="/new" replace /> : <LoginPage onSuccess={handleLogin} />
        } />
        
        <Route path="/signup" element={
          user ? <Navigate to="/new" replace /> : <LoginPage onSuccess={handleLogin} />
        } />

        {/* ✅ PROTECTED ROUTES */}
        <Route path="/*" element={
          user ? <AuthenticatedApp user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />
        } />
      </Routes>
    </BrowserRouter>
  );
}

// ✅ AUTHENTICATED APP (with sidebar + routes)
function AuthenticatedApp({ user, onLogout }: { user: LoginUser; onLogout: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [taskCount, setTaskCount] = useState(0);
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  // ✅ LOAD USER CREDITS
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
      .finally(() => setUsageLoading(false));
  }, [user]);

  // ✅ LOAD TASK COUNT
  useEffect(() => {
    const fetchTasksCount = async () => {
      try {
        const res = await fetch(
          `${API_CONFIG.BACKEND_BASE_URL}/tasks-list?username=${encodeURIComponent(user.username)}`
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

  // ✅ LOAD CHAT SESSIONS
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

  // ✅ ADD SESSION TO SIDEBAR (called after first message)
  const addSessionIfMissing = (sessionId: string, title: string) => {
    setSessions((prev) => {
      const exists = prev.some((s) => s.sessionId === sessionId);
      if (exists) return prev;
      return [{ sessionId, title }, ...prev];
    });
  };

  // ✅ RENAME SESSION
  const handleRenameSession = (sessionId: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.sessionId === sessionId ? { ...s, title } : s))
    );
  };

  // ✅ DELETE SESSION
  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        user={user}
        sessions={sessions}
        activeSessionId={null} // Will be managed by routes
        onSelectSession={() => {}} // Navigation handled by Link in Sidebar
        onNewChat={() => {}} // Navigation handled by Link in Sidebar
        onLogout={onLogout}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        taskCount={taskCount}
        usage={usage}
        usageLoading={usageLoading}
      />

      <main className={`flex-1 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"}`}>
        <Routes>
          {/* ✅ LANDING/HOME - Shows welcome or redirects to new chat */}
          <Route path="/" element={<LandingPage />} />

          {/* ✅ NEW CHAT */}
          <Route path="/new" element={
            <ChatLayoutWrapper
              user={user}
              isNew={true}
              onFirstAnswer={addSessionIfMissing}
              usage={usage}
              setUsage={setUsage}
            />
          } />

          {/* ✅ EXISTING CHAT */}
          <Route path="/c/:sessionId" element={
            <ChatLayoutWrapper
              user={user}
              isNew={false}
              onFirstAnswer={addSessionIfMissing}
              usage={usage}
              setUsage={setUsage}
            />
          } />

          {/* ✅ TASKS */}
          <Route path="/tasks" element={<TasksPage user={user} />} />

          {/* ✅ KNOWLEDGE SOURCES (Authorized Only) */}
          <Route path="/knowledge-sources" element={
            user.CONTENT_AUTHORIZATION === "Y" 
              ? <KnowledgeSources currentUser={user} />
              : <Navigate to="/" replace />
          } />

          {/* ✅ USERS (Admin Only) */}
          <Route path="/users" element={
            user.role?.toLowerCase() === "admin"
              ? <UsersPage currentUser={user} />
              : <Navigate to="/" replace />
          } />

          {/* ✅ CATCH ALL */}
          <Route path="*" element={<Navigate to="/new" replace />} />
        </Routes>
      </main>
    </div>
  );
}

// ✅ WRAPPER TO HANDLE URL PARAMS + NEW CHAT LOGIC
function ChatLayoutWrapper({
  user,
  isNew,
  onFirstAnswer,
  usage,
  setUsage,
}: {
  user: LoginUser;
  isNew: boolean;
  onFirstAnswer: (sessionId: string, title: string) => void;
  usage: UserUsage | null;
  setUsage: (u: UserUsage) => void;
}) {
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  // ✅ For /new route, generate a temporary ID
  const [tempSessionId] = useState(() => isNew ? `temp-${Date.now()}` : null);
  const sessionId = isNew ? tempSessionId! : urlSessionId!;

  // ✅ Callback after first message on /new
  const handleFirstAnswer = (actualSessionId: string, title: string) => {
    if (isNew) {
      // ✅ Update URL from /new to /c/{sessionId}
      navigate(`/c/${actualSessionId}`, { replace: true });
    }
    onFirstAnswer(actualSessionId, title);
  };

  return (
    <ChatLayout
      user={user}
      sessionId={sessionId}
      isNewChat={isNew}
      onFirstAnswer={handleFirstAnswer}
      usage={usage}
      setUsage={setUsage}
    />
  );
}