import { useEffect, useState } from "react";
import type { LoginUser } from "../pages/LoginPage";
import { API_CONFIG } from "../config/api";
const {BACKEND_BASE_URL} = API_CONFIG;
interface UserRow {
  name: string;
  username: string;
  role: string;
}

const ROLES = ["Viewer", "Editor", "Admin"];

export default function UsersPage({
  currentUser,
}: {
  currentUser: LoginUser;
}) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmData, setConfirmData] = useState<{
    name: string;
    username: string;
    oldRole: string;
    newRole: string;
  } | null>(null);

  /* ================= ADMIN CHECK (ROLE BASED) ================= */
  const isAdmin = currentUser.role?.toLowerCase() === "admin";

  /* ================= FETCH USERS ================= */
  useEffect(() => {
    fetch(`${BACKEND_BASE_URL}/user_role_details`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch users");
        return res.json();
      })
      .then((data: UserRow[]) =>
        setUsers(
          data.map((u) => ({
            ...u,
            role: u.role && u.role.trim() !== "" ? u.role : "viewer",
          }))
        )
      )
      .catch(() => setError("Unable to load user details"))
      .finally(() => setLoading(false));
  }, []);

  /* ================= REQUEST ROLE CHANGE ================= */
  const requestRoleChange = (
    name: string,
    username: string,
    oldRole: string,
    newRole: string
  ) => {
    if (oldRole === newRole) return;

    setConfirmData({
      name,
      username,
      oldRole,
      newRole,
    });
  };

  /* ================= CONFIRM ROLE CHANGE ================= */
  const confirmRoleChange = async () => {
    if (!confirmData) return;

    try {
      const formData = new FormData();
      formData.append("user_name", confirmData.username);
      formData.append("role", confirmData.newRole);

      const response = await fetch(
        `${BACKEND_BASE_URL}/user_role_update`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );

      if (!response.ok) throw new Error("Update failed");

      setUsers((prev) =>
        prev.map((u) =>
          u.username === confirmData.username
            ? { ...u, role: confirmData.newRole }
            : u
        )
      );
    } catch {
      alert("Unable to update role. Please try again later.");
    } finally {
      setConfirmData(null);
    }
  };

  /* ================= STATES ================= */
  if (loading) return <div className="p-6">Loading users…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">User Management</h1>

      <div className="bg-white border rounded-lg overflow-hidden">
        {/* TABLE HEADER */}
        <table className="w-full text-sm table-fixed">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left px-4 py-3 w-1/3">User</th>
              <th className="text-left px-4 py-3 w-1/3">Username</th>
              <th className="text-left px-4 py-3 w-1/3">Role</th>
            </tr>
          </thead>
        </table>

        {/* SCROLLABLE BODY */}
        <div className="max-h-screen overflow-y-auto">
          <table className="w-full text-sm table-fixed">
            <tbody>
              {users.map((u) => {
                const isSelf = u.username === currentUser.username;

                return (
                  <tr key={u.username} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-4">{u.name}</td>
                    <td className="px-4 py-4 font-mono">{u.username}</td>
                    <td className="px-4 py-4">
                      {isAdmin && !isSelf ? (
                        <select
                          value={u.role}
                          onChange={(e) =>
                            requestRoleChange(
                              u.name,
                              u.username,
                              u.role,
                              e.target.value
                            )
                          }
                          className="border rounded px-3 py-2 text-sm bg-white"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-xs font-medium">
                          {u.role}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= CONFIRMATION MODAL ================= */}
      {confirmData && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-3">
              Confirm Role Change
            </h2>

            <p className="text-sm mb-4 text-slate-700">
              Change role for <strong>{confirmData.name}</strong> (
              <span className="font-mono">@{confirmData.username}</span>)
              from <strong>{confirmData.oldRole}</strong> to{" "}
              <strong>{confirmData.newRole}</strong>?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmData(null)}
                className="px-4 py-2 text-sm hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={confirmRoleChange}
                className="px-4 py-2 text-sm bg-slate-800 text-white rounded hover:bg-slate-900"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
