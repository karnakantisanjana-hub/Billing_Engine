import React, { useEffect, useRef, useState } from "react";
import { useAuth, API_BASE_URL } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext.jsx";
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
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

export default function Invoices() {
  const { getAuthHeaders } = useAuth();
  const { t, languageCode } = useLanguage();
  const { theme, colors: C } = useTheme();

  const neuShadow = `8px 8px 16px ${C.shadowLo}, -8px -8px 16px ${C.shadowHi}`;
  const neuShadowSm = `4px 4px 10px ${C.shadowLoSm}, -4px -4px 10px ${C.shadowHiSm}`;
  const neuShadowInset = `inset 4px 4px 10px ${C.shadowLoInset}, inset -4px -4px 10px ${C.shadowHiInset}`;
  const neuShadowPressed = `inset 6px 6px 12px ${C.shadowLoInset}, inset -6px -6px 12px ${C.shadowHiInset}`;


  // ─── Tab State ───
  const [activeTab, setActiveTab] = useState("invoices");

  // ─── Invoice Tab State ───
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [generating, setGenerating] = useState(false);
  const generatingRef = useRef(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [invoiceStatusCounts, setInvoiceStatusCounts] = useState({});
  const [actionLoading, setActionLoading] = useState(null);
  const [notification, setNotification] = useState("");

  // ─── Generate Modal State ───
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedSubId, setSelectedSubId] = useState("");
  const [dueDays, setDueDays] = useState(7);

  // ─── Payment Tab State ───
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentTotalPages, setPaymentTotalPages] = useState(1);
  const [paymentTotal, setPaymentTotal] = useState(0);

  // ─── Failed Payment Tab State ───
  const [failedPayments, setFailedPayments] = useState([]);
  const [failedLoading, setFailedLoading] = useState(false);

  // ─── Refund Tab State ───
  const [refunds, setRefunds] = useState([]);
  const [refundsLoading, setRefundsLoading] = useState(false);
  const [refundPage, setRefundPage] = useState(1);
  const [refundTotalPages, setRefundTotalPages] = useState(1);
  const [refundTotal, setRefundTotal] = useState(0);

  // ─── Failed Payments Total (for summary card) ───
  const [failedPaymentsTotal, setFailedPaymentsTotal] = useState(0);

  // ─── GST CALCULATION ───
  const GST_RATE = 0.18;
  const calcWithGST = (amount) => Math.round((amount || 0) * 1.18 * 100) / 100;
  const formatWithGST = (amount) => `₹${calcWithGST(amount).toFixed(2)}`;

  const buildUrl = (path) => {
    const baseUrl = (API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");
    const cleanPath = path.replace(/^\/+/, "");
    if (baseUrl.endsWith("/api/v1") && cleanPath.startsWith("api/v1/")) {
      return `${baseUrl}/${cleanPath.replace(/^api\/v1\//, "")}`;
    }
    if (baseUrl.endsWith("/api/v1") && cleanPath.startsWith("api/")) {
      return `${baseUrl}/${cleanPath.replace(/^api\//, "")}`;
    }
    return `${baseUrl}/${cleanPath}`;
  };

  // ─── SHOW NOTIFICATION ───
  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  // ─── LOAD ALL INVOICES ───
  const loadInvoices = async (skipLoading = false) => {
    if (!skipLoading) {
      setLoading(true);
      setError(null);
    }
    try {
      const url = buildUrl("api/v1/invoices/enriched");
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const sorted = (Array.isArray(data) ? data : []).sort((a, b) => {
          return new Date(b.invoice_date || 0) - new Date(a.invoice_date || 0);
        });
        setInvoices(sorted);
      } else {
        setError(t("invoices.err_load", "Failed to load invoices."));
      }
    } catch (err) {
      setError(t("invoices.err_network_load", "Network error — could not load invoices."));
    } finally {
      if (!skipLoading) setLoading(false);
    }
  };

  // ─── LOAD STATUS COUNTS ───
  const loadStatusCounts = async () => {
    try {
      const url = buildUrl("api/invoice-management/invoices/status-counts");
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        setInvoiceStatusCounts(await res.json());
      }
    } catch (err) {
      console.error("Failed to load status counts:", err);
    }
  };

  // ─── LOAD PAYMENTS ───
  const loadPayments = async () => {
    setPaymentsLoading(true);
    try {
      const params = new URLSearchParams({ page: paymentPage, page_size: "15" });
      if (paymentStatusFilter) params.set("status", paymentStatusFilter);
      const url = buildUrl(`api/invoice-management/payments?${params}`);
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments);
        setPaymentTotalPages(data.total_pages);
        setPaymentTotal(data.total);
      }
    } catch (err) {
      console.error("Failed to load payments:", err);
    } finally {
      setPaymentsLoading(false);
    }
  };

  // ─── LOAD FAILED PAYMENTS ───
  const loadFailedPayments = async () => {
    setFailedLoading(true);
    try {
      const url = buildUrl("api/invoice-management/payments/failed");
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setFailedPayments(data.failed_payments);
        setFailedPaymentsTotal(data.total || data.failed_payments.length);
      }
    } catch (err) {
      console.error("Failed to load failed payments:", err);
    } finally {
      setFailedLoading(false);
    }
  };

  // ─── LOAD REFUNDS ───
  const loadRefunds = async () => {
    setRefundsLoading(true);
    try {
      const params = new URLSearchParams({ page: refundPage, page_size: "15" });
      const url = buildUrl(`api/invoice-management/refunds?${params}`);
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRefunds(data.refunds);
        setRefundTotalPages(data.total_pages);
        setRefundTotal(data.total);
      }
    } catch (err) {
      console.error("Failed to load refunds:", err);
    } finally {
      setRefundsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "invoices") {
      loadInvoices();
      loadStatusCounts();
    } else if (activeTab === "payments") {
      loadPayments();
    } else if (activeTab === "failed") {
      loadFailedPayments();
    } else if (activeTab === "refunds") {
      loadRefunds();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, paymentPage, paymentStatusFilter, refundPage]);

  // ─── OPEN GENERATE MODAL ───
  const openGenerateModal = async () => {
    setShowGenerateModal(true);
    try {
      const url = buildUrl("api/v1/billing-cycles/subscriptions");
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) setSubscriptions(await res.json());
    } catch (err) {
      console.error("Failed to load subscriptions:", err);
    }
  };

  // ─── GENERATE INVOICE ───
  const handleGenerate = async () => {
    if (!selectedSubId) {
      showNotification("Please select a subscription");
      return;
    }
    if (generatingRef.current) return;
    generatingRef.current = true;
    setGenerating(true);
    try {
      const url = buildUrl("api/v1/billing-cycles/run-invoice-generation");
      const res = await fetch(url, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription_id: parseInt(selectedSubId),
          due_date_days: parseInt(dueDays),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        showNotification(data.message || "Invoice generated successfully");
        loadInvoices(true);
        loadStatusCounts();
        setShowGenerateModal(false);
        setSelectedSubId("");
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification(errData.detail || "Could not generate invoice.");
      }
    } catch (err) {
      showNotification("Network error — could not reach the server.");
    } finally {
      setGenerating(false);
      generatingRef.current = false;
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
        alert(t("invoices.err_download", "Could not download the PDF for this invoice."));
      }
    } catch (err) {
      alert(t("invoices.err_download_network", "Network error — could not download PDF."));
    } finally {
      setDownloadingId(null);
    }
  };

  // ─── VIEW INVOICE DETAIL ───
  const handleView = (invoice) => {
    setSelectedInvoice(invoice);
  };

  // ─── MARK AS PAID ───
  const handleMarkPaid = async (invoiceId) => {
    setActionLoading(`paid-${invoiceId}`);
    try {
      const url = buildUrl(`api/invoice-management/invoices/${invoiceId}/mark-paid`);
      const res = await fetch(url, { method: "POST", headers: getAuthHeaders() });
      if (res.ok) {
        showNotification(t("invoices.notif_marked_paid", "Invoice marked as paid"));
        await loadInvoices();
        await loadStatusCounts();
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification(errData.detail || t("invoices.err_mark_paid", "Failed to mark as paid"));
      }
    } catch (err) {
      showNotification(t("common.network_error", "Network error"));
    } finally {
      setActionLoading(null);
    }
  };

  // ─── RETRY PAYMENT ───
  const handleRetryPayment = async (paymentId) => {
    setActionLoading(`retry-${paymentId}`);
    try {
      const url = buildUrl(`api/invoice-management/payments/${paymentId}/retry`);
      const res = await fetch(url, { method: "POST", headers: getAuthHeaders() });
      if (res.ok) {
        showNotification(t("invoices.notif_retry_initiated", "Payment retry initiated"));
        await loadFailedPayments();
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification(errData.detail || t("invoices.err_retry", "Failed to retry payment"));
      }
    } catch (err) {
      showNotification(t("common.network_error", "Network error"));
    } finally {
      setActionLoading(null);
    }
  };

  // ─── PROCESS REFUND ───
  const handleRefund = async (invoiceId) => {
    if (!window.confirm(t("invoices.confirm_refund", "Are you sure you want to process a refund for this invoice?"))) return;
    setActionLoading(`refund-${invoiceId}`);
    try {
      const url = buildUrl(`api/invoice-management/invoices/${invoiceId}/refund`);
      const res = await fetch(url, { method: "POST", headers: getAuthHeaders() });
      if (res.ok) {
        showNotification(t("invoices.notif_refund_processed", "Refund processed successfully"));
        await loadInvoices();
        await loadStatusCounts();
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification(errData.detail || t("invoices.err_refund", "Failed to process refund"));
      }
    } catch (err) {
      showNotification(t("common.network_error", "Network error"));
    } finally {
      setActionLoading(null);
    }
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
    const matchesDateFrom = !dateFrom || new Date(inv.invoice_date) >= new Date(dateFrom);
    const matchesDateTo = !dateTo || new Date(inv.invoice_date) <= new Date(dateTo + "T23:59:59");
    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  // ─── STATUS HELPERS (translated) ───
  const statusConfig = {
    paid: { bg: "rgba(16,185,129,0.1)", color: "#059669", label: t("status.paid", "PAID") },
    unpaid: { bg: "rgba(245,158,11,0.1)", color: "#D97706", label: t("status.unpaid", "UNPAID") },
    failed: { bg: "rgba(239,68,68,0.1)", color: "#DC2626", label: t("status.failed", "FAILED") },
    refunded: { bg: "rgba(139,92,246,0.1)", color: "#7C3AED", label: t("status.refunded", "REFUNDED") },
    draft: { bg: "rgba(156,163,175,0.1)", color: "#6B7280", label: t("invoices.status_draft", "DRAFT") },
    success: { bg: "rgba(16,185,129,0.1)", color: "#059669", label: t("status.success", "SUCCESS") },
    pending: { bg: "rgba(245,158,11,0.1)", color: "#D97706", label: t("status.pending", "PENDING") },
  };

  const getStatusStyle = (status) => {
    const s = (status || "").toLowerCase();
    return statusConfig[s] || { bg: "#f3f4f6", color: "#6B7280", label: (status || "UNKNOWN").toUpperCase() };
  };

  const COLORS = {
    gold: C.gold,
    goldLight: C.goldSoft,
    cream: C.card,
    cardBg: C.card,
    border: C.border,
    text: C.heading,
    muted: C.muted,
    bg: C.bg,
  };

  const TABS = [
    { id: "invoices", label: t("invoices.tab_invoices", "Invoice Status Board"), icon: FileText },
    { id: "payments", label: t("invoices.tab_payments", "Payment Status"), icon: CheckCircle },
    { id: "failed", label: t("invoices.tab_failed", "Failed Payments"), icon: AlertCircle },
    { id: "refunds", label: t("invoices.tab_refunds", "Refund History"), icon: RotateCcw },
  ];

  // ─── Neu input style ───
  const neuInputStyle = {
    width: "100%",
    padding: "10px 14px",
    border: "none",
    borderRadius: 12,
    fontSize: 13,
    background: COLORS.bg,
    color: COLORS.text,
    outline: "none",
    boxShadow: neuShadowInset,
    boxSizing: "border-box",
  };

  const neuSelectStyle = {
    padding: "10px 14px",
    border: "none",
    borderRadius: 12,
    fontSize: 13,
    background: COLORS.bg,
    color: COLORS.text,
    outline: "none",
    cursor: "pointer",
    boxShadow: neuShadowInset,
    appearance: "auto",
  };

  // Locale used for date formatting
  const dateLocale = languageCode && languageCode !== "en" ? `${languageCode}-IN` : "en-IN";
  const formatDate = (value) => {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleDateString(dateLocale);
    } catch {
      return new Date(value).toLocaleDateString("en-IN");
    }
  };

  return (
    <div style={{ padding: 32, background: COLORS.bg, minHeight: "100%" }}>
      {/* ─── HEADER ─── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: COLORS.text, margin: 0 }}>
            {t("invoices.management_title", "Invoice Management")}
          </h1>
          <p style={{ fontSize: 14, color: COLORS.muted, marginTop: 4 }}>
            {t("invoices.management_subtitle", "Monitor invoices, payments, failed transactions, and refunds")}
          </p>
        </div>
        {activeTab === "invoices" && (
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={openGenerateModal}
              disabled={generating}
              style={{
                padding: "12px 20px",
                background: COLORS.bg,
                color: COLORS.gold,
                border: "none",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                cursor: generating ? "not-allowed" : "pointer",
                opacity: generating ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: neuShadow,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { if (!generating) e.currentTarget.style.boxShadow = "10px 10px 20px rgba(163,150,128,0.35), -10px -10px 20px rgba(255,255,255,0.8)"; }}
              onMouseLeave={(e) => { if (!generating) e.currentTarget.style.boxShadow = neuShadow; }}
            >
              <FileText size={16} />
              {t("invoices.generate", "Generate Invoices")}
            </button>
            <button
              onClick={() => {
                if (activeTab === "invoices") loadInvoices();
                else if (activeTab === "payments") loadPayments();
                else if (activeTab === "failed") loadFailedPayments();
                else if (activeTab === "refunds") loadRefunds();
              }}
              style={{
                padding: "12px 20px",
                background: COLORS.bg,
                color: COLORS.text,
                border: "none",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: neuShadow,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "10px 10px 20px rgba(163,150,128,0.35), -10px -10px 20px rgba(255,255,255,0.8)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = neuShadow)}
            >
              <RefreshCw size={16} />
              {t("common.refresh", "Refresh")}
            </button>
          </div>
        )}
      </div>

      {/* ─── NOTIFICATION ─── */}
      {notification && (
        <div style={{
          padding: "12px 16px",
          background: COLORS.bg,
          borderRadius: 12,
          color: "#059669",
          fontSize: 13,
          fontWeight: 500,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: neuShadowInset,
        }}>
          <span>{notification}</span>
          <button onClick={() => setNotification("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#059669" }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ─── TABS ─── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 18px",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s",
                background: isActive ? COLORS.gold : COLORS.bg,
                color: isActive ? "#fff" : COLORS.text,
                boxShadow: isActive ? "4px 4px 10px rgba(197,160,89,0.35), -2px -2px 6px rgba(255,255,255,0.5)" : neuShadow,
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.boxShadow = "10px 10px 20px rgba(163,150,128,0.35), -10px -10px 20px rgba(255,255,255,0.8)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.boxShadow = neuShadow;
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          TAB 1: INVOICE STATUS BOARD
         ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "invoices" && (
        <div>
          {/* Status Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
            {[
              { status: "unpaid", label: t("invoices.status_unpaid", "Unpaid"), color: "#D97706" },
              { status: "paid", label: t("invoices.status_paid", "Paid"), color: "#059669" },
              { status: "failed", label: t("status.failed", "Failed"), color: "#DC2626" },
              { status: "refunded", label: t("invoices.status_refunded", "Refunded"), color: "#7C3AED" },
            ].map((item) => (
              <div
                key={item.status}
                style={{
                  padding: 18,
                  background: COLORS.bg,
                  borderRadius: 16,
                  boxShadow: neuShadow,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "box-shadow 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "10px 10px 20px rgba(163,150,128,0.3), -10px -10px 20px rgba(255,255,255,0.8)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = neuShadow)}
              >
                <div>
                  <p style={{ fontSize: 12, color: COLORS.muted, margin: 0 }}>{item.label}</p>
                  <p style={{ fontSize: 24, fontWeight: 800, color: item.color, margin: "4px 0 0" }}>
                    {item.status === "failed"
                      ? (failedPaymentsTotal > 0 ? failedPaymentsTotal : (failedPayments.length || (invoiceStatusCounts[item.status] || 0)))
                      : (invoiceStatusCounts[item.status] || 0)
                    }
                  </p>
                </div>
                <div style={{
                  width: 14, height: 14, borderRadius: "50%",
                  background: item.color,
                  boxShadow: `0 0 8px ${item.color}40`,
                }} />
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 380, minWidth: 200 }}>
              <Search
                size={16}
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: COLORS.muted, zIndex: 2 }}
              />
              <input
                type="text"
                placeholder={t("invoices.search_placeholder", "Search invoice #, customer, or date...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...neuInputStyle, paddingLeft: 40 }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={neuSelectStyle}
            >
              <option value="">{t("invoices.status_all", "All Status")}</option>
              <option value="unpaid">{t("invoices.status_unpaid", "Unpaid")}</option>
              <option value="paid">{t("invoices.status_paid", "Paid")}</option>
              <option value="failed">{t("status.failed", "Failed")}</option>
              <option value="refunded">{t("invoices.status_refunded", "Refunded")}</option>
              <option value="draft">{t("invoices.status_draft", "Draft")}</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={neuSelectStyle}
              placeholder={t("invoices.from_date", "From date")}
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={neuSelectStyle}
              placeholder={t("invoices.to_date", "To date")}
            />
            <button
              onClick={() => { setSearch(""); setStatusFilter(""); setDateFrom(""); setDateTo(""); }}
              style={{
                padding: "10px 16px",
                background: COLORS.bg,
                border: "none",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600,
                color: COLORS.text,
                cursor: "pointer",
                boxShadow: neuShadow,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = neuShadowInset)}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = neuShadow)}
            >
              {t("action.clear", "Clear")}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: 16,
              background: COLORS.bg,
              borderRadius: 12,
              color: "#DC2626",
              fontSize: 14,
              marginBottom: 16,
              boxShadow: neuShadowInset,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <AlertCircle size={16} style={{ color: "#DC2626", flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* Invoice Table */}
          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: COLORS.muted, fontSize: 14, background: COLORS.bg, borderRadius: 14, boxShadow: neuShadowInset }}>
              {t("invoices.loading_invoices", "Loading invoices...")}
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div style={{
              textAlign: "center", padding: 60, color: COLORS.muted, fontSize: 14,
              background: COLORS.bg, borderRadius: 14, boxShadow: neuShadowInset,
            }}>
              <FileText size={40} style={{ color: "#d4d4d4", marginBottom: 12, display: "block", margin: "0 auto 12px" }} />
              {t("invoices.empty", "No invoices found.")}
            </div>
          ) : (
            <div style={{
              background: COLORS.bg,
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: neuShadow,
            }}>
              {/* Table Header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1.3fr 1.3fr 0.8fr 0.9fr 0.9fr 1fr 0.9fr 1.5fr",
                padding: "14px 18px",
                background: COLORS.bg,
                borderBottom: `2px solid rgba(163,150,128,0.1)`,
                fontSize: 11,
                fontWeight: 700,
                color: COLORS.muted,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}>
                <div>{t("invoices.invoice_no", "Invoice #")}</div>
                <div>{t("invoices.customer", "Customer")}</div>
                <div>{t("invoices.plan", "Plan")}</div>
                <div>{t("invoices.date", "Date")}</div>
                <div>{t("invoices.due_date", "Due Date")}</div>
                <div>{t("invoices.amount_gst", "Amount (incl. 18% GST)")}</div>
                <div>{t("invoices.status", "Status")}</div>
                <div style={{ textAlign: "right" }}>{t("invoices.actions", "Actions")}</div>
              </div>

              {/* Table Rows */}
              {filteredInvoices.map((inv) => {
                const statusStyle = getStatusStyle(inv.status);
                return (
                  <div
                    key={inv.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.3fr 1.3fr 0.8fr 0.9fr 0.9fr 1fr 0.9fr 1.5fr",
                      padding: "14px 18px",
                      borderBottom: `1px solid rgba(163,150,128,0.06)`,
                      fontSize: 13,
                      color: COLORS.text,
                      alignItems: "center",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245,236,216,0.3)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ fontWeight: 600 }}>{inv.invoice_number || `#${inv.id}`}</div>
                    <div>{inv.customer_name || t("common.no_data", "Unknown")}</div>
                    <div style={{ color: COLORS.muted }}>{inv.plan_name || "—"}</div>
                    <div style={{ color: COLORS.muted }}>{formatDate(inv.invoice_date)}</div>
                    <div style={{ color: COLORS.muted }}>{formatDate(inv.due_date)}</div>
                    <div style={{ fontWeight: 600 }}>
                      <span>{formatWithGST(inv.total_amount || inv.amount || 0)}</span>
                      <div style={{ fontSize: 10, color: COLORS.muted }}>{t("invoices.gst_note", "+18% GST incl.")}</div>
                    </div>
                    <div>
                      <span style={{
                        padding: "4px 10px",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        background: statusStyle.bg,
                        color: statusStyle.color,
                      }}>
                        {statusStyle.label}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button
                        onClick={() => handleView(inv)}
                        style={{
                          padding: "6px 12px",
                          border: "none",
                          borderRadius: 8,
                          background: COLORS.bg,
                          cursor: "pointer",
                          fontSize: 11,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          color: COLORS.text,
                          boxShadow: neuShadowSm,
                          transition: "all 0.2s",
                          fontWeight: 500,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "6px 6px 12px rgba(163,150,128,0.3), -6px -6px 12px rgba(255,255,255,0.8)")}
                        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = neuShadowSm)}
                      >
                        <Eye size={13} /> {t("invoices.view", "View")}
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(inv.id)}
                        disabled={downloadingId === inv.id}
                        style={{
                          padding: "6px 12px",
                          border: "none",
                          borderRadius: 8,
                          background: COLORS.bg,
                          cursor: downloadingId === inv.id ? "not-allowed" : "pointer",
                          fontSize: 11,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          color: COLORS.text,
                          opacity: downloadingId === inv.id ? 0.5 : 1,
                          boxShadow: neuShadowSm,
                          transition: "all 0.2s",
                          fontWeight: 500,
                        }}
                        onMouseEnter={(e) => { if (downloadingId !== inv.id) e.currentTarget.style.boxShadow = "6px 6px 12px rgba(163,150,128,0.3), -6px -6px 12px rgba(255,255,255,0.8)"; }}
                        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = neuShadowSm)}
                      >
                        <Download size={13} /> {downloadingId === inv.id ? "..." : t("invoices.pdf", "PDF")}
                      </button>
                      {(inv.status === "unpaid" || inv.status === "failed") && (
                        <button
                          onClick={() => handleMarkPaid(inv.id)}
                          disabled={actionLoading === `paid-${inv.id}`}
                          style={{
                            padding: "6px 12px",
                            border: "none",
                            borderRadius: 8,
                            background: COLORS.bg,
                            cursor: actionLoading === `paid-${inv.id}` ? "not-allowed" : "pointer",
                            fontSize: 11,
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            color: "#059669",
                            boxShadow: neuShadowSm,
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => { if (actionLoading !== `paid-${inv.id}`) e.currentTarget.style.boxShadow = "6px 6px 12px rgba(163,150,128,0.3), -6px -6px 12px rgba(255,255,255,0.8)"; }}
                          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = neuShadowSm)}
                        >
                          <CheckCircle size={13} /> {actionLoading === `paid-${inv.id}` ? "..." : t("invoices.mark_paid", "Mark Paid")}
                        </button>
                      )}
                      {(inv.status === "paid" || inv.status === "unpaid") && (
                        <button
                          onClick={() => handleRefund(inv.id)}
                          disabled={actionLoading === `refund-${inv.id}`}
                          style={{
                            padding: "6px 12px",
                            border: "none",
                            borderRadius: 8,
                            background: COLORS.bg,
                            cursor: actionLoading === `refund-${inv.id}` ? "not-allowed" : "pointer",
                            fontSize: 11,
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            color: "#DC2626",
                            boxShadow: neuShadowSm,
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => { if (actionLoading !== `refund-${inv.id}`) e.currentTarget.style.boxShadow = "6px 6px 12px rgba(163,150,128,0.3), -6px -6px 12px rgba(255,255,255,0.8)"; }}
                          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = neuShadowSm)}
                        >
                          <RotateCcw size={13} /> {actionLoading === `refund-${inv.id}` ? "..." : t("invoices.refund", "Refund")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TAB 2: PAYMENT STATUS
         ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "payments" && (
        <div>
          {paymentsLoading ? (
            <div style={{ textAlign: "center", padding: 60, color: COLORS.muted, background: COLORS.bg, borderRadius: 14, boxShadow: neuShadowInset }}>
              {t("invoices.loading_payments", "Loading payments...")}
            </div>
          ) : payments.length === 0 ? (
            <div style={{
              textAlign: "center", padding: 60, color: COLORS.muted, fontSize: 14,
              background: COLORS.bg, borderRadius: 14, boxShadow: neuShadowInset,
            }}>
              <CheckCircle size={40} style={{ color: "#4ade80", margin: "0 auto 12px", display: "block" }} />
              {t("invoices.no_payments", "No payments found")}
            </div>
          ) : (
            <div style={{
              background: COLORS.bg,
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: neuShadow,
            }}>
              {/* Table Header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1.2fr 1fr 0.9fr 1fr 1.2fr 1fr",
                padding: "14px 18px",
                background: COLORS.bg,
                borderBottom: `2px solid rgba(163,150,128,0.1)`,
                fontSize: 11,
                fontWeight: 700,
                color: COLORS.muted,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}>
                <div>{t("invoices.invoice_no", "Invoice")}</div>
                <div>{t("invoices.customer", "Customer")}</div>
                <div>{t("invoices.amount_gst", "Amount (incl. 18% GST)")}</div>
                <div>{t("invoices.status", "Status")}</div>
                <div>{t("invoices.col_method", "Method")}</div>
                <div>{t("invoices.col_reference", "Reference")}</div>
                <div>{t("invoices.date", "Date")}</div>
              </div>

              {/* Table Rows */}
              {payments.map((pay) => {
                const statusStyle = getStatusStyle(pay.status);
                return (
                  <div
                    key={pay.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1.2fr 1fr 0.9fr 1fr 1.2fr 1fr",
                      padding: "14px 18px",
                      borderBottom: `1px solid rgba(163,150,128,0.06)`,
                      fontSize: 13,
                      color: COLORS.text,
                      alignItems: "center",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245,236,216,0.3)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ fontWeight: 600 }}>{pay.invoice_number}</div>
                    <div>{pay.customer_name}</div>
                    <div style={{ fontWeight: 600 }}>
                      <span>{formatWithGST(pay.amount || 0)}</span>
                      <div style={{ fontSize: 10, color: COLORS.muted }}>{t("invoices.gst_note", "+18% GST incl.")}</div>
                    </div>
                    <div>
                      <span style={{
                        padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                        background: statusStyle.bg, color: statusStyle.color,
                      }}>
                        {statusStyle.label}
                      </span>
                    </div>
                    <div style={{ color: COLORS.muted, fontSize: 12 }}>{pay.payment_method}</div>
                    <div style={{ color: COLORS.muted, fontSize: 12 }}>{pay.transaction_reference}</div>
                    <div style={{ color: COLORS.muted, fontSize: 12 }}>
                      {formatDate(pay.paid_at || pay.created_at)}
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              {paymentTotalPages > 1 && (
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "14px 18px", borderTop: `1px solid rgba(163,150,128,0.08)`,
                }}>
                  <span style={{ fontSize: 12, color: COLORS.muted }}>
                    {t("invoices.page", "Page")} {paymentPage} {t("invoices.of", "of")} {paymentTotalPages} ({paymentTotal} {t("invoices.total", "total")})
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => setPaymentPage(Math.max(1, paymentPage - 1))}
                      disabled={paymentPage === 1}
                      style={{
                        padding: "8px 12px", borderRadius: 10, border: "none",
                        background: COLORS.bg, cursor: "pointer",
                        boxShadow: paymentPage === 1 ? neuShadowInset : neuShadow,
                      }}
                    >
                      <ChevronLeft size={14} style={{ color: paymentPage === 1 ? "#ccc" : COLORS.text }} />
                    </button>
                    <button
                      onClick={() => setPaymentPage(Math.min(paymentTotalPages, paymentPage + 1))}
                      disabled={paymentPage === paymentTotalPages}
                      style={{
                        padding: "8px 12px", borderRadius: 10, border: "none",
                        background: COLORS.bg, cursor: "pointer",
                        boxShadow: paymentPage === paymentTotalPages ? neuShadowInset : neuShadow,
                      }}
                    >
                      <ChevronRight size={14} style={{ color: paymentPage === paymentTotalPages ? "#ccc" : COLORS.text }} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TAB 3: FAILED PAYMENT QUEUE
         ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "failed" && (
        <div>
          {/* Failed Payments Summary Banner */}
          <div style={{
            padding: 16,
            background: COLORS.bg,
            borderRadius: 12,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: neuShadowInset,
          }}>
            <AlertCircle size={20} style={{ color: "#DC2626", flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#DC2626" }}>
              {failedPayments.length} {t("invoices.failed_banner", "Failed Payments Pending Retry")}
            </span>
          </div>

          {failedLoading ? (
            <div style={{ textAlign: "center", padding: 60, color: COLORS.muted, background: COLORS.bg, borderRadius: 14, boxShadow: neuShadowInset }}>
              {t("invoices.loading_failed", "Loading failed payments...")}
            </div>
          ) : failedPayments.length === 0 ? (
            <div style={{
              textAlign: "center", padding: 60, color: COLORS.muted, fontSize: 14,
              background: COLORS.bg, borderRadius: 14, boxShadow: neuShadowInset,
            }}>
              <CheckCircle size={40} style={{ color: "#4ade80", margin: "0 auto 12px", display: "block" }} />
              <p style={{ fontWeight: 600, margin: "0 0 4px" }}>{t("invoices.no_failed", "No failed payments")}</p>
              <p style={{ fontSize: 12 }}>{t("invoices.no_failed_sub", "All payments are processing successfully")}</p>
            </div>
          ) : (
            <div style={{
              background: COLORS.bg,
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: neuShadow,
            }}>
              {/* Table Header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr 0.8fr 1fr 1fr 1.2fr 1fr 0.8fr",
                padding: "14px 18px",
                background: COLORS.bg,
                borderBottom: `2px solid rgba(163,150,128,0.1)`,
                fontSize: 11,
                fontWeight: 700,
                color: COLORS.muted,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}>
                <div>{t("invoices.customer", "Customer")}</div>
                <div>{t("invoices.invoice_no", "Invoice")}</div>
                <div>{t("invoices.plan", "Plan")}</div>
                <div>{t("invoices.amount_gst", "Amount (incl. 18% GST)")}</div>
                <div>{t("invoices.col_retry_attempt", "Retry Attempt")}</div>
                <div>{t("invoices.col_next_retry", "Next Retry")}</div>
                <div>{t("invoices.col_failed_on", "Failed On")}</div>
                <div style={{ textAlign: "right" }}>{t("invoices.actions", "Action")}</div>
              </div>

              {/* Table Rows */}
              {failedPayments.map((fp) => (
                <div
                  key={fp.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.5fr 1fr 0.8fr 1fr 1fr 1.2fr 1fr 0.8fr",
                    padding: "14px 18px",
                    borderBottom: `1px solid rgba(163,150,128,0.06)`,
                    fontSize: 13,
                    color: COLORS.text,
                    alignItems: "center",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245,236,216,0.3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{fp.customer_name}</div>
                    <div style={{ fontSize: 11, color: COLORS.muted }}>{fp.customer_email}</div>
                  </div>
                  <div style={{ fontWeight: 600 }}>{fp.invoice_number}</div>
                  <div style={{ color: COLORS.muted, fontSize: 12 }}>{fp.plan_name}</div>
                  <div style={{ fontWeight: 600, color: "#DC2626" }}>
                    <span>{formatWithGST(fp.amount || 0)}</span>
                    <div style={{ fontSize: 10, color: COLORS.muted }}>{t("invoices.gst_note", "+18% GST incl.")}</div>
                  </div>
                  <div>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "4px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                      background: "rgba(239,68,68,0.1)", color: "#DC2626",
                    }}>
                      <RotateCcw size={12} />
                      {t("invoices.attempt", "Attempt")} {fp.retry_attempt}
                    </span>
                  </div>
                  <div style={{ color: "#D97706", fontSize: 12 }}>
                    {formatDate(fp.next_retry_date)}
                  </div>
                  <div style={{ color: COLORS.muted, fontSize: 12 }}>
                    {formatDate(fp.failed_at)}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <button
                      onClick={() => handleRetryPayment(fp.id)}
                      disabled={actionLoading === `retry-${fp.id}`}
                      style={{
                        padding: "8px 14px",
                        background: COLORS.gold,
                        color: "#fff",
                        border: "none",
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: actionLoading === `retry-${fp.id}` ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        marginLeft: "auto",
                        boxShadow: "4px 4px 12px rgba(197,160,89,0.35)",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => { if (actionLoading !== `retry-${fp.id}`) e.currentTarget.style.boxShadow = "6px 6px 16px rgba(197,160,89,0.45)"; }}
                      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "4px 4px 12px rgba(197,160,89,0.35)")}
                    >
                      <RotateCcw size={12} />
                      {actionLoading === `retry-${fp.id}` ? "..." : t("invoices.retry_now", "Retry Now")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TAB 4: REFUND HISTORY
         ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "refunds" && (
        <div>
          {refundsLoading ? (
            <div style={{ textAlign: "center", padding: 60, color: COLORS.muted, background: COLORS.bg, borderRadius: 14, boxShadow: neuShadowInset }}>
              {t("invoices.loading_refunds", "Loading refunds...")}
            </div>
          ) : refunds.length === 0 ? (
            <div style={{
              textAlign: "center", padding: 60, color: COLORS.muted, fontSize: 14,
              background: COLORS.bg, borderRadius: 14, boxShadow: neuShadowInset,
            }}>
              <RotateCcw size={40} style={{ color: "#d4d4d4", margin: "0 auto 12px", display: "block" }} />
              {t("invoices.no_refunds", "No refunds issued yet")}
            </div>
          ) : (
            <div style={{
              background: COLORS.bg,
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: neuShadow,
            }}>
              {/* Table Header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.2fr 1.5fr 0.8fr 1fr 1fr",
                padding: "14px 18px",
                background: COLORS.bg,
                borderBottom: `2px solid rgba(163,150,128,0.1)`,
                fontSize: 11,
                fontWeight: 700,
                color: COLORS.muted,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}>
                <div>{t("invoices.col_refund_id", "Refund ID")}</div>
                <div>{t("invoices.invoice_no", "Invoice")}</div>
                <div>{t("invoices.customer", "Customer")}</div>
                <div>{t("invoices.plan", "Plan")}</div>
                <div>{t("invoices.amount_gst", "Amount (incl. 18% GST)")}</div>
                <div>{t("invoices.col_refund_date", "Refund Date")}</div>
              </div>

              {/* Table Rows */}
              {refunds.map((ref) => (
                <div
                  key={ref.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1.2fr 1.5fr 0.8fr 1fr 1fr",
                    padding: "14px 18px",
                    borderBottom: `1px solid rgba(163,150,128,0.06)`,
                    fontSize: 13,
                    color: COLORS.text,
                    alignItems: "center",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245,236,216,0.3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ fontWeight: 700, color: COLORS.gold }}>{ref.refund_id}</div>
                  <div style={{ fontWeight: 600 }}>{ref.invoice_number}</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{ref.customer_name}</div>
                    <div style={{ fontSize: 11, color: COLORS.muted }}>{ref.customer_email}</div>
                  </div>
                  <div style={{ color: COLORS.muted, fontSize: 12 }}>{ref.plan_name}</div>
                  <div style={{ fontWeight: 600, color: "#DC2626" }}>
                    <span>{formatWithGST(ref.amount || 0)}</span>
                    <div style={{ fontSize: 10, color: COLORS.muted }}>{t("invoices.gst_note", "+18% GST incl.")}</div>
                  </div>
                  <div style={{ color: COLORS.muted, fontSize: 12 }}>
                    {formatDate(ref.refund_date)}
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {refundTotalPages > 1 && (
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "14px 18px", borderTop: `1px solid rgba(163,150,128,0.08)`,
                }}>
                  <span style={{ fontSize: 12, color: COLORS.muted }}>
                    {t("invoices.page", "Page")} {refundPage} {t("invoices.of", "of")} {refundTotalPages} ({refundTotal} {t("invoices.total", "total")})
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => setRefundPage(Math.max(1, refundPage - 1))}
                      disabled={refundPage === 1}
                      style={{
                        padding: "8px 12px", borderRadius: 10, border: "none",
                        background: COLORS.bg, cursor: "pointer",
                        boxShadow: refundPage === 1 ? neuShadowInset : neuShadow,
                      }}
                    >
                      <ChevronLeft size={14} style={{ color: refundPage === 1 ? "#ccc" : COLORS.text }} />
                    </button>
                    <button
                      onClick={() => setRefundPage(Math.min(refundTotalPages, refundPage + 1))}
                      disabled={refundPage === refundTotalPages}
                      style={{
                        padding: "8px 12px", borderRadius: 10, border: "none",
                        background: COLORS.bg, cursor: "pointer",
                        boxShadow: refundPage === refundTotalPages ? neuShadowInset : neuShadow,
                      }}
                    >
                      <ChevronRight size={14} style={{ color: refundPage === refundTotalPages ? "#ccc" : COLORS.text }} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── INVOICE DETAIL MODAL ─── */}
      {selectedInvoice && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(43,36,32,0.45)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
          onClick={() => setSelectedInvoice(null)}
        >
          <div
            style={{
              background: COLORS.bg,
              borderRadius: 20,
              padding: 32,
              maxWidth: 500,
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "16px 16px 32px rgba(163,150,128,0.35), -16px -16px 32px rgba(255,255,255,0.7)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.text }}>
                {selectedInvoice.invoice_number || `${t("invoices.invoice_no", "Invoice")} #${selectedInvoice.id}`}
              </h2>
              <button
                onClick={() => setSelectedInvoice(null)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: COLORS.muted }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gap: 4 }}>
              {[
                { label: t("invoices.customer", "Customer"), value: selectedInvoice.customer_name },
                { label: t("invoices.plan", "Plan"), value: selectedInvoice.plan_name },
                { label: t("invoices.date", "Invoice Date"), value: formatDate(selectedInvoice.invoice_date) },
                { label: t("invoices.due_date", "Due Date"), value: formatDate(selectedInvoice.due_date) },
                { label: t("invoices.subtotal", "Subtotal"), value: `₹${(selectedInvoice.subtotal || 0).toFixed(2)}` },
                { label: t("invoices.gst_18", "GST (18%)"), value: `₹${((selectedInvoice.subtotal || 0) * GST_RATE).toFixed(2)}` },
                { label: t("invoices.tax_amount", "Tax Amount"), value: `₹${(selectedInvoice.tax_amount || 0).toFixed(2)}` },
                { label: t("invoices.total_incl_gst", "Total Amount (incl. GST)"), value: formatWithGST(selectedInvoice.total_amount || selectedInvoice.amount || 0) },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid rgba(163,150,128,0.08)` }}>
                  <span style={{ fontSize: 13, color: COLORS.muted }}>{row.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{row.value}</span>
                </div>
              ))}

              <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px", background: COLORS.bg, borderRadius: 12, marginTop: 8, boxShadow: neuShadowInset }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{t("invoices.detail_status", "STATUS")}</span>
                <span style={{
                  padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: getStatusStyle(selectedInvoice.status).bg,
                  color: getStatusStyle(selectedInvoice.status).color,
                }}>
                  {getStatusStyle(selectedInvoice.status).label}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button
                onClick={() => handleDownloadPdf(selectedInvoice.id)}
                style={{
                  flex: 1, padding: 12,
                  background: COLORS.bg, color: COLORS.gold,
                  border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: neuShadow,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "10px 10px 20px rgba(163,150,128,0.35), -10px -10px 20px rgba(255,255,255,0.8)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = neuShadow)}
              >
                <Download size={16} /> {t("invoices.download", "Download PDF")}
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                style={{
                  padding: "12px 20px",
                  background: COLORS.bg,
                  color: COLORS.text,
                  border: "none",
                  borderRadius: 12,
                  fontSize: 14,
                  cursor: "pointer",
                  fontWeight: 500,
                  boxShadow: neuShadow,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = neuShadowInset)}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = neuShadow)}
              >
                {t("common.close", "Close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── GENERATE INVOICE MODAL ─── */}
      {showGenerateModal && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(43,36,32,0.45)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
          onClick={() => setShowGenerateModal(false)}
        >
          <div
            style={{
              background: COLORS.bg, borderRadius: 20, padding: 32,
              maxWidth: 480, width: "90%",
              boxShadow: "16px 16px 32px rgba(163,150,128,0.35), -16px -16px 32px rgba(255,255,255,0.7)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, margin: "0 0 24px" }}>
              {t("invoices.generate_invoice", "Generate Invoice")}
            </h2>

            {/* Subscription Selector */}
            <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, marginBottom: 6, display: "block" }}>
              Select Subscription
            </label>
            <select
              value={selectedSubId}
              onChange={(e) => setSelectedSubId(e.target.value)}
              style={{
                ...neuSelectStyle, width: "100%", marginBottom: 16,
                appearance: "none", padding: "12px 14px",
              }}
            >
              <option value="">-- Choose a subscription --</option>
              {subscriptions.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.customer_name} — {sub.plan_name} (₹{sub.plan_price}) — {sub.status}
                </option>
              ))}
            </select>

            {/* Due Date Days */}
            <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted, marginBottom: 6, display: "block" }}>
              Due Date (days from today)
            </label>
            <input
              type="number"
              value={dueDays}
              onChange={(e) => setDueDays(e.target.value)}
              min="1"
              style={{ ...neuInputStyle, width: "100%", marginBottom: 24 }}
            />

            {/* Selected Invoice Preview */}
            {selectedSubId && (() => {
              const sub = subscriptions.find((s) => s.id === parseInt(selectedSubId));
              if (!sub) return null;
              const subtotal = parseFloat(sub.plan_price || 0);
              const gst = Math.round(subtotal * 0.18 * 100) / 100;
              const total = Math.round((subtotal + gst) * 100) / 100;
              return (
                <div style={{
                  padding: 16, borderRadius: 12, background: COLORS.bg,
                  boxShadow: neuShadowInset, marginBottom: 20,
                }}>
                  <p style={{ fontSize: 12, color: COLORS.muted, margin: 0 }}>Invoice Preview</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, margin: "6px 0 2px" }}>
                    {sub.customer_name} — {sub.plan_name}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: COLORS.muted }}>
                    <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: COLORS.muted }}>
                    <span>GST (18%)</span><span>₹{gst.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: COLORS.gold, marginTop: 6, paddingTop: 6, borderTop: "1px solid rgba(163,150,128,0.15)" }}>
                    <span>Total</span><span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handleGenerate}
                disabled={generating || !selectedSubId}
                style={{
                  flex: 1, padding: 12, background: COLORS.gold, color: "#fff",
                  border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600,
                  cursor: generating || !selectedSubId ? "not-allowed" : "pointer",
                  opacity: generating || !selectedSubId ? 0.6 : 1,
                  boxShadow: "4px 4px 12px rgba(197,160,89,0.35)",
                  transition: "all 0.2s",
                }}
              >
                {generating ? "Generating..." : "Generate Invoice"}
              </button>
              <button
                onClick={() => setShowGenerateModal(false)}
                style={{
                  padding: "12px 20px", background: COLORS.bg, color: COLORS.text,
                  border: "none", borderRadius: 12, fontSize: 14, fontWeight: 500,
                  cursor: "pointer", boxShadow: neuShadow, transition: "all 0.2s",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
