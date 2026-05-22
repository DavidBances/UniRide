import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "./api";
import "./Login.css";

type RegisterResponse = {
  error?: string;
  message?: string;
};

function normalizeRegisterError(status: number, message?: string) {
  if (!message) {
    return "No se pudo completar el registro.";
  }

  if (status === 409 && message.toLowerCase().includes("email")) {
    return "Ese email ya está registrado.";
  }

  if (status >= 500) {
    return "El servidor no pudo crear la cuenta. Inténtalo de nuevo.";
  }

  return message;
}

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setOk("");

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName || !normalizedEmail || !password) {
      setError("Completa nombre, correo y contraseña.");
      return;
    }

    if (!normalizedEmail.includes("@")) {
      setError("Correo no válido.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(apiUrl("/auth/register"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: trimmedName,
          email: normalizedEmail,
          password,
        }),
      });

      const data = (await response.json()) as RegisterResponse;

      if (!response.ok) {
        setError(normalizeRegisterError(response.status, data.error));
        return;
      }

      const successMessage = data.message ?? "Usuario registrado correctamente.";
      setOk(successMessage);
      navigate("/login", { replace: true, state: { registerMessage: successMessage } });
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page">
      <form className="card auth-card auth-form" onSubmit={handleSubmit}>
        <h1 className="text-title">Crear cuenta</h1>

        <div className="field">
          <label className="text-label" htmlFor="name">
            Name
          </label>
          <input
            className="input"
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Tu nombre"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="field">
          <label className="text-label" htmlFor="register-email">
            Email
          </label>
          <input
            className="input"
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder="tuemail@uni.es"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="field">
          <label className="text-label" htmlFor="register-password">
            Password
          </label>
          <input
            className="input"
            id="register-password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error && <p className="message message-error">{error}</p>}
        {ok && <p className="message message-success">{ok}</p>}

        <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
          {loading && <span className="button-spinner" aria-hidden="true" />}
          {loading ? "Registrando..." : "Registrarse"}
        </button>
      </form>
    </section>
  );
}
