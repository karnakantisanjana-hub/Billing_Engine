import React, { useEffect, useState } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { Play, Pause, XCircle, RefreshCw, Plus, X, Eye } from 'lucide-react';

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

export default function Subscriptions() {
  const { getAuthHeaders } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        fetch(`${API_BASE_URL}/api/plans`, { headers: getAuthHeaders() })
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
    if (targetStatus === 'cancelled' && !window.confirm('Are you sure you want to cancel this subscription?')) return;
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
        alert(detail || 'Status transition mismatch with backend validations.');
      }
    } catch (err) {
      alert('Network communication error.');
    }
  };

  const handleCreateSubscription = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedPlanId) return alert('Please provision all metadata points.');
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
        alert(`Creation failure: ${errData.detail || 'Malformed structural inputs.'}`);
      }
    } catch (err) {
      alert('Network transmission failed.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const getStatusBadgeStyle = (status) => {
    const base = { padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' };
    switch (status?.toLowerCase()) {
      case 'active': return { ...base, background: '#DCFCE7', color: '#166534' };
      case 'trial': return { ...base, background: '#DBEAFE', color: '#1E40AF' };
      case 'paused': return { ...base, background: '#FEF3C7', color: '#92400E' };
      case 'past_due': return { ...base, background: '#FEF3C7', color: '#92400E' };
      case 'cancelled': return { ...base, background: '#FEE2E2', color: '#991B1B' };
      default: return { ...base, background: '#F3EFE6', color: COLORS.muted };
    }
  };

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

  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
    color: COLORS.muted,
  };

  return (
    <div style={{ padding: 32, background: COLORS.bg, minHeight: '100%', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, color: COLORS.heading, margin: 0 }}>Subscription Registries</h1>
          <p style={{ color: COLORS.muted, margin: '4px 0 0 0' }}>Manage global subscriber lifecycle nodes</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px',
              background: COLORS.gold, color: '#fff', border: 'none', borderRadius: 10,
              cursor: 'pointer', fontWeight: 600, fontSize: 14, boxShadow: COLORS.shadow,
            }}
          >
            <Plus size={16} /> Create Subscription
          </button>
          <button
            onClick={fetchSubscriptions}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px',
              background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 10,
              cursor: 'pointer', fontWeight: 600, fontSize: 14, color: COLORS.heading,
            }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 16, boxShadow: COLORS.shadow, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: COLORS.muted }}>Loading subscriptions...</div>
        ) : error ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#991B1B' }}>Error: {error}</div>
        ) : subscriptions.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: COLORS.muted }}>No active subscription states found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#FBF7EF', borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                {['Customer', 'Plan', 'Status', 'Start Date', ''].map((h) => (
                  <th key={h} style={{ padding: 16, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.muted, textAlign: h === '' ? 'right' : 'left' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.id} style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                  <td style={{ padding: 16, fontWeight: 600, color: COLORS.heading }}>{sub.customer_name}</td>
                  <td style={{ padding: 16, color: COLORS.muted }}>{sub.plan_name}</td>
                  <td style={{ padding: 16 }}>
                    <span style={getStatusBadgeStyle(sub.status)}>{sub.status}</span>
                  </td>
                  <td style={{ padding: 16, color: COLORS.muted }}>{sub.start_date ? new Date(sub.start_date).toLocaleDateString() : '—'}</td>
                  <td style={{ padding: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setSelectedSubscription(sub)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#FBF3E3', color: COLORS.goldDark, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                    >
                      <Eye size={13} /> View
                    </button>
                    {sub.status === 'trial' && (
                      <button
                        onClick={() => handleAction(sub.id, 'active')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#DCFCE7', color: '#166534', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                      >
                        <Play size={13} /> Activate
                      </button>
                    )}
                    {sub.status === 'active' && (
                      <button
                        onClick={() => handleAction(sub.id, 'paused')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#FEF3C7', color: '#92400E', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                      >
                        <Pause size={13} /> Pause
                      </button>
                    )}
                    {sub.status === 'past_due' && (
                      <button
                        onClick={() => handleAction(sub.id, 'active')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#DCFCE7', color: '#166534', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                      >
                        <Play size={13} /> Mark Active
                      </button>
                    )}
                    {sub.status === 'paused' && (
                      <button
                        onClick={() => handleAction(sub.id, 'active')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#DCFCE7', color: '#166534', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                      >
                        <Play size={13} /> Resume
                      </button>
                    )}
                    {sub.status !== 'cancelled' && (
                      <button
                        onClick={() => handleAction(sub.id, 'cancelled')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                      >
                        <XCircle size={13} /> Cancel
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(43,36,32,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: COLORS.card, width: '100%', maxWidth: 480, borderRadius: 16, padding: 26, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 19, color: COLORS.heading }}>Provision New Subscription</h3>
              <X size={20} color={COLORS.muted} style={{ cursor: 'pointer' }} onClick={() => setIsModalOpen(false)} />
            </div>

            <form onSubmit={handleCreateSubscription} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Select Target Customer</label>
                <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} required style={inputStyle}>
                  <option value="">-- Choose Account Identity --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Select Billing Plan Model</label>
                <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} required style={inputStyle}>
                  <option value="">-- Choose Plan Rate --</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name} (${p.price}/{p.billing_interval})</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Initial Status Allocation</label>
                <select value={initialStatus} onChange={(e) => setInitialStatus(e.target.value)} style={inputStyle}>
                  <option value="active">Active (Immediate Billing Run)</option>
                  <option value="trial">Trialing Status Mode</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '10px 18px', background: '#F3EFE6', border: 'none', borderRadius: 10, cursor: 'pointer', color: COLORS.muted, fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  style={{ padding: '10px 18px', background: COLORS.gold, border: 'none', borderRadius: 10, cursor: 'pointer', color: '#fff', fontWeight: 600 }}
                >
                  {modalSubmitting ? 'Provisioning...' : 'Confirm Provisioning'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscription Detail Modal */}
      {selectedSubscription && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(43,36,32,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: COLORS.card, width: '100%', maxWidth: 440, borderRadius: 16, padding: 26, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 19, color: COLORS.heading }}>Subscription #{selectedSubscription.id}</h3>
              <X size={20} color={COLORS.muted} style={{ cursor: 'pointer' }} onClick={() => setSelectedSubscription(null)} />
            </div>

            {[
              ['Customer', selectedSubscription.customer_name || '—'],
              ['Plan', selectedSubscription.plan_name || '—'],
              ['Start Date', selectedSubscription.start_date ? new Date(selectedSubscription.start_date).toLocaleDateString() : '—'],
              ['Last Status Change', selectedSubscription.status_updated_at ? new Date(selectedSubscription.status_updated_at).toLocaleString() : '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', fontSize: 14, borderBottom: `1px solid ${COLORS.cardBorder}`, color: COLORS.heading }}>
                <span style={{ color: COLORS.muted }}>{label}</span>
                <span>{value}</span>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', fontSize: 14, color: COLORS.heading, alignItems: 'center' }}>
              <span style={{ color: COLORS.muted }}>Status</span>
              <span style={getStatusBadgeStyle(selectedSubscription.status)}>{selectedSubscription.status}</span>
            </div>

            {selectedSubscription.valid_next_states?.length > 0 && (
              <div style={{ marginTop: 14, fontSize: 13, color: COLORS.muted }}>
                Can transition to: {selectedSubscription.valid_next_states.join(', ')}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <button
                onClick={() => setSelectedSubscription(null)}
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