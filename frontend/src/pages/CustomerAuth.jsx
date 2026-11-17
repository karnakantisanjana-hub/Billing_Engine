import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = `http://${window.location.hostname}:8000`;

export default function CustomerAuth({ isSignUp = false }) {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', password: '', rememberMe: false });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isSignUp ? '/api/v1/customer/auth/register' : '/api/v1/customer/auth/login';
      const payload = isSignUp
        ? { name: formData.name, email: formData.email, password: formData.password }
        : { email: formData.email, password: formData.password };

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || data.message || 'Authentication failed');
      }

      // Store token for customer portal
      localStorage.setItem('customer_token', data.access_token);
      localStorage.setItem('customer_refresh_token', data.refresh_token);

      navigate('/customer/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-[#F3EFE6] rounded-3xl p-8 shadow-xl shadow-[#C5A059]/5">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold bg-gradient-to-r from-[#C5A059] to-[#DFBA73] bg-clip-text text-transparent">
            BillingEngine
          </span>
          <h2 className="text-xl font-bold text-[#1A1A1A] mt-2">
            {isSignUp ? 'Create your portal account' : 'Customer Portal Login'}
          </h2>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#666666] mb-2">Full Name</label>
              <input
                type="text" required
                className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#E6E0D4] rounded-xl focus:outline-none focus:border-[#C5A059] text-sm transition-all"
                placeholder="Alex Mercer"
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#666666] mb-2">Email Address</label>
            <input
              type="email" required
              className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#E6E0D4] rounded-xl focus:outline-none focus:border-[#C5A059] text-sm transition-all sequential-input"
              placeholder="name@company.com"
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#666666] mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"} required
                className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#E6E0D4] rounded-xl focus:outline-none focus:border-[#C5A059] text-sm transition-all sequential-input"
                placeholder="••••••••"
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-xs font-medium text-[#B38F48] hover:text-[#C5A059]"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center space-x-2 text-[#666666] cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-[#E6E0D4] text-[#C5A059] focus:ring-[#C5A059]"
                onChange={e => setFormData({...formData, rememberMe: e.target.checked})}
              />
              <span>Keep me signed in</span>
            </label>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-3.5 bg-[#C5A059] text-white rounded-xl font-semibold hover:bg-[#B38F48] transition-all shadow-md shadow-[#C5A059]/10 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>{isSignUp ? 'Get Started' : 'Enter Portal'}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}