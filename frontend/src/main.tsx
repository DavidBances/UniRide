import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import AuthPage from "./AuthPage";
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
