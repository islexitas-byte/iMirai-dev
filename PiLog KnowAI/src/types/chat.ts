export type Message = {
  role: "user" | "assistant";
  html: string;
  files?: File[]; // Ensure this exists
  timestamp?: string;
  suggested_next?:string[];
};