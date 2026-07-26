import React, { useEffect, useState } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { Search, Eye, X, RefreshCw, Zap } from 'lucide-react';

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

const STATUS_STYLES = {
  success: { bg: '#DCFCE7', color: '#166534' },
  paid: { bg: '#DCFCE7', color: '#166534' },
  pending: { bg: '#FEF3C7', color: '#92400E' },
  failed: { bg: '#FEE2E2', color: '#991B1B' },
  refunded: { bg: '#F3EFE6', color: '#6B6455' },
};

function statusStyle(status) {
  return STATUS_STYLES[(status || '').toLowerCase()] || { bg: '#F3EFE6', color: '#6B6455' };
}

export default function Payments() {
  const { getAuthHeaders } = useAuth();

  const [payments, setPayments] = useState([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Process payment modal
  const [isProcessOpen, setIsProcessOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState(null);
  const [processError, setProcessError] = useState(null);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/payments/enriched`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Failed to load payments (${res.status})`);
      const data = await res.json();
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnpaidInvoices = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/invoices/enriched`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setUnpaidInvoices(data.filter((inv) => (inv.status || '').toLowerCase() === 'unpaid'));
      }
    } catch (err) {
      console.error('Could not load unpaid invoices:', err);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchUnpaidInvoices();
  }, []);

  const openProcessModal = () => {
    setSelectedInvoiceId('');
    setProcessResult(null);
    setProcessError(null);
    setIsProcessOpen(true);
  };

  const handleProcess = async (e) => {
    e.preventDefault();
    const invoice = unpaidInvoices.find((inv) => inv.id === parseInt(selectedInvoiceId));
    if (!invoice) {
      setProcessError('Please select an invoice.');
      return;
    }

    setProcessing(true);
    setProcessError(null);
    setProcessResult(null);
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
        setProcessResult(data);
        fetchPayments();
        fetchUnpaidInvoices();
      } else {
        setProcessError(data.detail || 'Payment processing failed.');
      }
    } catch (err) {
      setProcessError('Network error — could not reach the server.');
    } finally {
      setProcessing(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      p.payment_reference?.toLowerCase().includes(q) ||
      (p.invoice_number || '').toLowerCase().includes(q) ||
      (p.customer_name || '').toLowerCase().includes(q);
    const matchesStatus = !statusFilter || (p.status || '').toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 10,
    border: `1px solid ${COLORS.cardBorder}`,
    outline: 'none',
    fontSize: 14,
    fontFamily: 'inherit',
    color: COLORS.heading,
    background: COLORS.bg,
  };

  return (
    <div style={{ padding: 32, background: COLORS.bg, minHeight: '100%' }}>
      {/* Header */}
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
          <h1 style={{ fontSize: 28, color: COLORS.heading, margin: 0 }}>Payments</h1>
          <p style={{ color: COLORS.muted, margin: '4px 0 0 0' }}>
            Transaction history and mock payment processing
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={openProcessModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '11px 18px',
              background: COLORS.gold,
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              boxShadow: COLORS.shadow,
            }}
          >
            <Zap size={16} /> Process Payment
          </button>
          <button
            onClick={fetchPayments}
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
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.cardBorder}`,
            borderRadius: 14,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: COLORS.shadow,
            flex: 1,
            minWidth: 240,
            maxWidth: 380,
          }}
        >
          <Search size={16} color={COLORS.muted} />
          <input
            type="text"
            placeholder="Search reference, invoice, or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: 14, width: '100%', background: 'transparent', color: COLORS.heading }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.cardBorder}`,
            borderRadius: 14,
            padding: '12px 16px',
            fontSize: 14,
            color: COLORS.heading,
            boxShadow: COLORS.shadow,
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="">All Status</option>
          <option value="success">Success</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Table */}
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
          <div style={{ padding: 48, textAlign: 'center', color: COLORS.muted }}>Loading payments...</div>
        ) : error ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#991B1B' }}>Error: {error}</div>
        ) : filteredPayments.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: COLORS.muted }}>
            {payments.length === 0 ? 'No payments recorded yet.' : 'No payments match your filters.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#FBF7EF', borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                {['Reference', 'Invoice', 'Customer', 'Amount', 'Method', 'Status', 'Date', ''].map((h) => (
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
              {filteredPayments.map((p) => {
                const s = statusStyle(p.status);
                return (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <td style={{ padding: 16, fontWeight: 600, color: COLORS.heading }}>{p.payment_reference}</td>
                    <td style={{ padding: 16, color: COLORS.muted }}>{p.invoice_number || '—'}</td>
                    <td style={{ padding: 16, color: COLORS.muted }}>{p.customer_name || '—'}</td>
                    <td style={{ padding: 16, color: COLORS.heading, fontWeight: 600 }}>₹{p.amount}</td>
                    <td style={{ padding: 16, color: COLORS.muted }}>{p.payment_method || '—'}</td>
                    <td style={{ padding: 16 }}>
                      <span
                        style={{
                          padding: '5px 12px',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: s.bg,
                          color: s.color,
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: 16, color: COLORS.muted }}>
                      {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: 16, textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedPayment(p)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 12px',
                          background: '#FBF3E3',
                          color: COLORS.goldDark,
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontSize: 13,
                        }}
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Process Payment Modal */}
      {isProcessOpen && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(43,36,32,0.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}
        >
          <div style={{ background: COLORS.card, width: '100%', maxWidth: 440, borderRadius: 16, padding: 26, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 19, color: COLORS.heading }}>Process Payment</h3>
              <X size={20} color={COLORS.muted} style={{ cursor: 'pointer' }} onClick={() => setIsProcessOpen(false)} />
            </div>

            {processResult ? (
              <div>
                <div
                  style={{
                    padding: '16px',
                    borderRadius: 12,
                    marginBottom: 16,
                    background: processResult.success ? '#DCFCE7' : '#FEE2E2',
                    color: processResult.success ? '#166534' : '#991B1B',
                  }}
                >
                  <strong>{processResult.success ? '✓ Payment Successful' : '✕ Payment Failed'}</strong>
                  <p style={{ margin: '6px 0 0 0', fontSize: 13 }}>
                    Reference: {processResult.payment_reference}<br />
                    Invoice status is now: <strong>{processResult.invoice_status}</strong>
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setIsProcessOpen(false)}
                    style={{ padding: '10px 18px', background: COLORS.gold, border: 'none', borderRadius: 10, cursor: 'pointer', color: '#fff', fontWeight: 600 }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProcess} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {processError && (
                  <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
                    {processError}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: COLORS.muted }}>
                    Select Unpaid Invoice
                  </label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    required
                    style={inputStyle}
                  >
                    <option value="">-- Choose an invoice --</option>
                    {unpaidInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} — {inv.customer_name || 'Unknown'} — ₹{inv.total_amount}
                      </option>
                    ))}
                  </select>
                  {unpaidInvoices.length === 0 && (
                    <p style={{ fontSize: 12, color: COLORS.muted, marginTop: 6 }}>No unpaid invoices right now.</p>
                  )}
                </div>

                <p style={{ fontSize: 12, color: COLORS.muted, margin: 0 }}>
                  This simulates a payment gateway: ~80% chance of success (marks the invoice paid),
                  ~20% chance of failure (moves the subscription to past_due).
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setIsProcessOpen(false)}
                    style={{ padding: '10px 18px', background: '#F3EFE6', border: 'none', borderRadius: 10, cursor: 'pointer', color: COLORS.muted, fontWeight: 500 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processing || unpaidInvoices.length === 0}
                    style={{ padding: '10px 18px', background: COLORS.gold, border: 'none', borderRadius: 10, cursor: 'pointer', color: '#fff', fontWeight: 600 }}
                  >
                    {processing ? 'Processing...' : 'Run Payment'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* View Payment Modal */}
      {selectedPayment && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(43,36,32,0.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}
        >
          <div style={{ background: COLORS.card, width: '100%', maxWidth: 420, borderRadius: 16, padding: 26, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 19, color: COLORS.heading }}>Payment Details</h3>
              <X size={20} color={COLORS.muted} style={{ cursor: 'pointer' }} onClick={() => setSelectedPayment(null)} />
            </div>

            {[
              ['Transaction ID', selectedPayment.payment_reference],
              ['Invoice', selectedPayment.invoice_number || '—'],
              ['Customer', selectedPayment.customer_name || '—'],
              ['Amount', `₹${selectedPayment.amount}`],
              ['Method', selectedPayment.payment_method || '—'],
              ['Status', selectedPayment.status],
              ['Date', selectedPayment.payment_date ? new Date(selectedPayment.payment_date).toLocaleString() : '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', fontSize: 14, borderBottom: `1px solid ${COLORS.cardBorder}`, color: COLORS.heading }}>
                <span style={{ color: COLORS.muted }}>{label}</span>
                <span>{value}</span>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <button
                onClick={() => setSelectedPayment(null)}
                style={{ padding: '10px 18px', background: '#F3EFE6', border: 'none', borderRadius: 10, cursor: 'pointer', color: COLORS.muted, fontWeight: 500 }}
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