import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";

function toInputDate(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export default function KycVerificationPanel() {
  const { isAuthenticated, user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [kyc, setKyc] = useState({ status: "not_submitted" });
  const [form, setForm] = useState({
    fullName: user?.name || "",
    dateOfBirth: "",
    licenseNumber: "",
    licenseExpiry: "",
    idType: "aadhaar",
    idNumber: "",
    address: "",
    licenseFront: "",
    licenseBack: "",
    idFront: "",
    selfie: ""
  });

  const kycStatus = useMemo(() => kyc?.status || "not_submitted", [kyc?.status]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;

    const fetchKyc = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/kyc/me");
        if (!isMounted) return;
        const payload = data.data || { status: "not_submitted" };
        setKyc(payload);
        if (payload.status !== "not_submitted") {
          setForm({
            fullName: payload.fullName || user?.name || "",
            dateOfBirth: toInputDate(payload.dateOfBirth),
            licenseNumber: payload.licenseNumber || "",
            licenseExpiry: toInputDate(payload.licenseExpiry),
            idType: payload.idType || "aadhaar",
            idNumber: payload.idNumber || "",
            address: payload.address || "",
            licenseFront: payload.documentUrls?.licenseFront || "",
            licenseBack: payload.documentUrls?.licenseBack || "",
            idFront: payload.documentUrls?.idFront || "",
            selfie: payload.documentUrls?.selfie || ""
          });
        }
      } catch (apiError) {
        if (isMounted) {
          setError(getApiErrorMessage(apiError, "Failed to load KYC details."));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchKyc();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.name]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitKyc = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        fullName: form.fullName,
        dateOfBirth: form.dateOfBirth,
        licenseNumber: form.licenseNumber,
        licenseExpiry: form.licenseExpiry,
        idType: form.idType,
        idNumber: form.idNumber,
        address: form.address,
        documentUrls: {
          licenseFront: form.licenseFront,
          licenseBack: form.licenseBack,
          idFront: form.idFront,
          selfie: form.selfie
        }
      };
      const { data } = await api.post("/kyc/submit", payload);
      setKyc(data.data);
      setMessage(data.message || "KYC submitted.");
      await refreshUser();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, "KYC submission failed."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.section
      id="kyc"
      className="glass-card kyc-section"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45 }}
    >
      <div className="section-head">
        <h2>KYC Verification</h2>
        <p>Complete KYC to unlock bookings and payment checkout.</p>
      </div>

      {!isAuthenticated ? (
        <p className="hint">Login to submit your KYC details.</p>
      ) : (
        <>
          <p className={`status-pill ${kycStatus}`}>
            KYC status: {kycStatus.replace("_", " ")}
          </p>
          {kyc.reviewNote && <p className="error-text">Review note: {kyc.reviewNote}</p>}
          {loading && <p>Loading KYC...</p>}
          {error && <p className="error-text">{error}</p>}
          {message && <p className="hint">{message}</p>}

          <form className="kyc-form" onSubmit={submitKyc}>
            <div className="booking-row">
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={updateField}
                placeholder="Full name"
                required
              />
              <input
                type="date"
                className="kyc-date-input"
                name="dateOfBirth"
                value={form.dateOfBirth}
                onChange={updateField}
                required
              />
            </div>
            <div className="booking-row">
              <input
                type="text"
                name="licenseNumber"
                value={form.licenseNumber}
                onChange={updateField}
                placeholder="Driving license number"
                required
              />
              <input
                type="date"
                className="kyc-date-input"
                name="licenseExpiry"
                value={form.licenseExpiry}
                onChange={updateField}
                required
              />
            </div>
            <div className="booking-row">
              <select name="idType" value={form.idType} onChange={updateField}>
                <option value="aadhaar">Aadhaar</option>
                <option value="passport">Passport</option>
                <option value="voter-id">Voter ID</option>
                <option value="other">Other</option>
              </select>
              <input
                type="text"
                name="idNumber"
                value={form.idNumber}
                onChange={updateField}
                placeholder="Government ID number"
                required
              />
            </div>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={updateField}
              placeholder="Current address"
              required
            />
            <div className="booking-row">
              <input
                type="url"
                name="licenseFront"
                value={form.licenseFront}
                onChange={updateField}
                placeholder="License front image URL"
                required
              />
              <input
                type="url"
                name="licenseBack"
                value={form.licenseBack}
                onChange={updateField}
                placeholder="License back image URL"
                required
              />
            </div>
            <div className="booking-row">
              <input
                type="url"
                name="idFront"
                value={form.idFront}
                onChange={updateField}
                placeholder="ID card image URL"
                required
              />
              <input
                type="url"
                name="selfie"
                value={form.selfie}
                onChange={updateField}
                placeholder="Selfie image URL"
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Submitting..." : "Submit KYC"}
            </button>
          </form>
        </>
      )}
    </motion.section>
  );
}
