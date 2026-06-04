import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import App from "./App";
import { LanguageProvider } from "./i18n";
import { LocalizedLoginRoute, LocalizedRegisterRoute } from "./LocalizedAuthRoutes";

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
