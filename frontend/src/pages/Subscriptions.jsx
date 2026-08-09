import React, { useEffect, useState } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext.jsx';
import { Play, Pause, XCircle, RefreshCw, Plus, X, Eye } from 'lucide-react';

const AVATAR_PALETTE = ['#C5A059', '#8FA98A', '#B08BA0', '#7C9CB5', '#C98B5E', '#9B8AC4'];

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name) {
  if (!name) return AVATAR_PALETTE[0];
  const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}

export default function Subscriptions() {
  const { getAuthHeaders } = useAuth();
  const { t } = useLanguage();
  const { theme, colors: C } = useTheme();

  // Preserve the existing page design while sourcing all page colors from the shared theme.
  const COLORS = {
    bg: C.bg,
    card: C.card,
    cardBorder: C.border,
    shadowLight: C.shadowHi,
    shadowDark: C.shadowLo,
    gold: C.gold,
    goldDark: C.goldText,
    goldLight: C.goldBannerEnd,
    goldSoft: C.goldSoft,
    heading: C.heading,
    muted: C.muted,
    rowHover: theme === 'dark' ? 'rgba(216,182,124,0.08)' : '#F5EEDF',
  };
  const [subscriptions, setSubscriptions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [initialStatus, setInitialStatus] = useState('active');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/subscriptions`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error(`Failed to load subscriptions (${response.status})`);
      const data = await response.json();
      setSubscriptions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchModalContextData = async () => {
    try {
      const [custRes, planRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/customers`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/api/v1/plans`, { headers: getAuthHeaders() })
      ]);
      if (custRes.ok) setCustomers(await custRes.json());
      if (planRes.ok) setPlans(await planRes.json());
    } catch (err) {
      console.error("Context parsing failure:", err);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    fetchModalContextData();
  }, []);

  const handleAction = async (id, targetStatus) => {
    if (targetStatus === 'cancelled' && !window.confirm(t('subscriptions.confirm_cancel', 'Are you sure you want to cancel this subscription?'))) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/subscriptions/${id}/status`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });
      if (response.ok) {
        fetchSubscriptions();
      } else {
        const errData = await response.json().catch(() => ({}));
        const detail = Array.isArray(errData.detail)
          ? errData.detail.map((d) => d.msg).join(', ')
          : errData.detail;
        alert(detail || t('subscriptions.status_mismatch', 'Status transition mismatch with backend validations.'));
      }
    } catch (err) {
      alert(t('subscriptions.network_error', 'Network communication error.'));
    }
  };

  const handleCreateSubscription = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedPlanId) return alert(t('subscriptions.missing_fields', 'Please provision all metadata points.'));
    setModalSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/subscriptions`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: parseInt(selectedCustomerId),
          plan_id: parseInt(selectedPlanId),
          status: initialStatus
        }),
      });

      if (response.ok) {
        setIsModalOpen(false);
        setSelectedCustomerId('');
        setSelectedPlanId('');
        fetchSubscriptions();
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(`${t('subscriptions.creation_failure', 'Creation failure')}: ${errData.detail || t('subscriptions.malformed_input', 'Malformed structural inputs.')}`);
      }
    } catch (err) {
      alert(t('subscriptions.transmission_failed', 'Network transmission failed.'));
    } finally {
      setModalSubmitting(false);
    }
  };

  const getStatusBadgeStyle = (status) => {
    const base = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 14px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      boxShadow: 'inset 1px 1px 3px rgba(0,0,0,0.04), inset -1px -1px 3px rgba(255,255,255,0.6)'
    };
    switch (status?.toLowerCase()) {
      case 'active': return { ...base, background: '#DCFCE7', color: '#166534' };
      case 'trial': return { ...base, background: '#DBEAFE', color: '#1E40AF' };
      case 'paused': return { ...base, background: '#FEF3C7', color: '#92400E' };
      case 'past_due': return { ...base, background: '#FEF3C7', color: '#92400E' };
      case 'cancelled': return { ...base, background: '#FEE2E2', color: C.danger };
      default: return { ...base, background: '#F3EFE6', color: COLORS.muted };
    }
  };

  const getStatusDotColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return '#22C55E';
      case 'trial': return '#3B82F6';
      case 'paused': return '#F59E0B';
      case 'past_due': return '#F59E0B';
      case 'cancelled': return '#EF4444';
      default: return COLORS.muted;
    }
  };

  const getStatusLabel = (status) => {
    const key = (status || '').toLowerCase();
    return t(`status.${key}`, status);
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
    gap: 6,
    padding: '9px 16px',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
    transition: 'all 0.15s ease',
  };

  const neumorphicButton = {
    ...buttonBaseStyle,
    background: COLORS.bg,
    color: COLORS.heading,
    boxShadow: `3px 3px 6px ${COLORS.shadowDark.replace('6px 6px 12px ', '')}, -3px -3px 6px #ffffff`,
  };

  const neumorphicGoldButton = {
    ...buttonBaseStyle,
    padding: '12px 20px',
    fontSize: 14,
    background: `linear-gradient(145deg, ${COLORS.gold}, ${COLORS.goldDark})`,
    color: theme === 'dark' ? '#161225' : '#fff',
    boxShadow: `4px 4px 10px ${COLORS.shadowDark.replace('6px 6px 12px ', '')}, -2px -2px 6px rgba(255,255,255,0.4)`,
  };

  const neumorphicOutlineButton = {
    ...buttonBaseStyle,
    padding: '12px 20px',
    fontSize: 14,
    background: COLORS.bg,
    color: COLORS.heading,
    boxShadow: `4px 4px 10px ${COLORS.shadowDark.replace('6px 6px 12px ', '')}, -4px -4px 10px #ffffff`,
  };

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
            {t('subscriptions.title', 'Subscriptions')}
          </h1>
          <p style={{ color: COLORS.goldDark, margin: '6px 0 0 0', fontSize: 15, fontWeight: 500 }}>
            {t('subscriptions.subtitle', 'Manage all subscriptions')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <button
            onClick={fetchSubscriptions}
            style={neumorphicOutlineButton}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <RefreshCw size={16} /> {t('common.refresh', 'Refresh')}
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            style={neumorphicGoldButton}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Plus size={16} /> {t('subscriptions.create', 'Create Subscription')}
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div style={{
        background: COLORS.card,
        borderRadius: 24,
        boxShadow: `10px 10px 20px ${COLORS.shadowDark.replace('6px 6px 12px ', '')}, -10px -10px 20px #ffffff`,
        overflow: 'hidden',
        padding: '8px'
      }}>
        {loading ? (
          <div style={{ padding: 64, textAlign: 'center', color: COLORS.muted, fontSize: 16 }}>
            {t('common.loading', 'Loading...')}
          </div>
        ) : error ? (
          <div style={{ padding: 64, textAlign: 'center', color: C.danger, fontSize: 16 }}>
            {t('common.error', 'Error occurred')}: {error}
          </div>
        ) : subscriptions.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center', color: COLORS.muted, fontSize: 16 }}>
            {t('common.no_data', 'No data found')}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px', textAlign: 'left' }}>
            <thead>
              <tr>
                {[
                  t('subscriptions.customer', 'Customer'),
                  t('subscriptions.plan', 'Plan'),
                  t('subscriptions.status', 'Status'),
                  t('subscriptions.start', 'Start Date'),
                  '',
                ].map((h, i) => (
                  <th
                    key={i}
                    style={{
                      padding: '16px 24px',
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      color: COLORS.goldDark,
                      textAlign: h === '' ? 'right' : 'left',
                      background: COLORS.goldLight,
                      borderTopLeftRadius: i === 0 ? 16 : 0,
                      borderBottomLeftRadius: i === 0 ? 16 : 0,
                      borderTopRightRadius: i === 4 ? 16 : 0,
                      borderBottomRightRadius: i === 4 ? 16 : 0,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr
                  key={sub.id}
                  onMouseEnter={() => setHoveredRow(sub.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{ transition: 'all 0.15s ease' }}
                >
                  <td style={{
                    padding: '16px 24px',
                    fontWeight: 700,
                    color: COLORS.heading,
                    borderTopLeftRadius: 16,
                    borderBottomLeftRadius: 16,
                    background: hoveredRow === sub.id ? COLORS.rowHover : 'transparent',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: getAvatarColor(sub.customer_name),
                        color: theme === 'dark' ? '#161225' : '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 700,
                        flexShrink: 0,
                        boxShadow: '2px 2px 5px rgba(0,0,0,0.1)',
                      }}>
                        {getInitials(sub.customer_name)}
                      </div>
                      {sub.customer_name}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', color: COLORS.muted, fontWeight: 500, background: hoveredRow === sub.id ? COLORS.rowHover : 'transparent' }}>
                    {sub.plan_name}
                  </td>
                  <td style={{ padding: '16px 24px', background: hoveredRow === sub.id ? COLORS.rowHover : 'transparent' }}>
                    <span style={getStatusBadgeStyle(sub.status)}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: getStatusDotColor(sub.status), display: 'inline-block' }} />
                      {getStatusLabel(sub.status)}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', color: COLORS.muted, background: hoveredRow === sub.id ? COLORS.rowHover : 'transparent' }}>
                    {sub.start_date ? new Date(sub.start_date).toLocaleDateString() : '—'}
                  </td>
                  <td style={{
                    padding: '16px 24px',
                    display: 'flex',
                    gap: 8,
                    justifyContent: 'flex-end',
                    borderTopRightRadius: 16,
                    borderBottomRightRadius: 16,
                    background: hoveredRow === sub.id ? COLORS.rowHover : 'transparent',
                  }}>
                    <button
                      onClick={() => setSelectedSubscription(sub)}
                      style={{ ...neumorphicButton, padding: '8px 12px' }}
                    >
                      <Eye size={14} /> {t('action.view', 'View')}
                    </button>
                    {sub.status === 'trial' && (
                      <button
                        onClick={() => handleAction(sub.id, 'active')}
                        style={{ ...neumorphicButton, padding: '8px 12px', color: '#166534' }}
                      >
                        <Play size={14} /> {t('action.activate', 'Activate')}
                      </button>
                    )}
                    {sub.status === 'active' && (
                      <button
                        onClick={() => handleAction(sub.id, 'paused')}
                        style={{ ...neumorphicButton, padding: '8px 12px', color: '#92400E' }}
                      >
                        <Pause size={14} /> {t('action.pause', 'Pause')}
                      </button>
                    )}
                    {sub.status === 'past_due' && (
                      <button
                        onClick={() => handleAction(sub.id, 'active')}
                        style={{ ...neumorphicButton, padding: '8px 12px', color: '#166534' }}
                      >
                        <Play size={14} /> {t('subscriptions.mark_active', 'Mark Active')}
                      </button>
                    )}
                    {sub.status === 'paused' && (
                      <button
                        onClick={() => handleAction(sub.id, 'active')}
                        style={{ ...neumorphicButton, padding: '8px 12px', color: '#166534' }}
                      >
                        <Play size={14} /> {t('action.resume', 'Resume')}
                      </button>
                    )}
                    {sub.status !== 'cancelled' && (
                      <button
                        onClick={() => handleAction(sub.id, 'cancelled')}
                        style={{ ...neumorphicButton, padding: '8px 12px', color: C.danger }}
                      >
                        <XCircle size={14} /> {t('action.cancel', 'Cancel')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: C.overlay, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{
            background: COLORS.card,
            width: '90%',
            maxWidth: 500,
            borderRadius: 32,
            padding: 32,
            boxShadow: `20px 20px 40px ${COLORS.shadowDark.replace('6px 6px 12px ', '')}, -20px -20px 40px #ffffff`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <h3 style={{ margin: 0, fontSize: 22, color: COLORS.heading, fontWeight: 800 }}>
                {t('subscriptions.provision_title', 'Provision New Subscription')}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ ...neumorphicButton, padding: 8, borderRadius: '50%' }}
              >
                <X size={20} color={COLORS.muted} />
              </button>
            </div>

            <form onSubmit={handleCreateSubscription} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>{t('subscriptions.select_customer', 'Select Target Customer')}</label>
                <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} required style={inputStyle}>
                  <option value="">-- {t('subscriptions.choose_account', 'Choose Account Identity')} --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>{t('subscriptions.select_plan', 'Select Billing Plan Model')}</label>
                <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} required style={inputStyle}>
                  <option value="">-- {t('subscriptions.choose_plan', 'Choose Billing Plan Model')} --</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name} (${p.price}/{p.interval})</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>{t('subscriptions.select_initial_status', 'Initial Status Allocation')}</label>
                <select value={initialStatus} onChange={(e) => setInitialStatus(e.target.value)} style={inputStyle}>
                  <option value="active">{t('subscriptions.status_active_option', 'Active (Immediate Billing Run)')}</option>
                  <option value="trial">{t('subscriptions.status_trial_option', 'Trialing Status Mode')}</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={neumorphicButton}
                >
                  {t('action.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  style={neumorphicGoldButton}
                >
                  {modalSubmitting ? t('subscriptions.provisioning', 'Provisioning...') : t('subscriptions.confirm_provisioning', 'Confirm Provisioning')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedSubscription && (
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
                {t('subscriptions.title', 'Subscription')} #{selectedSubscription.id}
              </h3>
              <button
                onClick={() => setSelectedSubscription(null)}
                style={{ ...neumorphicButton, padding: 8, borderRadius: '50%' }}
              >
                <X size={20} color={COLORS.muted} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                [t('subscriptions.customer', 'Customer'), selectedSubscription.customer_name || '—'],
                [t('subscriptions.plan', 'Plan'), selectedSubscription.plan_name || '—'],
                [t('subscriptions.start', 'Start Date'), selectedSubscription.start_date ? new Date(selectedSubscription.start_date).toLocaleDateString() : '—'],
                [t('subscriptions.last_status_change', 'Last Status Change'), selectedSubscription.status_updated_at ? new Date(selectedSubscription.status_updated_at).toLocaleString() : '—'],
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
                <span style={{ color: COLORS.muted, fontWeight: 500 }}>{t('subscriptions.status', 'Status')}</span>
                <span style={getStatusBadgeStyle(selectedSubscription.status)}>{getStatusLabel(selectedSubscription.status)}</span>
              </div>
            </div>

            {selectedSubscription.valid_next_states?.length > 0 && (
              <div style={{
                marginTop: 20,
                padding: 16,
                borderRadius: 16,
                background: COLORS.goldSoft,
                boxShadow: `inset 2px 2px 5px rgba(0,0,0,0.04), inset -2px -2px 5px #ffffff`,
                fontSize: 13,
                color: COLORS.goldDark
              }}>
                <span style={{ fontWeight: 700 }}>{t('subscriptions.can_transition_to', 'Can transition to')}:</span> {selectedSubscription.valid_next_states.join(', ')}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
              <button
                onClick={() => setSelectedSubscription(null)}
                style={neumorphicButton}
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}