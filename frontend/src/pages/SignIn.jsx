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
      {/* ─── NEUMORPHIC GLOBAL STYLES ─── */}
      <style>{`
        /* Right Panel Neumorphic Inputs */
        .neu-input {
          width: 100%;
          padding: 14px 16px;
          border: none !important;
          border-radius: 12px;
          font-size: 15px;
          background-color: #EFE8DB;
          color: #2B2420;
          outline: none;
          box-sizing: border-box;
          box-shadow: inset 3px 3px 6px #c8bfb0, inset -3px -3px 6px #ffffff;
          transition: all 0.25s ease;
        }

        .neu-input:focus {
          box-shadow: inset 4px 4px 8px #beaf9b, inset -4px -4px 8px #ffffff;
        }

        .neu-input-error {
          box-shadow: inset 3px 3px 6px rgba(239, 68, 68, 0.3), inset -3px -3px 6px #ffffff !important;
        }

        /* Right Panel Neumorphic Primary Button */
        .neu-submit-btn {
          width: 100%;
          padding: 14px;
          background: #C5A059;
          color: #ffffff;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: 0.3px;
          margin-top: 12px;
          box-shadow: 5px 5px 12px #c5beaf, -5px -5px 12px #ffffff;
          transition: all 0.2s ease;
        }

        .neu-submit-btn:hover:not(:disabled) {
          background: #d4b067;
          box-shadow: 6px 6px 14px #c5beaf, -6px -6px 14px #ffffff;
          transform: translateY(-1px);
        }

        .neu-submit-btn:active:not(:disabled) {
          box-shadow: inset 3px 3px 6px #a38140, inset -3px -3px 6px #e7bf72;
          transform: translateY(1px);
        }

        /* Feature Card Neumorphic Inset/Extruded Style */
        .neu-left-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          margin-bottom: 12px;
          border-radius: 14px;
          background: #181F2C;
          color: #9CA3AF;
          font-size: 14px;
          box-shadow: 4px 4px 8px #0d1118, -4px -4px 8px #232d40;
        }

        /* Toggle Button Inset Hover */
        .neu-toggle-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: #EFE8DB;
          border: none;
          padding: 6px 10px;
          border-radius: 8px;
          color: #7A7A7A;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 2px 2px 5px #c8bfb0, -2px -2px 5px #ffffff;
          transition: all 0.2s ease;
        }

        .neu-toggle-btn:active {
          box-shadow: inset 2px 2px 4px #c8bfb0, inset -2px -2px 4px #ffffff;
        }
      `}</style>

      {/* ─── LEFT PANEL (BRAND - DARK NEUMORPHISM) ─── */}
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
              "radial-gradient(circle, rgba(197,160,89,0.06) 0%, transparent 70%)",
          }}
        />

        <div style={{ zIndex: 1, maxWidth: 360, width: "100%" }}>
          {/* Neumorphic Brand Container */}
          <div
            style={{
              padding: "20px 24px",
              borderRadius: "20px",
              background: "#181F2C",
              boxShadow: "inset 4px 4px 8px #0d1118, inset -4px -4px 8px #232d40",
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontSize: 30,
                fontWeight: 800,
                color: "#C5A059",
                letterSpacing: 0.8,
                textShadow: "1px 1px 3px #0d1118",
              }}
            >
              BillingEngine
            </div>
          </div>

          <p
            style={{
              fontSize: 14,
              color: "#9CA3AF",
              textAlign: "center",
              lineHeight: 1.6,
              marginBottom: 40,
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
            <div key={item.text} className="neu-left-card">
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: "#181F2C",
                  boxShadow: "inset 2px 2px 4px #0d1118, inset -2px -2px 4px #232d40",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 15,
                }}
              >
                {item.icon}
              </div>
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* ─── RIGHT PANEL (FORM - SOFT LIGHT NEUMORPHISM) ─── */}
      <div
        style={{
          width: 520,
          minWidth: 520,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: 40,
          background: "#EFE8DB",
        }}
      >
        <div 
          style={{ 
            width: "100%", 
            maxWidth: 400,
            padding: "40px 32px",
            borderRadius: "24px",
            background: "#EFE8DB",
            boxShadow: "8px 8px 18px #c5beaf, -8px -8px 18px #ffffff",
          }}
        >
          <div style={{ marginBottom: 28, textAlign: "center" }}>
            <h1
              style={{
                fontSize: 26,
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
                  fontWeight: 700,
                  color: "#2B2420",
                  marginBottom: 8,
                  paddingLeft: 4,
                }}
              >
                Email
              </label>
              <input
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`neu-input ${error ? "neu-input-error" : ""}`}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#2B2420",
                  marginBottom: 8,
                  paddingLeft: 4,
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
                  style={{ paddingRight: 70 }}
                  className={`neu-input ${error ? "neu-input-error" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="neu-toggle-btn"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {error && (
                <div style={{ fontSize: 12, color: "#EF4444", marginTop: 8, paddingLeft: 4, fontWeight: 500 }}>
                  ⚠️ {error}
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="neu-submit-btn"
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#7A7A7A" }}>
            Don't have an account?{" "}
            <span
              onClick={() => setCurrentPage && setCurrentPage("signup")}
              style={{ color: "#C5A059", fontWeight: 700, cursor: "pointer" }}
            >
              Create one
            </span>
          </div>

          <div style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: "#7A7A7A" }}>
            <span
              onClick={() => setCurrentPage && setCurrentPage("landing")}
              style={{ color: "#C5A059", fontWeight: 700, cursor: "pointer" }}
            >
              ← Back to Home
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}