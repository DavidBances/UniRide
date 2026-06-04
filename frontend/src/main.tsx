import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import AuthPage from "./AuthPage";
import Login from "./Login";
import Register from "./Register";
import App from "./App";
import { LanguageProvider, useT } from "./i18n";

function LocalizedLoginRoute() {
  const t = useT();

  return (
    <AuthPage title={`UniRide | ${t("auth.loginTitle")}`}>
      <Login />
    </AuthPage>
  );
}

function LocalizedRegisterRoute() {
  const t = useT();

  return (
    <AuthPage title={`UniRide | ${t("auth.registerTitle")}`}>
      <Register />
    </AuthPage>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LocalizedLoginRoute />} />
          <Route path="/register" element={<LocalizedRegisterRoute />} />
          <Route path="*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  </StrictMode>
);
