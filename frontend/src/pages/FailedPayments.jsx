import React, { useEffect, useState } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { RefreshCw, AlertTriangle, Zap } from 'lucide-react';

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

export default function FailedPayments() {
  const { getAuthHeaders } = useAuth();

  const [failures, setFailures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryingId, setRetryingId] = useState(null);

  const fetchFailedQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const [invoicesRes, subscriptionsRes, paymentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/invoices/enriched`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/api/subscriptions`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/payments/enriched`, { headers: getAuthHeaders() }),
      ]);

      if (!invoicesRes.ok) throw new Error(`Failed to load invoices (${invoicesRes.status})`);

      const invoices = await invoicesRes.json();
      const subscriptions = subscriptionsRes.ok ? await subscriptionsRes.json() : [];
      const payments = paymentsRes.ok ? await paymentsRes.json() : [];

      const subById = new Map(subscriptions.map((s) => [s.id, s]));

      const failedInvoiceIds = new Set(
        payments
          .filter((p) => (p.status || '').toLowerCase() === 'failed')
          .map((p) => p.invoice_id)
      );

      const failedList = invoices
        .filter((inv) => {
          const isUnpaid = (inv.status || '').toLowerCase() === 'unpaid';
          const hasFailedPayment = failedInvoiceIds.has(inv.id);
          const sub = subById.get(inv.subscription_id);
          const isPastDue = sub?.status === 'past_due';

          return isUnpaid && (hasFailedPayment || isPastDue);
        })
        .map((inv) => {
          const sub = subById.get(inv.subscription_id);
          const attemptCount = payments.filter(
            (p) => p.invoice_id === inv.id && (p.status || '').toLowerCase() === 'failed'
          ).length;
          return {
            ...inv,
            subscriptionStatus: sub?.status || 'past_due',
            attemptCount: attemptCount || 1,
          };
        });

      setFailures(failedList);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFailedQueue();
  }, []);

  const triggerRetry = async (invoice) => {
    setRetryingId(invoice.id);
    try {
      const res = await fetch(`${API_BASE_URL}/payments/process`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          invoice_id: invoice.id,
          amount: invoice.total_amount,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        alert(`Retry ${data.success ? 'succeeded' : 'failed'} — status: ${data.status.toUpperCase()}`);
        fetchFailedQueue();
      } else {
        alert(data.detail || 'Retry failed to process.');
      }
    } catch (err) {
      alert('Network error — could not reach the server.');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div style={{ padding: 32, background: COLORS.bg, minHeight: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 28,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, color: COLORS.heading, margin: 0 }}>Failed Payment Queue</h1>
          <p style={{ color: COLORS.muted, margin: '4px 0 0 0' }}>
            Unpaid invoices on past-due subscriptions, ready for retry
          </p>
        </div>
        <button
          onClick={fetchFailedQueue}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '11px 18px',
            background: COLORS.card,
            border: `1px solid ${COLORS.cardBorder}`,
            borderRadius: 10,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
            color: COLORS.heading,
          }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: 16,
          boxShadow: COLORS.shadow,
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: COLORS.muted }}>Loading queue...</div>
        ) : error ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#991B1B' }}>Error: {error}</div>
        ) : failures.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: COLORS.muted }}>
            No failed payments in queue — all accounts healthy.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#FBF7EF', borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                {['Customer', 'Invoice #', 'Amount Due', 'Retry Attempt', 'Subscription Status', ''].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: 16,
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      color: COLORS.muted,
                      textAlign: h === '' ? 'right' : 'left',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {failures.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                  <td style={{ padding: 16, fontWeight: 600, color: COLORS.heading }}>{inv.customer_name || '—'}</td>
                  <td style={{ padding: 16, color: COLORS.muted }}>{inv.invoice_number}</td>
                  <td style={{ padding: 16, color: COLORS.heading, fontWeight: 600 }}>₹{inv.total_amount}</td>
                  <td style={{ padding: 16, color: COLORS.muted }}>Attempt {inv.attemptCount}</td>
                  <td style={{ padding: 16 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '5px 12px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: '#FEE2E2',
                        color: '#991B1B',
                      }}
                    >
                      <AlertTriangle size={11} /> {inv.subscriptionStatus}
                    </span>
                  </td>
                  <td style={{ padding: 16, textAlign: 'right' }}>
                    <button
                      onClick={() => triggerRetry(inv)}
                      disabled={retryingId === inv.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 14px',
                        background: COLORS.gold,
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      <Zap size={13} /> {retryingId === inv.id ? 'Retrying...' : 'Retry Charge'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}