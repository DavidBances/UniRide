import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import App from "./App";
import { apiUrl } from "./api";
import { AUTH_TOKEN_KEY } from "./authToken";
import RideDetailsPage from "./RideDetailsPage";

describe("RideDetailsPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    cleanup();
  });

  it("allows reserving a ride from the details page", async () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, "token-123");

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (String(input).endsWith("/api/rides/1")) {
        return {
          ok: true,
          json: async () => ({
            ride: {
              id: 1,
              origin: "Madrid",
              destination: "Barcelona",
              departureDate: "2099-05-20T08:30:00Z",
              availableSeats: 3,
              price: 12.5,
              status: "open",
              driver: { username: "Ada", rating_average: 4.8 },
            },
          }),
        } as Response;
      }

      if (String(input).endsWith("/api/me/bookings")) {
        return {
          ok: true,
          json: async () => ({ bookings: [] }),
        } as Response;
      }

      if (String(input).endsWith("/api/bookings") && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            message: "booking created successfully",
            booking: {
              id: 7,
              rideId: 1,
              seatsReserved: 2,
              status: "confirmed",
            },
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch call: ${String(input)}`);
    });

    render(
      <MemoryRouter initialEntries={["/rides/1"]}>
        <RideDetailsPage rideId="1" />
      </MemoryRouter>
    );

    expect(await screen.findByRole("button", { name: "Reservar" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Número de plazas"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Reservar" }));

    expect(await screen.findByText("Ya tienes una reserva para este viaje.")).toBeTruthy();
    expect(screen.getByText("Asientos reservados: 2")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar reserva" })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      apiUrl("/api/bookings"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer token-123" }),
      })
    );
  });

  it("shows cancel booking when the user already has one", async () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, "token-123");

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (String(input).endsWith("/api/rides/1")) {
        return {
          ok: true,
          json: async () => ({
            ride: {
              id: 1,
              origin: "Madrid",
              destination: "Barcelona",
              departureDate: "2099-05-20T08:30:00Z",
              availableSeats: 1,
              price: 12.5,
              status: "open",
              driver: { username: "Ada", rating_average: 4.8 },
            },
          }),
        } as Response;
      }

      if (String(input).endsWith("/api/me/bookings")) {
        return {
          ok: true,
          json: async () => ({
            bookings: [
              {
                id: 99,
                seatsReserved: 1,
                status: "confirmed",
                ride: { id: 1 },
              },
            ],
          }),
        } as Response;
      }

      if (String(input).endsWith("/api/bookings/99") && init?.method === "DELETE") {
        return {
          ok: true,
          json: async () => ({ message: "booking deleted successfully" }),
        } as Response;
      }

      throw new Error(`Unexpected fetch call: ${String(input)}`);
    });

    render(
      <MemoryRouter initialEntries={["/rides/1"]}>
        <RideDetailsPage rideId="1" />
      </MemoryRouter>
    );

    expect(await screen.findByRole("button", { name: "Cancelar reserva" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar reserva" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reservar" })).toBeTruthy();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      apiUrl("/api/bookings/99"),
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({ Authorization: "Bearer token-123" }),
      })
    );
  });

  it("redirects anonymous users to login when they try to reserve from details", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input).endsWith("/api/rides/1")) {
        return {
          ok: true,
          json: async () => ({
            ride: {
              id: 1,
              origin: "Madrid",
              destination: "Barcelona",
              departureDate: "2099-05-20T08:30:00Z",
              availableSeats: 3,
              price: 12.5,
              status: "open",
              driver: { username: "Ada", rating_average: 4.8 },
            },
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch call: ${String(input)}`);
    });

    render(
      <MemoryRouter initialEntries={["/rides/1"]}>
        <Routes>
          <Route path="*" element={<App />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Inicia sesión para reservar desde esta pantalla.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ir a login" })).toBeTruthy();
  });
});