import React from "react";
import { API_CONFIG } from "../config/api";

// const BACKEND_BASE_URL = "http://localhost:8000";
const {BACKEND_BASE_URL} = API_CONFIG;


export type LoginUser = {
  id?: string;
  name: string;
  username: string;
  email?: string;
  CONTENT_AUTHORIZATION: "Y" | "N";
};


export default function LoginPage({
  onSuccess,
}: {
  onSuccess: (u: LoginUser) => void;
}) {
  const [mode, setMode] = React.useState<"login" | "register">("login");

  const [name, setName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [email, setEmail] = React.useState("");

  const [showPw, setShowPw] = React.useState(false);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const url =
        mode === "login"
          ? `${BACKEND_BASE_URL}/auth/login`
          : `${BACKEND_BASE_URL}/auth/register`;

      const body =
        mode === "login"
          ? new URLSearchParams({ username, password }).toString()
          : new URLSearchParams({
              name,
              username,
              password,
              email,
            }).toString();

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();

      // ✅ LOGIN SUCCESS
      if (mode === "login") {
        const user: LoginUser = {
          name: data.name,
          username: data.username,
          CONTENT_AUTHORIZATION: data.CONTENT_AUTHORIZATION,
          
        };

        // ✅ PERSIST USER
        localStorage.setItem("user", JSON.stringify(user));

        onSuccess(user);

      }

      // ✅ REGISTER SUCCESS
      if (mode === "register") {
        setMode("login");
        setPassword("");
        setEmail("");
        setError("User registered successfully. Please sign in.");
      }
    } catch (err: any) {
      setError(err.message || "Request failed");
    } finally {
      setBusy(false);
    }
  };
  
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* LEFT branding panel */}
      <div className="hidden lg:flex flex-col items-center justify-center border-r p-10">
        <img
          src="iMirAI_LOGO_CO-Pilot 1.png"
          alt="Company Logo"
          className="h-16 w-auto object-contain"
        />
        <h1 className="mt-4 text-3xl font-semibold">
          {mode === "login" ? "" : ""}
        </h1>
        <p className="text-sm text-gray-500 mt-2 max-w-sm text-center">
          {mode === "login"
            ? "Secure Access to PiLog Knowledge Base"
            : "Create an account to explore iMirAI and structured enterprise data."}
        </p>
      </div>

      {/* RIGHT form panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-semibold">
            {mode === "login" ? "Sign in" : "Register"}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {mode === "login"
              ? "Enter your username and password."
              : "Create a new user account."}
          </p>

          <form onSubmit={submit} className="mt-4 space-y-4">
            {/* Name (register only) */}
            {mode === "register" && (
              <>
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Full name
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                    placeholder="john.doe@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                type="text"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                placeholder="your.username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  type={showPw ? "text" : "password"}
                  className="w-full rounded-xl border px-3 py-2 text-sm pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-600 hover:text-gray-900"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-gray-900 text-white px-4 py-2 text-sm hover:bg-black disabled:opacity-60"
            >
              {busy
                ? mode === "login"
                  ? "Signing in…"
                  : "Registering…"
                : mode === "login"
                ? "Sign in"
                : "Create account"}
            </button>
          </form>

          {/* TOGGLE */}
          <div className="mt-4 text-center text-sm">
            {mode === "login" ? (
              <>
                Don’t have an account?{" "}
                <button
                  onClick={() => setMode("register")}
                  className="text-gray-900 font-medium hover:underline"
                >
                  Register
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-gray-900 font-medium hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
