import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { apiUrl } from "./api";
import Register from "./Register";

describe("Register page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    cleanup();
  });

  function renderRegister() {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );
  }

  it("shows required field errors", () => {
    renderRegister();

    fireEvent.click(screen.getByRole("button", { name: "Registrarse" }));

    expect(screen.getByText("Completa nombre, correo y contraseña.")).toBeTruthy();
  });

  it("posts valid register data to the backend", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Usuario registrado correctamente." }),
    } as Response);

    renderRegister();
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "ADA@UNI.ES" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrarse" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        apiUrl("/auth/register"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            username: "Ada",
            email: "ada@uni.es",
            password: "password123",
          }),
        })
      );
    });
  });

  it("shows duplicate email errors clearly", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: "email already exists" }),
    } as Response);

    renderRegister();
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "ada@uni.es" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrarse" }));

    expect(await screen.findByText("Ese correo ya está registrado.")).toBeTruthy();
  });
});
