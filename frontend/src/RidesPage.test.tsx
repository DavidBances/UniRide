import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
          },
        ],
      }),
    } as Response);

    render(<RidesPage />);

    expect(await screen.findByText("Madrid to Barcelona")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("/api/rides", expect.any(Object));
  });

  it("submits filters using backend query params", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ rides: [] }),
    } as Response);

    render(<RidesPage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/rides", expect.any(Object));
    });

    fireEvent.change(screen.getByLabelText("Origin"), { target: { value: "Madrid" } });
    fireEvent.change(screen.getByLabelText("Destination"), { target: { value: "Barcelona" } });
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2099-05-20" } });
    fireEvent.change(screen.getByLabelText("Seats"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/rides?origin=Madrid&destination=Barcelona&departureDate=2099-05-20&availableSeats=2",
        expect.any(Object)
      );
    });
  });
});
