import React, { useState } from "react";
import { API_BASE_URL } from "../context/AuthContext";

export default function SignUp({ setCurrentPage }) {

  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "admin",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.username.trim()) newErrors.username = "Username is required";
    if (!formData.email || !formData.email.includes("@")) newErrors.email = "Valid email is required";
    if (formData.password.length < 8) newErrors.password = "Password must be at least 8 characters";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          full_name: formData.fullName,
          role: formData.role,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        alert(data.detail || data.message || "Signup failed. Please try again.");
      }
    } catch (err) {
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field) => ({
    width: "100%", padding: "12px 16px",
    border: `1.5px solid ${errors[field] ? "#EF4444" : "#F0E6D2"}`,
    borderRadius: 10, fontSize: 15, background: "#fff",
    color: "#2B2420", outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s, box-shadow 0.2s",
  });

  const labelStyle = {
    display: "block", fontSize: 13, fontWeight: 600,
    color: "#2B2420", marginBottom: 6,
  };

  const errorStyle = {
    fontSize: 12, color: "#EF4444", marginTop: 6,
  };

  // ─── SUCCESS STATE ───
  if (success) {
    return (
      <div style={{
        minHeight: "100vh", background: "#FDFBF7",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "rgba(16,185,129,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px", fontSize: 36, color: "#10b981",
          }}>
            ✓
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#2B2420", marginBottom: 8 }}>Account Created!</h2>
          <p style={{ fontSize: 14, color: "#7A7A7A", marginBottom: 24 }}>
            Your account has been created successfully. Sign in to get started.
          </p>
          <button
            onClick={() => setCurrentPage && setCurrentPage("signin")}
            style={{
              padding: "12px 28px", background: "#C5A059", color: "#fff",
              border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600,
              cursor: "pointer", transition: "all 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#D4B76A")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#C5A059")}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // ─── SIGNUP FORM ───
  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>

      {/* ─── LEFT PANEL (BRAND) ─── */}
      <div style={{
        flex: 1, background: "#181F2C",
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        padding: 60, position: "relative", overflow: "hidden",
      }}>
        {/* Subtle glow */}
        <div style={{
          position: "absolute", top: "-50%", right: "-50%",
          width: "100%", height: "100%",
          background: "radial-gradient(circle, rgba(197,160,89,0.08) 0%, transparent 70%)",
        }} />

        <div style={{ zIndex: 1 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#C5A059", letterSpacing: 0.5, marginBottom: 16 }}>
            BillingEngine
          </div>
          <p style={{ fontSize: 15, color: "#9CA3AF", textAlign: "center", maxWidth: 300, lineHeight: 1.6, marginBottom: 50 }}>
            The complete SaaS billing platform. Manage subscriptions, invoices, and revenue with ease.
          </p>

          {[
            { icon: "📄", text: "Auto-generate invoices & PDFs" },
            { icon: "🔄", text: "Automated billing cycles" },
            { icon: "📊", text: "Real-time revenue analytics" },
            { icon: "👥", text: "Customer self-service portal" },
          ].map((item) => (
            <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", color: "#9CA3AF", fontSize: 14 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "rgba(197,160,89,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14,
              }}>
                {item.icon}
              </div>
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* ─── RIGHT PANEL (FORM) ─── */}
      <div style={{
        width: 520, minWidth: 520,
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        padding: 40, background: "#FDFBF7",
      }}>
        <div style={{ width: "100%", maxWidth: 400 }}>

          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#2B2420", marginBottom: 8 }}>Create Account</h1>
            <p style={{ fontSize: 14, color: "#7A7A7A" }}>
              Already have an account?{" "}
              <span
                onClick={() => setCurrentPage && setCurrentPage("signin")}
                style={{ color: "#C5A059", fontWeight: 600, cursor: "pointer" }}
              >
                Sign in
              </span>
            </p>
          </div>

          <form onSubmit={handleSubmit}>

            {/* Full Name + Username */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  style={inputStyle("fullName")}
                  onFocus={(e) => { e.target.style.borderColor = "#C5A059"; e.target.style.boxShadow = "0 0 0 3px rgba(197,160,89,0.1)"; }}
                  onBlur={(e) => { e.target.style.borderColor = errors.fullName ? "#EF4444" : "#F0E6D2"; e.target.style.boxShadow = "none"; }}
                />
                {errors.fullName && <div style={errorStyle}>{errors.fullName}</div>}
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Username</label>
                <input
                  type="text"
                  placeholder="johndoe"
                  value={formData.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  style={inputStyle("username")}
                  onFocus={(e) => { e.target.style.borderColor = "#C5A059"; e.target.style.boxShadow = "0 0 0 3px rgba(197,160,89,0.1)"; }}
                  onBlur={(e) => { e.target.style.borderColor = errors.username ? "#EF4444" : "#F0E6D2"; e.target.style.boxShadow = "none"; }}
                />
                {errors.username && <div style={errorStyle}>{errors.username}</div>}
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                style={inputStyle("email")}
                onFocus={(e) => { e.target.style.borderColor = "#C5A059"; e.target.style.boxShadow = "0 0 0 3px rgba(197,160,89,0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = errors.email ? "#EF4444" : "#F0E6D2"; e.target.style.boxShadow = "none"; }}
              />
              {errors.email && <div style={errorStyle}>{errors.email}</div>}
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  style={{ ...inputStyle("password"), paddingRight: 60 }}
                  onFocus={(e) => { e.target.style.borderColor = "#C5A059"; e.target.style.boxShadow = "0 0 0 3px rgba(197,160,89,0.1)"; }}
                  onBlur={(e) => { e.target.style.borderColor = errors.password ? "#EF4444" : "#F0E6D2"; e.target.style.boxShadow = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", color: "#9CA3AF",
                    cursor: "pointer", fontSize: 13, fontWeight: 500,
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {errors.password && <div style={errorStyle}>{errors.password}</div>}
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Confirm Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  style={{ ...inputStyle("confirmPassword"), paddingRight: 60 }}
                  onFocus={(e) => { e.target.style.borderColor = "#C5A059"; e.target.style.boxShadow = "0 0 0 3px rgba(197,160,89,0.1)"; }}
                  onBlur={(e) => { e.target.style.borderColor = errors.confirmPassword ? "#EF4444" : "#F0E6D2"; e.target.style.boxShadow = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{
                    position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", color: "#9CA3AF",
                    cursor: "pointer", fontSize: 13, fontWeight: 500,
                  }}
                >
                  {showConfirm ? "Hide" : "Show"}
                </button>
              </div>
              {errors.confirmPassword && <div style={errorStyle}>{errors.confirmPassword}</div>}
            </div>

            {/* Role */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Role</label>
              <select
                value={formData.role}
                onChange={(e) => handleChange("role", e.target.value)}
                style={{
                  width: "100%", padding: "12px 16px",
                  border: "1.5px solid #F0E6D2", borderRadius: 10,
                  fontSize: 15, background: "#fff", color: "#2B2420",
                  outline: "none", cursor: "pointer", appearance: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#C5A059"; e.target.style.boxShadow = "0 0 0 3px rgba(197,160,89,0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#F0E6D2"; e.target.style.boxShadow = "none"; }}
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: 14,
                background: "#C5A059", color: "#fff",
                border: "none", borderRadius: 12,
                fontSize: 16, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#D4B76A"; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#C5A059"; }}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

          </form>

          <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#7A7A7A" }}>
            <span
              onClick={() => setCurrentPage && setCurrentPage("landing")}
              style={{ color: "#C5A059", fontWeight: 600, cursor: "pointer" }}
            >
              Back to Home
            </span>
          </div>

        </div>
      </div>

    </div>
  );
}
