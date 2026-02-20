import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/layout/Navbar";
import AuthPanel from "./components/layout/AuthPanel";
import WebGPUHero from "./components/hero/WebGPUHero";
import BikeCatalog from "./components/bikes/BikeCatalog";
import CuratedRoutes from "./components/routes/CuratedRoutes";
import RoutePlanner from "./components/routes/RoutePlanner";
import KycVerificationPanel from "./components/kyc/KycVerificationPanel";
import MyTrips from "./components/trips/MyTrips";
import BikingLoader from "./components/ui/BikingLoader";
import PwaInstallPrompt from "./components/ui/PwaInstallPrompt";

function AppContent() {
  const [isBooting, setIsBooting] = useState(true);
  const [tripRefreshSignal, setTripRefreshSignal] = useState(0);
  const [latestBooking, setLatestBooking] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsBooting(false), 4200);
    return () => clearTimeout(timer);
  }, []);

  const handleBookingCreated = (booking) => {
    setLatestBooking(booking || null);
    setTripRefreshSignal((prev) => prev + 1);
  };

  if (isBooting) return <BikingLoader />;

  return (
    <div className="app-root">
      <WebGPUHero />
      <Navbar />

      <main className="content-shell">
        <motion.section
          id="explore"
          className="hero-copy glass-card"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p className="hero-label">Ride India Platform</p>
          <h1>
            Bike Rentals, Road Trips, and Tourism Planning in One{" "}
            <span className="accent-text">Platform</span>
          </h1>
          <p>
            Find your bike, plan scenic routes, and track your travel history with a full
            MERN workflow and WebGPU-powered visuals.
          </p>
        </motion.section>

        <AuthPanel />
        <BikeCatalog onBookingCreated={handleBookingCreated} />
        <RoutePlanner />
        <CuratedRoutes />
        <KycVerificationPanel />
        <MyTrips refreshSignal={tripRefreshSignal} latestBooking={latestBooking} />
      </main>
      <PwaInstallPrompt />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
