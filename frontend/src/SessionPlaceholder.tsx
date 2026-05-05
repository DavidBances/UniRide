import { useEffect, useState } from "react";
import "./Login.css";

type User = {
  id: number;
  username: string;
  email: string;
};

type MeResponse = {
  user: User;
};

const AUTH_TOKEN_KEY = "uniride-auth-token";

function getStoredToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY) ?? "";
}

export default function SessionPlaceholder() {
  const [hydratingSession, setHydratingSession] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      window.location.replace("/");
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

        const data = (await response.json()) as MeResponse;
        setAuthUser(data.user);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        window.localStorage.removeItem(AUTH_TOKEN_KEY);
        window.location.replace("/");
        return;
      }

      if (!controller.signal.aborted) {
        setHydratingSession(false);
      }
    };

    void hydrateSession();

    return () => controller.abort();
  }, []);

  const handleLogout = () => {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.location.replace("/");
  };

  if (hydratingSession || !authUser) {
    return (
      <main className="auth-page">
        <section className="card auth-card auth-session-card">
          <p className="session-kicker">Verificando sesión</p>
          <h1 className="text-title">Restaurando acceso seguro</h1>
          <p className="session-copy">Comprobando si existe un token válido antes de mostrar tu espacio.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="card auth-card auth-session-card">
        <p className="session-kicker">Página placeholder</p>
        <h1 className="text-title">Bienvenido, {authUser.username}</h1>
        <p className="session-copy">
          Tu token JWT sigue guardado y la ruta privada <strong>/api/private/me</strong> responde con tus datos.
        </p>

        <div className="session-details">
          <div className="session-row">
            <span className="text-label">Usuario</span>
            <strong>{authUser.username}</strong>
          </div>
          <div className="session-row">
            <span className="text-label">Correo</span>
            <strong>{authUser.email}</strong>
          </div>
          <div className="session-row">
            <span className="text-label">Estado</span>
            <strong>Autenticado</strong>
          </div>
        </div>

        <button className="btn btn-primary auth-submit" type="button" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </section>
    </main>
  );
}