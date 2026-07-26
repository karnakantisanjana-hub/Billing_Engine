import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

const API = "http://127.0.0.1:8000";

export default function BillingCycles() {
  const { getAuthHeaders } = useAuth();

  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadBillingCycles();
  }, []);

  async function loadBillingCycles() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API}/api/v1/billing-cycles`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error("Unable to fetch billing cycles");
      }

      const data = await response.json();
      setCycles(data);
    } catch (err) {
      console.error(err);
      setError("Unable to load billing cycles.");
    } finally {
      setLoading(false);
    }
  }

  async function runBillingEngine() {
    try {
      setRunning(true);

      const response = await fetch(
        `${API}/api/v1/billing-cycles/run-invoice-generation`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      alert(data.message || "Billing engine completed.");

      loadBillingCycles();
    } catch (err) {
      console.error(err);
      alert("Failed to run billing engine.");
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        Loading Billing Cycles...
      </div>
    );
  }

  const total = cycles.length;
  const pending = cycles.filter(c => c.status === "pending").length;
  const completed = cycles.filter(c => c.status === "completed").length;
  const failed = cycles.filter(c => c.status === "failed").length;

  return (
    <div
      style={{
        padding: 40,
        background: "#F8F7F4",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          fontSize: 34,
          color: "#1F2937",
          marginBottom: 5,
        }}
      >
        Billing Cycles
      </h1>

      <p
        style={{
          color: "#6B7280",
          marginBottom: 30,
        }}
      >
        Manage recurring billing and invoice generation
      </p>

      {error && (
        <div
          style={{
            background: "#FEE2E2",
            color: "#991B1B",
            padding: 15,
            borderRadius: 10,
            marginBottom: 20,
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={runBillingEngine}
        disabled={running}
        style={{
          background: "#C5A059",
          color: "#fff",
          border: "none",
          padding: "12px 22px",
          borderRadius: 10,
          cursor: "pointer",
          marginBottom: 25,
          fontWeight: "600",
        }}
      >
        {running ? "Running..." : "Run Billing Engine"}
      </button>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 20,
          marginBottom: 30,
        }}
      >
        <Card title="Total Cycles" value={total} color="#2563EB" />
        <Card title="Pending" value={pending} color="#F59E0B" />
        <Card title="Completed" value={completed} color="#10B981" />
        <Card title="Failed" value={failed} color="#EF4444" />
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 15,
          boxShadow: "0 5px 20px rgba(0,0,0,.08)",
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead
            style={{
              background: "#F3F4F6",
            }}
          >
            <tr>
              <th style={th}>ID</th>
              <th style={th}>Customer</th>
              <th style={th}>Plan</th>
              <th style={th}>Billing Period</th>
              <th style={th}>Next Billing</th>
              <th style={th}>Status</th>
            </tr>
          </thead>

          <tbody>
            {cycles.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  style={{
                    textAlign: "center",
                    padding: 30,
                    color: "#888",
                  }}
                >
                  No billing cycles found.
                </td>
              </tr>
            ) : (
              cycles.map((cycle) => (
                <tr key={cycle.id}>
                  <td style={td}>{cycle.id}</td>
                  <td style={td}>{cycle.customer_name}</td>
                  <td style={td}>{cycle.plan_name}</td>
                  <td style={td}>{cycle.billing_period}</td>
                  <td style={td}>{cycle.next_billing_date}</td>
                  <td style={td}>
                    <span
                      style={{
                        padding: "5px 12px",
                        borderRadius: 20,
                        background:
                          cycle.status === "completed"
                            ? "#DCFCE7"
                            : cycle.status === "pending"
                            ? "#FEF3C7"
                            : "#FEE2E2",
                        color:
                          cycle.status === "completed"
                            ? "#166534"
                            : cycle.status === "pending"
                            ? "#92400E"
                            : "#991B1B",
                      }}
                    >
                      {cycle.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ title, value, color }) {
  return (
    <div
      style={{
        background: "#fff",
        padding: 25,
        borderRadius: 15,
        boxShadow: "0 5px 20px rgba(0,0,0,.08)",
      }}
    >
      <div
        style={{
          color: "#6B7280",
          marginBottom: 10,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 30,
          fontWeight: "700",
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

const th = {
  padding: 15,
  textAlign: "left",
  borderBottom: "1px solid #E5E7EB",
};

const td = {
  padding: 15,
  borderBottom: "1px solid #F3F4F6",
};