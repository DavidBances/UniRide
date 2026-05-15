import { useEffect, useState } from "react";
import Login from "./Login";
import Register from "./Register";
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
  const [currentPath, setCurrentPath] = useState(getCurrentPath());

  useEffect(() => {
    document.title = pageTitles[currentPath] ?? "UniRide";
  }, [currentPath]);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(getCurrentPath());
    };

    window.addEventListener("popstate", handleLocationChange);

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  return (
    <div>
      <Header />
      <main>{renderPage(currentPath)}</main>
    </div>
  );
}

function Header() {
  return <header />;
}

function renderPage(path: string) {
  switch (path) {
    case "/":
      return <HomePage />;
    case "/login":
      return <Login />;
    case "/register":
      return <Register />;
    case "/rides":
      return (
        <PlaceholderPage
          title="Rides"
          description="Ride listing page ready for future ride features."
        />
      );
    case "/create-ride":
      return (
        <PlaceholderPage
          title="Create ride"
          description="Ride creation page ready for future implementation."
        />
      );
    case "/profile":
      return (
        <PlaceholderPage
          title="Profile"
          description="User profile page ready for future account features."
        />
      );
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

function getCurrentPath() {
  const path = window.location.pathname;

  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }

  return path;
}

export default App;
