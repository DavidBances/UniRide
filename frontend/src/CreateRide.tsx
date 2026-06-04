import React, { useState } from "react";
import { apiUrl } from "./api";
import { getStoredToken } from "./authToken";
import { useT } from "./i18n";

export default function CreateRide() {
  const t = useT();
  const [formData, setFormData] = useState({
    origin: "",
    destination: "",
    departureDate: "",
    departureTime: "",
    availableSeats: 1,
    price: 0,
    notes: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.origin || !formData.destination || !formData.departureDate || !formData.departureTime) {
      setError(t("createRide.errorRequired"));
      return;
    }
    if (formData.availableSeats <= 0) {
      setError(t("createRide.errorSeats"));
      return;
    }
    if (formData.price < 0) {
      setError(t("createRide.errorPrice"));
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setError(t("createRide.loginRequired"));
      return;
    }

    setLoading(true);
    try {
      const departureISO = new Date(`${formData.departureDate}T${formData.departureTime}`).toISOString();

      const response = await fetch(apiUrl("/api/rides"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          origin: formData.origin,
          destination: formData.destination,
          departureDate: departureISO,
          availableSeats: Number(formData.availableSeats),
          price: Number(formData.price),
        }),
      });

      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        setError(data.error ?? t("createRide.submitError"));
        return;
      }

      setSuccess(data.message ?? t("createRide.success"));
      setFormData({
        origin: "",
        destination: "",
        departureDate: "",
        departureTime: "",
        availableSeats: 1,
        price: 0,
        notes: "",
      });
    } catch {
      setError(t("createRide.connectionError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-ride-container" style={{ maxWidth: "600px", margin: "2rem auto", padding: "20px", fontFamily: "sans-serif" }}>
      <h2 style={{ marginBottom: "20px" }}>{t("createRide.title")}</h2>

      {error && <div style={{ color: "#721c24", backgroundColor: "#f8d7da", padding: "12px", borderRadius: "5px", marginBottom: "20px" }}>{error}</div>}
      {success && <div style={{ color: "#155724", backgroundColor: "#d4edda", padding: "12px", borderRadius: "5px", marginBottom: "20px" }}>{success}</div>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>{t("createRide.origin")}</label>
          <input type="text" name="origin" value={formData.origin} onChange={handleChange} required placeholder={t("createRide.originPlaceholder")} style={{ width: "100%", padding: "10px", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ccc" }} />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>{t("createRide.destination")}</label>
          <input type="text" name="destination" value={formData.destination} onChange={handleChange} required placeholder={t("createRide.destinationPlaceholder")} style={{ width: "100%", padding: "10px", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ccc" }} />
        </div>
        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>{t("createRide.departureDate")}</label>
            <input type="date" name="departureDate" value={formData.departureDate} onChange={handleChange} required style={{ width: "100%", padding: "10px", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ccc" }} />
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>{t("createRide.departureTime")}</label>
            <input type="time" name="departureTime" value={formData.departureTime} onChange={handleChange} required style={{ width: "100%", padding: "10px", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ccc" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>{t("createRide.availableSeats")}</label>
            <input type="number" min="1" name="availableSeats" value={formData.availableSeats} onChange={handleChange} required style={{ width: "100%", padding: "10px", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ccc" }} />
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>{t("createRide.price")}</label>
            <input type="number" min="0" step="0.01" name="price" value={formData.price} onChange={handleChange} required style={{ width: "100%", padding: "10px", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ccc" }} />
          </div>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>{t("createRide.notes")}</label>
          <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} placeholder={t("createRide.notesPlaceholder")} style={{ width: "100%", padding: "10px", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ccc", resize: "vertical" }} />
        </div>

        <button type="submit" disabled={loading} style={{ padding: "12px", backgroundColor: "#0d6efd", color: "#fff", border: "none", borderRadius: "5px", cursor: loading ? "not-allowed" : "pointer", fontSize: "16px", fontWeight: "bold", marginTop: "10px" }}>
          {loading ? t("createRide.submitting") : t("createRide.submit")}
        </button>
      </form>
    </div>
  );
}
