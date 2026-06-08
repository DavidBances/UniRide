import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getStoredToken, onAuthTokenChanged } from "./authToken";
import Layout from "./components/Layout";
import Login from "./Login";
import ProfilePage from "./ProfilePage";
import Register from "./Register";
import RidesPage from "./RidesPage";
import RideDetailsPage from "./RideDetailsPage";
import CreateRide from "./CreateRide";
import { useT } from "./i18n";

function App() {
  const t = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = normalizePath(location.pathname);
  const [hasToken, setHasToken] = useState(() => Boolean(getStoredToken()));

  useEffect(() => {
    if (currentPath.startsWith("/rides/") && currentPath.length > 7) {
      document.title = `${t("appName")} | ${t("rideDetails.pageTitle")}`;
    } else {
      document.title = getPageTitle(currentPath, t);
    }
  }, [currentPath, t]);

  useEffect(() => onAuthTokenChanged(() => setHasToken(Boolean(getStoredToken()))), []);

  useEffect(() => {
    if (isPrivateRoute(currentPath) && !hasToken) {
      navigate("/login", { replace: true });
    }
  }, [currentPath, hasToken, navigate]);

  return <Layout>{renderPage(currentPath, hasToken, t)}</Layout>;
}

function renderPage(path: string, hasToken: boolean, t: ReturnType<typeof useT>) {
  if (isPrivateRoute(path) && !hasToken) {
    return <RedirectingPrivatePage />;
  }

  if (path.startsWith("/rides/") && path.length > 7) {
    const rideId = path.split("/")[2];
    if (rideId) return <RideDetailsPage rideId={rideId} />;
  }

  switch (path) {
    case "/":
      return <HomePage isAuthenticated={hasToken} />;
    case "/login":
      return <Login />;
    case "/register":
      return <Register />;
    case "/rides":
      return <RidesPage />;
    case "/create-ride":
      return <CreateRide />;
    case "/profile":
      return <ProfilePage />;
    case "/placeholder":
      return (
        <PlaceholderPage
          title={t("shared.comingSoon")}
          description={t("shared.pageNotFoundCopy")}
        />
      );
    default:
      return <NotFoundPage />;
  }
}

function HomePage({ isAuthenticated }: { isAuthenticated: boolean }) {
  const t = useT();

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-teal-100 bg-white px-6 py-8 shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:px-8 lg:px-10 lg:py-12">
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-r from-teal-50 via-cyan-50 to-emerald-50" aria-hidden="true" />
      <div className="absolute -left-10 top-16 h-32 w-32 rounded-full bg-teal-200/30 blur-3xl" aria-hidden="true" />
      <div className="absolute right-4 top-8 h-24 w-24 rounded-full bg-emerald-200/30 blur-3xl" aria-hidden="true" />

      <div className={`relative ${isAuthenticated ? "space-y-8" : "grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"}`}>
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-teal-800">
            {t("home.kicker")}
          </div>
          <div className="space-y-4">
            <h1 className="max-w-xl text-4xl font-bold leading-[1.05] text-gray-950 sm:text-5xl lg:text-6xl">
              {t("home.title")}
            </h1>
            <p className="max-w-2xl text-lg text-gray-600 sm:text-xl">
              {t("home.subtitle")}
            </p>
          </div>

          {isAuthenticated && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link className="btn btn-primary text-center sm:px-6" to="/rides">
                {t("home.findRides")}
              </Link>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <HomeMetric label={t("home.book")} value={t("home.bookCopy")} />
            <HomeMetric label={t("home.publish")} value={t("home.publishCopy")} />
            <HomeMetric label={t("home.organize")} value={t("home.organizeCopy")} />
          </div>
        </div>

        {!isAuthenticated && (
          <div className="relative overflow-hidden rounded-[1.75rem] border border-teal-100 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 p-5 text-white shadow-[0_20px_50px_rgba(15,23,42,0.24)] sm:p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.24),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.18),transparent_28%)]" aria-hidden="true" />
            <div className="relative space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-teal-50">
                {t("home.cardKicker")}
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl font-bold leading-tight text-white">{t("home.cardTitle")}</h2>
                <p className="max-w-md text-base text-teal-50/85">
                  {t("home.cardDescription")}
                </p>
              </div>

              <div className="grid gap-3">
                <HomeFeature label={t("home.book")} value={t("home.bookCopy")} dark />
                <HomeFeature label={t("home.publish")} value={t("home.publishCopy")} dark />
                <HomeFeature label={t("home.organize")} value={t("home.organizeCopy")} dark />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link className="btn btn-primary text-center sm:px-6" to="/register">
                  {t("home.createAccount")}
                </Link>
                <Link className="btn border border-white/10 bg-white/10 text-center text-white sm:px-6" to="/rides">
                  {t("home.browseRides")}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function HomeMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4 shadow-sm backdrop-blur-sm">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-800">{label}</p>
      <p className="mt-2 text-sm font-semibold text-gray-950">{value}</p>
    </div>
  );
}

function HomeFeature({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${dark ? "border-white/10 bg-white/5" : "border-gray-100 bg-gray-50"}`}>
      <dt className={`font-bold ${dark ? "text-white" : "text-gray-950"}`}>{label}</dt>
      <dd className={`mt-1 text-sm ${dark ? "text-teal-50/80" : "text-gray-600"}`}>{value}</dd>
    </div>
  );
}

function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const t = useT();

  return (
    <section className="empty-state my-6">
      <p className="text-sm font-bold uppercase text-teal-700">{t("shared.comingSoon")}</p>
      <h1 className="mt-2 text-2xl font-bold text-gray-950">{title}</h1>
      <p className="mt-2 text-gray-600">{description}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Link className="btn btn-primary text-center" to="/rides">
          {t("shared.browseRides")}
        </Link>
        <Link className="btn border border-gray-200 bg-white text-center text-gray-800" to="/profile">
          {t("shared.goToProfile")}
        </Link>
      </div>
    </section>
  );
}

function NotFoundPage() {
  const t = useT();

  return (
    <section className="empty-state my-6">
      <h1 className="text-2xl font-bold text-gray-950">{t("shared.pageNotFound")}</h1>
      <p className="mt-2 text-gray-600">{t("shared.pageNotFoundCopy")}</p>
      <Link className="btn btn-primary mt-5" to="/">
        {t("shared.goBackHome")}
      </Link>
    </section>
  );
}

function RedirectingPrivatePage() {
  const t = useT();

  return (
    <section className="empty-state my-6" aria-busy="true">
      <span className="loading-spinner" aria-hidden="true" />
      <h1 className="mt-4 text-2xl font-bold text-gray-950">{t("shared.redirecting")}</h1>
      <p className="mt-2 text-gray-600">{t("shared.redirectingCopy")}</p>
    </section>
  );
}

function getPageTitle(path: string, t: ReturnType<typeof useT>) {
  switch (path) {
    case "/":
      return t("appName");
    case "/login":
      return `${t("appName")} | ${t("auth.loginTitle")}`;
    case "/register":
      return `${t("appName")} | ${t("auth.registerTitle")}`;
    case "/rides":
      return `${t("appName")} | ${t("rides.title")}`;
    case "/create-ride":
      return `${t("appName")} | ${t("nav.publishRide")}`;
    case "/profile":
      return `${t("appName")} | ${t("profile.title")}`;
    case "/placeholder":
      return `${t("appName")} | ${t("shared.comingSoon")}`;
    default:
      return t("appName");
  }
}

function isPrivateRoute(path: string) {
  return path === "/profile" || path === "/create-ride";
}

function normalizePath(path: string) {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }

  return path;
}

export default App;
