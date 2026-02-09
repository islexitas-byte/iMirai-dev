import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { API_CONFIG } from "../config/api";

const { BACKEND_LOGIN_URL } = API_CONFIG;

const ADMIN_LIST = [
  "IMAD SYED",
  "ASIF AHMED",
  "SHOUKAT ALI",
  "PARDHA SARADHI",
  "SALEEM KHAN",
  "KESHAV MODUGU",
  "SASI KRISHNA",
  "KOTI AZMIRA",
  "ALLAPARTHI HARITHA",
  "SHAIK FATHIMUNNISA",
  "NAZIMA YASMEEN",
  "GOPI KRISHNA",
];

export type LoginUser = {
  id?: string;
  name: string;
  username: string;
  email?: string;
  CONTENT_AUTHORIZATION: "Y" | "N";
  role?: string;
};

export default function LoginPage({
  onSuccess,
}: {
  onSuccess: (u: LoginUser) => void;
}) {
  const location = useLocation();
  
  // ✅ DETERMINE MODE FROM URL
  const [mode, setMode] = React.useState<"login" | "register">(() => {
    return location.pathname === "/signup" ? "register" : "login";
  });

  const [name, setName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [organization, setOrganization] = React.useState("");
  const [otherOrganization, setOtherOrganization] = React.useState("");
  const [referredAdmin, setReferredAdmin] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const [signupSuccess, setSignupSuccess] = React.useState(false);
  const [activationSuccess, setActivationSuccess] = React.useState(false);

  const [showResend, setShowResend] = React.useState(false);
  const [resendMsg, setResendMsg] = React.useState("");

  /* ✅ SYNC MODE WITH URL */
  useEffect(() => {
    setMode(location.pathname === "/signup" ? "register" : "login");
  }, [location.pathname]);

  /* ✅ HANDLE ACTIVATION LINK */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("activated") === "true") {
      setMode("login");
      setSignupSuccess(false);
      setActivationSuccess(true);
    }
  }, []);

  const extractErrorMessage = async (res: Response) => {
    try {
      const data = await res.json();
      return data?.detail || "Request failed";
    } catch {
      return await res.text();
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setShowResend(false);
    setResendMsg("");
    setBusy(true);
    setSignupSuccess(false);
    setActivationSuccess(false);

    const isPilogMail = email.toLowerCase().endsWith("@piloggroup.com");

    /* 🔒 FRONTEND VALIDATIONS */
    if (mode === "register") {
      if (isPilogMail && organization === "Others") {
        setError(
          "You are using a PiLog email ID. Please select PiLog as organization."
        );
        setBusy(false);
        return;
      }

      if (organization === "PiLog" && !isPilogMail) {
        setError("Please provide PiLog organization mail ID.");
        setBusy(false);
        return;
      }

      if (organization === "Others") {
        if (!otherOrganization.trim()) {
          setError("Please enter your organization name.");
          setBusy(false);
          return;
        }
        if (!referredAdmin) {
          setError("Please select a referring admin.");
          setBusy(false);
          return;
        }
      }
    }

    try {
      const url =
        mode === "login"
          ? `${BACKEND_LOGIN_URL}/auth/login`
          : `${BACKEND_LOGIN_URL}/auth/register`;

      const registrationType =
        organization === "PiLog" && isPilogMail ? "DIRECT" : "ADMIN_APPROVAL";

      const finalOrganization =
        organization === "Others" ? otherOrganization : organization;

      const body =
        mode === "login"
          ? new URLSearchParams({ username, password }).toString()
          : new URLSearchParams({
              name,
              username,
              password,
              email,
              organization: finalOrganization,
              referred_admin: organization === "Others" ? referredAdmin : "",
              registration_type: registrationType,
            }).toString();

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!res.ok) {
        const message = await extractErrorMessage(res);

        if (res.status === 403 && mode === "login") {
          setError(message);
          setShowResend(true);
          setBusy(false);
          return;
        }

        if (message === "EMAIL_EXISTS") {
          setError("An account already exists with this email address.");
          setBusy(false);
          return;
        }

        if (message === "USERNAME_EXISTS") {
          setError("Username already taken. Try with another.");
          setBusy(false);
          return;
        }

        throw new Error(message);
      }

      const data = await res.json();

      if (mode === "login") {
        const user: LoginUser = {
          name: data.name,
          username: data.username,
          CONTENT_AUTHORIZATION: data.CONTENT_AUTHORIZATION,
          role: data.role,
        };

        localStorage.setItem("pilog_user", JSON.stringify(user));
        onSuccess(user);
      }

      if (mode === "register") {
        setSignupSuccess(true);
        setPassword("");
      }
    } catch (err: any) {
      setError(err.message || "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const resendActivation = async () => {
    setBusy(true);
    setResendMsg("");

    try {
      const res = await fetch(`${BACKEND_LOGIN_URL}/auth/resend-activation`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email }).toString(),
      });

      if (!res.ok) throw new Error(await extractErrorMessage(res));

      const data = await res.json();
      setResendMsg(data.message);
    } catch (err: any) {
      setResendMsg(err.message || "Unable to resend activation link.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex flex-col items-center justify-center border-r p-10">
        <img
          src="iMirAI_LOGO_CO-Pilot 1.png"
          alt="Company Logo"
          className="h-16 w-auto object-contain"
        />
        <p className="text-sm text-gray-500 mt-2 max-w-sm text-center">
          {mode === "login"
            ? "Secure Access to PiLog Knowledge Base"
            : "Create an account to explore iMirAI and structured enterprise data."}
        </p>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-semibold">
            {mode === "login" ? "Sign in" : "Sign up"}
          </h2>

          <form onSubmit={submit} className="mt-4 space-y-4">
            {mode === "register" && (
              <>
                <input
                  placeholder="Full name"
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <input
                  type="email"
                  placeholder="Mail ID"
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </>
            )}

            <input
              placeholder="Username"
              className="w-full rounded-xl border px-3 py-2 text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                placeholder="Password"
                className="w-full rounded-xl border px-3 py-2 text-sm pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>

            {mode === "register" && (
              <>
                <select
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  required
                >
                  <option value="">Select organization</option>
                  <option value="PiLog">PiLog</option>
                  <option value="Others">Others</option>
                </select>

                {organization === "Others" && (
                  <>
                    <input
                      placeholder="Enter your organization name"
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      value={otherOrganization}
                      onChange={(e) => setOtherOrganization(e.target.value)}
                      required
                    />

                    <select
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      value={referredAdmin}
                      onChange={(e) => setReferredAdmin(e.target.value)}
                      required
                    >
                      <option value="">Select referring admin</option>
                      {ADMIN_LIST.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            {signupSuccess && organization === "Others" && (
              <p className="text-sm text-green-600">
                Your request has been submitted. You will receive an activation
                link once the admin team approves it.
              </p>
            )}

            {signupSuccess && organization === "PiLog" && (
              <p className="text-sm text-green-600">
                Account created successfully. Please check your email to
                activate your account.
              </p>
            )}

            {activationSuccess && (
              <p className="text-sm text-green-600">
                Your account is activated, you can Sign in now.
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-gray-900 text-white px-4 py-2 text-sm"
            >
              {busy
                ? mode === "login"
                  ? "Signing in…"
                  : "Signing up…"
                : mode === "login"
                ? "Sign in"
                : "Create account"}
            </button>
          </form>

          {showResend && (
            <div className="mt-4 border-t pt-4 space-y-2">
              <button
                onClick={resendActivation}
                className="w-full rounded-xl border px-4 py-2 text-sm"
              >
                Resend Activation Link
              </button>
              {resendMsg && <p className="text-sm text-green-600">{resendMsg}</p>}
            </div>
          )}

          <div className="mt-4 text-center text-sm">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <a href="/signup" className="font-medium hover:underline">
                  Sign up
                </a>
              </>
            ) : (
              <>
                Already activated?{" "}
                <a href="/login" className="font-medium hover:underline">
                  Sign in
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}