import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { apiUrl } from "./api";
import App from "./App";
import RidesPage from "./RidesPage";

describe("RidesPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    cleanup();
  });

  it("loads rides without filters on first render", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        rides: [
          {
            id: 1,
            driverId: 2,
            origin: "Madrid",
            destination: "Barcelona",
            departureDate: "2099-05-20T08:30:00Z",
            availableSeats: 3,
            price: 12.5,
            status: "open",
            averageRating: 4.5,
            reviewCount: 2,
          },
        ],
      }),
    } as Response);

    render(
      <MemoryRouter>
        <RidesPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Madrid a Barcelona")).toBeTruthy();
    expect(screen.getByText("4.5/5 (2)")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(apiUrl("/api/rides"), expect.any(Object));
  });

  it("submits filters using backend query params", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ rides: [] }),
    } as Response);

    render(
      <MemoryRouter>
        <RidesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(apiUrl("/api/rides"), expect.any(Object));
    });

    fireEvent.change(screen.getByLabelText("Origen"), { target: { value: "Madrid" } });
    fireEvent.change(screen.getByLabelText("Destino"), { target: { value: "Barcelona" } });
    fireEvent.change(screen.getByLabelText("Fecha"), { target: { value: "2099-05-20" } });
    fireEvent.change(screen.getByLabelText("Plazas"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        apiUrl("/api/rides?origin=Madrid&destination=Barcelona&departureDate=2099-05-20&availableSeats=2"),
        expect.any(Object)
      );
    });
  });

  it("shows a loading state while rides are being fetched", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise<Response>(() => {}) as Promise<Response>
    );

    render(
      <MemoryRouter>
        <RidesPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText("Cargando viajes")).toBeTruthy();
  });

  it("shows an empty state when there are no rides", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ rides: [] }),
    } as Response);

    render(
      <MemoryRouter>
        <RidesPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("No hay viajes disponibles")).toBeTruthy();
  });

  it("redirects anonymous users to login when they try to reserve", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        rides: [
          {
            id: 1,
            driverId: 2,
            origin: "Madrid",
            destination: "Barcelona",
            departureDate: "2099-05-20T08:30:00Z",
            availableSeats: 3,
            price: 12.5,
            status: "open",
            averageRating: 4.5,
            reviewCount: 2,
          },
        ],
      }),
    } as Response);

    render(
      <MemoryRouter initialEntries={["/rides"]}>
        <Routes>
          <Route path="*" element={<App />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: "Reservar" }));

    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeTruthy();
  });
});
