import React, { useEffect, useState } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext.jsx';
import { Plus, X, Pencil, Trash2, Search, Users } from 'lucide-react';

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

export default function Customers() {
  const { getAuthHeaders } = useAuth();
  const { t } = useLanguage();
  const { theme, colors: C } = useTheme();

  // Keep the existing Customers design while deriving page colors from the shared theme.
  const COLORS = {
    bg: C.bg,
    card: C.card,
    cardBorder: C.border,
    shadow: `0 4px 20px ${C.shadowLo}`,
    gold: C.gold,
    goldDark: C.goldText,
    goldLight: C.goldBannerEnd,
    goldSoft: C.goldSoft,
    heading: C.heading,
    muted: C.muted,
    rowHover: theme === 'dark' ? 'rgba(216,182,124,0.08)' : '#F5EEDF',
  };

  const neuShadow = `8px 8px 16px ${C.shadowLo}, -8px -8px 16px ${C.shadowHi}`;
  const neuShadowSm = `4px 4px 10px ${C.shadowLoSm}, -4px -4px 10px ${C.shadowHi}`;
  const neuShadowInset = `inset 4px 4px 10px ${C.shadowLoInset}, inset -4px -4px 10px ${C.shadowHiInset}`;

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [hoveredRow, setHoveredRow] = useState(null);

  // Add/Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/customers`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Failed to load customers (${res.status})`);
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openAddModal = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormEmail('');
    setFormCompany('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setFormName(customer.name || '');
    setFormEmail(customer.email || '');
    setFormCompany(customer.company_name || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim() || !formEmail.trim()) {
      setFormError(t('customers.name_email_required', 'Name and email are required.'));
      return;
    }

    setSubmitting(true);
    try {
      const isEdit = Boolean(editingCustomer);
      const url = isEdit
        ? `${API_BASE_URL}/customers/${editingCustomer.id}`
        : `${API_BASE_URL}/customers`;

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim(),
          company_name: formCompany.trim() || null,
        }),
      });

      if (res.ok) {
        closeModal();
        fetchCustomers();
      } else {
        const errData = await res.json().catch(() => ({}));
        setFormError(errData.detail || t('common.error', 'Something went wrong.'));
      }
    } catch (err) {
      setFormError(t('common.network_error', 'Network error — could not reach the server.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (customer) => {
    if (!window.confirm(`${t('customers.confirm_delete', 'Delete')} ${customer.name}? ${t('customers.confirm_delete_suffix', "This can't be undone.")}`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/customers/${customer.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        fetchCustomers();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || t('customers.delete_failed', 'Could not delete this customer.'));
      }
    } catch (err) {
      alert(t('common.network_error', 'Network error — could not reach the server.'));
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      (c.company_name || '').toLowerCase().includes(q)
    );
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
    boxShadow: neuShadowInset,
  };

  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
    color: COLORS.muted,
  };

  return (
    <div style={{ padding: 32, background: COLORS.bg, minHeight: '100%' }}>

      {/* ─── HEADER ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 28,
          flexWrap: 'wrap',
          gap: 16,
          background: `linear-gradient(135deg, ${COLORS.goldSoft} 0%, ${COLORS.goldLight} 100%)`,
          padding: '28px 32px',
          borderRadius: 24,
          boxShadow: neuShadow,
        }}
      >
        <div>
          <h1 style={{ fontSize: 32, color: COLORS.heading, margin: 0, fontWeight: 800, letterSpacing: -0.5 }}>
            {t('customers.title', 'Customers')}
          </h1>
          <p style={{ color: COLORS.goldDark, margin: '6px 0 0 0', fontSize: 15, fontWeight: 500 }}>
            {t('customers.subtitle', 'Manage every account on the platform')}
          </p>
        </div>
        <button
          onClick={openAddModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 20px',
            background: `linear-gradient(145deg, ${COLORS.gold}, ${COLORS.goldDark})`,
            color: theme === 'dark' ? '#161225' : '#fff',
            border: 'none',
            borderRadius: 12,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
            boxShadow: "4px 4px 10px rgba(163,150,128,0.3), -2px -2px 6px rgba(255,255,255,0.4)",
            transition: 'transform 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <Plus size={16} />
          {t('customers.add', 'Add Customer')}
        </button>
      </div>

      {/* ─── SEARCH BAR ─── */}
      <div
        style={{
          background: COLORS.bg,
          borderRadius: 14,
          padding: '12px 16px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: neuShadowInset,
          maxWidth: 380,
        }}
      >
        <Search size={16} color={COLORS.muted} />
        <input
          type="text"
          placeholder={t('customers.search', 'Search by name, email, or company...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            border: 'none',
            outline: 'none',
            fontSize: 14,
            width: '100%',
            background: 'transparent',
            color: COLORS.heading,
          }}
        />
      </div>

      {/* ─── TABLE CARD ─── */}
      <div
        style={{
          background: COLORS.card,
          borderRadius: 24,
          boxShadow: neuShadow,
          overflow: 'hidden',
          padding: '8px',
        }}
      >
        {loading ? (
          <div style={{
            padding: 48,
            textAlign: 'center',
            color: COLORS.muted,
            background: COLORS.bg,
            borderRadius: 14,
            margin: 16,
            boxShadow: neuShadowInset,
          }}>
            {t('customers.loading', 'Loading customers...')}
          </div>
        ) : error ? (
          <div style={{
            padding: 48,
            textAlign: 'center',
            color: C.danger,
            background: COLORS.bg,
            borderRadius: 14,
            margin: 16,
            boxShadow: neuShadowInset,
            fontWeight: 500,
          }}>
            {t('common.error', 'Error')}: {error}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{
            padding: 48,
            textAlign: 'center',
            color: COLORS.muted,
          }}>
            <Users size={28} style={{ marginBottom: 10, opacity: 0.5 }} />
            <div>
              {customers.length === 0
                ? t('customers.none_yet', 'No customers yet.')
                : t('customers.none_match', 'No customers match your search.')}
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px', textAlign: 'left' }}>
            <thead>
              <tr>
                {[
                  t('customers.name', 'Name'),
                  t('customers.email', 'Email'),
                  t('customers.company', 'Company'),
                  t('customers.actions', 'Actions'),
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
                      background: COLORS.goldLight,
                      textAlign: i === 3 ? 'right' : 'left',
                      borderTopLeftRadius: i === 0 ? 16 : 0,
                      borderBottomLeftRadius: i === 0 ? 16 : 0,
                      borderTopRightRadius: i === 3 ? 16 : 0,
                      borderBottomRightRadius: i === 3 ? 16 : 0,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => (
                <tr
                  key={c.id}
                  onMouseEnter={() => setHoveredRow(c.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{ transition: 'all 0.15s ease' }}
                >
                  <td style={{
                    padding: '16px 24px',
                    fontWeight: 600,
                    color: COLORS.heading,
                    borderTopLeftRadius: 16,
                    borderBottomLeftRadius: 16,
                    background: hoveredRow === c.id ? COLORS.rowHover : 'transparent',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: getAvatarColor(c.name),
                        color: theme === 'dark' ? '#161225' : '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 700,
                        flexShrink: 0,
                        boxShadow: '2px 2px 5px rgba(0,0,0,0.1)',
                      }}>
                        {getInitials(c.name)}
                      </div>
                      {c.name}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', color: COLORS.muted, background: hoveredRow === c.id ? COLORS.rowHover : 'transparent' }}>
                    {c.email}
                  </td>
                  <td style={{ padding: '16px 24px', color: COLORS.muted, background: hoveredRow === c.id ? COLORS.rowHover : 'transparent' }}>
                    {c.company_name || '—'}
                  </td>
                  <td style={{
                    padding: '16px 24px',
                    textAlign: 'right',
                    borderTopRightRadius: 16,
                    borderBottomRightRadius: 16,
                    background: hoveredRow === c.id ? COLORS.rowHover : 'transparent',
                  }}>
                    <button
                      onClick={() => openEditModal(c)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 14px',
                        background: COLORS.bg,
                        color: COLORS.goldDark,
                        border: 'none',
                        borderRadius: 10,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 500,
                        marginRight: 8,
                        boxShadow: neuShadowSm,
                        transition: 'box-shadow 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = "6px 6px 12px rgba(163,150,128,0.3), -6px -6px 12px rgba(255,255,255,0.8)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = neuShadowSm;
                      }}
                    >
                      <Pencil size={13} /> {t('action.edit', 'Edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 14px',
                        background: COLORS.bg,
                        color: C.danger,
                        border: 'none',
                        borderRadius: 10,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 500,
                        boxShadow: neuShadowSm,
                        transition: 'box-shadow 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = "6px 6px 12px rgba(163,150,128,0.3), -6px -6px 12px rgba(255,255,255,0.8)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = neuShadowSm;
                      }}
                    >
                      <Trash2 size={13} /> {t('action.delete', 'Delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── ADD/EDIT MODAL ─── */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: C.overlay,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: COLORS.bg,
              width: '100%',
              maxWidth: 440,
              borderRadius: 20,
              padding: 30,
              boxShadow: "16px 16px 32px rgba(163,150,128,0.35), -16px -16px 32px rgba(255,255,255,0.7)",
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 19, color: COLORS.heading, fontWeight: 700 }}>
                {editingCustomer
                  ? t('customers.edit_title', 'Edit Customer')
                  : t('customers.add_title', 'Add Customer')}
              </h3>
              <X size={20} color={COLORS.muted} style={{ cursor: 'pointer' }} onClick={closeModal} />
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {formError && (
                <div
                  style={{
                    background: COLORS.bg,
                    color: C.danger,
                    padding: '12px 16px',
                    borderRadius: 12,
                    fontSize: 13,
                    boxShadow: neuShadowInset,
                    fontWeight: 500,
                  }}
                >
                  {formError}
                </div>
              )}

              <div>
                <label style={labelStyle}>{t('customers.full_name', 'Full Name')}</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>{t('customers.email', 'Email')}</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>{t('customers.company', 'Company Name')}</label>
                <input
                  type="text"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    padding: '11px 20px',
                    background: COLORS.bg,
                    border: 'none',
                    borderRadius: 12,
                    cursor: 'pointer',
                    color: COLORS.muted,
                    fontWeight: 500,
                    boxShadow: neuShadow,
                    transition: 'box-shadow 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = neuShadowInset;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = neuShadow;
                  }}
                >
                  {t('action.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '11px 20px',
                    background: `linear-gradient(145deg, ${COLORS.gold}, ${COLORS.goldDark})`,
                    border: 'none',
                    borderRadius: 12,
                    cursor: 'pointer',
                    color: theme === 'dark' ? '#161225' : '#fff',
                    fontWeight: 600,
                    boxShadow: "4px 4px 12px rgba(197,160,89,0.35)",
                    transition: 'box-shadow 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!submitting) e.currentTarget.style.boxShadow = "6px 6px 16px rgba(197,160,89,0.45)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "4px 4px 12px rgba(197,160,89,0.35)";
                  }}
                >
                  {submitting
                    ? t('customers.saving', 'Saving...')
                    : editingCustomer
                      ? t('customers.save_changes', 'Save Changes')
                      : t('customers.add', 'Add Customer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}