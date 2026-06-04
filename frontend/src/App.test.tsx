import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AUTH_TOKEN_KEY } from "./authToken";
import App from "./App";

describe("private route protection", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("redirects unauthenticated users away from profile", async () => {
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <Routes>
          <Route path="*" element={<App />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeTruthy();
    });
  });

  it("keeps register public", () => {
    render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="*" element={<App />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Crear cuenta" })).toBeTruthy();
  });

  it("hides the signup card and profile link on the home page when authenticated", () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, "token-123");

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="*" element={<App />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Comparte trayectos con tu comunidad universitaria." })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Crear cuenta" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Únete a UniRide y muévete con menos esfuerzo." })).toBeNull();
  });

  it("hides the public home CTAs when unauthenticated", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="*" element={<App />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Comparte trayectos con tu comunidad universitaria." })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Buscar viajes" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Ir al perfil" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Únete a UniRide y muévete con menos esfuerzo." })).toBeTruthy();
  });

  it("shows a large signup card when unauthenticated", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="*" element={<App />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Comparte trayectos con tu comunidad universitaria." })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Únete a UniRide y muévete con menos esfuerzo." })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Crear cuenta" }).length).toBeGreaterThan(0);
  });
});
