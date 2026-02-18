import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";

export default function AuthPanel() {
  const { login, register, authLoading, isAuthenticated, user } = useAuth();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      if (mode === "login") {
        await login({ email: form.email, password: form.password });
      } else {
        await register(form);
      }
      setForm({ name: "", email: "", password: "" });
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "Authentication failed."));
    }
  };

  if (isAuthenticated) {
    return (
      <motion.section
        className="glass-card auth-panel"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
      >
        <h2>Welcome back, {user?.name}</h2>
        <p>Your account is active. You can now create bookings and view your trips.</p>
      </motion.section>
    );
  }

  return (
    <motion.section
      className="glass-card auth-panel"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45 }}
    >
      <div className="auth-mode">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={mode === "login" ? "active" : ""}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={mode === "register" ? "active" : ""}
        >
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        {mode === "register" && (
          <input
            type="text"
            name="name"
            placeholder="Full name"
            value={form.name}
            onChange={updateField}
            required
          />
        )}
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={updateField}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={updateField}
          required
        />

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="btn-primary" disabled={authLoading}>
          {authLoading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
        </button>
      </form>
    </motion.section>
  );
}
