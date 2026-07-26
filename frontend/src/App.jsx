import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import SignIn from "./pages/SignIn.jsx";
import Invoices from "./pages/Invoices.jsx";
import Payments from "./pages/Payments.jsx";
import Refunds from "./pages/Refunds.jsx";
import FailedPayments from "./pages/FailedPayments.jsx";
import Subscriptions from "./pages/Subscriptions.jsx";
import BillingCycles from "./pages/BillingCycles.jsx";
import Customers from "./pages/Customers.jsx";
import PlanChange from "./pages/PlanChange.jsx";
import AuditLogs from "./pages/AuditLogs.jsx";
import Profile from "./pages/Profile.jsx";
import Landing from "./pages/LandingPage.jsx";
import SignUp from "./pages/SignUp.jsx";

function MainLayout() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { isAuthenticated, logout } = useAuth();


  if (!isAuthenticated) {
    if (currentPage !== 'landing' && currentPage !== 'signup' && currentPage !== 'signin') {
      // Default to landing page when not authenticated
      return <Landing setCurrentPage={setCurrentPage} />;
    }
  }


  const renderActiveView = () => {
    switch (currentPage) {
      case 'landing':
        return <Landing setCurrentPage={setCurrentPage} />;
      case 'signup':
        return <SignUp setCurrentPage={setCurrentPage} />;
      case 'dashboard':
        return <Dashboard setCurrentPage={setCurrentPage} />;
      case 'customers':
        return <Customers />;
      case 'subscriptions':
        return <Subscriptions />;
      case 'billing-cycles':
        return <BillingCycles />;
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
      case 'signin':
        return <SignIn />;
      default:
        return <Dashboard setCurrentPage={setCurrentPage} />;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        width: "100vw",
        height: "100vh",
        background: "#FDFBF7",
        overflow: "hidden",
        color: "#333333",
        fontFamily: "sans-serif",
      }}
    >
      {isAuthenticated && (
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} onLogout={logout} />
      )}

      <div
        style={{
          flex: 1,
          minWidth: 0,
          overflowY: "auto",
          background: "white",
          padding: isAuthenticated ? 20 : 0,
        }}
      >
        {renderActiveView()}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
