import { API_CONFIG } from "../config/api";

export type ChatSessionSummary = {
  session_id: string;
  title: string;
  last_message_preview: string;
  updated_at: string;
};
const {BACKEND_BASE_URL} = API_CONFIG;

export async function fetchChatSessions(username: string) {
  const res = await fetch(
    `${BACKEND_BASE_URL}/chat/sessions?username=${username}`
  );

  if (!res.ok) {
    throw new Error("Failed to load chat sessions");
  }

  return res.json() as Promise<{ sessions: ChatSessionSummary[] }>;
}

export async function fetchChatSession(sessionId: string) {
  const res = await fetch(
    `${BACKEND_BASE_URL}/chat/session/${sessionId}`
  );

  if (!res.ok) {
    throw new Error("Failed to load chat session");
  }

  return res.json();
}
export async function fetchSessionTitle(
  username: string,
  sessionId: string
): Promise<{ title: string }> {
  const res = await fetch(
    `${BACKEND_BASE_URL}/session/title?username=${username}&session_id=${sessionId}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch session title");
  }

  return res.json();
}

export async function renameSession(
  name: string,
  username: string,
  sessionId: string
) {
  const form = new FormData();
  form.append("name", name);
  form.append("username", username);
  form.append("session_id", sessionId);

  const res = await fetch(`${BACKEND_BASE_URL}/session/rename`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error("Rename session failed");
  }

  return res.json();
}

export async function deleteSession(
  username: string,
  sessionId: string
) {
  const form = new FormData();
  form.append("username", username);
  form.append("session_id", sessionId);

  const res = await fetch(`${BACKEND_BASE_URL}/session/delete`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error("Delete session failed");
  }

  return res.json();
}
