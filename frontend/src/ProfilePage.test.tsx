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

  it("shows user info, quick stats and dashboard navigation", async () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, "token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input).endsWith("/api/private/me")) {
        return {
          ok: true,
          json: async () => ({
            user: {
              id: 7,
              username: "Ada",
              email: "ada@uni.es",
            },
          }),
        } as Response;
      }

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
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Welcome, Ada" })).toBeTruthy();
    expect(screen.getByText("ada@uni.es")).toBeTruthy();
    expect(screen.getByRole("link", { name: "My bookings" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "My rides" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Logout" })).toBeTruthy();
    expect(screen.getByText("Leon to Madrid")).toBeTruthy();
    expect(screen.getByText("Reserved seats")).toBeTruthy();
    expect(screen.getByText("4.5/5 (2)")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/private/me",
      expect.objectContaining({
        headers: { Authorization: "Bearer token-123" },
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/me/bookings",
      expect.objectContaining({
        headers: { Authorization: "Bearer token-123" },
      })
    );
  });

  it("shows empty bookings state", async () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, "token-123");
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input).endsWith("/api/private/me")) {
        return {
          ok: true,
          json: async () => ({
            user: {
              id: 7,
              username: "Ada",
              email: "ada@uni.es",
            },
          }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({ bookings: [] }),
      } as Response;
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    expect(await screen.findByText("You do not have bookings yet.")).toBeTruthy();
  });

  it("clears the token on logout", async () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, "token-123");
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          id: 7,
          username: "Ada",
          email: "ada@uni.es",
        },
        bookings: [],
      }),
    } as Response);

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    const logoutButton = await screen.findByRole("button", { name: "Logout" });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(window.localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    });
  });

  it("cancels a booking from the dashboard", async () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, "token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (String(input).endsWith("/api/private/me")) {
        return {
          ok: true,
          json: async () => ({
            user: {
              id: 7,
              username: "Ada",
              email: "ada@uni.es",
            },
          }),
        } as Response;
      }

      if (init?.method === "DELETE") {
        return {
          ok: true,
          json: async () => ({}),
        } as Response;
      }

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
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: "Cancel booking" }));

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

  it("submits a rating for a completed booking", async () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, "token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input).endsWith("/api/private/me")) {
        return {
          ok: true,
          json: async () => ({
            user: {
              id: 7,
              username: "Ada",
              email: "ada@uni.es",
            },
          }),
        } as Response;
      }

      if (String(input).endsWith("/api/reviews")) {
        return {
          ok: true,
          json: async () => ({ message: "review created successfully" }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({
          bookings: [
            {
              id: 1,
              seatsReserved: 1,
              status: "confirmed",
              createdAt: "2026-05-01T10:00:00Z",
              ride: {
                id: 10,
                route: "Leon to Madrid",
                origin: "Leon",
                destination: "Madrid",
                date: "2026-05-20T10:00:00Z",
                price: 12.5,
                status: "completed",
                averageRating: 0,
                reviewCount: 0,
              },
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

    fireEvent.click(await screen.findByRole("button", { name: "Rate ride" }));
    fireEvent.change(screen.getByLabelText("Rating"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Comment"), { target: { value: "Comfortable trip" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit review" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/reviews",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer token-123",
          },
          body: JSON.stringify({
            rideId: 10,
            rating: 4,
            comment: "Comfortable trip",
          }),
        })
      );
    });
  });
});
