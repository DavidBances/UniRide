import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiUrl } from "./api";

type Ride = {
  id: number;
  driverId: number;
  origin: string;
  destination: string;
  departureDate: string;
  availableSeats: number;
  price: number;
  status: string;
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

  const queryString = useMemo(() => buildRideQuery(appliedFilters), [appliedFilters]);

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
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-label">Seats</dt>
                  <dd className="font-bold">{ride.availableSeats}</dd>
                </div>
                <div>
                  <dt className="text-label">Price</dt>
                  <dd className="font-bold">{Number(ride.price).toFixed(2)} EUR</dd>
                </div>
              </dl>
            </article>
          ))}
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
