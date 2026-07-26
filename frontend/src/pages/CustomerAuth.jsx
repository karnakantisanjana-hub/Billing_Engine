import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CustomerAuth({ isSignUp = false }) {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', rememberMe: false });

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/customer/dashboard');
    }, 800);
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
              className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#E6E0D4] rounded-xl focus:outline-none focus:border-[#C5A059] text-sm transition-all"
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