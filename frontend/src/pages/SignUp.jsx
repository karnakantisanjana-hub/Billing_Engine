import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import { useAuth, API_BASE_URL } from "../context/AuthContext";

export default function SignUp() {
  const navigate = useNavigate();
  const { login } = useAuth();
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

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[field];
        return n;
      });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.username.trim()) newErrors.username = "Username is required";
    if (!formData.email || !formData.email.includes("@"))
      newErrors.email = "Valid email is required";
    if (formData.password.length < 8)
      newErrors.password = "Password must be at least 8 characters";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
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
        if (data.access_token) {
          login(data.access_token);
          navigate("/dashboard", { replace: true });
        } else {
          alert("Account created successfully! Please sign in.");
          navigate("/signin");
        }
      } else {
        alert(data.detail || data.message || "Signup failed. Please try again.");
      }
    } catch (err) {
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const neuStyles = (
    <style>{`
      .neu-input {
        width: 100%;
        padding: 12px 16px;
        border: none !important;
        border-radius: 12px;
        font-size: 14px;
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
        box-shadow: inset 3px 3px 6px rgba(239, 68, 68, 0.35), inset -3px -3px 6px #ffffff !important;
      }
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
        margin-top: 8px;
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
      .neu-toggle-btn {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        background: #EFE8DB;
        border: none;
        padding: 5px 9px;
        border-radius: 8px;
        color: #7A7A7A;
        cursor: pointer;
        font-size: 11px;
        font-weight: 600;
        box-shadow: 2px 2px 5px #c8bfb0, -2px -2px 5px #ffffff;
        transition: all 0.2s ease;
      }

      /* Responsive Mobile Adjustments */
      @media (max-width: 768px) {
        .signup-container {
          flex-direction: column !important;
        }
        .signup-sidebar {
          display: none !important; /* Hide the dark sidebar on mobile to save space */
        }
        .signup-form-side {
          width: 100% !important;
          padding: 20px 15px !important;
        }
        .signup-card {
          padding: 24px 20px !important;
          width: 100% !important;
        }
        .name-grid {
          grid-template-columns: 1fr !important; /* Stack name and username */
        }
      }
    `}</style>
  );

  return (
    <div className="signup-container" style={{ minHeight: "100vh", display: "flex", fontFamily: "'Segoe UI', sans-serif" }}>
      {neuStyles}
      
      {/* Left Sidebar - Hidden on mobile */}
      <div className="signup-sidebar" style={{ flex: 1, background: "#181F2C", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 60, position: "relative", overflow: "hidden" }}>
        <div style={{ zIndex: 1, maxWidth: 360, width: "100%" }}>
          <div style={{ padding: "20px 24px", borderRadius: "20px", background: "#181F2C", boxShadow: "inset 4px 4px 8px #0d1118, inset -4px -4px 8px #232d40", textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: "#C5A059", letterSpacing: 0.8 }}>BillingEngine</div>
          </div>
          <p style={{ fontSize: 14, color: "#9CA3AF", textAlign: "center", marginBottom: 40 }}>The complete SaaS billing platform. Manage subscriptions, invoices, and revenue with ease.</p>
          {[
            { icon: "📄", text: "Auto-generate invoices & PDFs" },
            { icon: "🔄", text: "Automated billing cycles" },
            { icon: "📊", text: "Real-time revenue analytics" },
            { icon: "👥", text: "Customer self-service portal" },
          ].map((item) => (
            <div key={item.text} className="neu-left-card">
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "#181F2C", boxShadow: "inset 2px 2px 4px #0d1118, inset -2px -2px 4px #232d40", display: "flex", alignItems: "center", justifyContent: "center" }}>{item.icon}</div>
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* Right Side / Form Side */}
      <div className="signup-form-side" style={{ width: 540, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 40, background: "#EFE8DB" }}>
        <div className="signup-card" style={{ width: "100%", maxWidth: 440, padding: "36px 32px", borderRadius: "24px", background: "#EFE8DB", boxShadow: "8px 8px 18px #c5beaf, -8px -8px 18px #ffffff" }}>
          <div style={{ marginBottom: 24, textAlign: "center" }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#2B2420", marginBottom: 8 }}>Create Account</h1>
            <p style={{ fontSize: 14, color: "#7A7A7A" }}>Already have an account? <span onClick={() => navigate("/signin")} style={{ color: "#C5A059", fontWeight: 700, cursor: "pointer" }}>Sign in</span></p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="name-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Full Name</label>
                <input type="text" value={formData.fullName} onChange={(e) => handleChange("fullName", e.target.value)} className={`neu-input ${errors.fullName ? "neu-input-error" : ""}`} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Username</label>
                <input type="text" value={formData.username} onChange={(e) => handleChange("username", e.target.value)} className={`neu-input ${errors.username ? "neu-input-error" : ""}`} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Email</label>
              <input type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} className={`neu-input ${errors.email ? "neu-input-error" : ""}`} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Password</label>
              <div style={{ position: "relative" }}>
                <input type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => handleChange("password", e.target.value)} className={`neu-input ${errors.password ? "neu-input-error" : ""}`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="neu-toggle-btn">{showPassword ? "Hide" : "Show"}</button>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Confirm Password</label>
              <div style={{ position: "relative" }}>
                <input type={showConfirm ? "text" : "password"} value={formData.confirmPassword} onChange={(e) => handleChange("confirmPassword", e.target.value)} className={`neu-input ${errors.confirmPassword ? "neu-input-error" : ""}`} />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="neu-toggle-btn">{showConfirm ? "Hide" : "Show"}</button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="neu-submit-btn" style={{ opacity: loading ? 0.7 : 1 }}>{loading ? "Creating Account..." : "Create Account"}</button>
          </form>
          <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#7A7A7A" }}>
            <span onClick={() => navigate("/")} style={{ color: "#C5A059", fontWeight: 700, cursor: "pointer" }}>← Back to Home</span>
          </div>
        </div>
      </div>
    </div>
  );
}

