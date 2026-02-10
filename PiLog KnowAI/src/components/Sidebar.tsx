import { useEffect, useRef, useState } from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  SquarePen,
  Settings,
  LogOut,
  ListChecks,
  ExternalLink,
  Mail,
  Copy,
  Check,
  X,
  Users,
  AlertTriangle,
  Coins,
} from "lucide-react";
import type { LoginUser } from "../pages/LoginPage";
import type { ChatSession } from "../App";
import { Pencil, Trash2, Search, MessageSquare, Database } from "lucide-react";
import { renameSession, deleteSession } from "../api/chatHistory";
import ModalPortal from "./ModalPortal";
import { useLocation, useNavigate } from "react-router-dom";

type UserUsage = {
  credits: number;
  used: number;
  limit: number;
};

export default function Sidebar({
  collapsed,
  setCollapsed,
  user,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onLogout,
  onRenameSession,
  onDeleteSession,
  taskCount,
  usage,
  usageLoading,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  user: LoginUser;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onLogout: () => void;
  onRenameSession: (id: string, title: string) => void;
  onDeleteSession: (id: string) => void;
  taskCount: number;
  usage: UserUsage | null;
  usageLoading: boolean;
}) {
  const [showProfileCard, setShowProfileCard] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const avatarLetter = user.name?.charAt(0).toUpperCase();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const isKnowledgePage = location.pathname === "/knowledge-sources";
  const isTasksPage = location.pathname === "/tasks";
  const isChatPage = location.pathname === "/";
  const [showContactModal, setShowContactModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const contactEmail = "meeting.insights@piloggroup.com";
  const navigate = useNavigate();
  const isAdmin = user.role?.toLowerCase() === "admin";

  const creditsLeft = usage?.credits ?? 0;
  const totalCredits = usage?.limit ?? 0;
  const creditPercent =
    totalCredits > 0 ? Math.round((creditsLeft / totalCredits) * 100) : 0;

  const sidebarButtonClass = `
    mt-1 w-full h-10 flex items-center
    rounded-md text-sm font-medium
    transition
  `;

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(contactEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  type SidebarTooltipProps = {
    show: boolean;
    text: string;
    className?: string;
  };

  const SidebarTooltip = ({
    show,
    text,
    className = "",
  }: SidebarTooltipProps) => {
    if (!show) return null;

    return (
      <div
        className={`absolute left-full top-1/2 -translate-y-1/2 ml-2
                    whitespace-nowrap rounded-md bg-slate-900 px-2 py-1
                    text-xs text-white opacity-0 group-hover:opacity-100
                    transition pointer-events-none z-50
                    ${className}`}
      >
        {text}
      </div>
    );
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveRename = async (sessionId: string) => {
    if (!editValue.trim()) {
      cancelRename();
      return;
    }

    await renameSession(editValue, user.username, sessionId);
    onRenameSession(sessionId, editValue);
    cancelRename();
  };

  const handleDeleteSession = async (sessionId: string) => {
    setDeletingId(sessionId);
    await deleteSession(user.username, sessionId);
    onDeleteSession(sessionId);
    setDeleteConfirmId(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Ignore clicks on toggle button
      if (toggleRef.current?.contains(target)) return;

      // Close if click is outside the card
      if (profileRef.current && !profileRef.current.contains(target)) {
        setShowProfileCard(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function highlightMatch(text: string, query: string) {
    if (!query) return text;

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "ig");

    return text.split(regex).map((part, i) =>
      regex.test(part) ? (
        <span
          key={i}
          className="bg-slate-200 text-slate-900 font-medium rounded px-0.5"
        >
          {part}
        </span>
      ) : (
        part
      ),
    );
  }

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-white border-r border-slate-200
        flex flex-col transition-all duration-300
        z-[100]
        ${collapsed ? "w-20" : "w-64"}
      `}
    >
      {/* ===== HEADER ===== */}
      <div className="p-3 border-b border-slate-200">
        <div className="relative group flex items-center h-10 gap-2">
          {/* LOGO */}
          <img
            src={collapsed ? "/iMirAI-Logo1.png" : "/iMirAI_LOGO_CO-Pilot 1.png"}
            alt="Logo"
            className={`h-8 w-auto shrink-0 select-none transition-opacity duration-200
              ${collapsed ? "group-hover:opacity-0 px-1" : ""}
            `}
          />

          {/* COLLAPSE BUTTON (expanded only) */}
          {!collapsed && (
            <div className="relative">
              <div
                className="absolute right-full top-1/2 -translate-y-1/2 mr-2
                 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1
                 text-xs text-white opacity-0 group-hover:opacity-100
                 transition pointer-events-none z-50"
              >
                Collapse sidebar
              </div>

              <button
                onClick={() => {
                  cancelRename();
                  setCollapsed(true);
                }}
                className="ml-auto h-8 w-8 flex items-center justify-center
                 rounded-md text-slate-500 hover:bg-slate-100 transition"
              >
                <PanelLeftClose size={18} />
              </button>
            </div>
          )}

          {/* EXPAND BUTTON (collapsed + hover only) */}
          {collapsed && (
            <>
              <div
                className="absolute left-full top-1/2 -translate-y-1/2 ml-2
                 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1
                 text-xs text-white opacity-0 group-hover:opacity-100
                 transition pointer-events-none z-50"
              >
                Expand sidebar
              </div>

              <button
                onClick={() => {
                  cancelRename();
                  setCollapsed(false);
                }}
                className="absolute inset-0 opacity-0 group-hover:opacity-100
                 ml-auto h-8 w-8 flex items-center justify-center
                 rounded-md text-slate-500 hover:bg-slate-100 transition"
              >
                <PanelLeftOpen size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ===== NAVIGATION ===== */}
      <div className={`py-2 space-y-1 ${collapsed ? "" : "px-3"}`}>
        {/* NEW CHAT */}
        <div className="relative group">
          <SidebarTooltip show={collapsed} text="New chat" />
          <button
            onClick={() => {
              onNewChat();
              navigate("/new");
            }}
            className={`${sidebarButtonClass}
              ${collapsed ? "justify-start px-5" : "justify-start gap-2"}
              text-slate-700 hover:bg-slate-100`}
          >
            <SquarePen size={20} className="shrink-0 text-slate-600" />
            {!collapsed && <span>New Chat</span>}
          </button>
        </div>

        {/* SEARCH */}
        <div className="relative group">
          <SidebarTooltip show={collapsed} text="Search conversations" />
          <button
            onClick={() => {
              setSearchQuery("");
              setSearchOpen(true);
            }}
            className={`${sidebarButtonClass}
              ${collapsed ? "justify-start px-5" : "justify-start gap-2"}
              text-slate-700 hover:bg-slate-100`}
          >
            <Search size={20} className="shrink-0 text-slate-600" />
            {!collapsed && <span>Search Conversations</span>}
          </button>
        </div>

        {/* KNOWLEDGE SOURCES */}
        <div className="relative group">
          <SidebarTooltip show={collapsed} text="Knowledge sources" />
          <button
            onClick={() => navigate("/knowledge-sources")}
            className={`${sidebarButtonClass}
              ${collapsed ? "justify-start px-5" : "justify-start gap-2"}
              ${
                isKnowledgePage
                  ? "bg-slate-200 text-slate-900"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
          >
            <Database size={20} className="shrink-0 text-slate-600" />
            {!collapsed && <span>Knowledge Sources</span>}
          </button>
        </div>

        <button
          onClick={() =>
            window.open("https://pilogcloud.sharepoint.com/sites/SalesandPreSales?e=1%3A26d65cbed9ce46beb083c767b2ee7595", "_blank", "noopener,noreferrer")
          }
          className={`${sidebarButtonClass}
              ${collapsed ? "justify-start px-5" : "justify-start gap-2"}
              text-slate-700 hover:bg-slate-100`}
        >
          <ExternalLink size={18} className="shrink-0 text-slate-600" />
          {!collapsed && <span>SharePoint</span>}
        </button>

        {/* TASKS */}
        <div className="relative group">
          <SidebarTooltip show={collapsed} text="Tasks" />
          <button
            onClick={() => navigate("/tasks")}
            className={`${sidebarButtonClass}
              ${collapsed ? "justify-start px-5" : "justify-start gap-2"}
              ${
                isTasksPage
                  ? "bg-slate-200 text-slate-900"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
          >
            <ListChecks size={20} className="shrink-0 text-slate-600" />
            {!collapsed && (
              <div className="flex items-center justify-between flex-1">
                <span>Tasks</span>
                {taskCount > 0 && (
                  <span
                    className="min-w-[20px] h-5 flex items-center justify-center
                      rounded-full bg-slate-800 text-white text-xs font-semibold px-1"
                  >
                    {taskCount}
                  </span>
                )}
              </div>
            )}
          </button>
        </div>

        {/* CONTACT US */}
        <div className="relative group">
          <SidebarTooltip show={collapsed} text="Contact us" />
          <button
            onClick={() => setShowContactModal(true)}
            className={`${sidebarButtonClass}
              ${collapsed ? "justify-start px-5" : "justify-start gap-2"}
              text-slate-700 hover:bg-slate-100`}
          >
            <Mail size={20} className="shrink-0 text-slate-600" />
            {!collapsed && <span>Contact Us</span>}
          </button>
        </div>
      </div>

      {/* ===== CHAT HISTORY ===== */}
      <div className={`flex-1 overflow-y-auto py-2 space-y-1 ${collapsed ? "" : "px-3"}`}>
        {!collapsed && sessions.length > 0 && (
          <h3 className="text-xs font-semibold text-slate-400 mb-2">
            Your Conversations
          </h3>
        )}

        {sessions.map((s) => {
          const isEditing = editingId === s.sessionId;
          const isDeleting = deletingId === s.sessionId;

          return (
            <div
              key={s.sessionId}
              className={`
                group w-full h-9 flex items-center rounded-lg text-sm
                transition-all duration-200
                ${collapsed ? "" : "gap-2"}
                ${
                  isDeleting
                    ? "opacity-0 scale-95"
                    : isChatPage && activeSessionId === s.sessionId
                      ? "bg-slate-100 text-slate-900"
                      : "hover:bg-slate-100 text-slate-600"
                }
              `}
            >
              <button
                onClick={() => {
                  cancelRename();
                  onSelectSession(s.sessionId);
                  navigate(`/c/${s.sessionId}`);
                }}
                className={`flex-1 flex items-center gap-2 text-left min-w-0 ${collapsed ? "justify-center" : ""}`}
                disabled={isEditing}
              >
                <MessageSquare
                  size={20}
                  className={`shrink-0 ${
                    activeSessionId === s.sessionId
                      ? "text-slate-700"
                      : "text-slate-500"
                  }`}
                />
                {!collapsed && !isEditing && (
                  <span className="truncate">{s.title}</span>
                )}
              </button>

              {/* RENAME INPUT */}
              {!collapsed && isEditing && (
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="flex-1 text-sm border border-slate-300 rounded px-2 py-1"
                  autoFocus
                  onBlur={() => saveRename(s.sessionId)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      await saveRename(s.sessionId);
                    }
                    if (e.key === "Escape") {
                      cancelRename();
                    }
                  }}
                />
              )}

              {/* ACTION MENU */}
              {!collapsed && !isEditing && (
                <div
                  className="flex gap-1 w-12 justify-end
                    opacity-0 group-hover:opacity-100 transition"
                >
                  <button
                    onClick={() => {
                      setEditingId(s.sessionId);
                      setEditValue(s.title);
                    }}
                    title="Rename"
                    className="p-1 hover:bg-slate-200 rounded"
                  >
                    <Pencil size={14} />
                  </button>

                  <button
                    onClick={() => setDeleteConfirmId(s.sessionId)}
                    title="Delete"
                    className="p-1 hover:bg-red-100 text-red-600 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ===== USER FOOTER ===== */}
      <div className="relative z-10 bg-white border-t border-slate-200 overflow-visible">
          <button
            ref={toggleRef}
            onClick={() => setShowProfileCard((v) => !v)}
            className={`w-full h-14 flex items-center rounded-lg
            transition hover:bg-slate-100
            ${collapsed ? "justify-start px-4" : "justify-start gap-3 px-2"}
          `}
          >

          <div className="h-8 w-8 shrink-0 rounded-full bg-slate-600 text-white
                flex items-center justify-center font-semibold">
            {avatarLetter}
          </div>
          {showProfileCard && (
              <div
                ref={profileRef}
                className={`absolute bg-white border border-slate-200
                  rounded-xl shadow-xl p-3
                  z-[200]
                  ${collapsed
                    ? "left-20 bottom-4 w-72"
                    : "left-3 right-3 bottom-20"}
                `}
              >
              {/* USER INFO */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-slate-700 text-white flex items-center justify-center font-semibold">
                  {user.name?.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate text-left">
                    @{user.username}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 my-2" />
                {/* USERS */}
                {isAdmin && (
                <>
                  <button
                    onClick={() => {
                      navigate("/users");
                      setShowProfileCard(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md
                              text-sm text-slate-700 hover:bg-slate-100 transition"
                  >
                    <Users size={16} className="text-slate-600" />
                    <span>Users</span>
                  </button>
  
                  <div className="border-t border-slate-200 my-2" />
                </>
              )}
              {/* ===== CREDIT METER UI ===== */}
              <div
                className={`px- py-3 ${
                  collapsed ? "" : ""
                }`}
              >
                <div
                  className="rounded-lg bg-slate-50 border border-slate-200 p-3"
                  title={`Credits left: ${creditsLeft} / ${totalCredits}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Coins size={16} className="text-slate-600" />
                      Credits
                    </div>

                    <span className="text-sm font-semibold text-slate-800">
                      {usageLoading ? "…" : `${creditsLeft}/${totalCredits}`}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        creditsLeft <= 3 ? "bg-red-500" : "bg-slate-700"
                      }`}
                      style={{ width: `${creditPercent}%` }}
                    />
                  </div>

                  {creditsLeft <= 3 && !usageLoading && (
                    <p className="mt-2 text-xs text-red-600 font-medium">
                      Low credits remaining
                    </p>
                  )}
                </div>
              </div>
              {/* SETTINGS */}
              <button
                onClick={() => {
                  setShowSettings(true);
                  setShowProfileCard(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md
                          text-sm text-slate-700 hover:bg-slate-100 transition"
              >
                <Settings size={16} className="text-slate-600" />
                <span>Settings</span>
              </button>

              {/* LOGOUT */}
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md
                          text-sm text-red-600 hover:bg-red-50 transition"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}

          {!collapsed && (
            <span className="text-sm font-medium text-slate-700 truncate">
              {user.name}
            </span>
          )}
        </button>      
      </div>

      {/* ===== SEARCH MODAL ===== */}
      {searchOpen && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[9999] bg-black/40
                      flex items-center justify-center"
            onClick={() => setSearchOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-xl
                        shadow-xl p-4"
            >
              {/* HEADER */}
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-slate-800">
                  Search Conversations
                </h3>
              </div>

              {/* SEARCH INPUT */}
              <div className="relative mb-3">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  autoFocus
                  placeholder="Search conversations by title…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-300
                            pl-9 pr-3 py-2 text-sm
                            focus:outline-none focus:ring-2
                            focus:ring-slate-400"
                />
              </div>

              {/* RESULTS */}
              <div className="max-h-64 overflow-y-auto space-y-1">
                {(searchQuery ? filteredSessions : sessions).length === 0 && (
                  <div className="text-sm text-slate-500 py-4 text-center">
                    No chats found
                  </div>
                )}

                {(searchQuery ? filteredSessions : sessions).map((s) => (
                  <button
                    key={s.sessionId}
                    onClick={() => {
                      onSelectSession(s.sessionId);
                      setSearchOpen(false);
                      navigate(`/c/${s.sessionId}`);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md
                              text-sm text-slate-700
                              hover:bg-slate-100 transition"
                  >
                    {highlightMatch(s.title, searchQuery)}
                  </button>
                ))}
              </div>

              {/* FOOTER */}
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => setSearchOpen(false)}
                  className="text-sm text-slate-600 hover:underline"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ===== SETTINGS MODAL ===== */}
      {showSettings && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center"
            onClick={() => setShowSettings(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-md rounded-xl shadow-xl p-6"
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Account Settings
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    Name
                  </label>
                  <input
                    value={user.name}
                    disabled
                    className="w-full border rounded-md px-3 py-2 text-sm bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    Username
                  </label>
                  <input
                    value={user.username}
                    disabled
                    className="w-full border rounded-md px-3 py-2 text-sm bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value="********"
                    disabled
                    className="w-full border rounded-md px-3 py-2 text-sm bg-slate-100"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 rounded-md bg-slate-800 text-white hover:bg-slate-900"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ===== CONTACT MODAL ===== */}
      {showContactModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
              {/* Modal Header */}
              <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800">
                  Contact Support
                </h3>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail size={32} />
                </div>
                <p className="text-slate-600 text-sm mb-6">
                  Have questions or need assistance? Reach out to our team at:
                </p>

                {/* Email Display & Copy Box */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 mb-2">
                  <span className="flex-1 text-blue-600 font-medium truncate select-all">
                    {contactEmail}
                  </span>
                  <button
                    onClick={handleCopyEmail}
                    className={`p-2 rounded-lg transition-all ${
                      copied
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-100"
                    }`}
                    title="Copy Email"
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
                {copied && (
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                    Copied to clipboard!
                  </p>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t flex justify-end">
                <button
                  onClick={() => setShowContactModal(false)}
                  className="px-6 py-2 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 transition-all active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      {deleteConfirmId && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4"
            onClick={() => setDeleteConfirmId(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Delete Conversation?
                </h3>
              </div>

              {/* Body */}
              <div className="px-6 py-4">
                <p className="text-sm text-slate-600">
                  Are you sure you want to delete this conversation? This action
                  cannot be undone and the conversation will be permanently
                  removed.
                </p>
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {sessions.find((s) => s.sessionId === deleteConfirmId)
                      ?.title || "Untitled"}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteSession(deleteConfirmId)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </aside>
  );
}