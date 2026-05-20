import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiUrl } from "./api";
import { getStoredToken } from "./authToken";

type Ride = {
  id: number;
  driverId: number;
  origin: string;
  destination: string;
  departureDate: string;
  availableSeats: number;
  price: number;
  status: string;
  averageRating: number;
  reviewCount: number;
};

type RidesResponse = {
  rides?: Ride[];
  error?: string;
};

type RideFilters = {
  origin: string;
  destination: string;
  departureDate: string;
  availableSeats: string;
};

const emptyFilters: RideFilters = {
  origin: "",
  destination: "",
  departureDate: "",
  availableSeats: "",
};

export default function RidesPage() {
  const [filters, setFilters] = useState<RideFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<RideFilters>(emptyFilters);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [seatsToReserve, setSeatsToReserve] = useState(1);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [reservationError, setReservationError] = useState("");

  const queryString = useMemo(() => buildRideQuery(appliedFilters), [appliedFilters]);
  const token = getStoredToken();

  useEffect(() => {
    const controller = new AbortController();

    const loadRides = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(apiUrl(`/api/rides${queryString}`), {
          signal: controller.signal,
        });
        const data = (await response.json()) as RidesResponse;

        if (!response.ok) {
          setError(data.error ?? "No se pudieron cargar los viajes.");
          return;
        }

        setRides(data.rides ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setError("No se pudo conectar con el servidor.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadRides();

    return () => controller.abort();
  }, [queryString]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setAppliedFilters(filters);
  };

  const resetFilters = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  const handleReserveClick = (ride: Ride) => {
    if (!token) {
      setError("Debes iniciar sesión para reservar.");
      return;
    }
    setSelectedRide(ride);
    setSeatsToReserve(1);
    setReservationError("");
  };

  const handleConfirmReservation = async () => {
    if (!selectedRide || !token) return;

    setReservationLoading(true);
    setReservationError("");

    try {
      const response = await fetch(apiUrl("/api/bookings"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rideId: selectedRide.id,
          seatsReserved: seatsToReserve,
        }),
      });

      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        setReservationError(data.error ?? "No se pudo hacer la reserva.");
        return;
      }

      setSelectedRide(null);
      setReservationError("");
    } catch {
      setReservationError("Error de conexión al servidor.");
    } finally {
      setReservationLoading(false);
    }
  };

  const hasActiveFilters = queryString !== "";

  return (
    <section className="w-full py-6">
      <div className="mb-6">
        <h1 className="text-title">Rides</h1>
        <p className="text-gray-600">Busca viajes publicados por origen, destino, fecha y plazas.</p>
      </div>

      <form className="mb-6 grid gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-5" onSubmit={handleSubmit}>
        <div className="field">
          <label className="text-label" htmlFor="ride-origin">
            Origin
          </label>
          <input
            className="input"
            id="ride-origin"
            type="text"
            value={filters.origin}
            onChange={(event) => setFilters((current) => ({ ...current, origin: event.target.value }))}
          />
        </div>

        <div className="field">
          <label className="text-label" htmlFor="ride-destination">
            Destination
          </label>
          <input
            className="input"
            id="ride-destination"
            type="text"
            value={filters.destination}
            onChange={(event) => setFilters((current) => ({ ...current, destination: event.target.value }))}
          />
        </div>

        <div className="field">
          <label className="text-label" htmlFor="ride-date">
            Date
          </label>
          <input
            className="input"
            id="ride-date"
            type="date"
            value={filters.departureDate}
            onChange={(event) => setFilters((current) => ({ ...current, departureDate: event.target.value }))}
          />
        </div>

        <div className="field">
          <label className="text-label" htmlFor="ride-seats">
            Seats
          </label>
          <input
            className="input"
            id="ride-seats"
            min="1"
            type="number"
            value={filters.availableSeats}
            onChange={(event) => setFilters((current) => ({ ...current, availableSeats: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-3 self-end sm:flex-row md:flex-col">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Buscando..." : "Buscar"}
          </button>
          <button className="btn border border-gray-200 bg-white text-gray-700" type="button" onClick={resetFilters}>
            Limpiar filtros
          </button>
        </div>
      </form>

      {error && <p className="message message-error mb-4">{error}</p>}
      {!error && hasActiveFilters && <p className="message mb-4 text-gray-600">Resultados filtrados</p>}

      {loading ? (
        <p className="text-gray-600">Cargando viajes...</p>
      ) : rides.length === 0 && !error ? (
        <p className="rounded-lg border border-gray-200 bg-white p-4 text-gray-600">No hay viajes disponibles.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rides.map((ride) => (
            <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm" key={ride.id}>
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {ride.origin} to {ride.destination}
                  </h2>
                  <p className="text-sm text-gray-600">{formatRideDate(ride.departureDate)}</p>
                </div>
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-sm font-bold text-emerald-700">
                  {ride.status}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div>
                  <dt className="text-label">Seats</dt>
                  <dd className="font-bold">{ride.availableSeats}</dd>
                </div>
                <div>
                  <dt className="text-label">Price</dt>
                  <dd className="font-bold">{Number(ride.price).toFixed(2)} EUR</dd>
                </div>
                <div>
                  <dt className="text-label">Rating</dt>
                  <dd className="font-bold">{formatRating(ride.averageRating, ride.reviewCount)}</dd>
                </div>
              </dl>
              <button
                className="btn btn-primary w-full"
                type="button"
                onClick={() => handleReserveClick(ride)}
                disabled={ride.status !== "open"}
              >
                {ride.status === "open" ? "Reservar" : "Completed ride"}
              </button>
            </article>
          ))}
        </div>
      )}

      {selectedRide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-lg bg-white p-6 shadow-lg max-w-md w-full mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Reservar viaje
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {selectedRide.origin} → {selectedRide.destination}
            </p>

            {reservationError && (
              <p className="message message-error mb-4">{reservationError}</p>
            )}

            <div className="mb-6">
              <label className="text-label" htmlFor="seats-input">
                Número de pasajeros
              </label>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  className="btn border border-gray-200 bg-white text-gray-700 px-3"
                  onClick={() => setSeatsToReserve(Math.max(1, seatsToReserve - 1))}
                  disabled={seatsToReserve <= 1}
                >
                  −
                </button>
                <input
                  id="seats-input"
                  type="number"
                  min="1"
                  max={selectedRide.availableSeats}
                  value={seatsToReserve}
                  onChange={(e) => {
                    const value = Math.min(
                      selectedRide.availableSeats,
                      Math.max(1, parseInt(e.target.value) || 1)
                    );
                    setSeatsToReserve(value);
                  }}
                  className="input flex-1 text-center"
                />
                <button
                  type="button"
                  className="btn border border-gray-200 bg-white text-gray-700 px-3"
                  onClick={() =>
                    setSeatsToReserve(Math.min(selectedRide.availableSeats, seatsToReserve + 1))
                  }
                  disabled={seatsToReserve >= selectedRide.availableSeats}
                >
                  +
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Asientos disponibles: {selectedRide.availableSeats}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                className="btn border border-gray-200 bg-white text-gray-700 flex-1"
                type="button"
                onClick={() => setSelectedRide(null)}
                disabled={reservationLoading}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary flex-1"
                type="button"
                onClick={handleConfirmReservation}
                disabled={reservationLoading}
              >
                {reservationLoading ? "Reservando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function buildRideQuery(filters: RideFilters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    const trimmedValue = value.trim();
    if (trimmedValue !== "") {
      params.set(key, trimmedValue);
    }
  });

  const query = params.toString();
  return query ? `?${query}` : "";
}

function formatRideDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatRating(averageRating: number, reviewCount: number) {
  if (!reviewCount) {
    return "No ratings yet";
  }

  return `${Number(averageRating).toFixed(1)}/5 (${reviewCount})`;
}
