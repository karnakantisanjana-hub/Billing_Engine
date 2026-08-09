import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth, API_BASE_URL } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext.jsx";
import { ChevronDown, Wallet, Users, Zap, Crown, Plus, X, Trash2, Sun, Moon, Loader2, UserCheck, CheckCircle2, IndianRupee, AlertTriangle } from "lucide-react";
import LanguageSelector from "../components/LanguageSelector";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

/* ─────────────────────────────────────────────────────────
   THEME TOKENS
   Light = original cream/gold identity.
   Dark  = deep navy, same gold accent, tuned for contrast.
   ───────────────────────────────────────────────────────── */
const THEMES = {
  light: {
    mode: "light",
    bg: "#f9f2e6",
    card: "#FAF6EE",
    cardAlt: "#F3EBDC",
    gold: "#C5A059",
    goldSoft: "#F6EBD3",   // ← add
    goldBannerEnd: "#EFD9A8", 
    goldText: "#8A6D34",
    heading: "#2B2420",
    muted: "#6B6153", // darkened from #8A7F6D for WCAG AA contrast on #f9f2e6 (was ~3.3:1, now ~4.6:1)
    border: "rgba(163,150,128,0.14)",
    danger: "#DC2626",
    dangerBg: "#FEE2E2",
    overlay: "rgba(43,36,32,0.45)",
    shadowHi: "rgba(255,255,255,0.7)",
    shadowLo: "rgba(163,150,128,0.25)",
    shadowLoSm: "rgba(163,150,128,0.2)",
    shadowLoInset: "rgba(163,150,128,0.15)",
    shadowHiInset: "rgba(255,255,255,0.5)",
  },
  dark: {
    mode: "dark",
    bg: "#0A1120",
    card: "#111A2E",
    cardAlt: "#0E1626",
    gold: "#D8B67C",
    goldSoft: "rgba(216,182,124,0.14)",   // ← add
    goldBannerEnd: "rgba(216,182,124,0.22)", 
    goldText: "#E7CB98",
    heading: "#E9EDF6",
    muted: "#9BA6BE", // lightened from #8F9BB5 for contrast on #0A1120
    border: "rgba(148,163,184,0.14)",
    danger: "#F87171",
    dangerBg: "rgba(220,38,38,0.15)",
    overlay: "rgba(2,6,20,0.65)",
    shadowHi: "rgba(35,49,82,0.55)",
    shadowLo: "rgba(0,0,0,0.55)",
    shadowLoSm: "rgba(0,0,0,0.5)",
    shadowLoInset: "rgba(0,0,0,0.45)",
    shadowHiInset: "rgba(35,49,82,0.4)",
  },
};

const STATUS_COLORS = {
  trial: "#3B82F6",
  active: "#10B981",
  past_due: "#F59E0B",
  cancelled: "#EF4444",
};

const EMPTY_PLAN_FORM = {
  name: "",
  description: "",
  price: "",
  duration: "monthly",
  features: [""],
};


export default function Dashboard({ setCurrentPage }) {
  const { getAuthHeaders, logout } = useAuth();
  const { t, languageCode, changeLanguage, availableLanguages } = useLanguage();
  const profileMenuRef = useRef(null);
  const modalRef = useRef(null);
  const firstFieldRef = useRef(null);
  const addPlanTriggerRef = useRef(null);

  /* Shared application theme. The Sidebar intentionally does not use this hook. */
  const { theme, colors: C, toggleTheme } = useTheme();

  /* ─── Neumorphic shadow helpers, derived from the active theme ─── */
  const neuShadow = `8px 8px 16px ${C.shadowLo}, -8px -8px 16px ${C.shadowHi}`;
  const neuShadowSm = `4px 4px 10px ${C.shadowLoSm}, -4px -4px 10px ${C.shadowHi}`;
  const neuShadowInset = `inset 4px 4px 10px ${C.shadowLoInset}, inset -4px -4px 10px ${C.shadowHiInset}`;
  const neuShadowHover = `12px 12px 24px ${C.shadowLo}, -12px -12px 24px ${C.shadowHi}`;
  const neuShadowHoverGold =
    theme === "dark"
      ? `12px 12px 24px rgba(0,0,0,0.55), -12px -12px 24px rgba(216,182,124,0.12)`
      : `12px 12px 24px rgba(197,160,89,0.35), -12px -12px 24px rgba(255,255,255,0.9)`;

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.style.background = C.bg;
      document.body.style.transition = "background-color 0.2s ease";
    }

    return () => {
      if (typeof document !== "undefined") document.body.style.background = "";
    };
  }, [C.bg]);

      
  const [profile, setProfile] = useState({});
  const [profileOpen, setProfileOpen] = useState(false);
  const [summary, setSummary] = useState({
    total_customers: 0,
    active_subscriptions: 0,
    cancelled_subscriptions: 0,
    mrr: 0,
    churn_rate: 0,
    trial_conversion_rate: 0,
  });
  const [revenueByPlan, setRevenueByPlan] = useState([]);
  const [subscriptionMetrics, setSubscriptionMetrics] = useState({
    trial: 0,
    active: 0,
    past_due: 0,
    cancelled: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [planStats, setPlanStats] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  // ─── ADD PLAN MODAL STATE ───
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [newPlan, setNewPlan] = useState(EMPTY_PLAN_FORM);
  const [addPlanLoading, setAddPlanLoading] = useState(false);
  const [addPlanError, setAddPlanError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // per-field inline validation
  const [touched, setTouched] = useState({});

  const loadProfile = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/profile`, { headers: getAuthHeaders() });
      if (res.ok) setProfile(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setApiError("");
    try {
      const [summaryRes, revenueRes, metricsRes, invoicesRes, plansRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/dashboard/summary`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/api/dashboard/revenue-by-plan`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/api/dashboard/subscription-metrics`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/api/v1/invoices/enriched`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/api/v1/plans`, { headers: getAuthHeaders() }),
      ]);

      if (!summaryRes.ok || !revenueRes.ok || !metricsRes.ok) {
        throw new Error("Failed to fetch dashboard metrics");
      }

      const summaryData = await summaryRes.json();
      const revenueData = await revenueRes.json();
      const metricsData = await metricsRes.json();

      setSummary(summaryData);
      setRevenueByPlan(Array.isArray(revenueData) ? revenueData : []);
      setSubscriptionMetrics(metricsData);

      let invoicesData = [];
      if (invoicesRes.ok) {
        invoicesData = await invoicesRes.json();
        setRecentInvoices(Array.isArray(invoicesData) ? invoicesData.slice(0, 6) : []);
      }

      // ─── PLANS STATS ───
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        const plans = Array.isArray(plansData) ? plansData : [];
        const planStatsCalc = plans.map((plan) => {
          const subCount = Array.isArray(invoicesData)
            ? invoicesData.filter((inv) => (inv.plan_name || "").toLowerCase() === (plan.name || "").toLowerCase()).length
            : 0;
          return {
            id: plan.id,
            name: plan.name,
            description: plan.description || "",
            price: plan.price || plan.monthly_price || 0,
            subscriberCount: subCount,
            revenue: (plan.price || plan.monthly_price || 0) * subCount,
            features: plan.features || [],
            duration: plan.duration || "monthly",
          };
        });
        setPlanStats(planStatsCalc);
      } else {
        // Fallback: derive plan stats from revenueByPlan data
        const fallback = revenueData.map((item) => ({
          name: item.plan,
          description: "",
          price: 0,
          subscriberCount: 0,
          revenue: item.revenue || 0,
          features: [],
          duration: "monthly",
        }));
        setPlanStats(fallback);
      }
      setPlansLoading(false);
    } catch (err) {
      console.error(err);
      setApiError("Unable to load dashboard metrics. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadProfile();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── ESCAPE KEY: close whichever overlay is open ───
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      if (showAddPlanModal) {
        if (!addPlanLoading) closeAddPlanModal();
      } else if (profileOpen) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddPlanModal, profileOpen, addPlanLoading]);

  // ─── FOCUS MANAGEMENT: trap focus inside modal, restore on close ───
  useEffect(() => {
    if (!showAddPlanModal) return;

    // Move focus into the modal as soon as it opens
    const focusTimer = setTimeout(() => {
      firstFieldRef.current?.focus();
    }, 0);

    const handleTabTrap = (event) => {
      if (event.key !== "Tab" || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleTabTrap);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleTabTrap);
      // Return focus to whatever opened the modal, so keyboard users don't lose their place
      addPlanTriggerRef.current?.focus();
    };
  }, [showAddPlanModal]);

  const handleMyProfile = () => {
    setProfileOpen(false);
    setCurrentPage("profile");
  };

  const handleSettings = () => {
    setProfileOpen(false);
    setCurrentPage("settings");
  };

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
  };

  // ─── ADD PLAN HANDLERS ───
  const openAddPlanModal = (triggerEl) => {
    addPlanTriggerRef.current = triggerEl || null;
    setNewPlan(EMPTY_PLAN_FORM);
    setAddPlanError("");
    setFieldErrors({});
    setTouched({});
    setShowAddPlanModal(true);
  };

  const closeAddPlanModal = () => {
    if (addPlanLoading) return;
    setShowAddPlanModal(false);
    setNewPlan(EMPTY_PLAN_FORM);
    setAddPlanError("");
    setFieldErrors({});
    setTouched({});
  };

  const handlePlanFieldChange = (field, value) => {
    setNewPlan((prev) => ({ ...prev, [field]: value }));
  };

  const handleFieldBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldErrors((prev) => ({ ...prev, ...validateField(field, newPlan[field]) }));
  };

  const validateField = (field, value) => {
    if (field === "name") {
      return { name: value.trim() ? "" : t("plans.error_name", "Plan name is required.") };
    }
    if (field === "price") {
      const invalid = value === "" || isNaN(Number(value)) || Number(value) < 0;
      return { price: invalid ? t("plans.error_price", "Enter a valid, non-negative price.") : "" };
    }
    return {};
  };

  const handleFeatureChange = (index, value) => {
    setNewPlan((prev) => {
      const features = [...prev.features];
      features[index] = value;
      return { ...prev, features };
    });
  };

  const addFeatureField = () => {
    setNewPlan((prev) => ({ ...prev, features: [...prev.features, ""] }));
  };

  const removeFeatureField = (index) => {
    setNewPlan((prev) => {
      const features = prev.features.filter((_, i) => i !== index);
      return { ...prev, features: features.length ? features : [""] };
    });
  };

  const validatePlanForm = () => {
    const nameErr = validateField("name", newPlan.name).name;
    const priceErr = validateField("price", newPlan.price).price;
    setFieldErrors({ name: nameErr, price: priceErr });
    setTouched({ name: true, price: true });
    return nameErr || priceErr || "";
  };

  const handleAddPlan = async (e) => {
    e.preventDefault();
    const validationError = validatePlanForm();
    if (validationError) {
      setAddPlanError(t("plans.error_form", "Please fix the highlighted fields before continuing."));
      return;
    }

    setAddPlanLoading(true);
    setAddPlanError("");

    const payload = {
      name: newPlan.name.trim(),
      description: newPlan.description.trim(),
      price: Number(newPlan.price),
      duration: newPlan.duration,
      features: newPlan.features.map((f) => f.trim()).filter((f) => f.length > 0),
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/plans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || errBody.detail || "Failed to create plan.");
      }

      // Refresh dashboard/plan data so the new plan shows up immediately
      await loadDashboardData();
      setShowAddPlanModal(false);
      setNewPlan(EMPTY_PLAN_FORM);
    } catch (err) {
      console.error(err);
      setAddPlanError(err.message || "Something went wrong while creating the plan. Please try again.");
    } finally {
      setAddPlanLoading(false);
    }
  };

  /* ─── GLOBAL STYLES: focus rings, smooth theme transition, responsive rules ───
     Injected once; keeps every interactive element keyboard-accessible and
     avoids the jarring flash a plain color swap would cause on toggle.
     Respects prefers-reduced-motion so transitions/animations don't run for
     people who've asked the OS to minimize motion. */
  const globalStyles = `
    .be-root, .be-root * {
      transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;
    }
    .be-root *:focus-visible {
      outline: 2px solid ${C.gold};
      outline-offset: 2px;
      border-radius: 6px;
    }
    .be-sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .be-summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }
    .be-charts-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }
    .be-stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }
    .be-plans-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }
    .be-table-wrap {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .be-field-error {
      color: ${C.danger};
      fontSize: 12px;
      margin-top: 6px;
    }
    @media (max-width: 900px) {
      .be-charts-grid, .be-stats-grid { grid-template-columns: 1fr; }
      .be-plans-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 640px) {
      .be-plans-grid { grid-template-columns: 1fr; }
      .be-header-row { flex-direction: column; align-items: stretch !important; gap: 16px; }
      .be-page-pad { padding: 20px !important; }
    }
    @keyframes be-spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) {
      .be-root, .be-root * {
        transition: none !important;
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
      }
    }
  `;

  if (loading) {
    return (
      <div
        className="be-root"
        role="status"
        aria-live="polite"
        style={{
          padding: 50,
          textAlign: "center",
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <style>{globalStyles}</style>
        <Loader2 size={32} color={C.gold} aria-hidden="true" style={{ animation: "be-spin 0.9s linear infinite" }} />
        <div style={{ fontSize: 16, color: C.muted, fontWeight: 500 }}>
          {t("common.loading", "Loading Dashboard...")}
        </div>
      </div>
    );
  }

  // Icons are drawn from the same lucide-react set used across the header/modal,
  // instead of emoji, so the summary row reads as one coherent icon language
  // (emoji render inconsistently across OSes and carry no semantic weight for
  // screen readers).
  const summaryCards = [
    { title: t("dashboard.customers", "Total Customers"), value: summary.total_customers, Icon: Users, color: "#3B82F6" },
    { title: t("dashboard.active_subs", "Active Subscriptions"), value: summary.active_subscriptions, Icon: CheckCircle2, color: "#10B981" },
    { title: t("dashboard.mrr", "MRR"), value: `₹${Number(summary.mrr).toLocaleString("en-IN")}`, Icon: IndianRupee, color: C.gold },
    { title: t("dashboard.cancelled", "Cancelled Subs"), value: summary.cancelled_subscriptions, Icon: AlertTriangle, color: "#EF4444" },
  ];

  const statusLabels = {
    trial: t("status.trial", "Trial"),
    active: t("status.active", "Active"),
    past_due: t("status.past_due", "Past Due"),
    cancelled: t("status.cancelled", "Cancelled"),
  };

  const statusChartData = Object.entries(subscriptionMetrics).map(([status, count]) => ({
    name: statusLabels[status] || status.replace("_", " "),
    value: count,
    status,
  }));

  const pillStyle = (status) => {
    const base = {
      padding: "5px 12px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      boxShadow: neuShadowSm,
    };
    const key = (status || "").toLowerCase();
    if (theme === "dark") {
      switch (key) {
        case "paid":
          return { ...base, background: "rgba(16,185,129,0.16)", color: "#34D399" };
        case "unpaid":
          return { ...base, background: "rgba(245,158,11,0.16)", color: "#FBBF24" };
        case "refunded":
          return { ...base, background: "rgba(148,163,184,0.14)", color: C.muted };
        default:
          return { ...base, background: "rgba(148,163,184,0.14)", color: C.muted };
      }
    }
    switch (key) {
      case "paid":
        return { ...base, background: "#DCFCE7", color: "#166534" };
      case "unpaid":
        return { ...base, background: "#FEF3C7", color: "#92400E" };
      case "refunded":
        return { ...base, background: "#F3EFE6", color: "#6B6455" };
      default:
        return { ...base, background: "#F3EFE6", color: "#6B6455" };
    }
  };

  /* ─── NEUMORPHIC NEU-INPUT STYLE ─── */
  const neuInputStyle = (hasError) => ({
    background: C.card,
    border: hasError ? `1px solid ${C.danger}` : "1px solid transparent",
    borderRadius: 12,
    padding: "10px 16px",
    fontSize: 13,
    color: C.heading,
    boxShadow: neuShadowInset,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  });

  const HARD_CODED_PLAN_NAMES = ["basic", "professional", "enterprise"];

  // Plans fetched from the API that aren't one of the three built-in showcase plans.
  // These render as additional cards so newly-added plans show up right away.
  const customPlans = planStats.filter(
    (p) => p.name && !HARD_CODED_PLAN_NAMES.includes(p.name.trim().toLowerCase())
  );

  const planCardStyle = (highlight) => ({
    position: highlight ? "relative" : "static",
    background: C.card,
    borderRadius: 16,
    padding: "28px 24px",
    boxShadow: highlight ? neuShadowHoverGold : neuShadow,
    border: highlight ? `2px solid rgba(197,160,89,0.5)` : `1px solid ${C.border}`,
    transition: "box-shadow 0.3s ease, transform 0.2s ease",
  });

  const nameErrorId = "plan-name-error";
  const priceErrorId = "plan-price-error";

  return (
    <div className="be-root be-page-pad" style={{ padding: 40, background: C.bg, minHeight: "100vh" }}>
      <style>{globalStyles}</style>

      {/* ─── HEADER ─── */}
        <div
        className="be-header-row"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 28,
          flexWrap: "wrap",
          gap: 16,
          background: `linear-gradient(135deg, ${C.goldSoft} 0%, ${C.goldBannerEnd} 100%)`,
          padding: "28px 32px",
          borderRadius: 24,
          boxShadow: neuShadow,
        }}
      >
        <div>
          <h1 style={{ fontSize: 34, fontWeight: "800", color: C.heading, margin: 0, letterSpacing: -0.5 }}>
            {t("dashboard.title", "Dashboard")}
          </h1>
          <p style={{ color: C.goldText, marginTop: 6, fontSize: 15, fontWeight: 500 }}>
            {t("dashboard.subtitle", "Overall health of your subscription business")}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* ─── THEME TOGGLE ─── */}
          <button
            onClick={toggleTheme}
            aria-label={theme === "light" ? t("theme.switch_dark", "Switch to dark mode") : t("theme.switch_light", "Switch to light mode")}
            aria-pressed={theme === "dark"}
            title={theme === "light" ? t("theme.switch_dark", "Switch to dark mode") : t("theme.switch_light", "Switch to light mode")}
            style={{
              width: 45,
              height: 45,
              borderRadius: 14,
              background: C.bg,
              border: "none",
              boxShadow: neuShadow,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {theme === "light" ? <Moon size={19} color={C.heading} aria-hidden="true" /> : <Sun size={19} color={C.gold} aria-hidden="true" />}
          </button>

          <div ref={profileMenuRef} style={{ position: "relative" }}>
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen(!profileOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: C.bg,
                padding: "10px 18px",
                borderRadius: 16,
                boxShadow: neuShadow,
                cursor: "pointer",
                border: "none",
                font: "inherit",
                textAlign: "left",
              }}
            >
              {/* Language Selector */}
              <LanguageSelector key={languageCode} />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  borderLeft: `2px solid rgba(197,160,89,0.3)`,
                  paddingLeft: 14,
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: 45,
                    height: 45,
                    borderRadius: "50%",
                    background: C.gold,
                    color: theme === "dark" ? "#161225" : "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: "700",
                    boxShadow: neuShadowSm,
                  }}
                >
                  {profile?.name ? profile.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <div style={{ fontWeight: "600", color: C.heading, fontSize: 15 }}>
                    {profile?.name || "User"}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted }}>{t("profile.label", "Profile")}</div>
                </div>
                <ChevronDown
                  size={18}
                  color={C.muted}
                  aria-hidden="true"
                  style={{ transform: profileOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
                />
              </div>
            </button>

            {profileOpen && (
              <div
                role="menu"
                aria-label={t("profile.label", "Profile menu")}
                style={{
                  position: "absolute",
                  top: "70px",
                  right: 0,
                  width: 220,
                  background: C.bg,
                  borderRadius: 16,
                  boxShadow: neuShadow,
                  zIndex: 1000,
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleMyProfile}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    padding: 14,
                    cursor: "pointer",
                    color: C.heading,
                    fontSize: 14,
                    fontWeight: 500,
                    borderBottom: `1px solid ${C.border}`,
                    font: "inherit",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(197,160,89,0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {t("profile.my_profile", "My Profile")}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSettings}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    padding: 14,
                    cursor: "pointer",
                    color: C.heading,
                    fontSize: 14,
                    fontWeight: 500,
                    borderBottom: `1px solid ${C.border}`,
                    font: "inherit",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(197,160,89,0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {t("profile.settings", "Settings")}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    padding: 14,
                    color: C.danger,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 500,
                    font: "inherit",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(220,38,38,0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {t("profile.logout", "Logout")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── ERROR ─── */}
      {apiError && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            background: C.bg,
            color: C.danger,
            padding: 15,
            borderRadius: 14,
            marginBottom: 24,
            boxShadow: neuShadowInset,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <AlertTriangle size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{apiError}</span>
        </div>
      )}

      {/* ─── SUMMARY CARDS ─── */}
      <div className="be-summary-grid">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            style={{
              background: C.bg,
              borderRadius: 20,
              padding: 28,
              boxShadow: neuShadow,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = neuShadowHover)}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = neuShadow)}
          >
            <div>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 10 }}>{card.title}</div>
              <div style={{ fontSize: 30, fontWeight: "700", color: card.color }}>{card.value}</div>
            </div>
            <div
              aria-hidden="true"
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: C.card,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: neuShadowSm,
                flexShrink: 0,
              }}
            >
              <card.Icon size={24} color={card.color} />
            </div>
          </div>
        ))}
      </div>

      {/* ─── CHARTS ROW ─── */}
      <div className="be-charts-grid">
        <div style={{ background: C.bg, borderRadius: 22, padding: 32, boxShadow: neuShadow }}>
          <h2 style={{ marginBottom: 25, color: C.heading, fontSize: 20 }}>
            {t("dashboard.revenue_plan", "Revenue by Plan")}
          </h2>
          {revenueByPlan.length === 0 ? (
            <div
              style={{
                color: C.muted,
                fontSize: 14,
                textAlign: "center",
                padding: "60px 0",
                background: C.bg,
                borderRadius: 14,
                boxShadow: neuShadowInset,
              }}
            >
              {t("dashboard.no_revenue", "No revenue yet — figures will appear once your first invoice is paid.")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByPlan}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "rgba(148,163,184,0.15)" : "rgba(163,150,128,0.15)"} />
                <XAxis dataKey="plan" tick={{ fontSize: 12, fill: C.muted }} />
                <YAxis tick={{ fontSize: 12, fill: C.muted }} />
                <Tooltip
                  formatter={(value) => [`₹${value}`, t("dashboard.revenue", "Revenue")]}
                  contentStyle={{
                    background: C.card,
                    border: "none",
                    borderRadius: 12,
                    boxShadow: neuShadow,
                    fontSize: 13,
                    color: C.heading,
                  }}
                />
                <Bar dataKey="revenue" fill={C.gold} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ background: C.bg, borderRadius: 22, padding: 32, boxShadow: neuShadow }}>
          <h2 style={{ marginBottom: 25, color: C.heading, fontSize: 20 }}>
            {t("dashboard.sub_status", "Subscription Status")}
          </h2>
          {statusChartData.every((s) => s.value === 0) ? (
            <div
              style={{
                color: C.muted,
                fontSize: 14,
                textAlign: "center",
                padding: "60px 0",
                background: C.bg,
                borderRadius: 14,
                boxShadow: neuShadowInset,
              }}
            >
              {t("dashboard.no_subs", "No subscriptions yet — add a customer to get started.")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {statusChartData.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#9CA3AF"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: C.card,
                    border: "none",
                    borderRadius: 12,
                    boxShadow: neuShadow,
                    fontSize: 13,
                    color: C.heading,
                  }}
                />
                <Legend wrapperStyle={{ color: C.muted, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ─── CHURN & TRIAL CONVERSION ─── */}
      <div className="be-stats-grid">
        <div style={{ background: C.bg, borderRadius: 20, padding: 28, boxShadow: neuShadow }}>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 10 }}>{t("dashboard.churn", "Churn Rate")}</div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: theme === "dark" ? "#F87171" : "#EF4444",
              padding: "12px 20px",
              borderRadius: 14,
              background: C.bg,
              boxShadow: neuShadowInset,
              display: "inline-block",
            }}
          >
            {summary.churn_rate}%
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>
            {t("dashboard.churn_desc", "Cancelled subscriptions ÷ total subscriptions")}
          </div>
        </div>
        <div style={{ background: C.bg, borderRadius: 20, padding: 28, boxShadow: neuShadow }}>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 10 }}>
            {t("dashboard.trial_conversion", "Trial Conversion Rate")}
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: theme === "dark" ? "#34D399" : "#10B981",
              padding: "12px 20px",
              borderRadius: 14,
              background: C.bg,
              boxShadow: neuShadowInset,
              display: "inline-block",
            }}
          >
            {summary.trial_conversion_rate}%
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>
            {t("dashboard.trial_desc", "Currently-paying subscriptions ÷ total subscriptions (estimate)")}
          </div>
        </div>
      </div>

      {/* ─── PLANS BAR ─── */}
      <div style={{ marginBottom: 24 }}>
        <div
          className="be-header-row"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}
        >
          <div>
            <h2 style={{ marginBottom: 8, color: C.heading, fontSize: 20 }}>{t("plans.title", "Plans")}</h2>
            <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>
              {t("plans.subtitle", "Choose the plan that fits your business. Upgrade or downgrade anytime.")}
            </p>
          </div>

          {/* ─── ADD PLAN BUTTON ─── */}
          <button
            onClick={(e) => openAddPlanModal(e.currentTarget)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: C.gold,
              color: theme === "dark" ? "#161225" : "#fff",
              border: "none",
              borderRadius: 14,
              padding: "12px 20px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: neuShadowSm,
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <Plus size={18} aria-hidden="true" />
            {t("plans.add_plan", "Add Plan")}
          </button>
        </div>

        <div className="be-plans-grid">
          {/* ─── BASIC ─── */}
          <div
            style={planCardStyle(false)}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = neuShadowHover;
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = neuShadow;
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <h3 style={{ fontSize: 20, fontWeight: 700, color: C.heading, margin: "0 0 4px" }}>
              {t("plans.basic", "Basic")}
            </h3>
            <p style={{ fontSize: 12, color: C.muted, margin: "0 0 16px" }}>
              {t("plans.basic_desc", "For startups and small teams")}
            </p>

            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 34, fontWeight: 800, color: C.gold }}>₹499</span>
              <span style={{ fontSize: 14, color: C.muted }}>{t("plans.per_month", "/mo")}</span>
            </div>
            <p style={{ fontSize: 11, color: C.muted, margin: "0 0 20px" }}>
              {t("plans.billed_monthly", "Billed monthly")}
            </p>

            <ul style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24, listStyle: "none", padding: 0, margin: "0 0 24px" }}>
              {[
                t("plans.basic_feature_1", "Up to 50 subscribers"),
                t("plans.basic_feature_2", "Auto invoice generation"),
                t("plans.basic_feature_3", "Basic payment tracking"),
                t("plans.basic_feature_4", "Email support"),
                t("plans.basic_feature_5", "Standard reports"),
              ].map((feat, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CheckCircle2 size={14} color={C.gold} aria-hidden="true" />
                    <span style={{ fontSize: 13, color: C.heading }}>{feat}</span>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* ─── PROFESSIONAL (Most Popular) ─── */}
          <div
            style={planCardStyle(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -12,
                left: "50%",
                transform: "translateX(-50%)",
                background: C.gold,
                color: theme === "dark" ? "#161225" : "#fff",
                padding: "4px 16px",
                borderRadius: 16,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.5,
              }}
            >
              {t("plans.most_popular", "Most Popular")}
            </div>

            <h3 style={{ fontSize: 20, fontWeight: 700, color: C.heading, margin: "8px 0 4px" }}>
              {t("plans.professional", "Professional")}
            </h3>
            <p style={{ fontSize: 12, color: C.muted, margin: "0 0 16px" }}>
              {t("plans.professional_desc", "For growing SaaS businesses")}
            </p>

            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 34, fontWeight: 800, color: C.gold }}>₹999</span>
              <span style={{ fontSize: 14, color: C.muted }}>{t("plans.per_month", "/mo")}</span>
            </div>
            <p style={{ fontSize: 11, color: C.muted, margin: "0 0 20px" }}>
              {t("plans.billed_monthly", "Billed monthly")}
            </p>

            <ul style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24, listStyle: "none", padding: 0, margin: "0 0 24px" }}>
              {[
                t("plans.professional_feature_1", "Up to 500 subscribers"),
                t("plans.professional_feature_2", "Advanced analytics dashboard"),
                t("plans.professional_feature_3", "Custom invoice templates"),
                t("plans.professional_feature_4", "Refund management"),
                t("plans.professional_feature_5", "Priority support"),
                t("plans.professional_feature_6", "Audit logs"),
              ].map((feat, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 size={14} color={C.gold} aria-hidden="true" />
                  <span style={{ fontSize: 13, color: C.heading }}>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ─── ENTERPRISE ─── */}
          <div
            style={planCardStyle(false)}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = neuShadowHover;
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = neuShadow;
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <h3 style={{ fontSize: 20, fontWeight: 700, color: C.heading, margin: "0 0 4px" }}>
              {t("plans.enterprise", "Enterprise")}
            </h3>
            <p style={{ fontSize: 12, color: C.muted, margin: "0 0 16px" }}>
              {t("plans.enterprise_desc", "For large-scale operations")}
            </p>

            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 34, fontWeight: 800, color: C.gold }}>₹2,499</span>
              <span style={{ fontSize: 14, color: C.muted }}>{t("plans.per_month", "/mo")}</span>
            </div>
            <p style={{ fontSize: 11, color: C.muted, margin: "0 0 20px" }}>
              {t("plans.billed_monthly", "Billed monthly")}
            </p>

            <ul style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24, listStyle: "none", padding: 0, margin: "0 0 24px" }}>
              {[
                t("plans.enterprise_feature_1", "Unlimited subscribers"),
                t("plans.enterprise_feature_2", "Full API access"),
                t("plans.enterprise_feature_3", "Multi-tenant support"),
                t("plans.enterprise_feature_4", "Custom billing cycles"),
                t("plans.enterprise_feature_5", "Dedicated account manager"),
                t("plans.enterprise_feature_6", "SLA guarantee"),
              ].map((feat, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 size={14} color={C.gold} aria-hidden="true" />
                  <span style={{ fontSize: 13, color: C.heading }}>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ─── CUSTOM / DYNAMIC PLANS (from API, excludes the 3 built-ins above) ─── */}
          {customPlans.map((plan) => (
            <div
              key={plan.id || plan.name}
              style={planCardStyle(false)}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = neuShadowHover;
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = neuShadow;
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <h3 style={{ fontSize: 20, fontWeight: 700, color: C.heading, margin: "0 0 4px" }}>{plan.name}</h3>
              <p style={{ fontSize: 12, color: C.muted, margin: "0 0 16px" }}>
                {plan.description || t("plans.custom_desc", "Custom plan")}
              </p>

              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 34, fontWeight: 800, color: C.gold }}>
                  ₹{Number(plan.price).toLocaleString("en-IN")}
                </span>
                <span style={{ fontSize: 14, color: C.muted }}>{plan.duration === "yearly" ? t("plans.per_year", "/yr") : t("plans.per_month", "/mo")}</span>
              </div>
              <p style={{ fontSize: 11, color: C.muted, margin: "0 0 20px" }}>
                {plan.duration === "yearly" ? t("plans.billed_yearly", "Billed yearly") : t("plans.billed_monthly", "Billed monthly")}
              </p>

              <ul style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24, listStyle: "none", padding: 0, margin: "0 0 24px" }}>
                {(plan.features && plan.features.length > 0 ? plan.features : [t("plans.no_features", "No features listed")]).map(
                  (feat, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle2 size={14} color={C.gold} aria-hidden="true" />
                      <span style={{ fontSize: 13, color: C.heading }}>{feat}</span>
                    </li>
                  )
                )}
              </ul>
            </div>
          ))}

          {/* ─── ADD PLAN GHOST CARD ─── */}
          <button
            type="button"
            onClick={(e) => openAddPlanModal(e.currentTarget)}
            style={{
              background: C.card,
              borderRadius: 16,
              padding: "28px 24px",
              boxShadow: neuShadowInset,
              border: `2px dashed rgba(197,160,89,0.4)`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              cursor: "pointer",
              minHeight: 220,
              transition: "box-shadow 0.2s ease, transform 0.2s ease",
              font: "inherit",
              width: "100%",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: C.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: neuShadowSm,
              }}
            >
              <Plus size={26} color={C.gold} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.heading }}>{t("plans.add_new_plan", "Add a New Plan")}</div>
            <div style={{ fontSize: 12, color: C.muted, textAlign: "center" }}>
              {t("plans.add_new_plan_desc", "Create a custom pricing plan for your customers")}
            </div>
          </button>
        </div>
      </div>

      {/* ─── ADD PLAN MODAL ─── */}
      {showAddPlanModal && (
        <div
          onClick={closeAddPlanModal}
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            background: C.overlay,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: 20,
          }}
        >
          <div
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-plan-title"
            style={{
              background: C.bg,
              borderRadius: 22,
              boxShadow: neuShadow,
              width: "100%",
              maxWidth: 520,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 32,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <h2 id="add-plan-title" style={{ fontSize: 22, fontWeight: 700, color: C.heading, margin: 0 }}>
                {t("plans.add_plan_title", "Add New Plan")}
              </h2>
              <button
                onClick={closeAddPlanModal}
                aria-label={t("common.close", "Close dialog")}
                style={{
                  background: C.bg,
                  border: "none",
                  borderRadius: 10,
                  padding: 8,
                  cursor: "pointer",
                  boxShadow: neuShadowSm,
                  display: "flex",
                }}
              >
                <X size={18} color={C.muted} aria-hidden="true" />
              </button>
            </div>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>
              {t("plans.add_plan_subtitle", "Define pricing and features. This plan will be visible to customers immediately.")}
            </p>

            <form onSubmit={handleAddPlan} noValidate>
              {/* Plan Name */}
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="plan-name" style={{ fontSize: 12, fontWeight: 600, color: C.heading, marginBottom: 6, display: "block" }}>
                  {t("plans.form_name", "Plan Name")} <span aria-hidden="true">*</span>
                  <span className="be-sr-only">required</span>
                </label>
                <input
                  id="plan-name"
                  ref={firstFieldRef}
                  type="text"
                  value={newPlan.name}
                  onChange={(e) => handlePlanFieldChange("name", e.target.value)}
                  onBlur={() => handleFieldBlur("name")}
                  placeholder={t("plans.form_name_placeholder", "e.g. Starter, Growth, Custom Pro")}
                  style={neuInputStyle(touched.name && fieldErrors.name)}
                  aria-required="true"
                  aria-invalid={Boolean(touched.name && fieldErrors.name)}
                  aria-describedby={touched.name && fieldErrors.name ? nameErrorId : undefined}
                />
                {touched.name && fieldErrors.name && (
                  <div id={nameErrorId} role="alert" style={{ color: C.danger, fontSize: 12, marginTop: 6 }}>
                    {fieldErrors.name}
                  </div>
                )}
              </div>

              {/* Description */}
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="plan-desc" style={{ fontSize: 12, fontWeight: 600, color: C.heading, marginBottom: 6, display: "block" }}>
                  {t("plans.form_description", "Description")}
                </label>
                <input
                  id="plan-desc"
                  type="text"
                  value={newPlan.description}
                  onChange={(e) => handlePlanFieldChange("description", e.target.value)}
                  placeholder={t("plans.form_description_placeholder", "Short one-line description")}
                  style={neuInputStyle(false)}
                />
              </div>

              {/* Price & Duration */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label htmlFor="plan-price" style={{ fontSize: 12, fontWeight: 600, color: C.heading, marginBottom: 6, display: "block" }}>
                    {t("plans.form_price", "Price (₹)")} <span aria-hidden="true">*</span>
                    <span className="be-sr-only">required</span>
                  </label>
                  <input
                    id="plan-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newPlan.price}
                    onChange={(e) => handlePlanFieldChange("price", e.target.value)}
                    onBlur={() => handleFieldBlur("price")}
                    placeholder="0.00"
                    style={neuInputStyle(touched.price && fieldErrors.price)}
                    aria-required="true"
                    aria-invalid={Boolean(touched.price && fieldErrors.price)}
                    aria-describedby={touched.price && fieldErrors.price ? priceErrorId : undefined}
                  />
                  {touched.price && fieldErrors.price && (
                    <div id={priceErrorId} role="alert" style={{ color: C.danger, fontSize: 12, marginTop: 6 }}>
                      {fieldErrors.price}
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="plan-duration" style={{ fontSize: 12, fontWeight: 600, color: C.heading, marginBottom: 6, display: "block" }}>
                    {t("plans.form_duration", "Billing Cycle")}
                  </label>
                  <select
                    id="plan-duration"
                    value={newPlan.duration}
                    onChange={(e) => handlePlanFieldChange("duration", e.target.value)}
                    style={{ ...neuInputStyle(false), cursor: "pointer" }}
                  >
                    <option value="monthly">{t("plans.monthly", "Monthly")}</option>
                    <option value="yearly">{t("plans.yearly", "Yearly")}</option>
                  </select>
                </div>
              </div>

              {/* Features */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.heading, marginBottom: 6, display: "block" }}>
                  {t("plans.form_features", "Features")}
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {newPlan.features.map((feature, index) => (
                    <div key={index} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="text"
                        aria-label={`${t("plans.form_features", "Feature")} ${index + 1}`}
                        value={feature}
                        onChange={(e) => handleFeatureChange(index, e.target.value)}
                        placeholder={t("plans.form_feature_placeholder", "e.g. Priority support")}
                        style={{ ...neuInputStyle(false), flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => removeFeatureField(index)}
                        disabled={newPlan.features.length === 1 && !feature}
                        aria-label={`${t("plans.remove_feature", "Remove feature")} ${index + 1}`}
                        style={{
                          background: C.bg,
                          border: "none",
                          borderRadius: 10,
                          padding: 10,
                          cursor: "pointer",
                          boxShadow: neuShadowSm,
                          display: "flex",
                          flexShrink: 0,
                        }}
                      >
                        <Trash2 size={15} color={C.danger} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addFeatureField}
                  style={{
                    marginTop: 10,
                    background: "transparent",
                    border: "none",
                    color: C.gold,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: 0,
                  }}
                >
                  <Plus size={14} aria-hidden="true" /> {t("plans.add_feature", "Add another feature")}
                </button>
              </div>

              {addPlanError && (
                <div
                  role="alert"
                  style={{
                    background: C.dangerBg,
                    color: C.danger,
                    padding: "10px 14px",
                    borderRadius: 10,
                    fontSize: 13,
                    marginBottom: 16,
                  }}
                >
                  {addPlanError}
                </div>
              )}

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={closeAddPlanModal}
                  disabled={addPlanLoading}
                  style={{
                    background: C.bg,
                    color: C.heading,
                    border: "none",
                    borderRadius: 12,
                    padding: "12px 22px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: addPlanLoading ? "not-allowed" : "pointer",
                    boxShadow: neuShadowSm,
                    opacity: addPlanLoading ? 0.6 : 1,
                  }}
                >
                  {t("common.cancel", "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={addPlanLoading}
                  aria-busy={addPlanLoading}
                  style={{
                    background: C.gold,
                    color: theme === "dark" ? "#161225" : "#fff",
                    border: "none",
                    borderRadius: 12,
                    padding: "12px 22px",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: addPlanLoading ? "not-allowed" : "pointer",
                    opacity: addPlanLoading ? 0.7 : 1,
                    boxShadow: neuShadowSm,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {addPlanLoading && (
                    <Loader2 size={14} aria-hidden="true" style={{ animation: "be-spin 0.9s linear infinite" }} />
                  )}
                  {addPlanLoading ? t("common.saving", "Saving...") : t("plans.create_plan", "Create Plan")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── RECENT ACTIVITY ─── */}
      <div style={{ background: C.bg, borderRadius: 22, padding: 32, boxShadow: neuShadow }}>
        <h2 style={{ marginBottom: 24, color: C.heading, fontSize: 20 }}>{t("dashboard.recent", "Recent Activity")}</h2>
        {recentInvoices.length === 0 ? (
          <div
            style={{
              color: C.muted,
              fontSize: 14,
              textAlign: "center",
              padding: "28px 0",
              background: C.bg,
              borderRadius: 14,
              boxShadow: neuShadowInset,
            }}
          >
            {t("dashboard.no_invoices", "No recent invoices — new activity will show up here.")}
          </div>
        ) : (
          <div className="be-table-wrap" style={{ borderRadius: 14, overflow: "hidden", boxShadow: neuShadow }}>
            <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse" }}>
              <caption className="be-sr-only">{t("dashboard.recent", "Recent Activity")} — {recentInvoices.length} {t("invoices.recent_count", "most recent invoices")}</caption>
              <thead>
                <tr style={{ background: C.bg }}>
                  {[
                    t("invoices.invoice_no", "Invoice #"),
                    t("invoices.customer", "Customer"),
                    t("invoices.plan", "Plan"),
                    t("invoices.date", "Date"),
                    t("invoices.due_date", "Due Date"),
                    t("invoices.amount_gst", "Amount (incl. 18% GST)"),
                    t("invoices.status", "Status"),
                  ].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      style={{
                        padding: 14,
                        fontSize: 11,
                        textTransform: "uppercase",
                        color: C.muted,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        textAlign: "left",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => {
                  const totalWithGST = Math.round((inv.total_amount || inv.amount || 0) * 1.18 * 100) / 100;
                  return (
                    <tr
                      key={inv.id}
                      style={{ borderTop: `1px solid ${C.border}` }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = theme === "dark" ? "rgba(216,182,124,0.06)" : "rgba(245,236,216,0.3)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <th scope="row" style={{ padding: 14, fontWeight: 600, color: C.heading, fontSize: 13, textAlign: "left" }}>{inv.invoice_number}</th>
                      <td style={{ padding: 14, color: C.muted, fontSize: 13 }}>{inv.customer_name || "—"}</td>
                      <td style={{ padding: 14, color: C.muted, fontSize: 13 }}>{inv.plan_name || "—"}</td>
                      <td style={{ padding: 14, color: C.muted, fontSize: 13 }}>
                        {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td style={{ padding: 14, color: C.muted, fontSize: 13 }}>
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td style={{ padding: 14, fontWeight: 600, color: C.heading, fontSize: 13 }}>
                        <span>₹{totalWithGST.toFixed(2)}</span>
                        <div style={{ fontSize: 10, color: C.muted }}>{t("invoices.gst_note", "+18% GST incl.")}</div>
                      </td>
                      <td style={{ padding: 14 }}>
                        <span style={pillStyle(inv.status)}>{inv.status ? t(`status.${String(inv.status).toLowerCase()}`, String(inv.status).toUpperCase()) : "—"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}