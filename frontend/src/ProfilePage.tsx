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
    averageRating: number;
    reviewCount: number;
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
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");

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

  const openReviewForm = (booking: Booking) => {
    setReviewBooking(booking);
    setReviewRating(5);
    setReviewComment("");
    setReviewError("");
  };

  const handleSubmitReview = async () => {
    const token = getStoredToken();
    if (!reviewBooking || !token) {
      navigate("/login", { replace: true });
      return;
    }

    setReviewLoading(true);
    setReviewError("");

    try {
      const response = await fetch(apiUrl("/api/reviews"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rideId: reviewBooking.ride.id,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setReviewError(data.error ?? "Could not submit review.");
        return;
      }

      setReviewBooking(null);
      setReviewComment("");
    } catch {
      setReviewError("Connection error while submitting the review.");
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="w-full py-6" aria-busy="true" aria-label="Loading dashboard">
        <div className="mb-6">
          <div className="skeleton h-4 w-14 mb-3" />
          <div className="skeleton h-9 w-64 mb-3" />
          <div className="skeleton h-4 w-80 max-w-full" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="skeleton h-5 w-20 mb-4" />
            <div className="grid gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <div className="skeleton h-3 w-16 mb-1" />
                  <div className="skeleton h-5 w-32" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <div className="skeleton h-4 w-16 mb-3" />
                <div className="skeleton h-10 w-12 mb-2" />
                <div className="skeleton h-3 w-24" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="skeleton h-6 w-28 mb-1" />
          <div className="skeleton h-4 w-48 mb-4" />
          <div className="grid gap-3">
            <BookingCardSkeleton />
            <BookingCardSkeleton />
          </div>
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
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
              <p className="font-bold text-gray-950">No bookings yet</p>
              <p className="mt-2 text-sm text-gray-600">
                Find an open ride and reserve your first seat to see it here.
              </p>
              <Link className="btn btn-primary mt-4 inline-flex" to="/rides">
                Browse rides
              </Link>
            </div>
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
                    <ProfileField label="Rating" value={formatRating(booking.ride.averageRating, booking.ride.reviewCount)} />
                  </dl>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {booking.ride.status === "completed" && (
                      <button
                        className="btn border border-teal-200 bg-teal-50 text-sm text-teal-800"
                        type="button"
                        onClick={() => openReviewForm(booking)}
                      >
                        Rate ride
                      </button>
                    )}
                    <button
                      className="btn border border-red-200 bg-red-50 text-sm text-red-700"
                      type="button"
                      onClick={() => handleDeleteBooking(booking.id)}
                      disabled={deletingBookingId === booking.id}
                    >
                      {deletingBookingId === booking.id && <span className="button-spinner border-red-200 border-t-red-700" aria-hidden="true" />}
                      {deletingBookingId === booking.id ? "Cancelling..." : "Cancel booking"}
                    </button>
                  </div>
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

      {reviewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="review-title">
          <div className="max-h-full w-full max-w-md overflow-auto rounded-lg bg-white p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-950" id="review-title">Rate ride</h2>
            <p className="mt-2 text-sm text-gray-600">{reviewBooking.ride.route}</p>

            {reviewError && <p className="message message-error mt-4">{reviewError}</p>}

            <div className="mt-5 grid gap-4">
              <div className="field">
                <label className="text-label" htmlFor="review-rating">
                  Rating
                </label>
                <select
                  className="input"
                  id="review-rating"
                  value={reviewRating}
                  onChange={(event) => setReviewRating(Number(event.target.value))}
                >
                  <option value={5}>5 - Excellent</option>
                  <option value={4}>4 - Good</option>
                  <option value={3}>3 - Okay</option>
                  <option value={2}>2 - Poor</option>
                  <option value={1}>1 - Bad</option>
                </select>
              </div>

              <div className="field">
                <label className="text-label" htmlFor="review-comment">
                  Comment
                </label>
                <textarea
                  className="input min-h-24"
                  id="review-comment"
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                className="btn border border-gray-200 bg-white text-gray-800 sm:flex-1"
                type="button"
                onClick={() => setReviewBooking(null)}
                disabled={reviewLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary sm:flex-1"
                type="button"
                onClick={handleSubmitReview}
                disabled={reviewLoading}
              >
                {reviewLoading && <span className="button-spinner" aria-hidden="true" />}
                {reviewLoading ? "Submitting..." : "Submit review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function BookingCardSkeleton() {
  return (
    <article className="rounded-lg border border-gray-100 bg-gray-50 p-4" aria-hidden="true">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="skeleton h-5 w-40" />
          <div className="skeleton mt-2 h-4 w-28" />
        </div>
        <div className="skeleton h-6 w-20 rounded-md" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
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
      <div className="mt-4 skeleton h-9 w-full" />
    </article>
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

function formatRating(averageRating: number, reviewCount: number) {
  if (!reviewCount) {
    return "No ratings yet";
  }

  return `${Number(averageRating).toFixed(1)}/5 (${reviewCount})`;
}
