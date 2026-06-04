import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AUTH_TOKEN_KEY } from "../authToken";
import Navbar from "./Navbar";

describe("Navbar", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows logout instead of login when authenticated and hides register", () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, "token-123");

    render(
      <MemoryRouter initialEntries={["/rides"]}>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "EN" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Iniciar sesión" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Registrarse" })).toBeNull();
  });

  it("clears the token and shows login again on logout", () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, "token-123");

    render(
      <MemoryRouter initialEntries={["/rides"]}>
        <Navbar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(window.localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Registrarse" })).toBeTruthy();
  });
});