import { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiUrl } from "./api";
import { clearStoredToken, getStoredToken, storeToken } from "./authToken";
import { useT } from "./i18n";
import "./Login.css";

type LoginResponse = {
  token?: string;
  error?: string;
  message?: string;
};

export default function Login() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const registerMessage =
    typeof location.state === "object" &&
    location.state !== null &&
    "registerMessage" in location.state &&
    typeof location.state.registerMessage === "string"
      ? location.state.registerMessage
      : "";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(registerMessage);
  const [hydratingSession, setHydratingSession] = useState(true);

  useEffect(() => {
    const token = getStoredToken();

    if (!token) {
      setHydratingSession(false);
      return;
    }

    const controller = new AbortController();

    const hydrateSession = async () => {
      try {
        const response = await fetch(apiUrl("/api/private/me"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(t("auth.invalidSession"));
        }

        await response.json();
        navigate("/profile", { replace: true });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        clearStoredToken();
      } finally {
        if (!controller.signal.aborted) {
          setHydratingSession(false);
        }
      }
    };

    void hydrateSession();

    return () => controller.abort();
  }, [navigate, t]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setOk("");

    if (!email || !password) {
      setError(t("auth.requiredLogin"));
      return;
    }

    if (mode === "register" && !username.trim()) {
      setError(t("auth.requiredRegister"));
      return;
    }

    if (!email.includes("@")) {
      setError(t("auth.invalidEmail"));
      return;
    }

    if (password.length < 8) {
      setError(t("auth.passwordLength"));
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const response = await fetch(apiUrl(endpoint), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(mode === "register" ? { username: username.trim() } : {}),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = (await response.json()) as LoginResponse;

      if (!response.ok) {
        setError(data.error ?? t("auth.requestError"));
        return;
      }

      if (mode === "login") {
        if (!data.token) {
          setError(t("auth.invalidSession"));
          return;
        }

        storeToken(data.token);
        navigate("/profile");
        return;
      } else {
        setOk(data.message ?? t("auth.registerSuccess"));
        setMode("login");
      }

      setUsername("");
      setEmail("");
      setPassword("");
    } catch {
      setError(t("auth.serverError"));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode((prev) => (prev === "login" ? "register" : "login"));
    setError("");
    setOk("");
    setPassword("");
  };

  if (hydratingSession) {
    return (
      <section className="auth-page" aria-busy="true">
        <section className="card auth-card auth-session-card">
          <p className="session-kicker">{t("auth.verifyingSession")}</p>
          <h1 className="text-title">{t("auth.restoringAccess")}</h1>
          <span className="loading-spinner" aria-hidden="true" />
          <p className="session-copy">{t("auth.sessionMessage")}</p>
        </section>
      </section>
    );
  }

  return (
    <section className="auth-page">
      <form className="card auth-card auth-form" onSubmit={handleSubmit}>
        <h1 className="text-title">{mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}</h1>

        {mode === "register" && (
          <div className="field">
            <label className="text-label" htmlFor="username">
              {t("auth.username")}
            </label>
            <input
              className="input"
              id="username"
              type="text"
              autoComplete="username"
              placeholder="tu_usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        )}

        <div className="field">
          <label className="text-label" htmlFor="email">
            {t("auth.email")}
          </label>
          <input
            className="input"
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tuemail@uni.es"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="text-label" htmlFor="password">
            {t("auth.password")}
          </label>
          <input
            className="input"
            id="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="message message-error">{error}</p>}
        {ok && <p className="message message-success">{ok}</p>}

        <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
          {loading && <span className="button-spinner" aria-hidden="true" />}
          {loading
            ? mode === "login"
              ? t("auth.signingIn")
              : t("auth.signingUp")
            : mode === "login"
              ? t("auth.submitLogin")
              : t("auth.submitRegister")}
        </button>

        <p className="switch-auth">
          {mode === "login" ? t("auth.noAccount") : t("auth.haveAccount")}
          <button type="button" className="btn btn-ghost switch-auth-btn" onClick={switchMode}>
            {mode === "login" ? t("auth.createOne") : t("auth.signIn")}
          </button>
        </p>
      </form>
    </section>
  );
}
