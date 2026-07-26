import React, { useEffect, useState } from "react";
import { useAuth, API_BASE_URL } from "../context/AuthContext";
import { ChevronDown } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function Dashboard({ setCurrentPage }) {
  const { getAuthHeaders, logout } = useAuth();

  const [profile, setProfile] = useState({});
  const [plans, setPlans] = useState([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [metrics, setMetrics] = useState({
    mrr: 0,
    activeSubscribers: 0,
    pendingInvoices: 0,
    failedPayments: 0,
    chartData: [],
    planBreakdown: [],
  });

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const loadProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        setProfile({ name: "User" });
        return;
      }

      const data = await response.json();
      setProfile(data);
    } catch (err) {
      setProfile({ name: "User" });
    }
  };

  const loadPlans = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/plans`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Could not load plans:", err);
    }
  };

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setApiError("");

        const response = await fetch(
          "http://127.0.0.1:8000/api/dashboard-summary",
          { headers: getAuthHeaders( ) }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard");
        }

        const data = await response.json();
        console.log("Dashboard API:", data);

        setMetrics({
          mrr: data.monthly_recurring_revenue ?? 0,
          activeSubscribers: data.active_subscribers ?? 0,
          pendingInvoices: data.unpaid_invoices ?? 0,
          failedPayments: data.failed_recoveries ?? 0,
          chartData: data.chart_data ?? [],
          planBreakdown: data.plan_breakdown ?? [],
        });
      } catch (err) {
        console.error(err);
        setApiError("Unable to load dashboard data.");

        setMetrics((prev) => ({
          ...prev,
          chartData: [
            { month: "Jan", mrr: 12000 },
            { month: "Feb", mrr: 18000 },
            { month: "Mar", mrr: 25000 },
            { month: "Apr", mrr: 28000 },
            { month: "May", mrr: 34000 },
            { month: "Jun", mrr: 42000 },
          ],
        }));
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
    loadProfile();
    loadPlans();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 50, textAlign: "center", fontSize: 20 }}>
        Loading Dashboard...
      </div>
    );
  }

  const cards = [
    {
      title: "Monthly Recurring Revenue",
      value: `₹${metrics.mrr.toLocaleString("en-IN")}`,
      icon: "💰",
      color: "#C5A059",
    },
    {
      title: "Active Subscribers",
      value: metrics.activeSubscribers,
      icon: "👥",
      color: "#10b981",
    },
    {
      title: "Unpaid Invoices",
      value: metrics.pendingInvoices,
      icon: "📄",
      color: "#f59e0b",
    },
    {
      title: "Failed Recoveries",
      value: metrics.failedPayments,
      icon: "⚠️",
      color: "#ef4444",
    },
  ];

  return (
    <div style={{ padding: 40, background: "#F8F7F4", minHeight: "100vh" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 30,
        }}
      >
        <div>
          <h1 style={{ fontSize: 34, fontWeight: "700", color: "#2B2420", margin: 0 }}>
            Dashboard
          </h1>
          <p style={{ color: "#8A7F6D", marginTop: 6, fontSize: 15 }}>
            Subscription Billing Overview
          </p>
        </div>

        <div style={{ position: "relative" }}>
          <div
            onClick={() => setProfileOpen(!profileOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              background: "#FFFFFF",
              padding: "10px 18px",
              borderRadius: 14,
              border: "1px solid #F0E6D2",
              boxShadow: "0 4px 18px rgba(0,0,0,.08)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 45,
                height: 45,
                borderRadius: "50%",
                background: "#C5A059",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: "700",
              }}
            >
              {profile?.name ? profile.name.charAt(0).toUpperCase() : "U"}
            </div>

            <div>
              <div style={{ fontWeight: "600", color: "#2B2420", fontSize: 15 }}>
                {profile?.name || "User"}
              </div>
              <div style={{ fontSize: 12, color: "#8A7F6D" }}>Profile</div>
            </div>

            <ChevronDown size={18} color="#8A7F6D" style={{ transform: profileOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
          </div>

          {profileOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                background: "#fff",
                border: "1px solid #F0E6D2",
                borderRadius: 12,
                boxShadow: "0 8px 24px rgba(0,0,0,.12)",
                minWidth: 180,
                zIndex: 100,
                overflow: "hidden",
              }}
            >
              <div
                onClick={() => {
                  setProfileOpen(false);
                  if (setCurrentPage) setCurrentPage('profile');
                }}
                style={{
                  padding: "12px 18px",
                  cursor: "pointer",
                  color: "#2B2420",
                  fontSize: 14,
                  borderBottom: "1px solid #F0E6D2",
                }}
                onMouseEnter={(e) => (e.target.style.background = "#FAF6EE")}
                onMouseLeave={(e) => (e.target.style.background = "#fff")}
              >
                View Profile
              </div>
              <div
                onClick={() => {
                      setProfileOpen(false);
                      if (setCurrentPage) setCurrentPage('profile');
                }}

                style={{
                  padding: "12px 18px",
                  cursor: "pointer",
                  color: "#991B1B",
                  fontSize: 14,
                }}
                onMouseEnter={(e) => (e.target.style.background = "#FEF3C7")}
                onMouseLeave={(e) => (e.target.style.background = "#fff")}
              >
                Logout
              </div>
            </div>
          )}
        </div>
      </div>

      {apiError && (
        <div
          style={{
            background: "#FEE2E2",
            color: "#991B1B",
            padding: 15,
            borderRadius: 10,
            marginBottom: 20,
          }}
        >
          {apiError}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
          gap: 20,
          marginBottom: 35,
        }}
      >
        {cards.map((card) => (
          <div
            key={card.title}
            style={{
              background: "#fff",
              borderRadius: 18,
              padding: 25,
              boxShadow: "0 5px 20px rgba(0,0,0,.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ color: "#6B7280", fontSize: 13, marginBottom: 8 }}>{card.title}</div>
              <div style={{ fontSize: 28, fontWeight: "700", color: card.color }}>{card.value}</div>
            </div>
            <div style={{ fontSize: 32 }}>{card.icon}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20 }}>
        {/* Left Column: Monthly Recurring Revenue */}
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: 30,
            boxShadow: "0 5px 20px rgba(0,0,0,.08)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h2 style={{ marginBottom: 25, color: "#1F2937" }}>Monthly Recurring Revenue</h2>

          <ResponsiveContainer width="100%" height={520}>
            <AreaChart data={metrics.chartData}>
              <defs>
                <linearGradient id="mrr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C5A059" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#C5A059" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="mrr" stroke="#C5A059" fill="url(#mrr)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Right Column: Stacked Plans & Chart */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Available Billing Plans — real data from /plans */}
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 30,
              boxShadow: "0 5px 20px rgba(0,0,0,.08)",
            }}
          >
            <h2 style={{ marginBottom: 20, color: "#1F2937", fontSize: 20, fontWeight: "bold" }}>
              Available Billing Plans
            </h2>

            {plans.length === 0 ? (
              <div style={{ color: "#9CA3AF", fontSize: 14, textAlign: "center", padding: "24px 0" }}>
                No plans configured yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    style={{
                      background: "#FAF9F5",
                      borderRadius: 12,
                      padding: 16,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, color: "#1A1A1A", fontSize: 16, fontWeight: "bold" }}>
                        {plan.name}
                      </h3>
                      <p style={{ margin: "4px 0 0 0", color: "#888888", fontSize: 12 }}>
                        Interval: {plan.billing_interval} | Trial: {plan.trial_days} days
                      </p>
                    </div>
                    <div style={{ fontWeight: "bold", color: "#A88847" }}>
                      ₹{Number(plan.price).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subscribers by Plan chart */}
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 30,
              boxShadow: "0 5px 20px rgba(0,0,0,.08)",
              flex: 1,
            }}
          >
            <h2 style={{ marginBottom: 25, color: "#1F2937", fontSize: 20 }}>Subscribers by Plan</h2>

            {metrics.planBreakdown.length === 0 ? (
              <div style={{ color: "#9CA3AF", fontSize: 14, textAlign: "center", padding: "40px 0" }}>
                No active subscribers yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={metrics.planBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="plan_name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value, name) =>
                      name === "revenue" ? [`₹${value}`, "Revenue"] : [value, "Subscribers"]
                    }
                  />
                  <Bar dataKey="subscriber_count" fill="#C5A059" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
