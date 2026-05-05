import { useEffect, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import Login from "./Login";

const routes = [
  { path: "/", label: "Home" },
  { path: "/login", label: "Login" },
  { path: "/register", label: "Register" },
  { path: "/rides", label: "Rides" },
  { path: "/create-ride", label: "Create ride" },
  { path: "/profile", label: "Profile" },
];

function App() {
  const [currentPath, setCurrentPath] = useState(getCurrentPath());

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(getCurrentPath());
    };

    window.addEventListener("popstate", handleLocationChange);

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  const navigateTo = (path: string) => {
    if (path === currentPath) {
      return;
    }

    window.history.pushState({}, "", path);
    setCurrentPath(path);
  };

  return (
    <div>
      <Header currentPath={currentPath} onNavigate={navigateTo} />
      <main>{renderPage(currentPath)}</main>
    </div>
  );
}

function Header({
  currentPath,
  onNavigate,
}: {
  currentPath: string;
  onNavigate: (path: string) => void;
}) {
  return (
    <header>
      <nav aria-label="Main navigation">
        {routes.map((route) => (
          <NavigationLink
            key={route.path}
            path={route.path}
            currentPath={currentPath}
            onNavigate={onNavigate}
          >
            {route.label}
          </NavigationLink>
        ))}
      </nav>
    </header>
  );
}

function NavigationLink({
  path,
  currentPath,
  onNavigate,
  children,
}: {
  path: string;
  currentPath: string;
  onNavigate: (path: string) => void;
  children: ReactNode;
}) {
  const isActive = currentPath === path;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();
    onNavigate(path);
  };

  return (
    <a
      href={path}
      onClick={handleClick}
      aria-current={isActive ? "page" : undefined}
    >
      {children}
    </a>
  );
}

function renderPage(path: string) {
  switch (path) {
    case "/":
      return <HomePage />;
    case "/login":
      return <Login />;
    case "/register":
      return (
        <PlaceholderPage
          title="Register"
          description="User registration page ready for the next sprint."
        />
      );
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
    default:
      return <NotFoundPage />;
  }
}

function HomePage() {
  return (
    <section>
      <h1>UniRide</h1>
      <p>
        Shared university rides for students. This page is ready for future
        product content.
      </p>
    </section>
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