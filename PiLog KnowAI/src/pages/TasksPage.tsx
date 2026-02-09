import { useEffect, useRef, useState } from "react";
import TaskCard from "../components/TaskCard";
import type { Task } from "../types/task";
import { API_CONFIG } from "../config/api";
import type { LoginUser } from "./LoginPage";
import { Calendar as CalendarIcon, X } from "lucide-react";

const POLL_INTERVAL = 7000;

export default function TasksPage({ user }: { user: LoginUser }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const pollingRef = useRef<number | null>(null);
  const [activeTab, setActiveTab] = useState<"Harmonisation Task" | "Insights Task">("Harmonisation Task");
  
  // Date Range States
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/tasks-list?username=${user.username}`);
      const data: Task[] = await res.json();
      setTasks(data);

      const allCompleted = data.length > 0 && data.every((t) => t["Status"] === "Completed");
      if (allCompleted && pollingRef.current !== null) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    }
  };

  useEffect(() => {
    fetchTasks();
    pollingRef.current = window.setInterval(fetchTasks, POLL_INTERVAL);
    return () => {
      if (pollingRef.current !== null) window.clearInterval(pollingRef.current);
    };
  }, []);

  // Filtering Logic for Tabs and Date Range
  const filteredTasks = tasks.filter((t) => {
    const matchesTab = t["Task Type"] === activeTab;
    if (!matchesTab) return false;

    if (!fromDate && !toDate) return true;

    // Parse the task date (Assuming format from task.ts is ISO or compatible)
    const taskDate = new Date(t["Date Time"]).getTime();
    
    if (fromDate) {
      const start = new Date(fromDate).setHours(0, 0, 0, 0);
      if (taskDate < start) return false;
    }

    if (toDate) {
      const end = new Date(toDate).setHours(23, 59, 59, 999);
      if (taskDate > end) return false;
    }

    return true;
  });

  const resetDates = () => {
    setFromDate("");
    setToDate("");
  };

  return (
    <div className="h-full w-full bg-slate-50 flex flex-col">
      {/* HEADER CONTROLS */}
      <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-6 border-b border-slate-200 bg-white">
        
        {/* IMPROVED TOGGLE SWITCHER */}
        <div className="relative inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
          <div
            className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-transform duration-300 ease-out ${
              activeTab === "Harmonisation Task" ? "translate-x-0" : "translate-x-full"
            }`}
          />
          <button
            onClick={() => setActiveTab("Harmonisation Task")}
            className={`relative z-10 px-6 py-2 text-sm font-semibold transition-colors min-w-[140px] ${
              activeTab === "Harmonisation Task" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Harmonisation
          </button>
          <button
            onClick={() => setActiveTab("Insights Task")}
            className={`relative z-10 px-6 py-2 text-sm font-semibold transition-colors min-w-[140px] ${
              activeTab === "Insights Task" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Insights
          </button>
        </div>

        {/* DATE RANGE FILTER */}
        <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 px-2">
            <CalendarIcon size={16} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-500 tracking-wider">Range</span>
          </div>
          
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-white border border-slate-300 rounded-md px-2 py-1 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <span className="text-slate-400 text-sm">to</span>
          
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-white border border-slate-300 rounded-md px-2 py-1 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          />

          {(fromDate || toDate) && (
            <button 
              onClick={resetDates}
              className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
              title="Clear Dates"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-4 max-w-5xl mx-auto">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
              <CalendarIcon size={40} className="mb-4 opacity-20" />
              <p className="text-sm font-medium">No tasks found for this period</p>
              <button onClick={resetDates} className="mt-2 text-blue-600 text-xs hover:underline">Clear filters</button>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <TaskCard 
              key={task["Task ID"]} 
              task={task} 
              onRefresh={fetchTasks} // Pass the fetch function here
            />
            ))
          )}
        </div>
      </div>
    </div>
  );
}