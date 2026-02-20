import { useAuth } from "../../context/AuthContext";
import NotificationsBell from "./NotificationsBell";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header className="nav-wrap glass-card">
      <div className="brand">
        <div className="brand-logo" aria-hidden="true">
          <img src="/ride-india-logo.svg" alt="Ride India" />
        </div>
        <div className="brand-copy">
          <span className="brand-badge">Ride India</span>
          <span className="brand-tag">Moto bike Tourism Platform</span>
        </div>
      </div>

      <nav className="nav-links">
        <button type="button" onClick={() => scrollToSection("explore")}>
          Explore
        </button>
        <button type="button" onClick={() => scrollToSection("route-planner")}>
          Route Planner
        </button>
        <button type="button" onClick={() => scrollToSection("routes")}>
          Curated Routes
        </button>
        <button type="button" onClick={() => scrollToSection("kyc")}>
          KYC
        </button>
        <button type="button" onClick={() => scrollToSection("my-trips")}>
          My Trips
        </button>
      </nav>

      <div className="nav-user">
        {isAuthenticated ? (
          <>
            <NotificationsBell />
            <span>{user?.name}</span>
            <button type="button" className="btn-outline" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <span>Guest</span>
        )}
      </div>
    </header>
  );
}
