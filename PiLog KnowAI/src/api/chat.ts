import { API_CONFIG } from "../config/api";
import type { LoginUser } from "../pages/LoginPage";

export type AskResponse = {
  answer: string;
  preview_html?: string;
  suggested_next?: string[];
  usage: Record<string, string>;
  sessionId: string; // ✅ NOW REQUIRED FROM BACKEND
};

const { BACKEND_BASE_URL } = API_CONFIG;

export type AskRequest = {
  question: string;
  sessionId?: string;
  username: string;
  files?: File[];
  user?: LoginUser;
};

export type ChatAttachment = {
  name: string;
  type: string;
};

export type Message = {
  role: "user" | "assistant";
  content: React.ReactNode;
  attachments?: ChatAttachment[];
};

export async function askQuestion({
  question,
  sessionId,
  username,
  user,
  files = [],
}: AskRequest): Promise<AskResponse> {
  const form = new FormData();
  const role = user?.role ?? "viewer";

  form.append("question", question);
  form.append("username", username);

  if (sessionId) {
    form.append("sessionId", sessionId);
  }

  files.forEach((file) => {
    form.append("File", file);
  });

  const url = `${API_CONFIG.BACKEND_BASE_URL}/ask?role=${encodeURIComponent(role)}`;

  const res = await fetch(url, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

export async function saveFeedback(payload: {
  question: string;
  thumbsUp: boolean;
  percentage: number;
  sessionId?: string;
  reason?: string;
}) {
  const res = await fetch(`${BACKEND_BASE_URL}/save-feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question: payload.question,
      Thumbs_up: payload.thumbsUp ? "1" : "0",
      Thumbs_down: payload.thumbsUp ? "0" : "1",
      Percentage: String(payload.percentage),
      sessionId: payload.sessionId ?? null,
      reason: payload.reason ?? null,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to save feedback");
  }

  return res.json();
}

export type UserUsageResponse = {
  tokens_used: number;
  total_credits: number;
  credits_used: number;
  credits_left: number;
};

export async function getUserUsage(
  username: string
): Promise<UserUsageResponse> {
  const res = await fetch(
    `${BACKEND_BASE_URL}/credits/usage?username=${encodeURIComponent(username)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch user usage");
  }

  return res.json();
}