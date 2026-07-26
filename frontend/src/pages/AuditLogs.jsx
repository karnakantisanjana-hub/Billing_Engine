import React, { useEffect, useState } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { Search, RefreshCw, Eye, X, ScrollText } from 'lucide-react';

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

const ENTITY_STYLES = {
  plan: { bg: '#EDE4FB', color: '#5B21B6' },
  subscription: { bg: '#DBEAFE', color: '#1E40AF' },
  invoice: { bg: '#FEF3C7', color: '#92400E' },
  payment: { bg: '#DCFCE7', color: '#166534' },
  refund: { bg: '#FEE2E2', color: '#991B1B' },
  customer: { bg: '#F3EFE6', color: COLORS.muted },
  billing_cycle: { bg: '#E0F2FE', color: '#075985' },
};

function entityStyle(entityType) {
  return ENTITY_STYLES[(entityType || '').toLowerCase()] || { bg: '#F3EFE6', color: COLORS.muted };
}

function tryParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function ValueBlock({ label, value }) {
  const parsed = tryParse(value);
  if (parsed === null) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: COLORS.muted, marginBottom: 6 }}>
        {label}
      </div>
      {typeof parsed === 'object' ? (
        <div style={{ background: '#FBF7EF', borderRadius: 10, padding: 12 }}>
          {Object.entries(parsed).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
              <span style={{ color: COLORS.muted }}>{k}</span>
              <span style={{ color: COLORS.heading, fontWeight: 600, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>
                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: '#FBF7EF', borderRadius: 10, padding: 12, fontSize: 13, color: COLORS.heading, wordBreak: 'break-word' }}>
          {parsed}
        </div>
      )}
    </div>
  );
}

export default function AuditLogs() {
  const { getAuthHeaders } = useAuth();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/audit-logs`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Failed to load audit logs (${res.status})`);
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const entityTypes = [...new Set(logs.map((l) => l.entity_type))].sort();

  const filteredLogs = logs.filter((log) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      log.action?.toLowerCase().includes(q) ||
      (log.performed_by || '').toLowerCase().includes(q) ||
      String(log.entity_id).includes(q);
    const matchesEntity = !entityFilter || log.entity_type === entityFilter;
    return matchesSearch && matchesEntity;
  });

  return (
    <div style={{ padding: 32, background: COLORS.bg, minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, color: COLORS.heading, margin: 0 }}>System Audit Logs</h1>
          <p style={{ color: COLORS.muted, margin: '4px 0 0 0' }}>
            Every tracked change across plans, subscriptions, invoices, and payments
          </p>
        </div>
        <button
          onClick={fetchLogs}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '11px 18px',
            background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 10,
            cursor: 'pointer', fontWeight: 600, fontSize: 14, color: COLORS.heading,
          }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <div
          style={{
            background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 14,
            padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: COLORS.shadow, flex: 1, minWidth: 240, maxWidth: 380,
          }}
        >
          <Search size={16} color={COLORS.muted} />
          <input
            type="text"
            placeholder="Search action, performed by, or entity ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: 14, width: '100%', background: 'transparent', color: COLORS.heading }}
          />
        </div>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          style={{
            background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 14,
            padding: '12px 16px', fontSize: 14, color: COLORS.heading, boxShadow: COLORS.shadow,
            outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">All Entities</option>
          {entityTypes.map((et) => (
            <option key={et} value={et}>{et}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 16, boxShadow: COLORS.shadow, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: COLORS.muted }}>Loading audit logs...</div>
        ) : error ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#991B1B' }}>Error: {error}</div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: COLORS.muted }}>
            <ScrollText size={28} style={{ marginBottom: 10, opacity: 0.5 }} />
            <div>{logs.length === 0 ? 'No audit events recorded yet.' : 'No logs match your filters.'}</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#FBF7EF', borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                {['Entity', 'Entity ID', 'Action', 'Performed By', 'Date', ''].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: 16, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5,
                      color: COLORS.muted, textAlign: h === '' ? 'right' : 'left',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const s = entityStyle(log.entity_type);
                return (
                  <tr key={log.id} style={{ borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                    <td style={{ padding: 16 }}>
                      <span
                        style={{
                          padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          textTransform: 'uppercase', background: s.bg, color: s.color,
                        }}
                      >
                        {log.entity_type}
                      </span>
                    </td>
                    <td style={{ padding: 16, color: COLORS.muted }}>#{log.entity_id}</td>
                    <td style={{ padding: 16, fontWeight: 600, color: COLORS.heading }}>
                      {(log.action || '').replace(/_/g, ' ')}
                    </td>
                    <td style={{ padding: 16, color: COLORS.muted }}>{log.performed_by || 'system'}</td>
                    <td style={{ padding: 16, color: COLORS.muted }}>
                      {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: 16, textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedLog(log)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px',
                          background: '#FBF3E3', color: COLORS.goldDark, border: 'none', borderRadius: 8,
                          cursor: 'pointer', fontSize: 13, fontWeight: 600,
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

      {/* Detail modal */}
      {selectedLog && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(43,36,32,0.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}
        >
          <div style={{ background: COLORS.card, width: '100%', maxWidth: 480, borderRadius: 16, padding: 26, boxShadow: '0 20px 50px rgba(0,0,0,0.2)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 19, color: COLORS.heading }}>
                {(selectedLog.action || '').replace(/_/g, ' ')}
              </h3>
              <X size={20} color={COLORS.muted} style={{ cursor: 'pointer' }} onClick={() => setSelectedLog(null)} />
            </div>

            {[
              ['Entity', `${selectedLog.entity_type} #${selectedLog.entity_id}`],
              ['Performed By', selectedLog.performed_by || 'system'],
              ['Date', selectedLog.created_at ? new Date(selectedLog.created_at).toLocaleString() : '—'],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: 'flex', justifyContent: 'space-between', padding: '9px 0',
                  fontSize: 14, borderBottom: `1px solid ${COLORS.cardBorder}`, color: COLORS.heading,
                }}
              >
                <span style={{ color: COLORS.muted }}>{label}</span>
                <span>{value}</span>
              </div>
            ))}

            <div style={{ marginTop: 18 }}>
              <ValueBlock label="Before" value={selectedLog.old_value} />
              <ValueBlock label="After" value={selectedLog.new_value} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                onClick={() => setSelectedLog(null)}
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