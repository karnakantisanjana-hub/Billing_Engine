import React from 'react';

const COLORS = {
  navy: '#181F2C',
  navyActive: '#283346',
  navyHover: '#20293A',
  border: '#283346',
  gold: '#C5A059',
  goldLight: '#E5C158',
  textMuted: '#9CA3AF',
  logout: '#F87171',
};

export default function Sidebar({ currentPage, setCurrentPage, onLogout }) {

  const menuGroups = [
    {
      label: "Overview",
      items: [
        { id: 'dashboard', name: 'Dashboard', icon: '📊' },
      ]
    },
    {
      label: "Customer Management",
      items: [
        { id: 'customers', name: 'Customers', icon: '👥' },
        { id: 'subscriptions', name: 'Subscriptions', icon: '🔄' },
        { id: 'billing-cycles', name: 'Billing Cycles', icon: '♻️' },
      ]
    },
    {
      label: "Billing & Payments",
      items: [
        { id: 'invoices', name: 'Invoices', icon: '📄' },
        { id: 'planchange', name: 'Plan Change', icon: '🔁' },
        { id: 'payments', name: 'Payments', icon: '💳' },
        { id: 'failed-payments', name: 'Failed Payments', icon: '⚠️' },
        { id: 'refunds', name: 'Refunds', icon: '↩️' },
      ]
    },
    {
      label: "System",
      items: [
        { id: 'audit-logs', name: 'Audit Logs', icon: '📜' },
      ]
    },
  ];

  return (
    <div
      style={{
        width: "260px",
        minWidth: "260px",
        flexShrink: 0,
        backgroundColor: COLORS.navy,
        color: "#F3F4F6",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      {/* Brand Header */}
      <div style={{ padding: '26px 20px 18px', borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.gold, letterSpacing: 0.3 }}>
          BillingEngine
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }} className="sidebar-scroll">
        {menuGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: 12 }}>
            {/* Group Label */}
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: COLORS.textMuted,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                padding: '8px 14px 6px',
              }}
            >
              {group.label}
            </div>

            {/* Group Items */}
            {group.items.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = COLORS.navyHover;
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: isActive ? COLORS.navyActive : 'transparent',
                    color: isActive ? COLORS.goldLight : COLORS.textMuted,
                    border: 'none',
                    borderRadius: '10px',
                    borderLeft: isActive ? `4px solid ${COLORS.gold}` : '4px solid transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: isActive ? '700' : '500',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{item.icon}</span>
                  {item.name}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: '16px', borderTop: `1px solid ${COLORS.border}` }}>
        <button
          onClick={onLogout}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            padding: '12px 14px',
            backgroundColor: 'transparent',
            color: COLORS.logout,
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
          }}
        >
          🚪 Sign Out
        </button>
      </div>
    </div>
  );
}
