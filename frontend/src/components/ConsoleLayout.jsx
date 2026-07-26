import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

export default function ConsoleLayout() {
  const navigate = useNavigate();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Customers', path: '/customers', icon: '👥' },
    { name: 'Plans', path: '/plans', icon: '🏷️' },
    { name: 'Subscriptions', path: '/subscriptions', icon: '🔄' },
    { name: 'Billing Cycles', path: '/billing-cycles', icon: '📅' },
    { name: 'Invoices', path: '/invoices', icon: '📄' },
    { name: 'Payments', path: '/payments', icon: '💳' },
    { name: 'Failed Payments', path: '/failed-payments', icon: '⚠️' },
    { name: 'Refunds', path: '/refunds', icon: '↩️' },
    { name: 'Reports', path: '/reports', icon: '📈' },
    { name: 'Audit Logs', path: '/audit-logs', icon: '📜' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/signin');
  };

  return (
    <div className="flex h-screen bg-[#FDFBF7] text-[#333333] overflow-hidden">
      {/* Persistent Sidebar Layout */}
      <aside className="w-64 bg-[#1E1E24] text-[#EAEAEA] flex flex-col shadow-xl z-20">
        <div className="p-6 border-b border-gray-800 flex flex-col">
          <span className="text-xl font-bold tracking-wider text-white bg-gradient-to-r from-[#C5A059] to-[#E6C687] bg-clip-text text-transparent">
            BillingEngine
          </span>
          <span className="text-xs text-gray-400 font-semibold tracking-widest mt-1 uppercase">Admin Console</span>
        </div>
        
        {/* Scrollable Navigation List */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1 custom-scrollbar">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-xl transition-all font-medium text-sm space-x-3 group ${
                  isActive
                    ? 'bg-[#C5A059] text-white shadow-lg shadow-[#C5A059]/20'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <span className="text-lg group-hover:scale-110 transition-transform">{item.icon}</span>
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Action Bottom Section */}
        <div className="p-4 border-t border-gray-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-all rounded-xl space-x-3"
          >
            <span>🚪</span>
            <span>Exit Dashboard</span>
          </button>
        </div>
      </aside>

      {/* Main App Content Viewport */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-[#F3EFE6] px-8 flex items-center justify-end shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-[#FAF4E8] border border-[#EEDCBE] flex items-center justify-center font-bold text-xs text-[#C5A059]">
              AD
            </div>
            <span className="text-sm font-semibold text-gray-700">Root Administrator</span>
          </div>
        </header>
        
        {/* Child Routes Render Inside Here */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#FAF9F5]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}