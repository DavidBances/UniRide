import React, { useState } from "react";
import { apiUrl } from "./api";
import { getStoredToken } from "./authToken";

export default function CreateRide() {
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
      setError("Por favor, rellena todos los campos obligatorios.");
      return;
    }
    if (formData.availableSeats <= 0) {
      setError("El número de asientos debe ser mayor que 0.");
      return;
    }
    if (formData.price < 0) {
      setError("El precio no puede ser negativo.");
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setError("Debes iniciar sesión para publicar un viaje.");
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
        setError(data.error ?? "No se pudo publicar el viaje.");
        return;
      }

      setSuccess(data.message ?? "¡Viaje publicado con éxito!");
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
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-ride-container" style={{ maxWidth: "600px", margin: "2rem auto", padding: "20px", fontFamily: "sans-serif" }}>
      <h2 style={{ marginBottom: "20px" }}>Publicar un nuevo viaje</h2>

      {error && <div style={{ color: "#721c24", backgroundColor: "#f8d7da", padding: "12px", borderRadius: "5px", marginBottom: "20px" }}>{error}</div>}
      {success && <div style={{ color: "#155724", backgroundColor: "#d4edda", padding: "12px", borderRadius: "5px", marginBottom: "20px" }}>{success}</div>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Origen *</label>
          <input type="text" name="origin" value={formData.origin} onChange={handleChange} required placeholder="Ej: Universidad de León" style={{ width: "100%", padding: "10px", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ccc" }} />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Destino *</label>
          <input type="text" name="destination" value={formData.destination} onChange={handleChange} required placeholder="Ej: Centro de Madrid" style={{ width: "100%", padding: "10px", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ccc" }} />
        </div>
        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Fecha de salida *</label>
            <input type="date" name="departureDate" value={formData.departureDate} onChange={handleChange} required style={{ width: "100%", padding: "10px", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ccc" }} />
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Hora de salida *</label>
            <input type="time" name="departureTime" value={formData.departureTime} onChange={handleChange} required style={{ width: "100%", padding: "10px", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ccc" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Asientos disponibles *</label>
            <input type="number" min="1" name="availableSeats" value={formData.availableSeats} onChange={handleChange} required style={{ width: "100%", padding: "10px", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ccc" }} />
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Precio por asiento (€) *</label>
            <input type="number" min="0" step="0.01" name="price" value={formData.price} onChange={handleChange} required style={{ width: "100%", padding: "10px", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ccc" }} />
          </div>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Notas (opcional)</label>
          <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} placeholder="Detalles extra como lugar exacto de recogida..." style={{ width: "100%", padding: "10px", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ccc", resize: "vertical" }} />
        </div>

        <button type="submit" disabled={loading} style={{ padding: "12px", backgroundColor: "#0d6efd", color: "#fff", border: "none", borderRadius: "5px", cursor: loading ? "not-allowed" : "pointer", fontSize: "16px", fontWeight: "bold", marginTop: "10px" }}>
          {loading ? "Publicando..." : "Publicar Viaje"}
        </button>
      </form>
    </div>
  );
}
