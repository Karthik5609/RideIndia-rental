import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { getBikeImageUrl, handleBikeImageError } from "../../utils/bikeMedia";
import {
  composeLocation,
  getCityOptions,
  getPointsByCity
} from "../../utils/locationPoints";

function getTodayISO() {
  return new Date().toISOString().split("T")[0];
}

const citySuggestions = getCityOptions();

function getDefaultBookingForm(pickupCity) {
  const pickupPoints = getPointsByCity(pickupCity);
  const defaultDropCity = "Ooty";
  const dropPoints = getPointsByCity(defaultDropCity);
  return {
    startDate: getTodayISO(),
    endDate: getTodayISO(),
    pickupPoint: pickupPoints[0] || "",
    dropCity: defaultDropCity,
    dropPoint: dropPoints[0] || ""
  };
}

export default function BikeCatalog({ onBookingCreated = () => {} }) {
  const { isAuthenticated } = useAuth();
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [filters, setFilters] = useState({
    city: "",
    type: "",
    minPrice: "",
    maxPrice: ""
  });
  const [bookingForms, setBookingForms] = useState({});

  const queryParams = useMemo(() => {
    const params = {};
    if (filters.city) params.city = filters.city;
    if (filters.type) params.type = filters.type;
    if (filters.minPrice) params.minPrice = filters.minPrice;
    if (filters.maxPrice) params.maxPrice = filters.maxPrice;
    params.limit = 12;
    params.sort = "priceAsc";
    return params;
  }, [filters]);

  useEffect(() => {
    const fetchBikes = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/bikes", { params: queryParams });
        setBikes(data.data || []);
      } catch (apiError) {
        setError(getApiErrorMessage(apiError, "Failed to load bikes."));
      } finally {
        setLoading(false);
      }
    };

    fetchBikes();
  }, [queryParams]);

  const updateFilter = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const updateBookingField = (bike, name, value) => {
    setBookingForms((prev) => ({
      ...prev,
      [bike._id]: (() => {
        const current = {
          ...getDefaultBookingForm(bike.location.city),
          ...prev[bike._id],
          [name]: value
        };

        if (name === "dropCity") {
          const dropPoints = getPointsByCity(value);
          current.dropPoint = dropPoints[0] || "";
        }

        return current;
      })()
    }));
  };

  const createBooking = async (bike) => {
    if (!isAuthenticated) {
      setFeedback("Please login before booking a bike.");
      return;
    }

    const form = {
      ...getDefaultBookingForm(bike.location.city),
      ...bookingForms[bike._id]
    };

    try {
      const payload = {
        bikeId: bike._id,
        startDate: form.startDate,
        endDate: form.endDate,
        pickupLocation: composeLocation(bike.location.city, form.pickupPoint),
        dropLocation: composeLocation(form.dropCity, form.dropPoint)
      };
      const { data } = await api.post("/bookings", payload);
      setFeedback(data.message || "Booking confirmed.");
      if (data?.data?._id) {
        onBookingCreated(data.data);
        requestAnimationFrame(() => {
          document
            .getElementById("my-trips")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    } catch (apiError) {
      setFeedback(getApiErrorMessage(apiError, "Booking failed."));
    }
  };

  return (
    <section className="catalog-section">
      <div className="glass-card">
        <div className="section-head">
          <h2>Bike Catalog</h2>
          <p>Find the right bike with city, type, and budget filters.</p>
        </div>

        <div className="filter-grid">
          <select
            name="city"
            value={filters.city}
            onChange={updateFilter}
          >
            <option value="">All cities</option>
            {citySuggestions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <select name="type" value={filters.type} onChange={updateFilter}>
            <option value="">All types</option>
            <option value="commuter">Commuter</option>
            <option value="touring">Touring</option>
            <option value="adventure">Adventure</option>
            <option value="sports">Sports</option>
            <option value="cruiser">Cruiser</option>
            <option value="scooter">Scooter</option>
          </select>
          <input
            type="number"
            name="minPrice"
            placeholder="Min price/day"
            value={filters.minPrice}
            onChange={updateFilter}
          />
          <input
            type="number"
            name="maxPrice"
            placeholder="Max price/day"
            value={filters.maxPrice}
            onChange={updateFilter}
          />
        </div>

        {feedback && <p className="hint">{feedback}</p>}
        {error && <p className="error-text">{error}</p>}
      </div>

      {loading ? (
        <div className="glass-card">Loading bikes...</div>
      ) : bikes.length === 0 ? (
        <div className="glass-card">No bikes match these filters. Try another city or bike type.</div>
      ) : (
        <div className="bike-grid">
          {bikes.map((bike, index) => {
            const booking = {
              ...getDefaultBookingForm(bike.location.city),
              ...bookingForms[bike._id]
            };
            const pickupPoints = getPointsByCity(bike.location.city);
            const dropPoints = getPointsByCity(booking.dropCity);
            return (
              <motion.article
                key={bike._id}
                className="glass-card bike-card"
                initial={{ opacity: 0, x: index % 2 === 0 ? -24 : 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.45 }}
              >
                <img
                  src={getBikeImageUrl(bike)}
                  alt={`${bike.brand} ${bike.model}`}
                  className="bike-image"
                  loading="lazy"
                  onError={(event) => handleBikeImageError(event, bike.type)}
                />
                <div className="bike-card-body">
                  <h3>
                    {bike.brand} {bike.model}
                  </h3>
                  <p>
                    {bike.location.city}, {bike.location.state}
                  </p>
                  <p className="price">INR {bike.pricePerDay}/day</p>
                  <p>
                    {bike.specs.engineCC}cc | {bike.specs.mileageKmpl} kmpl | {bike.type}
                  </p>

                  <div className="booking-row">
                    <input
                      type="date"
                      min={getTodayISO()}
                      value={booking.startDate}
                      onChange={(event) =>
                        updateBookingField(bike, "startDate", event.target.value)
                      }
                    />
                    <input
                      type="date"
                      min={booking.startDate}
                      value={booking.endDate}
                      onChange={(event) =>
                        updateBookingField(bike, "endDate", event.target.value)
                      }
                    />
                  </div>

                  <div className="booking-row">
                    <select
                      value={booking.pickupPoint}
                      onChange={(event) =>
                        updateBookingField(bike, "pickupPoint", event.target.value)
                      }
                    >
                      {pickupPoints.map((point) => (
                        <option key={point} value={point}>
                          Pickup: {bike.location.city} - {point}
                        </option>
                      ))}
                    </select>
                    <select
                      value={booking.dropCity}
                      onChange={(event) =>
                        updateBookingField(bike, "dropCity", event.target.value)
                      }
                    >
                      {citySuggestions.map((city) => (
                        <option key={city} value={city}>
                          Drop city: {city}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="booking-row booking-row-single">
                    <select
                      value={booking.dropPoint}
                      onChange={(event) =>
                        updateBookingField(bike, "dropPoint", event.target.value)
                      }
                    >
                      {dropPoints.map((point) => (
                        <option key={point} value={point}>
                          Drop point: {booking.dropCity} - {point}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => createBooking(bike)}
                  >
                    Book This Bike
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </section>
  );
}
