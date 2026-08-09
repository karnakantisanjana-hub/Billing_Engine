import React, { useEffect, useState } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext.jsx';
import { ArrowRight, History, RefreshCw } from 'lucide-react';

export default function PlanChange() {
  const { getAuthHeaders } = useAuth();
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
        setPreviewError(data.detail || t('planchange.err_preview'));
      }
    } catch (err) {
      setPreviewError(t('planchange.err_network'));
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
          setConfirmError(data.detail || t('planchange.err_change_failed'));
        }
      }
    } catch (err) {
      setConfirmError(t('planchange.err_network'));
    } finally {
      setConfirming(false);
    }
  };

  const cardStyle = {
    background: COLORS.card,
    borderRadius: 24,
    padding: 24,
    boxShadow: `${COLORS.shadowDark}, ${COLORS.shadowLight}`,
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
    cursor: 'pointer',
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

  return (
    <div style={{ padding: 40, background: COLORS.bg, minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{
        marginBottom: 32,
        background: `linear-gradient(135deg, ${COLORS.goldSoft} 0%, ${COLORS.goldLight} 100%)`,
        padding: '28px 32px',
        borderRadius: 24,
        boxShadow: `6px 6px 16px ${COLORS.shadowDark.replace('6px 6px 12px ', '')}, -6px -6px 16px #ffffff`,
      }}>
        <h1 style={{ fontSize: 32, color: COLORS.heading, margin: 0, fontWeight: 800, letterSpacing: -0.5 }}>{t('planchange.title')}</h1>
        <p style={{ color: COLORS.goldDark, margin: '6px 0 0 0', fontSize: 15, fontWeight: 500 }}>
          {t('planchange.subtitle')}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 32, alignItems: 'start' }}>
        {/* Left: plan change flow */}
        <div style={cardStyle}>
          <label style={labelStyle}>{t('planchange.select_subscription')}</label>
          <select
            value={selectedSubId}
            onChange={(e) => handleSelectSubscription(e.target.value)}
            style={{ ...inputStyle, marginBottom: 24 }}
            disabled={loading}
          >
            <option value="">{t('planchange.choose_subscription')}</option>
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
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: COLORS.muted, marginBottom: 12, fontWeight: 700 }}>
                  {t('planchange.current_plan')}
                </div>
                <div
                  style={{
                    background: COLORS.bg,
                    borderRadius: 16,
                    padding: '20px',
                    boxShadow: `inset 4px 4px 8px ${COLORS.shadowDark}, inset -4px -4px 8px ${COLORS.shadowLight}`,
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.heading }}>{selectedSub.plan_name}</div>
                  {currentPlan && (
                    <div style={{ fontSize: 14, color: COLORS.muted, marginTop: 4, fontWeight: 500 }}>
                      ₹{currentPlan.price}/{currentPlan.billing_interval}
                    </div>
                  )}
                </div>
              </div>

              {/* New plan selection */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: COLORS.muted, marginBottom: 12, fontWeight: 700 }}>
                  {t('planchange.select_new_plan')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {availablePlans.map((p) => (
                    <label
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '16px 20px',
                        borderRadius: 16,
                        background: selectedPlanId === String(p.id) ? COLORS.goldSoft : COLORS.bg,
                        cursor: 'pointer',
                        boxShadow: selectedPlanId === String(p.id) 
                          ? `inset 4px 4px 8px ${COLORS.shadowDark}, inset -4px -4px 8px ${COLORS.shadowLight}` 
                          : `${COLORS.shadowDark}, ${COLORS.shadowLight}`,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <input
                        type="radio"
                        name="newPlan"
                        checked={selectedPlanId === String(p.id)}
                        onChange={() => handleSelectNewPlan(String(p.id))}
                        style={{ accentColor: COLORS.gold }}
                      />
                      <span style={{ fontWeight: 700, color: COLORS.heading, fontSize: 15 }}>{p.name}</span>
                      <span style={{ color: COLORS.muted, fontSize: 14, marginLeft: 'auto', fontWeight: 500 }}>
                        ₹{p.price}/{p.billing_interval}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {!selectedSub && !loading && (
            <div style={{ padding: '32px 0', textAlign: 'center', color: COLORS.muted, fontSize: 15, fontWeight: 500 }}>
              {t('planchange.select_prompt')}
            </div>
          )}
        </div>

        {/* Right: proration preview + history */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 18, color: COLORS.heading, fontWeight: 800 }}>{t('planchange.summary_title')}</h3>

            {confirmResult ? (
              <div>
                <div
                  style={{
                    background: theme === 'dark' ? 'rgba(34, 197, 94, 0.16)' : '#DCFCE7',
                    color: theme === 'dark' ? '#86EFAC' : '#166534',
                    padding: 16,
                    borderRadius: 12,
                    fontSize: 14,
                    marginBottom: 16,
                    fontWeight: 600,
                    boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  {t('planchange.success')}
                </div>
                <div style={{ fontSize: 14, color: COLORS.muted, fontWeight: 500 }}>
                  {t('planchange.new_plan_label')} <strong style={{ color: COLORS.heading, fontWeight: 700 }}>
                    {plans.find((p) => p.id === confirmResult.new_plan_id)?.name}
                  </strong>
                </div>
              </div>
            ) : previewLoading ? (
              <div style={{ color: COLORS.muted, fontSize: 15, fontWeight: 500 }}>{t('planchange.calculating')}</div>
            ) : previewError ? (
              <div style={{ color: theme === 'dark' ? '#FCA5A5' : '#991B1B', fontSize: 14, fontWeight: 600 }}>{previewError}</div>
            ) : preview ? (
              <>
                {[
                  [t('planchange.remaining_days'), `${preview.remaining_days} / ${preview.cycle_length_days}`],
                  [t('planchange.unused_credit').replace('{plan}', preview.current_plan_name), `-₹${preview.unused_credit}`],
                  [t('planchange.new_plan_charge').replace('{plan}', preview.new_plan_name), `+₹${preview.new_plan_charge}`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      fontSize: 14,
                      borderBottom: `1px solid ${COLORS.goldLight}`,
                      color: COLORS.muted,
                      fontWeight: 500
                    }}
                  >
                    <span>{label}</span>
                    <span style={{ color: COLORS.heading, fontWeight: 700 }}>{value}</span>
                  </div>
                ))}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '20px 0 8px',
                    fontSize: 18,
                    fontWeight: 800,
                    color: COLORS.heading,
                  }}
                >
                  <span>{preview.amount_due >= 0 ? t('planchange.amount_due') : t('planchange.credit_to_customer')}</span>
                  <span>₹{Math.abs(preview.amount_due)}</span>
                </div>

                {confirmError && (
                  <div style={{ background: theme === 'dark' ? 'rgba(239, 68, 68, 0.16)' : '#FEE2E2', color: theme === 'dark' ? '#FCA5A5' : '#991B1B', padding: 12, borderRadius: 12, fontSize: 13, marginTop: 16, fontWeight: 600 }}>
                    {confirmError}
                  </div>
                )}

                <button
                  onClick={handleConfirmUpgrade}
                  disabled={confirming}
                  style={{
                    ...neumorphicGoldButton,
                    width: '100%',
                    marginTop: 20,
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => { if (!confirming) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  {confirming ? t('planchange.confirming') : t('planchange.confirm_upgrade')} <ArrowRight size={16} />
                </button>
              </>
            ) : (
              <div style={{ color: COLORS.muted, fontSize: 15, fontWeight: 500 }}>
                {t('planchange.select_prompt_preview')}
              </div>
            )}
          </div>

          {/* Previous plan changes */}
          {selectedSub && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <History size={18} color={COLORS.goldDark} />
                <h3 style={{ margin: 0, fontSize: 16, color: COLORS.heading, fontWeight: 800 }}>{t('planchange.history_title')}</h3>
                <button
                  onClick={() => fetchHistory(selectedSubId)}
                  style={{ ...neumorphicButton, padding: 8, borderRadius: '50%', marginLeft: 'auto', width: 36, height: 36, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              {historyLoading ? (
                <div style={{ color: COLORS.muted, fontSize: 14, fontWeight: 500 }}>{t('common.loading')}</div>
              ) : history.length === 0 ? (
                <div style={{ color: COLORS.muted, fontSize: 14, fontWeight: 500 }}>{t('planchange.no_history')}</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {history.map((h) => (
                    <div
                      key={h.id}
                      style={{
                        padding: '16px',
                        borderRadius: 16,
                        background: COLORS.bg,
                        boxShadow: `inset 2px 2px 4px ${COLORS.shadowDark}, inset -2px -2px 4px ${COLORS.shadowLight}`,
                      }}
                    >
                      <div style={{ fontWeight: 700, color: COLORS.heading, fontSize: 14 }}>
                        {h.from_plan} → {h.to_plan}
                      </div>
                      <div style={{ color: COLORS.muted, marginTop: 4, fontSize: 13, fontWeight: 500 }}>
                        {h.date ? new Date(h.date).toLocaleDateString() : t('planchange.no_date')}
                        {h.proration && (
                          <> · {t('planchange.adjustment')} ₹{Math.abs(h.proration.amount_due)}</>
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