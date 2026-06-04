import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AUTH_TOKEN_KEY } from "./authToken";
import ProfilePage from "./ProfilePage";

describe("ProfilePage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows bookings and published rides with useful details", async () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, "token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input).endsWith("/api/me/bookings")) {
        return {
          ok: true,
          json: async () => ({
            bookings: [
              {
                id: 1,
                seatsReserved: 2,
                status: "confirmed",
                createdAt: "2026-05-01T10:00:00Z",
                ride: {
                  id: 10,
                  route: "Leon to Madrid",
                  origin: "Leon",
                  destination: "Madrid",
                  date: "2026-05-20T10:00:00Z",
                  price: 12.5,
                  status: "open",
                  averageRating: 4.5,
                  reviewCount: 2,
                },
              },
            ],
          }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({
          rides: [
            {
              id: 20,
              origin: "Madrid",
              destination: "Barcelona",
              departureDate: "2026-05-20T08:30:00Z",
              availableSeats: 3,
              price: 14,
              status: "open",
              bookingsCount: 2,
            },
          ],
        }),
      } as Response;
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Leon to Madrid")).toBeTruthy();
    expect(screen.getByText("Asientos")).toBeTruthy();
    expect(screen.getByText("Viaje publicado")).toBeTruthy();
    expect(screen.getByText("Ruta")).toBeTruthy();
    expect(screen.getByText("Fecha")).toBeTruthy();
    expect(screen.getByText("Asientos libres")).toBeTruthy();
    expect(screen.getByText("Reservas")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ver reservas" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar publicación" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Editar viaje" })).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/me/bookings",
      expect.objectContaining({
        headers: { Authorization: "Bearer token-123" },
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/me/rides",
      expect.objectContaining({
        headers: { Authorization: "Bearer token-123" },
      })
    );
  });

  it("shows empty states when there are no bookings or published rides", async () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, "token-123");
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input).endsWith("/api/me/bookings")) {
        return {
          ok: true,
          json: async () => ({ bookings: [] }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({ rides: [] }),
      } as Response;
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Aún no tienes reservas")).toBeTruthy();
    expect(screen.getByText("No has publicado viajes")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Buscar viajes" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Publicar viaje" })).toBeTruthy();
  });

  it("cancels a booking from the dashboard", async () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, "token-123");
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (String(input).endsWith("/api/me/bookings")) {
        return {
          ok: true,
          json: async () => ({
            bookings: [
              {
                id: 1,
                seatsReserved: 2,
                status: "confirmed",
                createdAt: "2026-05-01T10:00:00Z",
                ride: {
                  id: 10,
                  route: "Leon to Madrid",
                  origin: "Leon",
                  destination: "Madrid",
                  date: "2026-05-20T10:00:00Z",
                  price: 12.5,
                  status: "open",
                  averageRating: 0,
                  reviewCount: 0,
                },
              },
            ],
          }),
        } as Response;
      }

      if (String(input).endsWith("/api/me/rides")) {
        return {
          ok: true,
          json: async () => ({ rides: [] }),
        } as Response;
      }

      if (init?.method === "DELETE") {
        return {
          ok: true,
          json: async () => ({}),
        } as Response;
      }

      throw new Error(`Unexpected fetch call: ${String(input)}`);
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: "Cancelar" }));

    await waitFor(() => {
      expect(screen.queryByText("Leon to Madrid")).toBeNull();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bookings/1",
      expect.objectContaining({
        method: "DELETE",
        headers: { Authorization: "Bearer token-123" },
      })
    );
  });
});
