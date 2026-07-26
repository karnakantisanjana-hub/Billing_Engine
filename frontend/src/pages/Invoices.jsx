import React, { useEffect, useState } from "react";
import { useAuth, API_BASE_URL } from "../context/AuthContext";
import {
  FileText,
  Search,
  RefreshCw,
  Eye,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

export default function Invoices() {
  const { getAuthHeaders } = useAuth();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [generating, setGenerating] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const buildUrl = (path) => {
    const baseUrl = (API_BASE_URL || "http://localhost:8000" ).replace(
      /\/+$/,
      ""
    );
    const cleanPath = path.replace(/^\/+/, "");
    if (baseUrl.endsWith("/api/v1") && cleanPath.startsWith("api/v1/")) {
      return `${baseUrl}/${cleanPath.replace(/^api\/v1\//, "")}`;
    }
    if (baseUrl.endsWith("/api/v1") && cleanPath.startsWith("api/")) {
      return `${baseUrl}/${cleanPath.replace(/^api\//, "")}`;
    }
    return `${baseUrl}/${cleanPath}`;
  };

  // ─── LOAD ALL INVOICES ───
  const loadInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = buildUrl("api/v1/invoices/enriched");
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        // Sort by date descending — newest first
        const sorted = (Array.isArray(data) ? data : []).sort((a, b) => {
          return new Date(b.invoice_date || 0) - new Date(a.invoice_date || 0);
        });
        setInvoices(sorted);
      } else {
        setError("Failed to load invoices.");
      }
    } catch (err) {
      setError("Network error — could not load invoices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  // ─── GENERATE INVOICES ───
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const url = buildUrl("api/v1/billing-cycles/run-invoice-generation");
      const res = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        await loadInvoices(); // Reload all invoices after generation
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || "Could not run invoice generation.");
      }
    } catch (err) {
      alert("Network error — could not reach the server.");
    } finally {
      setGenerating(false);
    }
  };

  // ─── DOWNLOAD PDF ───
  const handleDownloadPdf = async (invoiceId) => {
    setDownloadingId(invoiceId);
    try {
      const url = buildUrl(`api/invoices/${invoiceId}/pdf`);
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const blob = await res.blob();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `invoice_${invoiceId}.pdf`;
        link.click();
        URL.revokeObjectURL(link.href);
      } else {
        alert("Could not download the PDF for this invoice.");
      }
    } catch (err) {
      alert("Network error — could not download PDF.");
    } finally {
      setDownloadingId(null);
    }
  };

  // ─── VIEW INVOICE DETAIL ───
  const handleView = (invoice) => {
    setSelectedInvoice(invoice);
  };

  // ─── FILTERED INVOICES ───
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      !search ||
      (inv.invoice_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (inv.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (inv.invoice_date || "").includes(search);
    const matchesStatus =
      !statusFilter ||
      (inv.status || "").toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // ─── STATUS HELPERS ───
  const statusConfig = {
    paid: { bg: "rgba(16,185,129,0.1)", color: "#059669", label: "PAID" },
    unpaid: { bg: "rgba(245,158,11,0.1)", color: "#D97706", label: "UNPAID" },
    failed: { bg: "rgba(239,68,68,0.1)", color: "#DC2626", label: "FAILED" },
    refunded: { bg: "rgba(139,92,246,0.1)", color: "#7C3AED", label: "REFUNDED" },
  };

  const getStatusStyle = (status) => {
    const s = (status || "").toLowerCase();
    return statusConfig[s] || { bg: "#f3f4f6", color: "#6B7280", label: (status || "UNKNOWN").toUpperCase() };
  };

  // ─── THEMES ───
  const COLORS = {
    gold: "#C5A059",
    goldLight: "#F5ECD8",
    cream: "#FDFBF7",
    cardBg: "#FFFFFF",
    border: "#F0E6D2",
    text: "#2B2420",
    muted: "#7A7A7A",
  };

  return (
    <div>
      {/* ─── HEADER ─── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: COLORS.text, margin: 0 }}>
            Invoices
          </h1>
          <p style={{ fontSize: 14, color: COLORS.muted, marginTop: 4 }}>
            All invoices generated across active subscriptions
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              padding: "10px 20px",
              background: COLORS.gold,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: generating ? "not-allowed" : "pointer",
              opacity: generating ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { if (!generating) e.currentTarget.style.background = "#D4B76A"; }}
            onMouseLeave={(e) => { if (!generating) e.currentTarget.style.background = COLORS.gold; }}
          >
            <FileText size={16} />
            {generating ? "Generating..." : "Generate Invoices"}
          </button>
          <button
            onClick={loadInvoices}
            style={{
              padding: "10px 20px",
              background: "#fff",
              color: COLORS.text,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.goldLight)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* ─── FILTERS ─── */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 420 }}>
          <Search
            size={16}
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: COLORS.muted }}
          />
          <input
            type="text"
            placeholder="Search invoice #, customer, or date..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px 10px 40px",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              fontSize: 14,
              background: "#fff",
              color: COLORS.text,
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = COLORS.gold)}
            onBlur={(e) => (e.target.style.borderColor = COLORS.border)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "10px 14px",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            fontSize: 14,
            background: "#fff",
            color: COLORS.text,
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="">All Status</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* ─── ERROR ─── */}
      {error && (
        <div style={{
          padding: 16, background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10,
          color: "#DC2626", fontSize: 14, marginBottom: 20,
        }}>
          <AlertCircle size={16} style={{ display: "inline", marginRight: 8, verticalAlign: "middle" }} />
          {error}
        </div>
      )}

      {/* ─── TABLE ─── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: COLORS.muted, fontSize: 14 }}>
          Loading invoices...
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: COLORS.muted, fontSize: 14 }}>
          No invoices found.
        </div>
      ) : (
        <div style={{
          border: `1px solid ${COLORS.border}`,
          borderRadius: 14,
          overflow: "hidden",
          background: COLORS.cardBg,
        }}>
          {/* Table Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1.5fr 1fr 1fr 1fr 1fr 1fr 1.2fr",
            padding: "14px 20px",
            background: COLORS.goldLight,
            borderBottom: `1px solid ${COLORS.border}`,
            fontSize: 12,
            fontWeight: 700,
            color: COLORS.text,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}>
            <div>Invoice #</div>
            <div>Customer</div>
            <div>Plan</div>
            <div>Date</div>
            <div>Due Date</div>
            <div>Amount</div>
            <div>Status</div>
            <div style={{ textAlign: "right" }}>Actions</div>
          </div>

          {/* Table Rows */}
          {filteredInvoices.map((inv) => {
            const statusStyle = getStatusStyle(inv.status);
            return (
              <div
                key={inv.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1.5fr 1fr 1fr 1fr 1fr 1fr 1.2fr",
                  padding: "14px 20px",
                  borderBottom: `1px solid ${COLORS.border}`,
                  fontSize: 13,
                  color: COLORS.text,
                  alignItems: "center",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAF5")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
              >
                <div style={{ fontWeight: 600 }}>{inv.invoice_number || `#${inv.id}`}</div>
                <div>{inv.customer_name || "Unknown"}</div>
                <div style={{ color: COLORS.muted }}>{inv.plan_name || "—"}</div>
                <div style={{ color: COLORS.muted }}>
                  {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString("en-IN") : "—"}
                </div>
                <div style={{ color: COLORS.muted }}>
                  {inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-IN") : "—"}
                </div>
                <div style={{ fontWeight: 600 }}>₹{(inv.total_amount || 0).toFixed(2)}</div>
                <div>
                  <span style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    background: statusStyle.bg,
                    color: statusStyle.color,
                  }}>
                    {statusStyle.label}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => handleView(inv)}
                    style={{
                      padding: "6px 12px",
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 8,
                      background: "#fff",
                      cursor: "pointer",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      color: COLORS.text,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.goldLight)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                  >
                    <Eye size={14} /> View
                  </button>
                  <button
                    onClick={() => handleDownloadPdf(inv.id)}
                    disabled={downloadingId === inv.id}
                    style={{
                      padding: "6px 12px",
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 8,
                      background: "#fff",
                      cursor: downloadingId === inv.id ? "not-allowed" : "pointer",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      color: COLORS.text,
                      opacity: downloadingId === inv.id ? 0.5 : 1,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => { if (downloadingId !== inv.id) e.currentTarget.style.background = COLORS.goldLight; }}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                  >
                    <Download size={14} /> {downloadingId === inv.id ? "..." : "PDF"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── INVOICE DETAIL MODAL ─── */}
      {selectedInvoice && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.4)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
          onClick={() => setSelectedInvoice(null)}
        >
          <div
            style={{
              background: "#fff", borderRadius: 16, padding: 32,
              maxWidth: 500, width: "90%", maxHeight: "80vh", overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.text }}>
                {selectedInvoice.invoice_number || `Invoice #${selectedInvoice.id}`}
              </h2>
              <button
                onClick={() => setSelectedInvoice(null)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: COLORS.muted }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              {[
                { label: "Customer", value: selectedInvoice.customer_name },
                { label: "Plan", value: selectedInvoice.plan_name },
                { label: "Invoice Date", value: selectedInvoice.invoice_date ? new Date(selectedInvoice.invoice_date).toLocaleDateString("en-IN") : "—" },
                { label: "Due Date", value: selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString("en-IN") : "—" },
                { label: "Subtotal", value: `₹${(selectedInvoice.subtotal || 0).toFixed(2)}` },
                { label: "Tax Amount", value: `₹${(selectedInvoice.tax_amount || 0).toFixed(2)}` },
                { label: "Total Amount", value: `₹${(selectedInvoice.total_amount || 0).toFixed(2)}` },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                  <span style={{ fontSize: 13, color: COLORS.muted }}>{row.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{row.value}</span>
                </div>
              ))}

              <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", background: COLORS.goldLight, borderRadius: 10, padding: "14px 16px", marginTop: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>STATUS</span>
                <span style={{
                  padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                  background: getStatusStyle(selectedInvoice.status).bg,
                  color: getStatusStyle(selectedInvoice.status).color,
                }}>
                  {getStatusStyle(selectedInvoice.status).label}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button
                onClick={() => handleDownloadPdf(selectedInvoice.id)}
                style={{
                  flex: 1, padding: 12, background: COLORS.gold, color: "#fff",
                  border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <Download size={16} /> Download PDF
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                style={{
                  padding: "12px 20px", background: "#fff", color: COLORS.text,
                  border: `1px solid ${COLORS.border}`, borderRadius: 10,
                  fontSize: 14, cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
