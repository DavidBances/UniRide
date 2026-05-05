import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import Login from "./Login";
import Layout from "./components/Layout";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* Página de inicio temporal */}
          <Route path="/" element={<div className="text-center mt-20"><h1 className="text-3xl font-bold text-blue-600">Bienvenido a UniRide</h1><p className="mt-4 text-gray-600">Página principal en construcción...</p></div>} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  </StrictMode>
);
