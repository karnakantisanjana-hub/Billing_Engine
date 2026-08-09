import React, { useEffect, useState } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext.jsx';
import { useLanguage } from '../context/LanguageContext';
import { RefreshCw, AlertTriangle, Zap } from 'lucide-react';

export default function FailedPayments() {
  const { getAuthHeaders } = useAuth();
  const { theme, colors: C } = useTheme();
  const { t } = useLanguage();

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
    rowHover: theme === 'dark' ? 'rgba(216,182,124,0.08)' : '#F5EEDF',
  };

  const [failures, setFailures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);

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
        const resultWord = data.success ? t('failedq.result_succeeded') : t('failedq.result_failed');
        alert(
          t('failedq.alert_result')
            .replace('{result}', resultWord)
            .replace('{status}', (data.status || '').toUpperCase())
        );
        fetchFailedQueue();
      } else {
        alert(data.detail || t('failedq.alert_generic_fail'));
      }
    } catch (err) {
      alert(t('invoices.err_network_generic'));
    } finally {
      setRetryingId(null);
    }
  };

  const buttonBaseStyle = {
    display: 'flex', 
    alignItems: 'center', 
    gap: 8, 
    padding: '12px 20px',
    border: 'none', 
    borderRadius: 12,
    cursor: 'pointer', 
    fontWeight: 600, 
    fontSize: 14,
    transition: 'all 0.2s ease',
  };

  const neumorphicButton = {
    ...buttonBaseStyle,
    background: COLORS.bg,
    color: COLORS.heading,
    boxShadow: `${COLORS.shadowDark}, ${COLORS.shadowLight}`,
  };

  const neumorphicGoldButton = {
    ...buttonBaseStyle,
    background: `linear-gradient(145deg, ${COLORS.gold}, ${COLORS.goldDark})`,
    color: theme === 'dark' ? '#161225' : '#fff',
    boxShadow: `4px 4px 8px ${COLORS.shadowDark}, -4px -4px 8px ${COLORS.shadowLight}`,
  };

  const getStatusBadgeStyle = () => {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 14px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      background: theme === 'dark' ? 'rgba(239,68,68,0.18)' : '#FEE2E2',
      color: theme === 'dark' ? '#FCA5A5' : '#991B1B',
      boxShadow: 'inset 1px 1px 3px rgba(0,0,0,0.04), inset -1px -1px 3px rgba(255,255,255,0.6)'
    };
  };

  const tableHeaders = [
    t('failedq.col_customer'),
    t('failedq.col_invoice_no'),
    t('failedq.col_amount_due'),
    t('failedq.col_retry_attempt'),
    t('failedq.col_subscription_status'),
    '',
  ];

  return (
    <div style={{ padding: 40, background: COLORS.bg, minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{
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
      }}>
        <div>
          <h1 style={{ fontSize: 32, color: COLORS.heading, margin: 0, fontWeight: 800, letterSpacing: -0.5 }}>{t('failedq.title')}</h1>
          <p style={{ color: COLORS.goldDark, margin: '6px 0 0 0', fontSize: 15, fontWeight: 500 }}>
            {t('failedq.subtitle')}
          </p>
        </div>
        <button
          onClick={fetchFailedQueue}
          style={neumorphicButton}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <RefreshCw size={16} /> {t('common.refresh')}
        </button>
      </div>

      <div style={{ 
        background: COLORS.card, 
        borderRadius: 24, 
        boxShadow: `10px 10px 20px ${COLORS.shadowDark.replace('6px 6px 12px ', '')}, -10px -10px 20px #ffffff`, 
        overflow: 'hidden',
        padding: '8px'
      }}>
        {loading ? (
          <div style={{ padding: 64, textAlign: 'center', color: COLORS.muted, fontSize: 16 }}>{t('failedq.loading')}</div>
        ) : error ? (
          <div style={{ padding: 64, textAlign: 'center', color: theme === 'dark' ? '#FCA5A5' : '#991B1B', fontSize: 16 }}>{t('failedq.error_prefix')} {error}</div>
        ) : failures.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center', color: COLORS.muted, fontSize: 16 }}>
            {t('failedq.empty')}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px', textAlign: 'left' }}>
            <thead>
              <tr>
                {tableHeaders.map((h, i) => (
                  <th
                    key={i}
                    style={{
                      padding: '16px 24px',
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      color: COLORS.goldDark,
                      background: COLORS.goldLight,
                      textAlign: h === '' ? 'right' : 'left',
                      borderTopLeftRadius: i === 0 ? 16 : 0,
                      borderBottomLeftRadius: i === 0 ? 16 : 0,
                      borderTopRightRadius: i === 5 ? 16 : 0,
                      borderBottomRightRadius: i === 5 ? 16 : 0,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {failures.map((inv) => (
                <tr
                  key={inv.id}
                  onMouseEnter={() => setHoveredRow(inv.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{ transition: 'all 0.15s ease' }}
                >
                  <td style={{ padding: '16px 24px', fontWeight: 700, color: COLORS.heading, borderTopLeftRadius: 16, borderBottomLeftRadius: 16, background: hoveredRow === inv.id ? COLORS.rowHover : 'transparent' }}>
                    {inv.customer_name || '—'}
                  </td>
                  <td style={{ padding: '16px 24px', color: COLORS.muted, background: hoveredRow === inv.id ? COLORS.rowHover : 'transparent' }}>
                    {inv.invoice_number}
                  </td>
                  <td style={{ padding: '16px 24px', color: COLORS.heading, fontWeight: 700, background: hoveredRow === inv.id ? COLORS.rowHover : 'transparent' }}>
                    ₹{inv.total_amount}
                  </td>
                  <td style={{ padding: '16px 24px', color: COLORS.muted, background: hoveredRow === inv.id ? COLORS.rowHover : 'transparent' }}>
                    {t('failedq.attempt').replace('{n}', inv.attemptCount)}
                  </td>
                  <td style={{ padding: '16px 24px', background: hoveredRow === inv.id ? COLORS.rowHover : 'transparent' }}>
                    <span style={getStatusBadgeStyle()}>
                      <AlertTriangle size={11} /> {t(`status.${inv.subscriptionStatus}`, inv.subscriptionStatus)}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right', borderTopRightRadius: 16, borderBottomRightRadius: 16, background: hoveredRow === inv.id ? COLORS.rowHover : 'transparent' }}>
                    <button
                      onClick={() => triggerRetry(inv)}
                      disabled={retryingId === inv.id}
                      style={{ ...neumorphicGoldButton, padding: '8px 14px', fontSize: 13 }}
                    >
                      <Zap size={14} /> {retryingId === inv.id ? t('failedq.retrying') : t('failedq.retry_charge')}
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