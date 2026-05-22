import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getStoredToken } from "./authToken";
import Layout from "./components/Layout";
import Login from "./Login";
import ProfilePage from "./ProfilePage";
import Register from "./Register";
import RidesPage from "./RidesPage";

const pageTitles: Record<string, string> = {
  "/": "UniRide",
  "/login": "UniRide | Login",
  "/register": "UniRide | Register",
  "/rides": "UniRide | Rides",
  "/create-ride": "UniRide | Create ride",
  "/profile": "UniRide | Profile",
  "/placeholder": "UniRide | Placeholder",
};

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = normalizePath(location.pathname);
  const hasToken = Boolean(getStoredToken());

  useEffect(() => {
    document.title = pageTitles[currentPath] ?? "UniRide";
  }, [currentPath]);

  useEffect(() => {
    if (isPrivateRoute(currentPath) && !hasToken) {
      navigate("/login", { replace: true });
    }
  }, [currentPath, hasToken, navigate]);

  return <Layout>{renderPage(currentPath, hasToken)}</Layout>;
}

function renderPage(path: string, hasToken: boolean) {
  if (isPrivateRoute(path) && !hasToken) {
    return <RedirectingPrivatePage />;
  }

  switch (path) {
    case "/":
      return <HomePage />;
    case "/login":
      return <Login />;
    case "/register":
      return <Register />;
    case "/rides":
      return <RidesPage />;
    case "/create-ride":
      return (
        <PlaceholderPage
          title="Create ride"
          description="Ride creation page ready for future implementation."
        />
      );
    case "/profile":
      return <ProfilePage />;
    case "/placeholder":
      return <ProfilePage />;
    default:
      return <NotFoundPage />;
  }
}

function HomePage() {
  return (
    <section className="grid gap-6 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div className="space-y-5">
        <p className="text-sm font-bold uppercase text-teal-700">Campus mobility</p>
        <h1 className="text-4xl font-bold leading-tight text-gray-950 sm:text-5xl">
          Share rides with your university community.
        </h1>
        <p className="max-w-2xl text-lg text-gray-600">
          Find available trips, reserve seats and manage your profile from one responsive dashboard.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link className="btn btn-primary text-center" to="/rides">
            Find rides
          </Link>
          <Link className="btn border border-gray-200 bg-white text-center text-gray-800" to="/register">
            Create account
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-gray-950">Ready for final review</h2>
        <dl className="mt-5 grid gap-4 text-sm">
          <HomeFeature label="Mobile friendly" value="Navigation, forms and cards adapt cleanly." />
          <HomeFeature label="Useful states" value="Loading, empty and error states guide the flow." />
          <HomeFeature label="Accessible basics" value="Clear labels, focus states and keyboard-friendly controls." />
        </dl>
      </div>
    </section>
  );
}

function HomeFeature({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
      <dt className="font-bold text-gray-950">{label}</dt>
      <dd className="mt-1 text-gray-600">{value}</dd>
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
  return (
    <section className="empty-state my-6">
      <p className="text-sm font-bold uppercase text-teal-700">Coming soon</p>
      <h1 className="mt-2 text-2xl font-bold text-gray-950">{title}</h1>
      <p className="mt-2 text-gray-600">{description}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Link className="btn btn-primary text-center" to="/rides">
          Browse rides
        </Link>
        <Link className="btn border border-gray-200 bg-white text-center text-gray-800" to="/profile">
          Go to profile
        </Link>
      </div>
    </section>
  );
}

function NotFoundPage() {
  return (
    <section className="empty-state my-6">
      <h1 className="text-2xl font-bold text-gray-950">Page not found</h1>
      <p className="mt-2 text-gray-600">The page you are looking for does not exist.</p>
      <Link className="btn btn-primary mt-5" to="/">
        Go back home
      </Link>
    </section>
  );
}

function RedirectingPrivatePage() {
  return (
    <section className="empty-state my-6" aria-busy="true">
      <span className="loading-spinner" aria-hidden="true" />
      <h1 className="mt-4 text-2xl font-bold text-gray-950">Redirecting</h1>
      <p className="mt-2 text-gray-600">Inicia sesión para acceder a esta página.</p>
    </section>
  );
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
