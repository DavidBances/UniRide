import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getStoredToken } from "./authToken";
import Login from "./Login";
import Register from "./Register";
import RidesPage from "./RidesPage";
import SessionPlaceholder from "./SessionPlaceholder";

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

  return (
    <div>
      <Header />
      <main>{renderPage(currentPath, hasToken)}</main>
    </div>
  );
}

function Header() {
  return <header />;
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
      return <SessionPlaceholder />;
    case "/placeholder":
      return <SessionPlaceholder />;
    default:
      return <NotFoundPage />;
  }
}

function HomePage() {
  return null;
}

function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}

function NotFoundPage() {
  return (
    <section>
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <a href="/">Go back home</a>
    </section>
  );
}

function RedirectingPrivatePage() {
  return (
    <section>
      <h1>Redirecting</h1>
      <p>Inicia sesión para acceder a esta página.</p>
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
