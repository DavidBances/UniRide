import { FormEvent, useEffect, useState } from "react";
import "./Login.css";

type LoginResponse = {
  token?: string;
  error?: string;
  message?: string;
};

const AUTH_TOKEN_KEY = "uniride-auth-token";

function getStoredToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY) ?? "";
}

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [hydratingSession, setHydratingSession] = useState(true);

  const clearSession = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  };

  useEffect(() => {
    const token = getStoredToken();

    if (!token) {
      setHydratingSession(false);
      return;
    }

    const controller = new AbortController();

    const hydrateSession = async () => {
      try {
        const response = await fetch("/api/private/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("invalid session");
        }

        await response.json();
        window.location.replace("/placeholder");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        clearSession();
      } finally {
        if (!controller.signal.aborted) {
          setHydratingSession(false);
        }
      }
    };

    void hydrateSession();

    return () => controller.abort();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setOk("");

    if (!email || !password) {
      setError("Completa correo y contraseña.");
      return;
    }

    if (mode === "register" && !username.trim()) {
      setError("Completa usuario, correo y contraseña.");
      return;
    }

    if (!email.includes("@")) {
      setError("Correo no válido.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/api/register";
      const response = await fetch(endpoint, {
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
        setError(data.error ?? "No se pudo completar la solicitud.");
        return;
      }

      if (mode === "login") {
        if (!data.token) {
          setError("La respuesta de login no incluye sesión válida.");
          return;
        }

        window.localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        window.location.assign("/placeholder");
        return;
      } else {
        setOk(data.message ?? "Usuario registrado correctamente.");
        setMode("login");
      }

      setUsername("");
      setEmail("");
      setPassword("");
    } catch {
      setError("No se pudo conectar con el servidor.");
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
      <main className="auth-page">
        <section className="card auth-card auth-session-card">
          <p className="session-kicker">Verificando sesión</p>
          <h1 className="text-title">Restaurando acceso seguro</h1>
          <p className="session-copy">Comprobando si existe un token válido antes de mostrar el formulario.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <form className="card auth-card auth-form" onSubmit={handleSubmit}>
        <h1 className="text-title">{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h1>

        {mode === "register" && (
          <div className="field">
            <label className="text-label" htmlFor="username">
              Nombre de usuario
            </label>
            <input
              className="input"
              id="username"
              type="text"
              placeholder="tu_usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        )}

        <div className="field">
          <label className="text-label" htmlFor="email">
            Email
          </label>
          <input
            className="input"
            id="email"
            type="email"
            placeholder="tuemail@uni.es"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="text-label" htmlFor="password">
            Password
          </label>
          <input
            className="input"
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="message message-error">{error}</p>}
        {ok && <p className="message message-success">{ok}</p>}

        <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
          {loading
            ? mode === "login"
              ? "Entrando..."
              : "Registrando..."
            : mode === "login"
              ? "Entrar"
              : "Registrarse"}
        </button>

        <p className="switch-auth">
          {mode === "login" ? "No tienes una cuenta?" : "Ya tienes una cuenta?"}
          <button type="button" className="btn btn-ghost switch-auth-btn" onClick={switchMode}>
            {mode === "login" ? "Crear una" : "Iniciar sesión"}
          </button>
        </p>
      </form>
    </main>
  );
}