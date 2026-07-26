import React, { useEffect, useState } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { Plus, X, Pencil, Trash2, Search, Users } from 'lucide-react';

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

export default function Customers() {
  const { getAuthHeaders } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Add/Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null); // null = creating new
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
      setFormError('Name and email are required.');
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
        setFormError(errData.detail || 'Something went wrong.');
      }
    } catch (err) {
      setFormError('Network error — could not reach the server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (customer) => {
    if (!window.confirm(`Delete ${customer.name}? This can't be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/customers/${customer.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        fetchCustomers();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || 'Could not delete this customer.');
      }
    } catch (err) {
      alert('Network error — could not reach the server.');
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
          <h1 style={{ fontSize: 28, color: COLORS.heading, margin: 0 }}>Customers</h1>
          <p style={{ color: COLORS.muted, margin: '4px 0 0 0' }}>
            Manage every account on the platform
          </p>
        </div>
        <button
          onClick={openAddModal}
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
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {/* Search */}
      <div
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: 14,
          padding: '12px 16px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: COLORS.shadow,
          maxWidth: 380,
        }}
      >
        <Search size={16} color={COLORS.muted} />
        <input
          type="text"
          placeholder="Search by name, email, or company..."
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
          <div style={{ padding: 48, textAlign: 'center', color: COLORS.muted }}>
            Loading customers...
          </div>
        ) : error ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#991B1B' }}>
            Error: {error}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: COLORS.muted }}>
            <Users size={28} style={{ marginBottom: 10, opacity: 0.5 }} />
            <div>{customers.length === 0 ? 'No customers yet.' : 'No customers match your search.'}</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#FBF7EF', borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                <th style={{ padding: 16, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.muted }}>Name</th>
                <th style={{ padding: 16, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.muted }}>Email</th>
                <th style={{ padding: 16, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.muted }}>Company</th>
                <th style={{ padding: 16, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.muted, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                  <td style={{ padding: 16, fontWeight: 600, color: COLORS.heading }}>{c.name}</td>
                  <td style={{ padding: 16, color: COLORS.muted }}>{c.email}</td>
                  <td style={{ padding: 16, color: COLORS.muted }}>{c.company_name || '—'}</td>
                  <td style={{ padding: 16, textAlign: 'right' }}>
                    <button
                      onClick={() => openEditModal(c)}
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
                        marginRight: 8,
                      }}
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 12px',
                        background: '#FEE2E2',
                        color: '#991B1B',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(43,36,32,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: COLORS.card,
              width: '100%',
              maxWidth: 440,
              borderRadius: 16,
              padding: 26,
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 19, color: COLORS.heading }}>
                {editingCustomer ? 'Edit Customer' : 'Add Customer'}
              </h3>
              <X size={20} color={COLORS.muted} style={{ cursor: 'pointer' }} onClick={closeModal} />
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {formError && (
                <div
                  style={{
                    background: '#FEE2E2',
                    color: '#991B1B',
                    padding: '10px 14px',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                >
                  {formError}
                </div>
              )}

              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Company Name</label>
                <input
                  type="text"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    padding: '10px 18px',
                    background: '#F3EFE6',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    color: COLORS.muted,
                    fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 18px',
                    background: COLORS.gold,
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    color: '#fff',
                    fontWeight: 600,
                  }}
                >
                  {submitting ? 'Saving...' : editingCustomer ? 'Save Changes' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}