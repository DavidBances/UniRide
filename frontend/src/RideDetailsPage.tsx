import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "./api";

type RideDetail = {
  id: number;
  origin: string;
  destination: string;
  departureDate: string;
  availableSeats: number;
  price: number;
  status: string;
  driver: {
    username: string;
    rating_average: number;
  };
};

export default function RideDetailsPage({ rideId }: { rideId: string }) {
  const [ride, setRide] = useState<RideDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchRide = async () => {
      try {
        const response = await fetch(apiUrl(`/api/rides/${rideId}`), {
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo cargar el viaje");
        }

        setRide(data.ride);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err.message || "Error de conexión");
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchRide();

    return () => controller.abort();
  }, [rideId]);

  if (loading) {
    return (
      <section className="w-full py-6" aria-busy="true">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <span className="loading-spinner" aria-hidden="true" />
          <p className="mt-2 text-gray-600">Cargando detalles del viaje...</p>
        </div>
      </section>
    );
  }

  if (error || !ride) {
    return (
      <section className="w-full py-6">
        <div className="rounded-lg border border-red-100 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-950">Viaje no encontrado</h1>
          <p className="mt-2 text-red-700">{error || "El viaje que buscas no existe."}</p>
          <Link className="btn btn-primary mt-5 inline-flex" to="/rides">
            Volver a viajes
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-3xl mx-auto py-6">
      <Link to="/rides" className="text-sm font-bold text-teal-700 hover:underline mb-6 inline-block">
        &larr; Volver a los viajes
      </Link>
      
      <div className="rounded-lg border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-950">
              {ride.origin} &rarr; {ride.destination}
            </h1>
            <p className="text-lg text-gray-600 mt-2">
              {new Date(ride.departureDate).toLocaleString("es-ES", {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </p>
          </div>
          <span className={`rounded-md px-3 py-1 text-sm font-bold w-fit ${ride.status === "open" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>
            {ride.status.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg">
            <p className="text-sm text-gray-500 font-semibold mb-1">Conductor</p>
            <p className="font-bold text-gray-900">{ride.driver.username}</p>
            <p className="text-xs text-gray-600 mt-1">
              {ride.driver.rating_average ? `${ride.driver.rating_average.toFixed(1)}/5 rating` : "Sin valoraciones"}
            </p>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg">
            <p className="text-sm text-gray-500 font-semibold mb-1">Precio</p>
            <p className="font-bold text-gray-900 text-xl">{Number(ride.price).toFixed(2)} €</p>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg">
            <p className="text-sm text-gray-500 font-semibold mb-1">Asientos libres</p>
            <p className="font-bold text-gray-900 text-xl">{ride.availableSeats}</p>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg">
            <p className="text-sm text-gray-500 font-semibold mb-1">Notas</p>
            <p className="text-sm text-gray-700">Sin notas adicionales proporcionadas por el conductor.</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <button 
            className="btn btn-primary w-full text-lg py-3" 
            type="button"
            disabled={ride.availableSeats === 0 || ride.status !== "open"}
            onClick={() => alert("El flujo de reservas interactivo se activará en el próximo Sprint de Bookings.")}
          >
            {ride.status !== "open" 
              ? "Viaje completado / cerrado" 
              : ride.availableSeats === 0 
              ? "No quedan plazas" 
              : "Solicitar reserva (Placeholder)"}
          </button>
        </div>
      </div>
    </section>
  );
}