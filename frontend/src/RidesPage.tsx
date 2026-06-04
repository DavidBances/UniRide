import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl } from "./api";
import { getStoredToken } from "./authToken";
import { useT } from "./i18n";

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
  const t = useT();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<RideFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<RideFilters>(emptyFilters);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [seatsToReserve, setSeatsToReserve] = useState(1);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [reservationError, setReservationError] = useState("");
  const [reservationSuccess, setReservationSuccess] = useState("");

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
          setError(data.error ?? t("rides.connectionError"));
          return;
        }

        setRides(data.rides ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setError(t("rides.connectionError"));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadRides();

    return () => controller.abort();
  }, [queryString, t]);

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
      navigate("/login");
      return;
    }
    setSelectedRide(ride);
    setSeatsToReserve(1);
    setReservationError("");
    setReservationSuccess("");
  };

  const handleConfirmReservation = async () => {
    if (!selectedRide || !token) return;

    setReservationLoading(true);
    setReservationError("");
    setReservationSuccess("");

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
        setReservationError(data.error ?? t("rides.reservationError"));
        return;
      }

      setRides((current) =>
        current.map((ride) =>
          ride.id === selectedRide.id
            ? {
                ...ride,
                availableSeats: Math.max(0, ride.availableSeats - seatsToReserve),
              }
            : ride
        )
      );
      setReservationSuccess(data.message ?? t("rides.reservationCreated"));
      setSelectedRide(null);
      setReservationError("");
    } catch {
      setReservationError(t("rides.connectionError"));
    } finally {
      setReservationLoading(false);
    }
  };

  const hasActiveFilters = queryString !== "";

  return (
    <section className="w-full py-6">
      <div className="mb-6">
        <h1 className="text-title">{t("rides.title")}</h1>
        <p className="text-gray-600">{t("rides.description")}</p>
      </div>

      <form className="mb-6 grid gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-2 lg:grid-cols-5" onSubmit={handleSubmit}>
        <div className="field">
          <label className="text-label" htmlFor="ride-origin">
            {t("rides.origin")}
          </label>
          <input
            className="input"
            id="ride-origin"
            type="text"
            placeholder="Madrid"
            value={filters.origin}
            onChange={(event) => setFilters((current) => ({ ...current, origin: event.target.value }))}
          />
        </div>

        <div className="field">
          <label className="text-label" htmlFor="ride-destination">
            {t("rides.destination")}
          </label>
          <input
            className="input"
            id="ride-destination"
            type="text"
            placeholder="Barcelona"
            value={filters.destination}
            onChange={(event) => setFilters((current) => ({ ...current, destination: event.target.value }))}
          />
        </div>

        <div className="field">
          <label className="text-label" htmlFor="ride-date">
            {t("rides.date")}
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
            {t("rides.seats")}
          </label>
          <input
            className="input"
            id="ride-seats"
            min="1"
            inputMode="numeric"
            type="number"
            value={filters.availableSeats}
            onChange={(event) => setFilters((current) => ({ ...current, availableSeats: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-3 self-end sm:flex-row md:flex-col">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? t("rides.searching") : t("rides.search")}
          </button>
          <button className="btn border border-gray-200 bg-white text-gray-700" type="button" onClick={resetFilters}>
            {t("rides.clearFilters")}
          </button>
        </div>
      </form>

      {error && <p className="message message-error mb-4">{error}</p>}
      {reservationSuccess && <p className="message message-success mb-4">{reservationSuccess}</p>}
      {!error && hasActiveFilters && <p className="message mb-4 text-gray-600">{t("rides.filtered")}</p>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label={t("rides.loading")}>
          <RideCardSkeleton />
          <RideCardSkeleton />
          <RideCardSkeleton />
          <RideCardSkeleton />
        </div>
      ) : rides.length === 0 && !error ? (
        <div className="empty-state">
          {hasActiveFilters ? (
            <>
              <h2 className="text-lg font-bold text-gray-950">{t("rides.noResults")}</h2>
              <p className="mt-2 text-sm text-gray-600">
                {t("rides.noResultsCopy")}
              </p>
              <button className="btn border border-gray-200 bg-white text-gray-700 mt-4" type="button" onClick={resetFilters}>
                {t("rides.noResultsReset")}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-gray-950">{t("rides.noRides")}</h2>
              <p className="mt-2 text-sm text-gray-600">
                {t("rides.noRidesCopy")}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rides.map((ride) => (
            <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm" key={ride.id}>
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {ride.origin} {t("rides.routeJoiner")} {ride.destination}
                  </h2>
                  <p className="text-sm text-gray-600">{formatRideDate(ride.departureDate)}</p>
                </div>
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-sm font-bold text-emerald-700">
                  {t(`rides.rideStatus.${ride.status}`) ?? ride.status}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div>
                  <dt className="text-label">{t("rides.seatsLabel")}</dt>
                  <dd className="font-bold">{ride.availableSeats}</dd>
                </div>
                <div>
                  <dt className="text-label">{t("rides.price")}</dt>
                  <dd className="font-bold">{Number(ride.price).toFixed(2)} EUR</dd>
                </div>
                <div>
                  <dt className="text-label">{t("rides.rating")}</dt>
                  <dd className="font-bold">{formatRating(ride.averageRating, ride.reviewCount)}</dd>
                </div>
              </dl>
              <div className="mt-4 flex gap-3">
                <Link
                  to={`/rides/${ride.id}`}
                  className="btn border border-gray-200 bg-white text-gray-700 flex-1 text-center"
                >
                  {t("rides.viewDetails")}
                </Link>
                <button
                  className="btn btn-primary flex-1"
                  type="button"
                  onClick={() => handleReserveClick(ride)}
                  disabled={ride.status !== "open" || ride.availableSeats <= 0}
                >
                  {ride.status !== "open" ? t("rides.completed") : ride.availableSeats <= 0 ? t("rides.noSeatsLeft") : t("rides.reserve")}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedRide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="reserve-title">
          <div className="max-h-full w-full max-w-md overflow-auto rounded-lg bg-white p-6 shadow-lg">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              <span id="reserve-title">{t("rides.reserveTitle")}</span>
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {selectedRide.origin} → {selectedRide.destination}
            </p>

            {reservationError && (
              <p className="message message-error mb-4">{reservationError}</p>
            )}

            <div className="mb-6">
              <label className="text-label" htmlFor="seats-input">
                {t("rides.selectedSeats")}
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
                  inputMode="numeric"
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
                {t("rides.seatsLabel")}: {selectedRide.availableSeats}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                className="btn border border-gray-200 bg-white text-gray-700 flex-1"
                type="button"
                onClick={() => setSelectedRide(null)}
                disabled={reservationLoading}
              >
                {t("rides.cancel")}
              </button>
              <button
                className="btn btn-primary flex-1"
                type="button"
                onClick={handleConfirmReservation}
                disabled={reservationLoading}
              >
                {reservationLoading && <span className="button-spinner" aria-hidden="true" />}
                {reservationLoading ? t("rides.reserving") : t("rides.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function RideCardSkeleton() {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm" aria-hidden="true">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="skeleton h-5 w-3/4" />
          <div className="skeleton mt-2 h-4 w-1/2" />
        </div>
        <div className="skeleton h-6 w-16 rounded-md" />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <div className="skeleton h-3 w-10" />
          <div className="skeleton mt-1 h-5 w-14" />
        </div>
        <div>
          <div className="skeleton h-3 w-10" />
          <div className="skeleton mt-1 h-5 w-20" />
        </div>
        <div>
          <div className="skeleton h-3 w-12" />
          <div className="skeleton mt-1 h-5 w-24" />
        </div>
      </div>
      <div className="skeleton h-10 w-full" />
    </article>
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
