import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = `http://${window.location.hostname}:8000`;

const getAuthHeaders = () => ({
  "Authorization": `Bearer ${localStorage.getItem("customer_token")}`,
  "Content-Type": "application/json",
});

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customer, setCustomer] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    // Check if customer is logged in
    const token = localStorage.getItem('customer_token');
    if (!token) {
      navigate('/customer/login');
      return;
    }
    loadDashboardData();
  }, [navigate]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [profileRes, subsRes, invoicesRes, plansRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/customer/portal/profile`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/api/v1/customer/portal/subscriptions`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/api/v1/customer/portal/invoices`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/api/v1/customer/portal/plans`, { headers: getAuthHeaders() }),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setCustomer(data);
      } else if (profileRes.status === 401) {
        localStorage.removeItem('customer_token');
        localStorage.removeItem('customer_refresh_token');
        navigate('/customer/login');
        return;
      }

      if (subsRes.ok) {
        const data = await subsRes.json();
        setSubscriptions(Array.isArray(data) ? data : []);
      }

      if (invoicesRes.ok) {
        const data = await invoicesRes.json();
        setInvoices(Array.isArray(data) ? data : []);
      }

      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_refresh_token');
    navigate('/customer/login');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F9F2E6',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40,
            height: 40,
            border: '3px solid #F3EFE6',
            borderTopColor: '#C5A059',
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#6B6153', fontSize: 16 }}>Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F9F2E6',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          textAlign: 'center',
          maxWidth: 400
        }}>
          <div style={{ color: '#EF4444', marginBottom: 16 }}>⚠️ {error}</div>
          <button
            onClick={loadDashboardData}
            style={{
              background: '#C5A059',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const activeSubscription = subscriptions.find(s => s.status === 'active' || s.status === 'trial');
  const currentPlan = activeSubscription?.plan;
  const nextInvoice = invoices.find(i => i.status === 'unpaid' || i.status === 'pending');

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F9F2E6',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #F3EFE6',
        padding: '16px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #C5A059 0%, #DFBA73 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            color: 'white',
            fontSize: 18
          }}>
            BE
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#2B2420' }}>
            Customer Portal
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#6B6153', fontSize: 14 }}>
            {customer?.name || 'Customer'}
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid #E6E0D4',
              color: '#6B6153',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#C5A059'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E6E0D4'}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Welcome Section */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700, color: '#2B2420' }}>
            Welcome back, {customer?.name?.split(' ')[0] || 'there'}!
          </h2>
          <p style={{ margin: 0, color: '#6B6153', fontSize: 16 }}>
            Manage your subscriptions, view invoices, and update your account.
          </p>
        </section>

        {/* Current Plan Card */}
        <section style={{ marginBottom: '32px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#2B2420' }}>
            Current Plan
          </h3>
          {activeSubscription ? (
            <div style={{
              background: 'white',
              border: '1px solid #E6E0D4',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 2px 12px rgba(197,160,89,0.08)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: 12,
                    fontWeight: 600,
                    background: currentPlan?.billing_interval === 'annual' ? '#E8F5E9' : '#FFF3E0',
                    color: currentPlan?.billing_interval === 'annual' ? '#2E7D32' : '#E65100',
                    marginBottom: 12
                  }}>
                    {activeSubscription.status === 'trial' ? '🧪 Trial' : '✓ Active'}
                    <span style={{ textTransform: 'capitalize' }}>{activeSubscription.status}</span>
                  </div>
                  <h4 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#2B2420' }}>
                    {currentPlan?.name || 'Unknown Plan'}
                  </h4>
                  <p style={{ margin: 0, color: '#6B6153' }}>
                    {currentPlan?.billing_interval === 'annual' ? 'Billed yearly' : 'Billed monthly'}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#C5A059' }}>
                    {currentPlan?.price ? `₹${Number(currentPlan.price).toLocaleString('en-IN')}` : '—'}
                  </div>
                  <div style={{ fontSize: 14, color: '#6B6153' }}>
                    /{currentPlan?.billing_interval === 'annual' ? 'year' : 'month'}
                  </div>
                </div>
              </div>
              {currentPlan?.features && currentPlan.features.length > 0 && (
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #F3EFE6' }}>
                  <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#2B2420' }}>
                    Included Features
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {currentPlan.features.map((feature, i) => (
                      <span
                        key={i}
                        style={{
                          background: '#FDFBF7',
                          border: '1px solid #E6E0D4',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: 13,
                          color: '#4A4438'
                        }}
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #F3EFE6', display: 'flex', gap: 12 }}>
                <button style={{
                  background: '#C5A059',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}>
                  View Details
                </button>
                {plans.length > 1 && (
                  <button style={{
                    background: 'transparent',
                    color: '#C5A059',
                    border: '1px solid #C5A059',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}>
                    Change Plan
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{
              background: 'white',
              border: '2px dashed #E6E0D4',
              borderRadius: '16px',
              padding: '40px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
              <h4 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600, color: '#2B2420' }}>
                No Active Subscription
              </h4>
              <p style={{ margin: '0 0 20px', color: '#6B6153' }}>
                You don't have an active subscription yet.
              </p>
              {plans.length > 0 && (
                <button style={{
                  background: '#C5A059',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}>
                  Browse Plans
                </button>
              )}
            </div>
          )}
        </section>

        {/* Quick Stats */}
        <section style={{ marginBottom: '32px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#2B2420' }}>
            Overview
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div style={{
              background: 'white',
              border: '1px solid #E6E0D4',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6B6153', fontWeight: 500 }}>
                Active Subscriptions
              </p>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#2B2420' }}>
                {subscriptions.filter(s => s.status === 'active').length}
              </p>
            </div>
            <div style={{
              background: 'white',
              border: '1px solid #E6E0D4',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6B6153', fontWeight: 500 }}>
                Total Invoices
              </p>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#2B2420' }}>
                {invoices.length}
              </p>
            </div>
            <div style={{
              background: 'white',
              border: '1px solid #E6E0D4',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6B6153', fontWeight: 500 }}>
                Unpaid Invoices
              </p>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#EF4444' }}>
                {invoices.filter(i => i.status === 'unpaid').length}
              </p>
            </div>
            <div style={{
              background: 'white',
              border: '1px solid #E6E0D4',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6B6153', fontWeight: 500 }}>
                Next Payment Due
              </p>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#2B2420' }}>
                {nextInvoice ? new Date(nextInvoice.due_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '—'}
              </p>
            </div>
          </div>
        </section>

        {/* Recent Invoices */}
        <section style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#2B2420' }}>
              Recent Invoices
            </h3>
            <button style={{
              background: 'transparent',
              color: '#C5A059',
              border: 'none',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}>
              View All
            </button>
          </div>
          {invoices.length > 0 ? (
            <div style={{
              background: 'white',
              border: '1px solid #E6E0D4',
              borderRadius: '16px',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FDFBF7' }}>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B6153', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Invoice #
                    </th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B6153', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Date
                    </th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B6153', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Due Date
                    </th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B6153', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Amount
                    </th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B6153', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.slice(0, 5).map((invoice, i) => (
                    <tr key={invoice.id} style={{ borderTop: '1px solid #F3EFE6' }}>
                      <td style={{ padding: '16px', fontSize: 14, fontWeight: 500, color: '#2B2420' }}>
                        {invoice.invoice_number}
                      </td>
                      <td style={{ padding: '16px', fontSize: 14, color: '#6B6153' }}>
                        {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td style={{ padding: '16px', fontSize: 14, color: '#6B6153' }}>
                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td style={{ padding: '16px', fontSize: 14, fontWeight: 600, color: '#2B2420' }}>
                        ₹{invoice.total_amount ? Number(invoice.total_amount).toLocaleString('en-IN') : '0'}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: 12,
                          fontWeight: 600,
                          background: invoice.status === 'paid' ? '#E8F5E9' : invoice.status === 'unpaid' ? '#FEF3C7' : '#F3EFE6',
                          color: invoice.status === 'paid' ? '#2E7D32' : invoice.status === 'unpaid' ? '#B45309' : '#6B6153'
                        }}>
                          {invoice.status === 'paid' && '✓'}
                          {invoice.status === 'unpaid' && '⏳'}
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{
              background: 'white',
              border: '1px solid #E6E0D4',
              borderRadius: '16px',
              padding: '40px',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, color: '#6B6153' }}>No invoices yet</p>
            </div>
          )}
        </section>

        {/* Available Plans */}
        {plans.length > 0 && (
          <section>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#2B2420' }}>
              Available Plans
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  style={{
                    background: 'white',
                    border: `1px solid ${currentPlan?.id === plan.id ? '#C5A059' : '#E6E0D4'}`,
                    borderRadius: '16px',
                    padding: '24px',
                    position: 'relative',
                    boxShadow: currentPlan?.id === plan.id ? '0 4px 20px rgba(197,160,89,0.15)' : '0 2px 8px rgba(0,0,0,0.04)'
                  }}
                >
                  {currentPlan?.id === plan.id && (
                    <div style={{
                      position: 'absolute',
                      top: -10,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#C5A059',
                      color: 'white',
                      padding: '4px 16px',
                      borderRadius: '20px',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.5
                    }}>
                      Current Plan
                    </div>
                  )}
                  <h4 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: '#2B2420' }}>
                    {plan.name}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: '#C5A059' }}>
                      ₹{Number(plan.price).toLocaleString('en-IN')}
                    </span>
                    <span style={{ fontSize: 14, color: '#6B6153' }}>
                      /{plan.billing_interval === 'annual' ? 'year' : 'month'}
                    </span>
                  </div>
                  {plan.features && plan.features.length > 0 && (
                    <ul style={{ margin: '16px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {plan.features.slice(0, 5).map((feature, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#4A4438' }}>
                          <span style={{ color: '#C5A059' }}>✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        background: 'white',
        borderTop: '1px solid #F3EFE6',
        padding: '24px 32px',
        textAlign: 'center',
        color: '#6B6153',
        fontSize: 14
      }}>
        © 2024 BillingEngine. All rights reserved.
      </footer>
    </div>
  );
}