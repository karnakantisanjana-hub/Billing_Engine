import React, { useState } from "react";
import { useAuth, API_BASE_URL } from "../context/AuthContext";

export default function SignIn({ setCurrentPage }) {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.access_token);
        if (setCurrentPage) {
          setCurrentPage("dashboard");
        }
      } else {
        setError(data.detail || "Invalid email or password");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ─── LEFT PANEL (BRAND) ─── */}
      <div
        style={{
          flex: 1,
          background: "#181F2C",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: 60,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-50%",
            right: "-50%",
            width: "100%",
            height: "100%",
            background:
              "radial-gradient(circle, rgba(197,160,89,0.08) 0%, transparent 70%)",
          }}
        />

        <div style={{ zIndex: 1 }}>
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: "#C5A059",
              letterSpacing: 0.5,
              marginBottom: 16,
            }}
          >
            BillingEngine
          </div>
          <p
            style={{
              fontSize: 15,
              color: "#9CA3AF",
              textAlign: "center",
              maxWidth: 300,
              lineHeight: 1.6,
              marginBottom: 50,
            }}
          >
            The complete SaaS billing platform. Manage subscriptions, invoices,
            and revenue with ease.
          </p>

          {[
            { icon: "📊", text: "Revenue analytics dashboard" },
            { icon: "💳", text: "Payment tracking & recovery" },
            { icon: "📄", text: "Automated invoice generation" },
            { icon: "👥", text: "Customer management portal" },
          ].map((item) => (
            <div
              key={item.text}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 0",
                color: "#9CA3AF",
                fontSize: 14,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(197,160,89,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
              >
                {item.icon}
              </div>
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* ─── RIGHT PANEL (FORM) ─── */}
      <div
        style={{
          width: 520,
          minWidth: 520,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: 40,
          background: "#FDFBF7",
        }}
      >
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ marginBottom: 32 }}>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#2B2420",
                marginBottom: 8,
              }}
            >
              Welcome Back
            </h1>
            <p style={{ fontSize: 14, color: "#7A7A7A" }}>
              Sign in to your account to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#2B2420",
                  marginBottom: 6,
                }}
              >
                Email
              </label>
              <input
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: `1.5px solid ${error ? "#EF4444" : "#F0E6D2"}`,
                  borderRadius: 10,
                  fontSize: 15,
                  background: "#fff",
                  color: "#2B2420",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#C5A059";
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(197,160,89,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = error ? "#EF4444" : "#F0E6D2";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#2B2420",
                  marginBottom: 6,
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: `1.5px solid ${error ? "#EF4444" : "#F0E6D2"}`,
                    borderRadius: 10,
                    fontSize: 15,
                    background: "#fff",
                    color: "#2B2420",
                    outline: "none",
                    boxSizing: "border-box",
                    paddingRight: 60,
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#C5A059";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(197,160,89,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = error ? "#EF4444" : "#F0E6D2";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#9CA3AF",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {error && (
                <div style={{ fontSize: 12, color: "#EF4444", marginTop: 6 }}>
                  {error}
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: 14,
                background: "#C5A059",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "all 0.2s",
                marginTop: 8,
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = "#D4B76A";
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.background = "#C5A059";
              }}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#7A7A7A" }}>
            Don't have an account?{" "}
            <span
              onClick={() => setCurrentPage && setCurrentPage("signup")}
              style={{ color: "#C5A059", fontWeight: 600, cursor: "pointer" }}
            >
              Create one
            </span>
          </div>

          <div style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: "#7A7A7A" }}>
            <span
              onClick={() => setCurrentPage && setCurrentPage("landing")}
              style={{ color: "#C5A059", fontWeight: 600, cursor: "pointer" }}
            >
              ← Back to Home
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
