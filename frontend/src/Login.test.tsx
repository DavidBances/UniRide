import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Login from "./Login";

describe("Login form validation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    cleanup();
  });

  function renderLogin() {
    render(<Login />);
  }

  it("shows required field error on login submit", () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(screen.getByText("Completa correo y contraseña.")).toBeTruthy();
  });

  it("shows required field error on register submit", () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: "Crear una" }));

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "student@uni.es" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrarse" }));

    expect(screen.getByText("Completa usuario, correo y contraseña.")).toBeTruthy();
  });

  it("shows invalid email error", () => {
    renderLogin();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "invalid-email" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });

    const form = document.querySelector("form");
    if (!form) {
      throw new Error("Missing login form");
    }

    fireEvent.submit(form);

    expect(screen.getByText("Correo no válido.")).toBeTruthy();
  });

  it("shows password length error", () => {
    renderLogin();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "student@uni.es" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(screen.getByText("La contraseña debe tener al menos 8 caracteres.")).toBeTruthy();
  });

  it("disables submit while the login request is loading", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {}) as Promise<Response>));

    renderLogin();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "student@uni.es" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: "Entrando..." }) as HTMLButtonElement;
      expect(submitButton.disabled).toBe(true);
    });
  });

  it("renders backend errors returned on submit", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ error: "invalid credentials" }),
    } as Response);

    renderLogin();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "student@uni.es" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("invalid credentials")).toBeTruthy();
  });
});