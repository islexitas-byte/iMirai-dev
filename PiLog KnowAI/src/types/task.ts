/* =========================
   TASK TYPES (BACKEND DRIVEN)
   ========================= */

export type TaskType = "Harmonisation Task" | "Insights Task";

/* =========================
   OVERALL TASK STATUS
   ========================= */

export type OverallTaskStatus =
  | "In Progress"
  | "Completed"
  | "Failed";

/* =========================
   STEP STATUS (INSIGHTS)
   ========================= */

export type StepStatus =
  | "Completed"
  | "In Progress";

/* =========================
   TASK MODEL
   ========================= */

export type Task = {
  /* COMMON */
  "Task ID": string;
  "Task Name": string;
  "Task Type": TaskType;
  "Date Time": string;
  "Status": "In Progress" | "Completed" | "Failed";

  /* HARMONISATION TASK */
  "Total Records"?: number;
  "In Progress"?: number;
  "Completed"?: number;
  "Failed"?: number;

  /* INSIGHTS TASK */
  "Data Loaded"?: "Completed" | "In Progress";
  "Data Analysed"?: "Completed" | "In Progress";
  "Data Insights Generated"?: "Completed" | "In Progress";
};
