import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const COLORS = {
  navy: '#181F2C',            // Neumorphic Base
  shadowDark: '#0e121a',      // Bottom-Right Dark Shadow
  shadowLight: '#222c3e',     // Top-Left Light Highlight
  gold: '#C5A059',            // Accent Gold
  goldLight: '#E5C158',
  textMuted: '#9CA3AF',
  logout: '#F87171',
};

export default function Sidebar({ currentPage, setCurrentPage, onLogout }) {
  const { t } = useLanguage();

  const menuGroups = [
    {
      label: t('group.overview', 'Overview'),
      items: [
        { id: 'dashboard', name: t('nav.dashboard', 'Dashboard'), icon: '📊' },
      ]
    },
    {
      label: t('group.customer_management', 'Customer Management'),
      items: [
        { id: 'customers', name: t('nav.customers', 'Customers'), icon: '👥' },
        { id: 'subscriptions', name: t('nav.subscriptions', 'Subscriptions'), icon: '🔄' },
      ]
    },
    {
      label: t('group.billing_payments', 'Billing & Payments'),
      items: [
        { id: 'invoices', name: t('nav.invoices', 'Invoices'), icon: '📄' },
        { id: 'planchange', name: t('nav.planchange', 'Plan Change'), icon: '🔁' },
        { id: 'payments', name: t('nav.payments', 'Payments'), icon: '💳' },
        { id: 'failed-payments', name: t('nav.failed', 'Failed Payments'), icon: '⚠️' },
        { id: 'refunds', name: t('nav.refunds', 'Refunds'), icon: '↩️' },
      ]
    },
    {
      label: t('group.system', 'System'),
      items: [
        { id: 'audit-logs', name: t('nav.auditlogs', 'Audit Logs'), icon: '📜' },
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
        position: "sticky",   // ADD THIS
        top: 0,                // ADD THIS
        alignSelf: "flex-start",
        boxShadow: `6px 0 16px ${COLORS.shadowDark}`,
      }}
    >
      {/* Neumorphic Hover & Active Rules */}
      <style>{`
        .neu-nav-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 16px;
          background-color: ${COLORS.navy};
          color: ${COLORS.textMuted};
          border: none;
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.25s ease;
          box-shadow: 3px 3px 6px ${COLORS.navy}, -3px -3px 6px ${COLORS.navy};
        }

        .neu-nav-btn:hover:not(.active) {
          color: #FFFFFF;
          box-shadow: 4px 4px 8px ${COLORS.shadowDark}, -4px -4px 8px ${COLORS.shadowLight};
          transform: translateY(-1px);
        }

        /* Active Pressed Inset Neumorphic Style */
        .neu-nav-btn.active {
          color: ${COLORS.goldLight};
          font-weight: 700;
          box-shadow: inset 4px 4px 8px ${COLORS.shadowDark}, inset -4px -4px 8px ${COLORS.shadowLight};
        }

        /* Neumorphic Logout Button */
        .neu-logout-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 16px;
          background-color: ${COLORS.navy};
          color: ${COLORS.logout};
          border: none;
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          font-size: 14px;
          font-weight: 600;
          box-shadow: 4px 4px 8px ${COLORS.shadowDark}, -4px -4px 8px ${COLORS.shadowLight};
          transition: all 0.2s ease;
        }

        .neu-logout-btn:hover {
          box-shadow: 6px 6px 12px ${COLORS.shadowDark}, -6px -6px 12px ${COLORS.shadowLight};
          transform: translateY(-1px);
        }

        .neu-logout-btn:active {
          box-shadow: inset 3px 3px 6px ${COLORS.shadowDark}, inset -3px -3px 6px ${COLORS.shadowLight};
          transform: translateY(1px);
        }

        /* Custom Scrollbar */
        .sidebar-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: ${COLORS.shadowLight};
          border-radius: 10px;
        }
      `}</style>

      {/* Brand Header */}
      <div 
        style={{ 
          padding: '24px 20px', 
          margin: '16px 16px 8px 16px',
          borderRadius: '16px',
          backgroundColor: COLORS.navy,
          boxShadow: `inset 3px 3px 6px ${COLORS.shadowDark}, inset -3px -3px 6px ${COLORS.shadowLight}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.gold, letterSpacing: 0.8, textShadow: `1px 1px 2px ${COLORS.shadowDark}` }}>
          BillingEngine
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }} className="sidebar-scroll">
        {menuGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: 16 }}>
            {/* Group Label */}
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: COLORS.gold,
                textTransform: 'uppercase',
                letterSpacing: 1.4,
                padding: '8px 12px 10px',
                opacity: 0.85
              }}
            >
              {group.label}
            </div>

            {/* Group Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {group.items.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={`neu-nav-btn ${isActive ? 'active' : ''}`}
                  >
                    <span 
                      style={{ 
                        fontSize: 16, 
                        width: 24, 
                        textAlign: 'center',
                        display: 'inline-block',
                        filter: isActive ? `drop-shadow(0px 0px 4px ${COLORS.gold})` : 'none'
                      }}
                    >
                      {item.icon}
                    </span>
                    {item.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: '20px 16px' }}>
        <button
          onClick={onLogout}
          className="neu-logout-btn"
        >
          <span style={{ fontSize: 16 }}>🚪</span> {t('nav.signout', 'Sign Out')}
        </button>
      </div>
    </div>
  );
}