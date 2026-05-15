import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ProfilePage from "./ProfilePage";
import { AUTH_TOKEN_KEY } from "./authToken";

describe("ProfilePage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders user data and bookings dashboard", async () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, "valid-token");
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: 1,
            username: "ada",
            email: "ada@uni.es",
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          bookings: [
            {
              id: 10,
              seatsReserved: 2,
              status: "confirmed",
              createdAt: "2026-05-01T10:00:00Z",
              ride: {
                id: 20,
                route: "Madrid → Barcelona",
                origin: "Madrid",
                destination: "Barcelona",
                date: "2099-05-20T10:00:00Z",
                price: 15,
                status: "open",
              },
            },
          ],
        }),
      } as Response);

    render(<ProfilePage />);

    expect(await screen.findByText("Hola, ada")).toBeTruthy();
    expect(screen.getByText("ada@uni.es")).toBeTruthy();
    expect(screen.getByText("Madrid → Barcelona")).toBeTruthy();
    expect(screen.getByText("2 seats · 15.00 EUR")).toBeTruthy();
  });

  it("shows empty bookings state", async () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, "valid-token");
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: 1,
            username: "ada",
            email: "ada@uni.es",
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ bookings: [] }),
      } as Response);

    render(<ProfilePage />);

    expect(await screen.findByText("Aún no tienes reservas.")).toBeTruthy();
  });
});
