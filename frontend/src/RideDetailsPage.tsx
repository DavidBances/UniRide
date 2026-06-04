import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl } from "./api";
import { getStoredToken } from "./authToken";

type RideDetail = {
  id: number;
  origin: string;
  destination: string;
  departureDate: string;
  availableSeats: number;
  price: number;
  status: string;
  driver: {
    username: string;
    rating_average: number;
  };
};

type RideBooking = {
  id: number;
  rideId: number;
  seatsReserved: number;
  status: string;
};

type BookingsResponse = {
  bookings?: Array<{
    id: number;
    seatsReserved: number;
    status: string;
    ride: {
      id: number;
    };
  }>;
  error?: string;
};

export default function RideDetailsPage({ rideId }: { rideId: string }) {
  const navigate = useNavigate();
  const [ride, setRide] = useState<RideDetail | null>(null);
  const [booking, setBooking] = useState<RideBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [error, setError] = useState("");
  const [reservationSeats, setReservationSeats] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const token = getStoredToken();

  useEffect(() => {
    const controller = new AbortController();

    const fetchRide = async () => {
      try {
        const response = await fetch(apiUrl(`/api/rides/${rideId}`), {
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo cargar el viaje");
        }

        setRide(data.ride);
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.name !== "AbortError") {
            setError(err.message || "Error de conexión");
          }
        } else {
          setError("Error de conexión");
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchCurrentBooking = async () => {
      if (!token) {
        setBooking(null);
        setLoadingBooking(false);
        return;
      }

      setLoadingBooking(true);

      try {
        const response = await fetch(apiUrl("/api/me/bookings"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        const data = (await response.json()) as BookingsResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "No se pudieron cargar tus reservas.");
        }

        const currentBooking = data.bookings?.find((item) => item.ride.id === Number(rideId));

        if (currentBooking) {
          setBooking({
            id: currentBooking.id,
            rideId: currentBooking.ride.id,
            seatsReserved: currentBooking.seatsReserved,
            status: currentBooking.status,
          });
          setReservationSeats(currentBooking.seatsReserved);
        } else {
          setBooking(null);
          setReservationSeats(1);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.name !== "AbortError") {
            setActionError(err.message || "Error de conexión");
          }
        } else {
          setActionError("Error de conexión");
        }
      } finally {
        setLoadingBooking(false);
      }
    };

    void fetchRide();
    void fetchCurrentBooking();

    return () => controller.abort();
  }, [rideId, token]);

  const isRideFull = Boolean(ride && (ride.availableSeats === 0 || ride.status === "full"));

  const handleReserve = async () => {
    if (!ride || !token) {
      navigate("/login");
      return;
    }

    setActionLoading(true);
    setActionError("");
    setActionSuccess("");

    try {
      const response = await fetch(apiUrl("/api/bookings"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rideId: ride.id,
          seatsReserved: reservationSeats,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        message?: string;
        booking?: { id: number; rideId: number; seatsReserved: number; status: string };
      };

      if (!response.ok) {
        setActionError(data.error ?? "No se pudo hacer la reserva.");
        return;
      }

      setRide((current) =>
        current
          ? {
              ...current,
              availableSeats: Math.max(0, current.availableSeats - reservationSeats),
              status: Math.max(0, current.availableSeats - reservationSeats) === 0 ? "full" : current.status,
            }
          : current
      );

      if (data.booking) {
        setBooking(data.booking);
      } else {
        setBooking({
          id: 0,
          rideId: ride.id,
          seatsReserved: reservationSeats,
          status: "confirmed",
        });
      }

      setActionSuccess(data.message ?? "Reserva confirmada correctamente.");
    } catch {
      setActionError("Error de conexión al servidor.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking || !token) return;

    setActionLoading(true);
    setActionError("");
    setActionSuccess("");

    try {
      const response = await fetch(apiUrl(`/api/bookings/${booking.id}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        setActionError(data.error ?? "No se pudo cancelar la reserva.");
        return;
      }

      setRide((current) =>
        current
          ? {
              ...current,
              availableSeats: current.availableSeats + booking.seatsReserved,
              status: current.availableSeats + booking.seatsReserved > 0 ? "open" : current.status,
            }
          : current
      );
      setBooking(null);
      setReservationSeats(1);
      setActionSuccess(data.message ?? "Reserva cancelada correctamente.");
    } catch {
      setActionError("Error de conexión al servidor.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="w-full py-6" aria-busy="true">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <span className="loading-spinner" aria-hidden="true" />
          <p className="mt-2 text-gray-600">Cargando detalles del viaje...</p>
        </div>
      </section>
    );
  }

  if (error || !ride) {
    return (
      <section className="w-full py-6">
        <div className="rounded-lg border border-red-100 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-950">Viaje no encontrado</h1>
          <p className="mt-2 text-red-700">{error || "El viaje que buscas no existe."}</p>
          <Link className="btn btn-primary mt-5 inline-flex" to="/rides">
            Volver a viajes
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-3xl mx-auto py-6">
      <Link to="/rides" className="text-sm font-bold text-teal-700 hover:underline mb-6 inline-block">
        &larr; Volver a los viajes
      </Link>
      
      <div className="rounded-lg border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-950">
              {ride.origin} &rarr; {ride.destination}
            </h1>
            <p className="text-lg text-gray-600 mt-2">
              {new Date(ride.departureDate).toLocaleString("es-ES", {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </p>
          </div>
          <span className={`rounded-md px-3 py-1 text-sm font-bold w-fit ${isRideFull ? "bg-red-50 text-red-700" : ride.status === "open" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>
            {isRideFull ? "Full" : ride.status.toUpperCase()}
          </span>
        </div>

        {actionError && <p className="message message-error mb-4">{actionError}</p>}
        {actionSuccess && <p className="message message-success mb-4">{actionSuccess}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg">
            <p className="text-sm text-gray-500 font-semibold mb-1">Conductor</p>
            <p className="font-bold text-gray-900">{ride.driver.username}</p>
            <p className="text-xs text-gray-600 mt-1">
              {ride.driver.rating_average ? `${ride.driver.rating_average.toFixed(1)}/5 rating` : "Sin valoraciones"}
            </p>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg">
            <p className="text-sm text-gray-500 font-semibold mb-1">Precio</p>
            <p className="font-bold text-gray-900 text-xl">{Number(ride.price).toFixed(2)} €</p>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg">
            <p className="text-sm text-gray-500 font-semibold mb-1">Asientos libres</p>
            <p className="font-bold text-gray-900 text-xl">{ride.availableSeats}</p>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg">
            <p className="text-sm text-gray-500 font-semibold mb-1">Notes</p>
            <p className="text-sm text-gray-700">Sin notas adicionales proporcionadas por el conductor.</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          {token ? (
            booking ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-700">Ya tienes una reserva para este viaje.</p>
                <p className="mt-1 text-sm text-gray-600">Asientos reservados: {booking.seatsReserved}</p>
                <button
                  className="btn bg-red-50 text-red-700 hover:bg-red-100 mt-4 w-full text-lg py-3"
                  type="button"
                  onClick={handleCancelBooking}
                  disabled={actionLoading || loadingBooking}
                >
                  {actionLoading ? "Cancelando..." : "Cancelar reserva"}
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <label className="text-label" htmlFor="ride-details-seats">
                  Número de plazas
                </label>
                <input
                  id="ride-details-seats"
                  className="input mt-2"
                  type="number"
                  min="1"
                  max={ride.availableSeats}
                  value={reservationSeats}
                  onChange={(event) => {
                    const nextValue = Math.max(1, Math.min(ride.availableSeats, Number(event.target.value) || 1));
                    setReservationSeats(nextValue);
                  }}
                  disabled={isRideFull}
                />
                <button
                  className="btn btn-primary w-full text-lg py-3 mt-4"
                  type="button"
                  onClick={handleReserve}
                  disabled={actionLoading || loadingBooking || isRideFull}
                >
                  {loadingBooking ? "Comprobando reserva..." : actionLoading ? "Reservando..." : isRideFull ? "Viaje lleno" : "Reservar"}
                </button>
              </div>
            )
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-600">Inicia sesión para reservar desde esta pantalla.</p>
              <Link className="btn btn-primary mt-4 w-full text-lg py-3 inline-flex justify-center" to="/login">
                Ir a login
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}