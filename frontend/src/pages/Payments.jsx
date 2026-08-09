import React, { useEffect, useState } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext.jsx';
import { Search, Eye, X, RefreshCw, Zap, Landmark, QrCode } from 'lucide-react';

function getStatusBadgeStyle(status, theme) {
  const dark = theme === 'dark';
  const styles = {
    success: { bg: dark ? 'rgba(34,197,94,0.18)' : '#DCFCE7', color: dark ? '#86EFAC' : '#166534', dot: '#22C55E' },
    paid: { bg: dark ? 'rgba(34,197,94,0.18)' : '#DCFCE7', color: dark ? '#86EFAC' : '#166534', dot: '#22C55E' },
    pending: { bg: dark ? 'rgba(245,158,11,0.18)' : '#FEF3C7', color: dark ? '#FCD34D' : '#92400E', dot: '#F59E0B' },
    failed: { bg: dark ? 'rgba(239,68,68,0.18)' : '#FEE2E2', color: dark ? '#FCA5A5' : '#991B1B', dot: '#EF4444' },
    refunded: { bg: dark ? 'rgba(148,163,184,0.18)' : '#F3EFE6', color: dark ? '#CBD5E1' : '#6B6455', dot: dark ? '#CBD5E1' : '#8A7F6D' },
  };
  const s = styles[(status || '').toLowerCase()] || styles.refunded;
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
    borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.4, boxShadow: 'inset 1px 1px 3px rgba(0,0,0,0.04), inset -1px -1px 3px rgba(255,255,255,0.25)',
    background: s.bg, color: s.color,
  };
}

function getStatusDotColor(status, theme) {
  const dark = theme === 'dark';
  const dots = { success: '#22C55E', paid: '#22C55E', pending: '#F59E0B', failed: '#EF4444', refunded: dark ? '#CBD5E1' : '#8A7F6D' };
  return dots[(status || '').toLowerCase()] || (dark ? '#CBD5E1' : '#8A7F6D');
}

// Dummy bank details shown for the "Bank Transfer" payment method.
// Swap these for real account details whenever you're ready.
const BANK_DETAILS = {
  accountName: 'Your Company Pvt Ltd',
  accountNumber: '0123456789012',
  ifsc: 'HDFC0001234',
  bankName: 'HDFC Bank',
};

// Builds the string encoded into the QR code from the selected invoice.
// Uses a simple UPI-style payment string so most banking/UPI apps can read it.
function buildQrPayload(invoice) {
  if (!invoice) return '';
  const payee = encodeURIComponent(BANK_DETAILS.accountName);
  const note = encodeURIComponent(`Invoice ${invoice.invoice_number}`);
  return `upi://pay?pa=payments@yourbank&pn=${payee}&am=${invoice.total_amount}&cu=INR&tn=${note}`;
}

// Free QR image generation endpoint — no extra npm package needed.
function qrImageUrl(data, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export default function Payments() {
  const { getAuthHeaders } = useAuth();
  const { t, languageCode } = useLanguage();
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
    rowHover: theme === 'dark' ? 'rgba(216,182,124,0.08)' : '#F5EEDF',
  };

  const [payments, setPayments] = useState([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);

  // Process payment modal
  const [isProcessOpen, setIsProcessOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank'); // 'bank' | 'qr'
  const [senderBankDetails, setSenderBankDetails] = useState({
    accountName: '',
    accountNumber: '',
    ifsc: '',
  });
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState(null);
  const [processError, setProcessError] = useState(null);

  const dateLocale = languageCode && languageCode !== 'en' ? `${languageCode}-IN` : 'en-IN';
  const formatDate = (value, withTime) => {
    if (!value) return '—';
    try {
      return withTime
        ? new Date(value).toLocaleString(dateLocale)
        : new Date(value).toLocaleDateString(dateLocale);
    } catch {
      return withTime
        ? new Date(value).toLocaleString('en-IN')
        : new Date(value).toLocaleDateString('en-IN');
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/payments/enriched`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(t('payments.err_load', 'Failed to load payments ({status})').replace('{status}', res.status));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openProcessModal = () => {
    setSelectedInvoiceId('');
    setPaymentMethod('bank');
    setSenderBankDetails({ accountName: '', accountNumber: '', ifsc: '' });
    setProcessResult(null);
    setProcessError(null);
    setIsProcessOpen(true);
  };

  const selectedInvoice = unpaidInvoices.find((inv) => inv.id === parseInt(selectedInvoiceId));

  const handleProcess = async (e) => {
    e.preventDefault();
    const invoice = unpaidInvoices.find((inv) => inv.id === parseInt(selectedInvoiceId));
    if (!invoice) {
      setProcessError(t('payments.select_invoice_required', 'Please select an invoice.'));
      return;
    }

    if (paymentMethod === 'bank') {
      const { accountName, accountNumber, ifsc } = senderBankDetails;
      if (!accountName.trim() || !accountNumber.trim() || !ifsc.trim()) {
        setProcessError(t('payments.bank_details_required', 'Please enter your account name, account number, and IFSC code.'));
        return;
      }
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
          payment_method: paymentMethod === 'qr' ? 'QR Scan' : 'Bank Transfer',
          ...(paymentMethod === 'bank' && {
            payer_account_name: senderBankDetails.accountName,
            payer_account_number: senderBankDetails.accountNumber,
            payer_ifsc: senderBankDetails.ifsc,
          }),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setProcessResult(data);
        fetchPayments();
        fetchUnpaidInvoices();
      } else {
        setProcessError(data.detail || t('payments.err_process', 'Payment processing failed.'));
      }
    } catch (err) {
      setProcessError(t('invoices.err_network_generic', 'Network error — could not reach the server.'));
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
    padding: '12px 16px',
    borderRadius: 12,
    border: 'none',
    outline: 'none',
    fontSize: 14,
    fontFamily: 'inherit',
    color: COLORS.heading,
    background: COLORS.bg,
    boxShadow: `inset 4px 4px 8px ${COLORS.shadowDark}, inset -4px -4px 8px ${COLORS.shadowLight}`,
  };

  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 8,
    color: COLORS.muted,
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

  // Method toggle button styles — "pressed" state uses inset shadow, like the neumorphic inputs.
  const methodButtonStyle = (active) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '16px 12px',
    borderRadius: 14,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 13,
    background: COLORS.bg,
    color: active ? COLORS.goldDark : COLORS.muted,
    boxShadow: active
      ? `inset 3px 3px 7px ${COLORS.shadowDark}, inset -3px -3px 7px ${COLORS.shadowLight}`
      : `${COLORS.shadowDark}, ${COLORS.shadowLight}`,
    transition: 'all 0.2s ease',
  });

  // Table headers — built inside the component so they re-translate on language change
  const TABLE_HEADERS = [
    t('payments.col_reference', 'Reference'),
    t('invoices.invoice_no', 'Invoice'),
    t('invoices.customer', 'Customer'),
    t('invoices.amount', 'Amount'),
    t('invoices.col_method', 'Method'),
    t('invoices.status', 'Status'),
    t('invoices.date', 'Date'),
    '',
  ];

  return (
    <div style={{ padding: 40, background: COLORS.bg, minHeight: '100vh', position: 'relative', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
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
          <h1 style={{ fontSize: 32, color: COLORS.heading, margin: 0, fontWeight: 800, letterSpacing: -0.5 }}>
            {t('nav.payments', 'Payments')}
          </h1>
          <p style={{ color: COLORS.goldDark, margin: '6px 0 0 0', fontSize: 15, fontWeight: 500 }}>
            {t('payments.subtitle', 'Transaction history and mock payment processing')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <button
            onClick={fetchPayments}
            style={neumorphicButton}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <RefreshCw size={16} /> {t('common.refresh', 'Refresh')}
          </button>
          <button
            onClick={openProcessModal}
            style={neumorphicGoldButton}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Zap size={16} /> {t('payments.process', 'Process Payment')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div
          style={{
            background: COLORS.bg,
            borderRadius: 12,
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: `inset 4px 4px 8px ${COLORS.shadowDark}, inset -4px -4px 8px ${COLORS.shadowLight}`,
            flex: 1,
            minWidth: 240,
            maxWidth: 380,
            height: 48,
          }}
        >
          <Search size={18} color={COLORS.muted} />
          <input
            type="text"
            placeholder={t('payments.search_placeholder', 'Search reference, invoice, or customer...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: 14, width: '100%', background: 'transparent', color: COLORS.heading }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            background: COLORS.bg,
            borderRadius: 12,
            padding: '0 16px',
            fontSize: 14,
            color: COLORS.heading,
            boxShadow: `${COLORS.shadowDark}, ${COLORS.shadowLight}`,
            outline: 'none',
            border: 'none',
            cursor: 'pointer',
            height: 48,
          }}
        >
          <option value="">{t('invoices.status_all', 'All Status')}</option>
          <option value="success">{t('status.success', 'Success')}</option>
          <option value="pending">{t('status.pending', 'Pending')}</option>
          <option value="failed">{t('status.failed', 'Failed')}</option>
          <option value="refunded">{t('invoices.status_refunded', 'Refunded')}</option>
        </select>
      </div>

      {/* Table */}
      <div style={{
        background: COLORS.card,
        borderRadius: 24,
        boxShadow: `10px 10px 20px ${COLORS.shadowDark.replace('6px 6px 12px ', '')}, -10px -10px 20px #ffffff`,
        overflow: 'hidden',
        padding: '8px'
      }}>
        {loading ? (
          <div style={{ padding: 64, textAlign: 'center', color: COLORS.muted, fontSize: 16 }}>
            {t('invoices.loading_payments', 'Loading payments...')}
          </div>
        ) : error ? (
          <div style={{ padding: 64, textAlign: 'center', color: '#991B1B', fontSize: 16 }}>
            {t('common.error', 'Error')}: {error}
          </div>
        ) : filteredPayments.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center', color: COLORS.muted, fontSize: 16 }}>
            {payments.length === 0
              ? t('payments.none_recorded', 'No payments recorded yet.')
              : t('payments.none_match_filters', 'No payments match your filters.')}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px', textAlign: 'left' }}>
            <thead>
              <tr>
                {TABLE_HEADERS.map((h, i) => (
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
                      borderTopRightRadius: i === TABLE_HEADERS.length - 1 ? 16 : 0,
                      borderBottomRightRadius: i === TABLE_HEADERS.length - 1 ? 16 : 0,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => (
                <tr
                  key={p.id}
                  onMouseEnter={() => setHoveredRow(p.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{ transition: 'all 0.15s ease' }}
                >
                  <td style={{ padding: '16px 24px', fontWeight: 700, color: COLORS.heading, borderTopLeftRadius: 16, borderBottomLeftRadius: 16, background: hoveredRow === p.id ? COLORS.rowHover : 'transparent' }}>
                    {p.payment_reference}
                  </td>
                  <td style={{ padding: '16px 24px', color: COLORS.muted, background: hoveredRow === p.id ? COLORS.rowHover : 'transparent' }}>
                    {p.invoice_number || '—'}
                  </td>
                  <td style={{ padding: '16px 24px', color: COLORS.muted, background: hoveredRow === p.id ? COLORS.rowHover : 'transparent' }}>
                    {p.customer_name || '—'}
                  </td>
                  <td style={{ padding: '16px 24px', color: COLORS.heading, fontWeight: 700, background: hoveredRow === p.id ? COLORS.rowHover : 'transparent' }}>
                    ₹{p.amount}
                  </td>
                  <td style={{ padding: '16px 24px', color: COLORS.muted, background: hoveredRow === p.id ? COLORS.rowHover : 'transparent' }}>
                    {p.payment_method || '—'}
                  </td>
                  <td style={{ padding: '16px 24px', background: hoveredRow === p.id ? COLORS.rowHover : 'transparent' }}>
                    <span style={getStatusBadgeStyle(p.status, theme)}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: getStatusDotColor(p.status, theme), display: 'inline-block' }} />
                      {t(`status.${(p.status || '').toLowerCase()}`, p.status)}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', color: COLORS.muted, background: hoveredRow === p.id ? COLORS.rowHover : 'transparent' }}>
                    {formatDate(p.payment_date)}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right', borderTopRightRadius: 16, borderBottomRightRadius: 16, background: hoveredRow === p.id ? COLORS.rowHover : 'transparent' }}>
                    <button
                      onClick={() => setSelectedPayment(p)}
                      style={{ ...neumorphicButton, padding: '8px 12px', fontSize: 13 }}
                    >
                      <Eye size={14} /> {t('invoices.view', 'View')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Process Payment Modal */}
      {isProcessOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: C.overlay, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{
            background: COLORS.card,
            width: '90%',
            maxWidth: 460,
            borderRadius: 32,
            padding: 32,
            boxShadow: `20px 20px 40px ${COLORS.shadowDark.replace('6px 6px 12px ', '')}, -20px -20px 40px #ffffff`,
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <h3 style={{ margin: 0, fontSize: 22, color: COLORS.heading, fontWeight: 800 }}>
                {t('payments.process_title', 'Process Payment')}
              </h3>
              <button onClick={() => setIsProcessOpen(false)} style={{ ...neumorphicButton, padding: 8, borderRadius: '50%' }}>
                <X size={20} color={COLORS.muted} />
              </button>
            </div>

            {processResult ? (
              <div>
                <div
                  style={{
                    padding: '20px',
                    borderRadius: 16,
                    marginBottom: 20,
                    background: COLORS.bg,
                    boxShadow: `inset 2px 2px 5px ${COLORS.shadowDark}, inset -2px -2px 5px ${COLORS.shadowLight}`,
                    color: processResult.success ? '#166534' : '#991B1B',
                  }}
                >
                  <strong>
                    {processResult.success
                      ? t('payments.result_success', '✓ Payment Successful')
                      : t('payments.result_failed', '✕ Payment Failed')}
                  </strong>
                  <p style={{ margin: '8px 0 0 0', fontSize: 14 }}>
                    {t('payments.reference_label', 'Reference')}: {processResult.payment_reference}<br />
                    {t('payments.invoice_status_now', 'Invoice status is now')}: <strong>
                      {t(`status.${(processResult.invoice_status || '').toLowerCase()}`, processResult.invoice_status)}
                    </strong>
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setIsProcessOpen(false)} style={neumorphicGoldButton}>
                    {t('payments.done', 'Done')}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProcess} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {processError && (
                  <div style={{ background: theme === 'dark' ? 'rgba(239,68,68,0.18)' : '#FEE2E2', color: theme === 'dark' ? '#FCA5A5' : '#991B1B', padding: '12px 16px', borderRadius: 12, fontSize: 13 }}>
                    {processError}
                  </div>
                )}

                <div>
                  <label style={labelStyle}>{t('payments.select_unpaid_invoice', 'Select Unpaid Invoice')}</label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    required
                    style={inputStyle}
                  >
                    <option value="">{t('payments.choose_invoice_placeholder', '-- Choose an invoice --')}</option>
                    {unpaidInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} — {inv.customer_name || t('common.no_data', 'Unknown')} — ₹{inv.total_amount}
                      </option>
                    ))}
                  </select>
                  {unpaidInvoices.length === 0 && (
                    <p style={{ fontSize: 12, color: COLORS.muted, marginTop: 8 }}>
                      {t('payments.no_unpaid_invoices', 'No unpaid invoices right now.')}
                    </p>
                  )}
                </div>

                {/* Payment method toggle */}
                <div>
                  <label style={labelStyle}>{t('payments.select_method', 'Payment Method')}</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('bank')}
                      style={methodButtonStyle(paymentMethod === 'bank')}
                    >
                      <Landmark size={20} />
                      {t('payments.method_bank', 'Bank Transfer')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('qr')}
                      style={methodButtonStyle(paymentMethod === 'qr')}
                    >
                      <QrCode size={20} />
                      {t('payments.method_qr', 'Scan QR')}
                    </button>
                  </div>
                </div>

                {/* Bank Transfer details */}
                {paymentMethod === 'bank' && (
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 14,
                      background: COLORS.bg,
                      boxShadow: `inset 3px 3px 7px ${COLORS.shadowDark}, inset -3px -3px 7px ${COLORS.shadowLight}`,
                      fontSize: 13,
                      color: COLORS.heading,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: COLORS.muted }}>{t('payments.bank_account_name', 'Account Name')}</span>
                      <strong>{BANK_DETAILS.accountName}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: COLORS.muted }}>{t('payments.bank_account_number', 'Account Number')}</span>
                      <strong>{BANK_DETAILS.accountNumber}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: COLORS.muted }}>{t('payments.bank_ifsc', 'IFSC Code')}</span>
                      <strong>{BANK_DETAILS.ifsc}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: COLORS.muted }}>{t('payments.bank_name', 'Bank')}</span>
                      <strong>{BANK_DETAILS.bankName}</strong>
                    </div>
                    {selectedInvoice && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${COLORS.goldLight}` }}>
                        <span style={{ color: COLORS.muted }}>{t('invoices.amount', 'Amount')}</span>
                        <strong>₹{selectedInvoice.total_amount}</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* Sender's own bank details — required for Bank Transfer */}
                {paymentMethod === 'bank' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>
                      {t('payments.your_bank_details', 'Your Bank Details')}
                    </label>

                    <div>
                      <label style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6, display: 'block' }}>
                        {t('payments.your_account_name', 'Account Holder Name')}
                      </label>
                      <input
                        type="text"
                        value={senderBankDetails.accountName}
                        onChange={(e) => setSenderBankDetails({ ...senderBankDetails, accountName: e.target.value })}
                        placeholder={t('payments.your_account_name_placeholder', 'e.g. John Doe')}
                        style={{ ...inputStyle, marginTop: 0, marginBottom: 0 }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6, display: 'block' }}>
                        {t('payments.your_account_number', 'Account Number')}
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={senderBankDetails.accountNumber}
                        onChange={(e) => setSenderBankDetails({ ...senderBankDetails, accountNumber: e.target.value })}
                        placeholder={t('payments.your_account_number_placeholder', 'e.g. 123456789012')}
                        style={{ ...inputStyle, marginTop: 0, marginBottom: 0 }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6, display: 'block' }}>
                        {t('payments.your_ifsc', 'IFSC Code')}
                      </label>
                      <input
                        type="text"
                        value={senderBankDetails.ifsc}
                        onChange={(e) => setSenderBankDetails({ ...senderBankDetails, ifsc: e.target.value.toUpperCase() })}
                        placeholder={t('payments.your_ifsc_placeholder', 'e.g. HDFC0001234')}
                        style={{ ...inputStyle, marginTop: 0, marginBottom: 0 }}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* QR code */}
                {paymentMethod === 'qr' && (
                  <div
                    style={{
                      padding: 20,
                      borderRadius: 14,
                      background: COLORS.bg,
                      boxShadow: `inset 3px 3px 7px ${COLORS.shadowDark}, inset -3px -3px 7px ${COLORS.shadowLight}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    {selectedInvoice ? (
                      <>
                        <img
                          src={qrImageUrl(buildQrPayload(selectedInvoice))}
                          alt={t('payments.qr_alt', 'Scan to pay')}
                          width={180}
                          height={180}
                          style={{ borderRadius: 12, background: '#fff', padding: 8 }}
                        />
                        <p style={{ margin: 0, fontSize: 12, color: COLORS.muted, textAlign: 'center' }}>
                          {t('payments.qr_hint', 'Scan with any UPI / banking app')}<br />
                          ₹{selectedInvoice.total_amount} — {selectedInvoice.invoice_number}
                        </p>
                      </>
                    ) : (
                      <p style={{ margin: 0, fontSize: 13, color: COLORS.muted, textAlign: 'center' }}>
                        {t('payments.qr_select_invoice_first', 'Select an invoice to generate a QR code.')}
                      </p>
                    )}
                  </div>
                )}

                <p style={{ fontSize: 12, color: COLORS.muted, margin: 0 }}>
                  {t(
                    'payments.simulation_note',
                    'This simulates a payment gateway: ~80% chance of success (marks the invoice paid), ~20% chance of failure.'
                  )}
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 8 }}>
                  <button type="button" onClick={() => setIsProcessOpen(false)} style={neumorphicButton}>
                    {t('action.cancel', 'Cancel')}
                  </button>
                  <button type="submit" disabled={processing || unpaidInvoices.length === 0} style={neumorphicGoldButton}>
                    {processing ? t('payments.processing', 'Processing...') : t('payments.run_payment', 'Run Payment')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* View Payment Modal */}
      {selectedPayment && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: C.overlay, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{
            background: COLORS.card,
            width: '90%',
            maxWidth: 460,
            borderRadius: 32,
            padding: 32,
            boxShadow: `20px 20px 40px ${COLORS.shadowDark.replace('6px 6px 12px ', '')}, -20px -20px 40px #ffffff`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <h3 style={{ margin: 0, fontSize: 22, color: COLORS.heading, fontWeight: 800 }}>
                {t('payments.details_title', 'Payment Details')}
              </h3>
              <button onClick={() => setSelectedPayment(null)} style={{ ...neumorphicButton, padding: 8, borderRadius: '50%' }}>
                <X size={20} color={COLORS.muted} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                [t('payments.transaction_id', 'Transaction ID'), selectedPayment.payment_reference],
                [t('invoices.invoice_no', 'Invoice'), selectedPayment.invoice_number || '—'],
                [t('invoices.customer', 'Customer'), selectedPayment.customer_name || '—'],
                [t('invoices.amount', 'Amount'), `₹${selectedPayment.amount}`],
                [t('invoices.col_method', 'Method'), selectedPayment.payment_method || '—'],
                [t('invoices.date', 'Date'), formatDate(selectedPayment.payment_date, true)],
              ].map(([label, value]) => (
                <div key={label} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '16px 0',
                  fontSize: 15,
                  borderBottom: `1px solid ${COLORS.goldLight}`,
                  color: COLORS.heading
                }}>
                  <span style={{ color: COLORS.muted, fontWeight: 500 }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{value}</span>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', fontSize: 15, color: COLORS.heading, alignItems: 'center' }}>
                <span style={{ color: COLORS.muted, fontWeight: 500 }}>{t('invoices.status', 'Status')}</span>
                <span style={getStatusBadgeStyle(selectedPayment.status, theme)}>
                  {t(`status.${(selectedPayment.status || '').toLowerCase()}`, selectedPayment.status)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
              <button onClick={() => setSelectedPayment(null)} style={neumorphicButton}>
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}