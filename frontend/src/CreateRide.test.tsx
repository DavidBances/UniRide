import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CreateRide from "./CreateRide";
import { AUTH_TOKEN_KEY } from "./authToken";

describe("CreateRide", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    cleanup();
  });

  it("uses the shared auth token when publishing a ride", async () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, "token-123");

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ message: "ride created successfully" }),
    } as Response);

    render(<CreateRide />);

    fireEvent.change(document.querySelector('input[name="origin"]') as HTMLInputElement, { target: { value: "Madrid" } });
    fireEvent.change(document.querySelector('input[name="destination"]') as HTMLInputElement, { target: { value: "Barcelona" } });
    fireEvent.change(document.querySelector('input[name="departureDate"]') as HTMLInputElement, { target: { value: "2099-05-20" } });
    fireEvent.change(document.querySelector('input[name="departureTime"]') as HTMLInputElement, { target: { value: "08:30" } });
    fireEvent.change(document.querySelector('input[name="availableSeats"]') as HTMLInputElement, { target: { value: "3" } });
    fireEvent.change(document.querySelector('input[name="price"]') as HTMLInputElement, { target: { value: "12.5" } });
    fireEvent.submit(document.querySelector("form") as HTMLFormElement);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/rides",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer token-123",
          }),
        })
      );
    });

    expect(await screen.findByText("ride created successfully")).toBeTruthy();
  });

  it("asks the user to log in when there is no session token", async () => {
    render(<CreateRide />);

    fireEvent.change(document.querySelector('input[name="origin"]') as HTMLInputElement, { target: { value: "Madrid" } });
    fireEvent.change(document.querySelector('input[name="destination"]') as HTMLInputElement, { target: { value: "Barcelona" } });
    fireEvent.change(document.querySelector('input[name="departureDate"]') as HTMLInputElement, { target: { value: "2099-05-20" } });
    fireEvent.change(document.querySelector('input[name="departureTime"]') as HTMLInputElement, { target: { value: "08:30" } });
    fireEvent.submit(document.querySelector("form") as HTMLFormElement);

    expect(await screen.findByText("Debes iniciar sesión para publicar un viaje.")).toBeTruthy();
  });
});
