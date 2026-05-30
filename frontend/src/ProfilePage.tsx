import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "./api";
import { getStoredToken } from "./authToken";

type BookingRideSummary = {
  id: number;
  route: string;
  origin: string;
  destination: string;
  date: string;
  price: number;
  status: string;
  averageRating: number;
  reviewCount: number;
};

type Booking = {
  id: number;
  seatsReserved: number;
  status: string;
  createdAt: string;
  ride: BookingRideSummary;
};

type UserRide = {
  id: number;
  origin: string;
  destination: string;
  departureDate: string;
  availableSeats: number;
  price: number;
  status: string;
  bookingsCount: number;
};

type RideReservation = {
  id: number;
  rideId: number;
  seatsReserved: number;
  status: string;
  createdAt: string;
  passenger: {
    id: number;
    username: string;
    email: string;
  };
};

export default function ProfilePage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rides, setRides] = useState<UserRide[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingRides, setLoadingRides] = useState(true);
  const [errorBookings, setErrorBookings] = useState("");
  const [errorRides, setErrorRides] = useState("");
  const [selectedRide, setSelectedRide] = useState<UserRide | null>(null);
  const [rideReservations, setRideReservations] = useState<RideReservation[]>([]);
  const [loadingRideReservations, setLoadingRideReservations] = useState(false);
  const [rideModalError, setRideModalError] = useState("");

  const token = getStoredToken();

  useEffect(() => {
    const controller = new AbortController();

    const fetchBookings = async () => {
      try {
        const response = await fetch(apiUrl("/api/me/bookings"), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Error al cargar reservas");
        setBookings(data.bookings || []);
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.name !== "AbortError") setErrorBookings(err.message);
        } else {
          setErrorBookings("Ocurrió un error inesperado");
        }
      } finally {
        setLoadingBookings(false);
      }
    };

    const fetchRides = async () => {
      try {
        const response = await fetch(apiUrl("/api/me/rides"), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Error al cargar viajes");
        setRides(data.rides || []);
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.name !== "AbortError") setErrorRides(err.message);
        } else {
          setErrorRides("Ocurrió un error inesperado");
        }
      } finally {
        setLoadingRides(false);
      }
    };

    if (token) {
      void fetchBookings();
      void fetchRides();
    } else {
      setLoadingBookings(false);
      setLoadingRides(false);
    }

    return () => controller.abort();
  }, [token]);

  const handleCancelBooking = async (bookingId: number) => {
    if (!window.confirm("¿Estás seguro de que quieres cancelar esta reserva?")) return;

    try {
      const response = await fetch(apiUrl(`/api/bookings/${bookingId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "No se pudo cancelar la reserva.");
        return;
      }

      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    } catch {
      alert("Error de conexión al servidor.");
    }
  };

  const openRideReservations = async (ride: UserRide) => {
    setSelectedRide(ride);
    setRideReservations([]);
    setRideModalError("");
    setLoadingRideReservations(true);

    try {
      const response = await fetch(apiUrl(`/api/me/rides/${ride.id}/bookings`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al cargar las reservas del viaje");
      }

      setRideReservations(data.bookings || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setRideModalError(err.message || "Error al cargar las reservas del viaje");
      } else {
        setRideModalError("Error al cargar las reservas del viaje");
      }
    } finally {
      setLoadingRideReservations(false);
    }
  };

  const closeRideModal = () => {
    setSelectedRide(null);
    setRideReservations([]);
    setRideModalError("");
    setLoadingRideReservations(false);
  };

  const formatRideDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
  };

  return (
    <section className="w-full max-w-6xl mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold text-gray-950 mb-8">Mi Perfil</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Mis Reservas</h2>

          {loadingBookings ? (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm" aria-busy="true">
              <span className="loading-spinner" aria-hidden="true" />
              <p className="mt-2 text-gray-600">Cargando reservas...</p>
            </div>
          ) : errorBookings ? (
            <div className="rounded-lg border border-red-100 bg-red-50 p-4">
              <p className="text-red-700">{errorBookings}</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="empty-state">
              <h3 className="text-lg font-bold text-gray-950">Aún no tienes reservas</h3>
              <p className="mt-2 text-gray-600 text-sm">Explora los viajes disponibles y reserva tu próximo trayecto.</p>
              <Link className="btn btn-primary mt-4 text-sm" to="/rides">Buscar viajes</Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {bookings.map((booking) => (
                <article key={booking.id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{booking.ride.route}</h3>
                        <p className="text-sm text-gray-600">{formatRideDate(booking.ride.date)}</p>
                      </div>
                      <span
                        className={`rounded-md px-2 py-1 text-xs font-bold ${
                          booking.status === "confirmed" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {booking.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mt-4 mb-4 bg-gray-50 p-3 rounded border border-gray-100">
                      <div>
                        <p className="text-gray-500 font-medium">Asientos</p>
                        <p className="font-bold text-gray-900">{booking.seatsReserved}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium">Precio total</p>
                        <p className="font-bold text-gray-900">{(booking.ride.price * booking.seatsReserved).toFixed(2)} €</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-auto pt-4 border-t border-gray-100">
                    <Link to={`/rides/${booking.ride.id}`} className="btn border border-gray-200 bg-white text-gray-700 flex-1 text-center text-sm py-2">
                      Ver viaje
                    </Link>
                    <button onClick={() => handleCancelBooking(booking.id)} className="btn bg-red-50 text-red-600 hover:bg-red-100 flex-1 text-sm py-2">
                      Cancelar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">Mis Viajes Publicados</h2>
            <Link to="/create-ride" className="btn btn-primary text-sm py-1.5 px-3">+ Nuevo</Link>
          </div>

          {loadingRides ? (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm" aria-busy="true">
              <span className="loading-spinner" aria-hidden="true" />
              <p className="mt-2 text-gray-600">Cargando viajes...</p>
            </div>
          ) : errorRides ? (
            <div className="rounded-lg border border-red-100 bg-red-50 p-4">
              <p className="text-red-700">{errorRides}</p>
            </div>
          ) : rides.length === 0 ? (
            <div className="empty-state">
              <h3 className="text-lg font-bold text-gray-950">No has publicado viajes</h3>
              <p className="mt-2 text-gray-600 text-sm">Empieza a compartir coche y ahorra gastos.</p>
              <Link className="btn btn-primary mt-4 text-sm" to="/create-ride">Publicar viaje</Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {rides.map((ride) => (
                <article key={ride.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Viaje publicado</p>
                      <h3 className="mt-1 text-lg font-bold text-gray-900">
                        {ride.origin} &rarr; {ride.destination}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">{formatRideDate(ride.departureDate)}</p>
                    </div>
                    <span
                      className={`inline-flex w-fit rounded-md px-2 py-1 text-xs font-bold ${
                        ride.status === "open" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {ride.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500">Ruta</p>
                      <p className="mt-1 font-bold text-gray-900">{ride.origin} &rarr; {ride.destination}</p>
                    </div>
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500">Fecha</p>
                      <p className="mt-1 font-bold text-gray-900">{formatRideDate(ride.departureDate)}</p>
                    </div>
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500">Asientos libres</p>
                      <p className="mt-1 font-bold text-gray-900">{ride.availableSeats}</p>
                    </div>
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500">Reservas</p>
                      <p className="mt-1 font-bold text-gray-900">{ride.bookingsCount}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
                    <p className="font-semibold text-gray-700">Acciones de gestión</p>
                    <p className="mt-1 text-gray-600">Revisa quién se ha apuntado a este viaje.</p>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button type="button" className="btn border border-gray-200 bg-white text-gray-700" onClick={() => void openRideReservations(ride)}>
                        Ver reservas
                      </button>
                      <button type="button" className="btn bg-red-50 text-red-700 hover:bg-red-100" disabled>
                        Cancelar publicación
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <Link to={`/rides/${ride.id}`} className="btn border border-gray-200 bg-white text-gray-700 w-full text-center text-sm py-2 block">
                      Ver detalles
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedRide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="ride-bookings-title">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Reservas del viaje</p>
                <h3 id="ride-bookings-title" className="mt-1 text-2xl font-bold text-gray-950">
                  {selectedRide.origin} &rarr; {selectedRide.destination}
                </h3>
              </div>
              <button type="button" className="text-sm font-semibold text-gray-500 hover:text-gray-800" onClick={closeRideModal}>
                Cerrar
              </button>
            </div>

            {rideModalError && <p className="message message-error mt-4">{rideModalError}</p>}

            {loadingRideReservations ? (
              <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-6" aria-busy="true">
                <span className="loading-spinner" aria-hidden="true" />
                <p className="mt-2 text-gray-600">Cargando reservas...</p>
              </div>
            ) : rideReservations.length === 0 ? (
              <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-6">
                <p className="text-gray-700 font-semibold">Todavía no hay reservas para este viaje.</p>
                <p className="mt-1 text-sm text-gray-600">Cuando alguien reserve, aparecerá aquí su nombre, email y número de plazas.</p>
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {rideReservations.map((reservation) => (
                  <article key={reservation.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-bold text-gray-950">{reservation.passenger.username}</p>
                        <p className="text-sm text-gray-600">{reservation.passenger.email}</p>
                        <p className="mt-2 text-sm text-gray-700">Asientos: {reservation.seatsReserved}</p>
                        <p className="text-sm text-gray-700">Estado: {reservation.status.toUpperCase()}</p>
                      </div>
                      <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-gray-700">
                        {new Date(reservation.createdAt).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
