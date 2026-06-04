import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "./api";
import { useT } from "./i18n";
import "./Login.css";

type RegisterResponse = {
  error?: string;
  message?: string;
};

function normalizeRegisterError(status: number, message: string | undefined, t: ReturnType<typeof useT>) {
  if (!message) {
    return t("registerPage.genericError");
  }

  if (status === 409 && message.toLowerCase().includes("email")) {
    return t("registerPage.duplicateEmail");
  }

  if (status >= 500) {
    return t("registerPage.serverError");
  }

  return message;
}

export default function Register() {
  const t = useT();
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
      setError(t("registerPage.required"));
      return;
    }

    if (!normalizedEmail.includes("@")) {
      setError(t("registerPage.invalidEmail"));
      return;
    }

    if (password.length < 8) {
      setError(t("registerPage.shortPassword"));
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
        setError(normalizeRegisterError(response.status, data.error, t));
        return;
      }

      const successMessage = data.message ?? t("registerPage.success");
      setOk(successMessage);
      navigate("/login", { replace: true, state: { registerMessage: successMessage } });
    } catch {
      setError(t("registerPage.genericError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page">
      <form className="card auth-card auth-form" onSubmit={handleSubmit}>
        <h1 className="text-title">{t("registerPage.title")}</h1>

        <div className="field">
          <label className="text-label" htmlFor="name">
            {t("registerPage.name")}
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
            {t("registerPage.email")}
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
            {t("registerPage.password")}
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
          {loading ? t("registerPage.loading") : t("registerPage.submit")}
        </button>
      </form>
    </section>
  );
}
