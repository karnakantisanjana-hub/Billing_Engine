import React, { useState } from "react";
import axios from "axios";
import { Receipt, AlertCircle } from "lucide-react";

const COLORS = {
  bg: '#FAF6EE',
  card: '#FFFFFF',
  cardBorder: '#F0E6D2',
  shadow: '0 4px 20px rgba(197,160,89,0.10)',
  gold: '#C5A059',
  goldDark: '#A98244',
  heading: '#2B2420',
  muted: '#8A7F6D',
};

export default function Refunds() {
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
      setStatusMsg(`success|Refund of ₹${res.data.refunded_amount} issued successfully.`);
    } catch (err) {
      setStatusMsg(`error|${err.response?.data?.detail || "Failed to process refund. Check if the invoice is marked as 'paid'."}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ padding: 32, background: COLORS.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          marginBottom: 28,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, color: COLORS.heading, margin: 0 }}>Refunds</h1>
          <p style={{ color: COLORS.muted, margin: '4px 0 0 0' }}>
            Issue customer refunds for paid invoices
          </p>
        </div>
      </div>

      {/* Refund Card */}
      <div
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: 16,
          boxShadow: COLORS.shadow,
          padding: 32,
          maxWidth: 560,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Receipt size={22} color={COLORS.gold} />
          <h2 style={{ fontSize: 20, color: COLORS.heading, margin: 0 }}>Issue a Customer Refund</h2>
        </div>
        <p style={{ color: COLORS.muted, fontSize: 14, margin: '8px 0 24px 0', lineHeight: 1.5 }}>
          Note: The system automatically evaluates current active duration credits and returns up to 66% of the base charge.
        </p>

        <form onSubmit={handleRefund}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: COLORS.heading, fontSize: 14 }}>
              Invoice Database ID
            </label>
            <input
              type="number"
              placeholder="Enter invoice ID (e.g. 3)"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 10,
                border: `1px solid ${COLORS.cardBorder}`,
                fontSize: 14,
                color: COLORS.heading,
                outline: 'none',
                background: COLORS.bg,
                boxSizing: 'border-box',
              }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={processing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              background: COLORS.gold,
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: processing ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: 14,
              opacity: processing ? 0.7 : 1,
              boxShadow: COLORS.shadow,
            }}
          >
            {processing ? 'Processing...' : 'Issue Refund'}
          </button>
        </form>

        {/* Status Message */}
        {statusMsg && (() => {
          const [type, ...msgParts] = statusMsg.split('|');
          const msg = msgParts.join('|');
          return (
            <div
              style={{
                marginTop: 20,
                padding: '14px 18px',
                borderRadius: 10,
                fontWeight: 500,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: type === 'success' ? '#DCFCE7' : '#FEF3C7',
                color: type === 'success' ? '#166534' : '#92400E',
              }}
            >
              <AlertCircle size={16} />
              {msg}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
