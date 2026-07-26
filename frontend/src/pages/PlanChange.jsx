import React, { useEffect, useState } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { ArrowRight, History, RefreshCw } from 'lucide-react';

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

export default function PlanChange() {
  const { getAuthHeaders } = useAuth();

  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedSubId, setSelectedSubId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [loading, setLoading] = useState(true);

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState(null);
  const [confirmError, setConfirmError] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [subsRes, plansRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/subscriptions`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/api/plans`, { headers: getAuthHeaders() }),
      ]);
      if (subsRes.ok) setSubscriptions(await subsRes.json());
      if (plansRes.ok) setPlans(await plansRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const selectedSub = subscriptions.find((s) => s.id === parseInt(selectedSubId));
  const currentPlan = plans.find((p) => p.name === selectedSub?.plan_name);
  const availablePlans = plans.filter((p) => p.name !== selectedSub?.plan_name);

  const fetchHistory = async (subId) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/subscriptions/${subId}/plan-history`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) setHistory(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectSubscription = (id) => {
    setSelectedSubId(id);
    setSelectedPlanId('');
    setPreview(null);
    setConfirmResult(null);
    setConfirmError(null);
    if (id) fetchHistory(id);
    else setHistory([]);
  };

  const handleSelectNewPlan = async (planId) => {
    setSelectedPlanId(planId);
    setPreview(null);
    setPreviewError(null);
    setConfirmResult(null);

    if (!planId || !selectedSubId) return;

    setPreviewLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/subscriptions/${selectedSubId}/change-plan/preview?new_plan_id=${planId}`,
        { headers: getAuthHeaders() }
      );
      const data = await res.json();
      if (res.ok) {
        setPreview(data);
      } else {
        setPreviewError(data.detail || 'Could not calculate proration.');
      }
    } catch (err) {
      setPreviewError('Network error — could not reach the server.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmUpgrade = async () => {
    setConfirming(true);
    setConfirmError(null);
    try {
      const res = await fetch(
    `${API_BASE_URL}/api/subscriptions/${selectedSubId}/change-plan`,
    {
        method: "POST",
        headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            new_plan_id: Number(selectedPlanId),
        }),
    }
  );
      const data = await res.json();
      if (res.ok) {
        setConfirmResult(data);
        setPreview(null);
        setSelectedPlanId('');
        fetchInitialData();
        fetchHistory(selectedSubId);
      } else {
        if (Array.isArray(data.detail)) {
        setConfirmError(data.detail.map(e => e.msg).join(", "));
      } else {
        setConfirmError(data.detail || "Plan change failed.");
      }
      }
    } catch (err) {
      setConfirmError('Network error — could not reach the server.');
    } finally {
      setConfirming(false);
    }
  };

  const cardStyle = {
    background: COLORS.card,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 16,
    padding: 24,
    boxShadow: COLORS.shadow,
  };

  const selectStyle = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 10,
    border: `1px solid ${COLORS.cardBorder}`,
    outline: 'none',
    fontSize: 14,
    fontFamily: 'inherit',
    color: COLORS.heading,
    background: COLORS.bg,
    cursor: 'pointer',
  };

  return (
    <div style={{ padding: 32, background: COLORS.bg, minHeight: '100%' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, color: COLORS.heading, margin: 0 }}>Change Plan</h1>
        <p style={{ color: COLORS.muted, margin: '4px 0 0 0' }}>
          Upgrade or downgrade a subscription mid-cycle, with fair proration
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 24, alignItems: 'start' }}>
        {/* Left: plan change flow */}
        <div style={cardStyle}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: COLORS.muted }}>
            Select Subscription
          </label>
          <select
            value={selectedSubId}
            onChange={(e) => handleSelectSubscription(e.target.value)}
            style={{ ...selectStyle, marginBottom: 24 }}
            disabled={loading}
          >
            <option value="">-- Choose a subscription --</option>
            {subscriptions
              .filter((s) => s.status !== 'cancelled')
              .map((s) => (
                <option key={s.id} value={s.id}>
                  #{s.id} — {s.customer_name} ({s.plan_name}, {s.status})
                </option>
              ))}
          </select>

          {selectedSub && (
            <>
              {/* Current plan */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.muted, marginBottom: 8 }}>
                  Current Plan
                </div>
                <div
                  style={{
                    background: '#FBF7EF',
                    border: `1px solid ${COLORS.cardBorder}`,
                    borderRadius: 12,
                    padding: '16px 18px',
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.heading }}>{selectedSub.plan_name}</div>
                  {currentPlan && (
                    <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>
                      ₹{currentPlan.price}/{currentPlan.billing_interval}
                    </div>
                  )}
                </div>
              </div>

              {/* New plan selection */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.muted, marginBottom: 10 }}>
                  Select New Plan
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {availablePlans.map((p) => (
                    <label
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: `1px solid ${selectedPlanId === String(p.id) ? COLORS.gold : COLORS.cardBorder}`,
                        background: selectedPlanId === String(p.id) ? '#FBF3E3' : COLORS.bg,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="newPlan"
                        checked={selectedPlanId === String(p.id)}
                        onChange={() => handleSelectNewPlan(String(p.id))}
                      />
                      <span style={{ fontWeight: 600, color: COLORS.heading }}>{p.name}</span>
                      <span style={{ color: COLORS.muted, fontSize: 13, marginLeft: 'auto' }}>
                        ₹{p.price}/{p.billing_interval}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {!selectedSub && !loading && (
            <div style={{ padding: '24px 0', textAlign: 'center', color: COLORS.muted, fontSize: 14 }}>
              Select a subscription above to begin.
            </div>
          )}
        </div>

        {/* Right: proration preview + history */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 17, color: COLORS.heading }}>Plan Upgrade Summary</h3>

            {confirmResult ? (
              <div>
                <div
                  style={{
                    background: '#DCFCE7',
                    color: '#166534',
                    padding: 14,
                    borderRadius: 10,
                    fontSize: 13,
                    marginBottom: 14,
                  }}
                >
                  ✓ Plan changed successfully.
                </div>
                <div style={{ fontSize: 13, color: COLORS.muted }}>
                  New plan: <strong style={{ color: COLORS.heading }}>
                    {plans.find((p) => p.id === confirmResult.new_plan_id)?.name}
                  </strong>
                </div>
              </div>
            ) : previewLoading ? (
              <div style={{ color: COLORS.muted, fontSize: 14 }}>Calculating proration...</div>
            ) : previewError ? (
              <div style={{ color: '#991B1B', fontSize: 14 }}>{previewError}</div>
            ) : preview ? (
              <>
                {[
                  ['Remaining days in cycle', `${preview.remaining_days} / ${preview.cycle_length_days}`],
                  [`Unused ${preview.current_plan_name} credit`, `-₹${preview.unused_credit}`],
                  [`${preview.new_plan_name} charge (remaining period)`, `+₹${preview.new_plan_charge}`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '9px 0',
                      fontSize: 13,
                      borderBottom: `1px solid ${COLORS.cardBorder}`,
                      color: COLORS.muted,
                    }}
                  >
                    <span>{label}</span>
                    <span style={{ color: COLORS.heading }}>{value}</span>
                  </div>
                ))}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '14px 0 4px',
                    fontSize: 16,
                    fontWeight: 700,
                    color: COLORS.heading,
                  }}
                >
                  <span>{preview.amount_due >= 0 ? 'Amount Due' : 'Credit to Customer'}</span>
                  <span>₹{Math.abs(preview.amount_due)}</span>
                </div>

                {confirmError && (
                  <div style={{ background: '#FEE2E2', color: '#991B1B', padding: 10, borderRadius: 8, fontSize: 13, marginTop: 12 }}>
                    {confirmError}
                  </div>
                )}

                <button
                  onClick={handleConfirmUpgrade}
                  disabled={confirming}
                  style={{
                    width: '100%',
                    marginTop: 16,
                    padding: '12px 18px',
                    background: COLORS.gold,
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {confirming ? 'Confirming...' : 'Confirm Upgrade'} <ArrowRight size={15} />
                </button>
              </>
            ) : (
              <div style={{ color: COLORS.muted, fontSize: 14 }}>
                Select a subscription and a new plan to preview the proration.
              </div>
            )}
          </div>

          {/* Previous plan changes */}
          {selectedSub && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <History size={16} color={COLORS.goldDark} />
                <h3 style={{ margin: 0, fontSize: 15, color: COLORS.heading }}>Previous Plan Changes</h3>
                <button
                  onClick={() => fetchHistory(selectedSubId)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted }}
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              {historyLoading ? (
                <div style={{ color: COLORS.muted, fontSize: 13 }}>Loading...</div>
              ) : history.length === 0 ? (
                <div style={{ color: COLORS.muted, fontSize: 13 }}>No plan changes yet for this subscription.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {history.map((h) => (
                    <div
                      key={h.id}
                      style={{
                        padding: '10px 12px',
                        background: '#FBF7EF',
                        borderRadius: 10,
                        fontSize: 13,
                      }}
                    >
                      <div style={{ fontWeight: 600, color: COLORS.heading }}>
                        {h.from_plan} → {h.to_plan}
                      </div>
                      <div style={{ color: COLORS.muted, marginTop: 2 }}>
                        {h.date ? new Date(h.date).toLocaleDateString() : '—'}
                        {h.proration && (
                          <> · Adjustment ₹{Math.abs(h.proration.amount_due)}</>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}