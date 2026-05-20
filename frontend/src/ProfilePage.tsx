import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl } from "./api";
import { clearStoredToken, getStoredToken } from "./authToken";

type User = {
  id: number;
  username: string;
  email: string;
};

type MeResponse = {
  user?: User;
};

type Booking = {
  id: number;
  seatsReserved: number;
  status: string;
  createdAt: string;
  ride: {
    id: number;
    route: string;
    origin: string;
    destination: string;
    date: string;
    price: number;
    status: string;
  };
};

type BookingsResponse = {
  bookings?: Booking[];
  error?: string;
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingBookingId, setDeletingBookingId] = useState<number | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const controller = new AbortController();

    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [meResponse, bookingsResponse] = await Promise.all([
          fetch(apiUrl("/api/private/me"), { headers, signal: controller.signal }),
          fetch(apiUrl("/api/me/bookings"), { headers, signal: controller.signal }),
        ]);

        if (!meResponse.ok) {
          throw new Error("invalid session");
        }

        const meData = (await meResponse.json()) as MeResponse;
        if (!meData.user) {
          throw new Error("missing user");
        }

        setUser(meData.user);

        if (bookingsResponse.ok) {
          const bookingsData = (await bookingsResponse.json()) as BookingsResponse;
          setBookings(bookingsData.bookings ?? []);
        } else {
          setBookings([]);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        clearStoredToken();
        setError("No se pudo cargar tu perfil. Vuelve a iniciar sesion.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => controller.abort();
  }, [navigate]);

  const stats = useMemo(() => buildStats(bookings), [bookings]);

  const handleLogout = () => {
    clearStoredToken();
    navigate("/login", { replace: true });
  };

  const handleDeleteBooking = async (bookingId: number) => {
    const token = getStoredToken();
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setDeletingBookingId(bookingId);
    setError("");

    try {
      const response = await fetch(apiUrl(`/api/bookings/${bookingId}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "No se pudo cancelar la reserva.");
        return;
      }

      setBookings((current) => current.filter((booking) => booking.id !== bookingId));
    } catch {
      setError("Error de conexion al intentar cancelar la reserva.");
    } finally {
      setDeletingBookingId(null);
    }
  };

  if (loading) {
    return (
      <section className="w-full py-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase text-teal-700">Profile</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-950">Loading your dashboard</h1>
          <p className="mt-2 text-gray-600">Checking your session and latest bookings.</p>
        </div>
      </section>
    );
  }

  if (error || !user) {
    return (
      <section className="w-full py-6">
        <div className="rounded-lg border border-red-100 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-950">Profile unavailable</h1>
          <p className="mt-2 text-red-700">{error || "No se pudo cargar tu perfil."}</p>
          <Link className="btn btn-primary mt-5 inline-flex" to="/login">
            Login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full py-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase text-teal-700">Profile</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-950">Welcome, {user.username}</h1>
          <p className="mt-2 text-gray-600">Manage your rides, reservations and account access from one place.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <a className="btn border border-gray-200 bg-white text-gray-800" href="#my-bookings">
            My bookings
          </a>
          <a className="btn border border-gray-200 bg-white text-gray-800" href="#my-rides">
            My rides
          </a>
          <button className="btn btn-primary" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {error && <p className="message message-error mb-4">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <aside className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-950">Basic info</h2>
          <dl className="mt-4 grid gap-4">
            <ProfileField label="Username" value={user.username} />
            <ProfileField label="Email" value={user.email} />
            <ProfileField label="Account status" value="Authenticated" />
          </dl>
        </aside>

        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" key={stat.label}>
              <p className="text-sm font-semibold text-gray-500">{stat.label}</p>
              <p className="mt-3 text-3xl font-bold text-gray-950">{stat.value}</p>
              <p className="mt-2 text-sm text-gray-600">{stat.caption}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section id="my-bookings" className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-950">My bookings</h2>
              <p className="text-sm text-gray-600">Your latest passenger reservations.</p>
            </div>
            <Link className="text-sm font-bold text-teal-700 hover:underline" to="/rides">
              Find rides
            </Link>
          </div>

          {bookings.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 p-4 text-gray-600">
              You do not have bookings yet.
            </p>
          ) : (
            <div className="grid gap-3">
              {bookings.slice(0, 3).map((booking) => (
                <article className="rounded-lg border border-gray-100 bg-gray-50 p-4" key={booking.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-bold text-gray-950">{booking.ride.route}</h3>
                      <p className="mt-1 text-sm text-gray-600">{formatDate(booking.ride.date)}</p>
                    </div>
                    <span className="w-fit rounded-md bg-teal-50 px-2 py-1 text-sm font-bold text-teal-700">
                      {booking.status}
                    </span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <ProfileField label="Seats" value={String(booking.seatsReserved)} />
                    <ProfileField label="Price" value={`${Number(booking.ride.price).toFixed(2)} EUR`} />
                  </dl>
                  <button
                    className="btn mt-4 w-full border border-red-200 bg-red-50 text-sm text-red-700"
                    type="button"
                    onClick={() => handleDeleteBooking(booking.id)}
                    disabled={deletingBookingId === booking.id}
                  >
                    {deletingBookingId === booking.id ? "Cancelling..." : "Cancel booking"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="my-rides" className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-gray-950">My rides</h2>
          <p className="mt-2 text-sm text-gray-600">
            Publish a ride or review the public rides list while personal ride management is completed.
          </p>
          <div className="mt-5 grid gap-3">
            <Link className="btn btn-primary text-center" to="/create-ride">
              Publish ride
            </Link>
            <Link className="btn border border-gray-200 bg-white text-center text-gray-800" to="/rides">
              Browse rides
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-label">{label}</dt>
      <dd className="mt-1 break-words font-bold text-gray-950">{value}</dd>
    </div>
  );
}

function buildStats(bookings: Booking[]) {
  const activeBookings = bookings.filter((booking) => booking.status !== "cancelled").length;
  const reservedSeats = bookings.reduce((total, booking) => total + booking.seatsReserved, 0);

  return [
    {
      label: "Bookings",
      value: String(bookings.length),
      caption: "Total reservations",
    },
    {
      label: "Active",
      value: String(activeBookings),
      caption: "Ready or pending",
    },
    {
      label: "Seats",
      value: String(reservedSeats),
      caption: "Reserved seats",
    },
  ];
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
