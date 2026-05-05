import { useEffect } from "react";
import Login from "./Login";
import SessionPlaceholder from "./SessionPlaceholder";

export default function App() {
  useEffect(() => {
    if (window.location.pathname === "/placeholder") {
      document.title = "UniRide | Placeholder";
      return;
    }

    document.title = "UniRide | Login";
  }, []);

  if (window.location.pathname === "/placeholder") {
    return <SessionPlaceholder />;
  }

  return <Login />;
}