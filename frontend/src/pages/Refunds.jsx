import React, { useState } from "react";
import axios from "axios";
import { Receipt, AlertCircle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext.jsx";

export default function Refunds() {
  const { t } = useLanguage();
  const { theme, colors: C } = useTheme();

  const COLORS = {
    bg: C.bg,
    card: C.card,
    cardBorder: C.border,
    shadowLight: `-6px -6px 12px ${C.shadowHi}`,
    shadowDark: `6px 6px 12px ${C.shadowLo}`,
    gold: C.gold,
    goldDark: C.goldText,
    goldLight: C.goldBannerEnd,
    goldSoft: C.goldSoft,
    heading: C.heading,
    muted: C.muted,
  };
  const [invoiceId, setInvoiceId] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleRefund = async (e) => {
    e.preventDefault();
    if (!invoiceId) return;

    setProcessing(true);
    setStatusMsg("");
    try {
      const token = localStorage.getItem("admin_token");
      const res = await axios.post(
        `http://localhost:8000/api/refunds?invoice_id=${invoiceId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
       );
      setStatusMsg(
        `success|${t('refunds.success_msg', 'Refund of ₹{amount} issued successfully.').replace('{amount}', res.data.refunded_amount)}`
      );
    } catch (err) {
      setStatusMsg(`error|${err.response?.data?.detail || t('refunds.error_default', "Failed to process refund. Check if the invoice is marked as 'paid'.")}`);
    } finally {
      setProcessing(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    border: 'none',
    outline: 'none',
    fontSize: 14,
    fontFamily: 'inherit',
    color: COLORS.heading,
    background: COLORS.bg,
    boxShadow: `inset 4px 4px 8px ${COLORS.shadowDark}, inset -4px -4px 8px ${COLORS.shadowLight}`,
    boxSizing: 'border-box',
  };

  const buttonBaseStyle = {
    display: 'flex', 
    alignItems: 'center', 
    gap: 8, 
    padding: '12px 24px',
    border: 'none', 
    borderRadius: 12,
    cursor: 'pointer', 
    fontWeight: 600, 
    fontSize: 14,
    transition: 'all 0.2s ease',
  };

  const neumorphicGoldButton = {
    ...buttonBaseStyle,
    background: `linear-gradient(145deg, ${COLORS.gold}, ${COLORS.goldDark})`,
    color: theme === 'dark' ? '#161225' : '#fff',
    boxShadow: `4px 4px 8px ${COLORS.shadowDark}, -4px -4px 8px ${COLORS.shadowLight}`,
  };

  const cardStyle = {
    background: COLORS.card,
    borderRadius: 24,
    boxShadow: `10px 10px 20px ${COLORS.shadowDark.replace('6px 6px 12px ', '')}, -10px -10px 20px #ffffff`,
    padding: 32,
    maxWidth: 560,
  };

  return (
    <div style={{ padding: 40, background: COLORS.bg, minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 28,
          flexWrap: 'wrap',
          gap: 20,
          background: `linear-gradient(135deg, ${COLORS.goldSoft} 0%, ${COLORS.goldLight} 100%)`,
          padding: '28px 32px',
          borderRadius: 24,
          boxShadow: `6px 6px 16px ${COLORS.shadowDark.replace('6px 6px 12px ', '')}, -6px -6px 16px #ffffff`,
        }}
      >
        <div>
          <h1 style={{ fontSize: 32, color: COLORS.heading, margin: 0, fontWeight: 800, letterSpacing: -0.5 }}>{t('refunds.title', 'Refunds')}</h1>
          <p style={{ color: COLORS.goldDark, margin: '6px 0 0 0', fontSize: 15, fontWeight: 500 }}>
            {t('refunds.subtitle', 'Issue customer refunds for paid invoices')}
          </p>
        </div>
      </div>

      {/* Refund Card */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: COLORS.goldLight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Receipt size={22} color={COLORS.goldDark} />
          </div>
          <h2 style={{ fontSize: 22, color: COLORS.heading, margin: 0, fontWeight: 800 }}>{t('refunds.card_title', 'Issue a Customer Refund')}</h2>
        </div>
        <p style={{ color: COLORS.muted, fontSize: 15, margin: '8px 0 28px 0', lineHeight: 1.6, fontWeight: 500 }}>
          {t('refunds.note', 'Note: The system automatically evaluates current active duration credits and returns up to 66% of the base charge.')}
        </p>

        <form onSubmit={handleRefund}>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 10, fontWeight: 700, color: COLORS.muted, fontSize: 13, paddingLeft: 4 }}>
              {t('refunds.invoice_id_label', 'Invoice Database ID')}
            </label>
            <input
              type="number"
              placeholder={t('refunds.invoice_id_placeholder', 'Enter invoice ID (e.g. 3)')}
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <button
            type="submit"
            disabled={processing}
            style={{
              ...neumorphicGoldButton,
              opacity: processing ? 0.7 : 1,
              cursor: processing ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => { if (!processing) e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {processing ? t('refunds.processing', 'Processing...') : t('refunds.submit', 'Issue Refund')}
          </button>
        </form>

        {/* Status Message */}
        {statusMsg && (() => {
          const [type, ...msgParts] = statusMsg.split('|');
          const msg = msgParts.join('|');
          return (
            <div
              style={{
                marginTop: 24,
                padding: '16px 20px',
                borderRadius: 16,
                fontWeight: 600,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: type === 'success' ? (theme === 'dark' ? 'rgba(34,197,94,0.18)' : '#DCFCE7') : COLORS.goldSoft,
                color: type === 'success' ? (theme === 'dark' ? '#86EFAC' : '#166534') : (theme === 'dark' ? '#FCD34D' : '#92400E'),
                boxShadow: `inset 2px 2px 5px rgba(0,0,0,0.04), inset -2px -2px 5px rgba(255,255,255,0.6)`,
              }}
            >
              <AlertCircle size={18} />
              {msg}
            </div>
          );
        })()}
      </div>
    </div>
  );
}