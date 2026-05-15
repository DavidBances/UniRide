import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "./api";
import { clearStoredToken, getStoredToken } from "./authToken";
import "./Login.css";

type User = {
  id: number;
  username: string;
  email: string;
};

type MeResponse = {
  user: User;
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
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      window.location.replace("/login");
      return;
    }

    const controller = new AbortController();

    const loadProfile = async () => {
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
        setError("No se pudo cargar tu perfil. Inicia sesión de nuevo.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => controller.abort();
  }, []);

  const upcomingBookings = useMemo(
    () => bookings.filter((booking) => new Date(booking.ride.date).getTime() >= Date.now()).length,
    [bookings]
  );

  const handleLogout = () => {
    clearStoredToken();
    window.location.replace("/");
  };

  if (loading) {
    return (
      <section className="w-full py-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-label">Verificando sesión</p>
          <h1 className="text-title">Cargando perfil</h1>
        </div>
      </section>
    );
  }

  if (error || !user) {
    return (
      <section className="w-full py-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-title">No se pudo cargar el perfil</h1>
          <p className="message message-error mt-3">{error || "Usuario no autenticado."}</p>
          <button className="btn btn-primary mt-4" type="button" onClick={() => window.location.replace("/login")}>
            Ir a login
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full py-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-label">Perfil</p>
          <h1 className="text-title">Hola, {user.username}</h1>
          <p className="text-gray-600">{user.email}</p>
        </div>
        <button className="btn btn-primary md:w-auto" type="button" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="My bookings" value={bookings.length.toString()} />
        <StatCard label="Upcoming bookings" value={upcomingBookings.toString()} />
        {/* TODO: Connect this stat when a GET /api/me/rides or equivalent endpoint exists. */}
        <StatCard label="My rides" value="Pending" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">My bookings</h2>
              <p className="text-sm text-gray-600">Reservas hechas con tu cuenta.</p>
            </div>
            <a className="btn border border-gray-200 bg-white text-gray-700" href="#my-bookings">
              My bookings
            </a>
          </div>

          <div id="my-bookings" className="grid gap-3">
            {bookings.length === 0 ? (
              <p className="rounded-lg bg-gray-50 p-4 text-gray-600">Aún no tienes reservas.</p>
            ) : (
              bookings.map((booking) => (
                <article className="rounded-lg border border-gray-200 p-4" key={booking.id}>
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-gray-900">{booking.ride.route}</h3>
                      <p className="text-sm text-gray-600">{formatDate(booking.ride.date)}</p>
                    </div>
                    <span className="rounded-md bg-emerald-50 px-2 py-1 text-sm font-bold text-emerald-700">
                      {booking.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">
                    {booking.seatsReserved} seats · {Number(booking.ride.price).toFixed(2)} EUR
                  </p>
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Navigation</h2>
          <div className="mt-4 grid gap-3">
            <a className="btn border border-gray-200 bg-white text-gray-700" href="#my-bookings">
              My bookings
            </a>
            <button className="btn border border-gray-200 bg-gray-50 text-gray-500" type="button" disabled>
              My rides
            </button>
            <button className="btn btn-primary" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            TODO: habilitar My rides cuando exista un endpoint para viajes publicados por el usuario.
          </p>
        </aside>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-label">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
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
