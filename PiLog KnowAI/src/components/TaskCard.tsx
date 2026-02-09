import {
  FileText,
  BarChart3,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  Eye,
  X,
  MoreVertical,
  Pencil,
  Trash2,
  Check
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { API_CONFIG } from "../config/api";
import type { Task, OverallTaskStatus } from "../types/task";

/* ================== MAIN COMPONENT ================== */
function downloadResult(taskId: string) {
  const url = `${API_CONFIG.BACKEND_BASE_URL}/task/download/${taskId}`;
  window.open(url, "_blank");
}

export default function TaskCard({ task, onRefresh }: { task: Task; onRefresh: () => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(task["Task Name"]);
  const menuRef = useRef<HTMLDivElement>(null);

  const isInsights = task["Task Type"] === "Insights Task";
  const HeaderIcon = isInsights ? BarChart3 : FileText;

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRename = async () => {
    try {
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/tasks/rename/${task["Task ID"]}?newName=${encodeURIComponent(newName)}`, {
        method: 'POST'
      });
      if (res.ok) {
        setIsEditing(false);
        onRefresh(); // Trigger parent refresh
      }
    } catch (err) {
      console.error("Rename failed", err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/tasks/delete/${task["Task ID"]}`, {
        method: 'DELETE'
      });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3 transition-all hover:border-slate-300">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className={`p-2 rounded-lg ${isInsights ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'}`}>
              <HeaderIcon size={20} />
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    className="text-sm font-semibold text-slate-900 border-b border-blue-500 outline-none w-full bg-slate-50 px-1"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                  />
                  <button onClick={handleRename} className="text-emerald-600"><Check size={16}/></button>
                  <button onClick={() => setIsEditing(false)} className="text-red-500"><X size={16}/></button>
                </div>
              ) : (
                <h3 
                  className="text-sm font-semibold text-slate-900 cursor-pointer hover:text-blue-600 flex items-center gap-2"
                  onClick={() => setIsEditing(true)}
                >
                  {task["Task Name"]}
                  <Pencil size={12} className="opacity-0 group-hover:opacity-100 text-slate-400" />
                </h3>
              )}
              <p className="text-xs text-slate-500">{task["Date Time"]}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={task["Status"]} />
            
            {/* THREE DOT MENU */}
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
              >
                <MoreVertical size={18} />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
                  {task["Status"] === "Completed" && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        isInsights ? setIsModalOpen(true) : downloadResult(task["Task ID"]);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      {isInsights ? <Eye size={14}/> : <Download size={14}/>}
                      {isInsights ? "View Insights" : "Download Result"}
                    </button>
                  )}
                  
                  <button
                    onClick={() => { setShowMenu(false); setIsEditing(true); }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Pencil size={14} /> Rename Task
                  </button>
                  
                  <div className="border-t border-slate-100 my-1"></div>
                  
                  <button
                    onClick={() => { setShowMenu(false); handleDelete(); }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Delete Task
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BODY (Same as before) */}
        {!isInsights ? (
          <div className="grid grid-cols-4 gap-4 text-sm">
            <Metric label="Total" value={task["Total Records"] ?? 0} />
            <Metric label="In Progress" value={task["In Progress"] ?? 0} />
            <Metric label="Completed" value={task["Completed"] ?? 0} />
            <Metric label="Failed" value={task["Failed"] ?? 0} variant="error" />
          </div>
        ) : (
          <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <Step label="Data Loaded" status={task["Data Loaded"]} />
            <Step label="Data Analysed" status={task["Data Analysed"]} />
            <Step label="Insights Generated" status={task["Data Insights Generated"]} />
          </div>
        )}
      </div>

      {isModalOpen && (
        <InsightsModal 
          taskId={task["Task ID"]} 
          taskName={task["Task Name"]} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </>
  );
}

/* ================== MODAL COMPONENT ================== */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-800 mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}


function InsightsModal({ taskId, taskName, onClose }: { taskId: string, taskName: string, onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_CONFIG.BACKEND_BASE_URL}/show/insights/${taskId}`)
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [taskId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-slate-800">{taskName}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
              <p className="text-slate-500 text-sm">Fetching generated insights...</p>
            </div>
          ) : data ? (
            <div className="space-y-6 text-sm text-slate-700">

              {data.summary && (
                <Section title="Summary">
                  <p>{data.summary}</p>
                </Section>
              )}

              {Array.isArray(data.key_findings) && data.key_findings.length > 0 && (
                <Section title="Key Findings">
                  <ul className="list-disc pl-5 space-y-1">
                    {data.key_findings.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </Section>
              )}

              {Array.isArray(data.trends) && data.trends.length > 0 && (
                <Section title="Trends">
                  <ul className="list-disc pl-5 space-y-1">
                    {data.trends.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </Section>
              )}

              {Array.isArray(data.reasons_insights) && data.reasons_insights.length > 0 && (
                <Section title="Reasons & Insights">
                  <ul className="list-disc pl-5 space-y-1">
                    {data.reasons_insights.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </Section>
              )}

              {Array.isArray(data.recommendations) && data.recommendations.length > 0 && (
                <Section title="Recommendations">
                  <ul className="list-disc pl-5 space-y-1">
                    {data.recommendations.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </Section>
              )}

            </div>
          ) : (
            <p className="text-center text-slate-500 py-12">No insight data available.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================== HELPERS ================== */

function Metric({ label, value, variant }: { label: string; value: number; variant?: "error"; }) {
  return (
    <div className={`rounded-lg p-2 text-center ${variant === "error" ? "bg-red-50 text-red-700 border border-red-100" : "bg-slate-50 text-slate-800 border border-slate-100"}`}>
      <div className="text-[10px] tracking-wider font-bold opacity-60 mb-1">{label}</div>
      <div className="text-base font-bold">{value}</div>
    </div>
  );
}

function Step({ label, status }: { label: string; status?: "Completed" | "In Progress"; }) {
  const Icon = status === "Completed" ? CheckCircle : Loader2;
  return (
    <div className="flex items-center gap-3 text-sm py-1">
      <Icon size={18} className={status === "Completed" ? "text-emerald-500" : "text-slate-400 animate-spin"} />
      <span className={status === "Completed" ? "text-slate-700 font-medium" : "text-slate-500"}>{label}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: OverallTaskStatus }) {
  const config = {
    "Completed": { icon: CheckCircle, class: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    "In Progress": { icon: Clock, class: "bg-blue-50 text-blue-700 border-blue-100" },
    "Failed": { icon: XCircle, class: "bg-red-50 text-red-700 border-red-100" }
  };
  const { icon: Icon, class: className } = config[status] || config["In Progress"];

  return (
    <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${className}`}>
      <Icon size={14} />
      {status}
    </div>
  );
}