import React, { useEffect, useState } from "react";
import { useAuth, API_BASE_URL } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext.jsx";

export default function AuditLogs() {
  const { getAuthHeaders } = useAuth();
  const { t } = useLanguage();
  const { theme, colors: C } = useTheme();

  const COLORS = {
    bg: C.bg,
    card: C.card,
    shadowLight: C.shadowHi,
    shadowDark: C.shadowLo,
    gold: C.gold,
    goldDark: C.goldText,
    goldLight: C.goldBannerEnd,
    goldSoft: C.goldSoft,
    heading: C.heading,
    muted: C.muted,
  };

  const [logs, setLogs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/customers`, { 
        headers: getAuthHeaders() 
      });
      if (!res.ok) throw new Error("Failed to load customers");
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading customers:", err);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (customerId) params.set("customer_id", customerId);
      if (entityType) params.set("entity_type", entityType);
      if (action) params.set("action", action);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      const res = await fetch(`${API_BASE_URL}/api/v1/audit-logs?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load audit logs");
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading audit logs:", err);
      setError(t('audit.unable_load_detail', 'Unable to load audit logs. Please check your backend connection.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    loadLogs();
  }, []);

  const formatDate = (iso) => {
    if (!iso) return "—";
    const date = new Date(iso);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    }) + ", " + date.toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  };

  const getActionStyle = (action) => {
    const a = action.toLowerCase();
    const base = { 
      padding: "6px 14px", 
      borderRadius: "20px", 
      fontSize: "11px", 
      fontWeight: 800, 
      textTransform: "uppercase",
      boxShadow: `inset 2px 2px 5px rgba(0,0,0,0.08), inset -2px -2px 5px rgba(255,255,255,0.8)`,
      letterSpacing: "0.5px"
    };
    if (a.includes("success") || a.includes("create")) return { ...base, color: theme === 'dark' ? '#86EFAC' : '#14532D', background: theme === 'dark' ? 'rgba(34,197,94,0.18)' : '#D1FAE5' };
    if (a.includes("failed") || a.includes("cancel")) return { ...base, color: theme === 'dark' ? '#FCA5A5' : '#7F1D1D', background: theme === 'dark' ? 'rgba(239,68,68,0.18)' : '#FEE2E2' };
    if (a.includes("change") || a.includes("update")) return { ...base, color: theme === 'dark' ? '#93C5FD' : '#1E3A8A', background: theme === 'dark' ? 'rgba(59,130,246,0.18)' : '#DBEAFE' };
    if (a.includes("refund")) return { ...base, color: theme === 'dark' ? '#FCD34D' : '#78350F', background: theme === 'dark' ? 'rgba(245,158,11,0.18)' : '#FEF3C7' };
    return { ...base, color: COLORS.goldDark, background: COLORS.goldLight };
  };

  const renderDetails = (details) => {
    if (!details) return "—";
    
    let data = details;
    try {
      if (typeof details === 'string') {
        const jsonStr = details.replace(/'/g, '"');
        data = JSON.parse(jsonStr);
      }
    } catch (e) {
      return <span style={{ color: COLORS.muted }}>{details}</span>;
    }

    if (typeof data !== 'object' || data === null) {
      return <span style={{ color: COLORS.muted }}>{String(data)}</span>;
    }

    const filterGroup = { display: "flex", flexDirection: "column", gap: "10px" };
  const labelStyle = {
    fontSize: "12px", fontWeight: 800, color: COLORS.goldDark,
    textTransform: "uppercase", letterSpacing: "1px", paddingLeft: "4px"
  };
  const thStyle = {
    textAlign: "left", padding: "16px 24px", fontSize: "12px",
    textTransform: "uppercase", letterSpacing: "1.2px", color: COLORS.goldDark, fontWeight: 800
  };
  const tdStyle = { padding: "20px 24px", fontSize: "14px", color: COLORS.heading, verticalAlign: "middle" };
  const emptyStyle = { textAlign: "center", padding: 80, color: COLORS.muted, fontSize: 16, fontWeight: 600 };

  return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {Object.entries(data).map(([key, val]) => {
          const isAmount = key.toLowerCase().includes('amount') || key.toLowerCase().includes('price');
          const isId = key.toLowerCase().includes('id');
          
          return (
            <div key={key} style={{
              fontSize: "12px",
              padding: "6px 12px",
              borderRadius: "10px",
              background: COLORS.bg,
              boxShadow: `inset 3px 3px 6px ${COLORS.shadowDark}, inset -3px -3px 6px ${COLORS.shadowLight}`,
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
              <span style={{ color: COLORS.muted, fontWeight: 700 }}>{key.replace(/_/g, ' ')}:</span>
              <span style={{ 
                color: isAmount ? (theme === 'dark' ? '#86EFAC' : '#14532D') : (isId ? (theme === 'dark' ? '#93C5FD' : '#1E3A8A') : COLORS.heading),
                fontWeight: 800 
              }}>
                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const actionLabel = (a) => {
    if (!a) return "—";
    return a.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };
  const filterGroup = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 800,
  color: COLORS.goldDark,
  textTransform: 'uppercase',
  letterSpacing: 1,
  paddingLeft: 4,
};

const thStyle = {
  textAlign: 'left',
  padding: '16px 24px',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: 1.2,
  color: COLORS.goldDark,
  fontWeight: 800,
};

const tdStyle = {
  padding: '20px 24px',
  fontSize: 14,
  color: COLORS.heading,
  verticalAlign: 'middle',
};

const emptyStyle = {
  textAlign: 'center',
  padding: 80,
  color: COLORS.muted,
  fontSize: 16,
  fontWeight: 600,
};

  return (
    <div style={{ padding: 40, background: COLORS.bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Dynamic Light Gold Neumorphic Styles */}
      <style>{`
        .neu-input {
          padding: 12px 16px;
          border-radius: 14px;
          border: 2px solid transparent;
          outline: none;
          font-size: 14px;
          font-family: inherit;
          font-weight: 700;
          color: ${COLORS.heading};
          background: ${COLORS.bg};
          box-shadow: inset 4px 4px 8px ${COLORS.shadowDark}, inset -4px -4px 8px ${COLORS.shadowLight};
          min-width: 180px;
          transition: all 0.3s ease;
          appearance: none;
        }
        .neu-input:focus {
          border-color: ${COLORS.gold};
          box-shadow: inset 6px 6px 10px ${COLORS.shadowDark}, inset -6px -6px 10px ${COLORS.shadowLight};
        }
        
        /* Dropdown Option Button Styles */
        .neu-select {
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${COLORS.goldDark.replace('#', '%23')}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 14px center;
          background-size: 16px;
          padding-right: 42px;
          cursor: pointer;
        }
        .neu-select option {
          background-color: ${COLORS.bg};
          color: ${COLORS.heading};
          font-weight: 600;
          padding: 10px;
        }

        /* Gold Metallic Neumorphic Button */
        .neu-button {
          padding: 12px 28px;
          border-radius: 14px;
          border: 1px solid ${COLORS.goldLight};
          background: linear-gradient(145deg, #d3b169, #b18b45);
          color: #FFFFFF;
          font-weight: 800;
          cursor: pointer;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          box-shadow: 5px 5px 12px ${COLORS.shadowDark}, -5px -5px 12px ${COLORS.shadowLight};
          transition: all 0.2s ease;
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        .neu-button:hover {
          background: linear-gradient(145deg, #dcba72, #ba944c);
          box-shadow: 7px 7px 16px ${COLORS.shadowDark}, -7px -7px 16px ${COLORS.shadowLight};
          transform: translateY(-1px);
        }
        .neu-button:active {
          box-shadow: inset 3px 3px 6px rgba(0,0,0,0.3), inset -3px -3px 6px rgba(255,255,255,0.2);
          transform: translateY(1px);
        }

        .neu-card {
          background: ${COLORS.card};
          border-radius: 24px;
          box-shadow: 9px 9px 18px ${COLORS.shadowDark}, -9px -9px 18px ${COLORS.shadowLight};
          padding: 32px;
        }

        .neu-table-container {
          background: ${COLORS.card};
          border-radius: 24px;
          box-shadow: 12px 12px 24px ${COLORS.shadowDark}, -12px -12px 24px ${COLORS.shadowLight};
          overflow: hidden;
          padding: 16px;
        }

        .neu-row {
          transition: all 0.2s ease;
        }
        .neu-row:hover td {
          background: rgba(255, 255, 255, 0.45);
        }

        .audit-header {
          background: linear-gradient(135deg, ${COLORS.goldSoft} 0%, ${COLORS.goldLight} 100%);
          border-radius: 24px;
          padding: 28px 32px;
          margin-bottom: 32px;
          box-shadow: 6px 6px 16px ${COLORS.shadowDark}, -6px -6px 16px ${COLORS.shadowLight};
        }
      `}</style>

      {/* Header */}
      <div className="audit-header">
        <h1 style={{ fontSize: 32, color: COLORS.heading, margin: 0, fontWeight: 800, letterSpacing: -0.5 }}>
          {t('audit.title', 'Audit Log Viewer')}
        </h1>
        <p style={{ color: COLORS.goldDark, margin: '6px 0 0 0', fontSize: 15, fontWeight: 600 }}>
          {t('audit.subtitle', 'Track every action performed across the system')}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="neu-card" style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 40 }}>
        <div style={filterGroup}>
          <label style={labelStyle}>{t('audit.customer', 'Customer')}</label>
          <select className="neu-input neu-select" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">{t('audit.all_customers', 'All Customers')}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={filterGroup}>
          <label style={labelStyle}>{t('audit.entity_type', 'Entity Type')}</label>
          <select className="neu-input neu-select" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
            <option value="">{t('audit.all_entities', 'All Entity Types')}</option>
            <option value="plan">{t('audit.entity_plan', 'Plan')}</option>
            <option value="customer">{t('audit.entity_customer', 'Customer')}</option>
            <option value="subscription">{t('audit.entity_subscription', 'Subscription')}</option>
            <option value="invoice">{t('audit.entity_invoice', 'Invoice')}</option>
            <option value="payment">{t('audit.entity_payment', 'Payment')}</option>
          </select>
        </div>

        <div style={filterGroup}>
          <label style={labelStyle}>{t('audit.action', 'Action')}</label>
          <select className="neu-input neu-select" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">{t('audit.all_actions', 'All Actions')}</option>
            <option value="create">{t('audit.action_create', 'Create')}</option>
            <option value="update">{t('audit.action_update', 'Update')}</option>
            <option value="change_plan">{t('audit.action_change_plan', 'Plan Changed')}</option>
            <option value="cancel">{t('audit.action_cancel', 'Cancelled')}</option>
            <option value="pause">{t('audit.action_pause', 'Paused')}</option>
            <option value="resume">{t('audit.action_resume', 'Resumed')}</option>
            <option value="payment_success">{t('audit.action_payment_success', 'Payment Received')}</option>
            <option value="payment_failed">{t('audit.action_payment_failed', 'Payment Failed')}</option>
            <option value="refund_issued">{t('audit.action_refund_issued', 'Refund Issued')}</option>
          </select>
        </div>

        <div style={filterGroup}>
          <label style={labelStyle}>{t('invoices.from_date', 'From')}</label>
          <input type="date" className="neu-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>

        <div style={filterGroup}>
          <label style={labelStyle}>{t('invoices.to_date', 'To')}</label>
          <input type="date" className="neu-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "2px" }}>
          <button onClick={loadLogs} className="neu-button">{t('audit.apply_filters', 'Apply Filters')}</button>
        </div>
      </div>

      {error && (
        <div style={{ background: theme === 'dark' ? 'rgba(239,68,68,0.18)' : '#FEE2E2', color: theme === 'dark' ? '#FCA5A5' : '#991B1B', padding: "16px 20px", borderRadius: 16, marginBottom: 24, fontWeight: 600, boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.05)' }}>
          {error}
        </div>
      )}

      {/* Table Container */}
      <div className="neu-table-container">
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px", textAlign: "left" }}>
          <thead>
            <tr>
              {[
                t('audit.date', 'Date'),
                t('audit.entity', 'Entity'),
                t('audit.action', 'Action'),
                t('audit.user', 'User'),
                t('audit.details', 'Details'),
              ].map((h, i, arr) => (
                <th
                  key={i}
                  style={{
                    ...thStyle,
                    background: COLORS.goldLight,
                    borderTopLeftRadius: i === 0 ? 16 : 0,
                    borderBottomLeftRadius: i === 0 ? 16 : 0,
                    borderTopRightRadius: i === arr.length - 1 ? 16 : 0,
                    borderBottomRightRadius: i === arr.length - 1 ? 16 : 0,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={emptyStyle}>
                <div style={{ color: COLORS.goldDark, fontWeight: 800, fontSize: 16 }}>{t('audit.loading', 'Loading logs...')}</div>
              </td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="5" style={emptyStyle}>{t('audit.no_entries', 'No audit log entries found.')}</td></tr>
            ) : (
              logs.map((log) => {
                const actionStyle = getActionStyle(log.action);
                return (
                  <tr key={log.id} className="neu-row">
                    <td style={{ ...tdStyle, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 }}>{formatDate(log.created_at)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ textTransform: "capitalize", fontWeight: 800, color: COLORS.heading }}>{log.entity_type}</span>
                        <span style={{ color: COLORS.goldDark, fontSize: "12px", fontWeight: 800 }}>#{log.entity_id}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={actionStyle}>
                        {actionLabel(log.action)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ 
                          width: "32px", height: "32px", borderRadius: "50%", background: COLORS.bg,
                          boxShadow: `3px 3px 6px ${COLORS.shadowDark}, -3px -3px 6px ${COLORS.shadowLight}`,
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: COLORS.goldDark, fontWeight: 800
                        }}>
                          {log.performed_by ? log.performed_by.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <span style={{ fontWeight: 700, color: COLORS.heading }}>{log.performed_by || "System"}</span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, borderTopRightRadius: 16, borderBottomRightRadius: 16, maxWidth: 400 }}>
                      {renderDetails(log.new_value)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

