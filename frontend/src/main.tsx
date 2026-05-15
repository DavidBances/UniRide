import { StrictMode, useEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import "./index.css";
import Login from "./Login";
import Register from "./Register";
import Layout from "./components/Layout";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <AuthPage title="UniRide | Login">
              <Login />
            </AuthPage>
          }
        />
        <Route
          path="/register"
          element={
            <AuthPage title="UniRide | Register">
              <Register />
            </AuthPage>
          }
        />
        <Route
          path="*"
          element={
            <Layout>
              <App />
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);

function AuthPage({ children, title }: { children: ReactNode; title: string }) {
  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <div className="h-screen flex flex-col bg-[radial-gradient(circle_at_85%_10%,rgba(255,209,102,0.45),transparent_35%),radial-gradient(circle_at_15%_85%,rgba(32,201,151,0.35),transparent_40%),linear-gradient(135deg,#09111f_0%,#182235_55%,#0f1c2f_100%)]">
      <div className="w-full flex items-center justify-start px-4 sm:px-6 lg:px-8 py-2">
        <Link to="/" className="text-xl font-bold text-white tracking-tight">
          UniRide
        </Link>
      </div>

      <main className="flex-1 w-full flex items-center justify-center px-4 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="w-full py-2 px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-white/80">
          &copy; {new Date().getFullYear()} UniRide. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
