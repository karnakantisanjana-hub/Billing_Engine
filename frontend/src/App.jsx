import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SignIn from './pages/SignIn.jsx';
import Invoices from './pages/Invoices.jsx';
import Payments from './pages/Payments.jsx';
import Refunds from './pages/Refunds.jsx';
import FailedPayments from './pages/FailedPayments.jsx';
import Subscriptions from './pages/Subscriptions.jsx';
import Customers from './pages/Customers.jsx';
import PlanChange from './pages/PlanChange.jsx';
import AuditLogs from './pages/AuditLogs.jsx';
import Profile from './pages/Profile.jsx';
import Landing from './pages/LandingPage.jsx';
import SignUp from './pages/SignUp.jsx';
import CustomerAuth from './pages/CustomerAuth.jsx';
import CustomerDashboard from './pages/CustomerDashboard.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { Routes, Route } from 'react-router-dom';

// Global scrollbar styling so every scrollable region in the app (sidebar nav
// and main content) shares one thin, theme-colored scrollbar instead of each
// scroll container falling back to the browser's own default (often a thick,
// solid black/gray bar, especially on Windows or in dark mode) — which is
// what produced the "double scrollbar" look when two adjacent containers
// (sidebar + main content) each scroll independently.
const globalScrollbarStyles = `
  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
  }

  .app-content {
    scrollbar-width: thin;
    scrollbar-color: rgba(197,160,89,0.55) transparent;
  }
  .app-content::-webkit-scrollbar {
    width: 8px;
  }
  .app-content::-webkit-scrollbar-track {
    background: transparent;
  }
  .app-content::-webkit-scrollbar-thumb {
    background: rgba(197,160,89,0.45);
    border-radius: 10px;
  }
  .app-content::-webkit-scrollbar-thumb:hover {
    background: rgba(197,160,89,0.7);
  }

  /* Dashboard-only: keep scrolling functional but hide the visible track/thumb,
     since Dashboard already renders its own internal scroll affordances and
     the outer content scrollbar next to the sidebar's was showing as an
     unwanted second (black, unstyled-looking) bar on this page specifically. */
  .app-content.app-content--no-scrollbar {
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* old Edge/IE */
  }
  .app-content.app-content--no-scrollbar::-webkit-scrollbar {
    display: none; /* Chrome, Safari, new Edge */
  }
`;

function PublicPage({ page, setCurrentPage }) {
  const pageStyle = {
    width: '100%',
    minWidth: 0,
    minHeight: '100dvh',
    overflowX: 'hidden',
    overflowY: 'auto',
    background: 'var(--page-bg)',
    color: 'var(--text)',
  };

  return (
    <div className="public-page" style={pageStyle}>
      {page === 'signin' && <SignIn setCurrentPage={setCurrentPage} />}
      {page === 'signup' && <SignUp setCurrentPage={setCurrentPage} />}
      {page === 'landing' && <Landing setCurrentPage={setCurrentPage} />}
    </div>
  );
}

function MainLayout() {
  const [currentPage, setCurrentPage] = useState('landing');
  const { isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (isAuthenticated && ['landing', 'signin', 'signup'].includes(currentPage)) {
      setCurrentPage('dashboard');
    }
  }, [isAuthenticated, currentPage]);

  // Public pages must not be rendered inside the authenticated row layout.
  // This prevents width: 0 and overflow: hidden from clipping Landing and SignIn.
  if (!isAuthenticated) {
    return <PublicPage page={currentPage} setCurrentPage={setCurrentPage} />;
  }

  const renderActiveView = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard setCurrentPage={setCurrentPage} />;
      case 'customers':
        return <Customers />;
      case 'subscriptions':
        return <Subscriptions />;
      case 'invoices':
        return <Invoices />;
      case 'payments':
        return <Payments />;
      case 'planchange':
        return <PlanChange />;
      case 'failed-payments':
        return <FailedPayments />;
      case 'refunds':
        return <Refunds />;
      case 'audit-logs':
        return <AuditLogs />;
      case 'profile':
        return <Profile setCurrentPage={setCurrentPage} />;
      default:
        return <Dashboard setCurrentPage={setCurrentPage} />;
    }
  };

  return (
    <div
      className="app-shell"
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '100dvh',
        minHeight: 0,
        overflow: 'hidden',
        background: 'var(--page-bg)',
        color: 'var(--text)',
        fontFamily: 'sans-serif',
      }}
    >
      <style>{globalScrollbarStyles}</style>

      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onLogout={logout}
      />

      <main
        className={`app-content${currentPage === 'dashboard' ? ' app-content--no-scrollbar' : ''}`}
        style={{
          flex: '1 1 auto',
          width: 0,
          minWidth: 0,
          height: '100dvh',
          minHeight: 0,
          overflowX: 'hidden',
          overflowY: 'auto',
          background: 'var(--page-bg)',
          color: 'var(--text)',
          padding: 20,
        }}
      >
        {renderActiveView()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Public routes for admin */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/" element={<Landing />} />

          {/* Customer portal routes */}
          <Route path="/customer/login" element={<CustomerAuth isSignUp={false} />} />
          <Route path="/customer/signup" element={<CustomerAuth isSignUp={true} />} />
          <Route path="/customer/dashboard" element={<CustomerDashboard />} />

          {/* Admin routes - protected by MainLayout */}
          <Route path="/*" element={<MainLayout />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}