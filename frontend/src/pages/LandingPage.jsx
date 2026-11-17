import { useNavigate } from "react-router-dom";
import React from "react";

export default function Landing() {
  const navigate = useNavigate();

  const features = [
    { icon: "🔄", title: "Subscription Management", desc: "Create, upgrade, downgrade, and cancel subscriptions with automated billing cycles and plan changes." },
    { icon: "📄", title: "Invoice Generation", desc: "Auto-generate professional invoices with custom branding, tax calculations, and PDF downloads." },
    { icon: "💳", title: "Payment Tracking", desc: "Monitor all payments, track failed recoveries, and manage refunds from a single dashboard." },
    { icon: "📊", title: "Revenue Analytics", desc: "Track MRR, active subscribers, plan distribution, and financial trends with visual charts." },
    { icon: "👥", title: "Customer Portal", desc: "Give your customers a self-service portal to view invoices, manage subscriptions, and update payment methods." },
    { icon: "🔐", title: "Secure Auth", desc: "JWT-based authentication with role-based access control, audit logs, and session management." },
  ];

  const plans = [
    {
      name: "Basic",
      desc: "For startups and small teams",
      price: "499",
      period: "Billed monthly",
      featured: false,
      features: ["Up to 50 subscribers", "Auto invoice generation", "Basic payment tracking", "Email support", "Standard reports"],
    },
    {
      name: "Professional",
      desc: "For growing SaaS businesses",
      price: "999",
      period: "Billed monthly",
      featured: true,
      features: ["Up to 500 subscribers", "Advanced analytics dashboard", "Custom invoice templates", "Refund management", "Priority support", "Audit logs"],
    },
    {
      name: "Enterprise",
      desc: "For large-scale operations",
      price: "2,499",
      period: "Billed monthly",
      featured: false,
      features: ["Unlimited subscribers", "Full API access", "Multi-tenant support", "Custom billing cycles", "Dedicated account manager", "SLA guarantee"],
    },
  ];

  const stats = [
    { value: "500+", label: "Active Businesses" },
    { value: "99.9%", label: "Uptime SLA" },
    { value: "₹2.4M", label: "Revenue Tracked" },
    { value: "24/7", label: "Support" },
  ];

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const responsiveStyles = (
    <style>{`
      * { box-sizing: border-box; }
      html, body { overflow-x: hidden; max-width: 100vw; }

      .nav-links { display: flex; align-items: center; gap: 28px; }
      .nav-hamburger { display: none; }
      .mobile-menu-panel { display: none; }

      @media (max-width: 860px) {
        .nav-links { display: none; }
        .nav-hamburger { display: flex; }
        nav { padding: 0 16px !important; }
        .mobile-menu-panel.open {
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 70px;
          left: 0;
          right: 0;
          background: #FDFBF7;
          border-bottom: 1px solid #F0E6D2;
          padding: 16px 20px 24px;
          gap: 4px;
          z-index: 99;
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        }

        section { padding-left: 20px !important; padding-right: 20px !important; }

        .hero-section { padding-top: 110px !important; padding-bottom: 60px !important; }
        .hero-title { font-size: 32px !important; }
        .hero-desc { font-size: 15px !important; }
        .hero-buttons { flex-direction: column !important; width: 100%; }
        .hero-buttons > * { width: 100%; text-align: center; }

        .stats-bar { flex-wrap: wrap !important; gap: 20px 32px !important; padding: 24px 16px !important; margin: 20px 16px !important; }

        .features-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
        .pricing-grid { grid-template-columns: 1fr !important; gap: 16px !important; }

        .footer-inner { flex-direction: column !important; gap: 28px !important; }
      }

      @media (max-width: 420px) {
        .hero-title { font-size: 26px !important; }
        .stat-value { font-size: 24px !important; }
      }
    `}</style>
  );

  return (
    <div style={{ background: "#FDFBF7", color: "#2B2420", fontFamily: "'Segoe UI', system-ui, sans-serif", overflowX: "hidden", maxWidth: "100vw" }}>
      {responsiveStyles}

      {/* ─── NAVBAR ─── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(253,251,247,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #F0E6D2", padding: "0 40px", height: 70,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#C5A059", letterSpacing: 0.5 }}>BillingEngine</span>
          <span style={{ fontSize: 14, fontWeight: 400, color: "#2B2420", marginLeft: 8 }}>SaaS Billing</span>
        </div>

        <div className="nav-links">
          <a href="#features" style={{ fontSize: 14, fontWeight: 500, color: "#7A7A7A", textDecoration: "none" }}>Features</a>
          <a href="#pricing" style={{ fontSize: 14, fontWeight: 500, color: "#7A7A7A", textDecoration: "none" }}>Pricing</a>
          <button
            onClick={() => navigate("/signin")}
            style={{ padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600, background: "transparent", color: "#2B2420", border: "1.5px solid #F0E6D2", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C5A059"; e.currentTarget.style.color = "#C5A059"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#F0E6D2"; e.currentTarget.style.color = "#2B2420"; }}
          >
            Sign In
          </button>
          <button
            onClick={() => navigate("/signup")}
            style={{ padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600, background: "#C5A059", color: "#fff", border: "none", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#D4B76A"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#C5A059"; }}
          >
            Get Started
          </button>
        </div>

        {/* Hamburger — mobile only */}
        <button
          className="nav-hamburger"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label="Toggle menu"
          style={{
            alignItems: "center", justifyContent: "center",
            width: 40, height: 40, borderRadius: 8,
            background: "transparent", border: "1.5px solid #F0E6D2",
            fontSize: 18, cursor: "pointer", color: "#2B2420",
          }}
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </button>
      </nav>

      {/* Mobile dropdown menu */}
      <div className={`mobile-menu-panel${mobileMenuOpen ? " open" : ""}`}>
        <a
          href="#features"
          onClick={() => setMobileMenuOpen(false)}
          style={{ fontSize: 15, fontWeight: 500, color: "#2B2420", textDecoration: "none", padding: "12px 4px", borderBottom: "1px solid #F0E6D2" }}
        >
          Features
        </a>
        <a
          href="#pricing"
          onClick={() => setMobileMenuOpen(false)}
          style={{ fontSize: 15, fontWeight: 500, color: "#2B2420", textDecoration: "none", padding: "12px 4px", borderBottom: "1px solid #F0E6D2" }}
        >
          Pricing
        </a>
        <button
          onClick={() => { setMobileMenuOpen(false); navigate("/signin"); }}
          style={{ margin: "12px 0 8px", padding: "12px", borderRadius: 10, fontSize: 15, fontWeight: 600, background: "transparent", color: "#2B2420", border: "1.5px solid #F0E6D2", cursor: "pointer" }}
        >
          Sign In
        </button>
        <button
          onClick={() => { setMobileMenuOpen(false); navigate("/signup"); }}
          style={{ padding: "12px", borderRadius: 10, fontSize: 15, fontWeight: 600, background: "#C5A059", color: "#fff", border: "none", cursor: "pointer" }}
        >
          Get Started
        </button>
      </div>

      {/* ─── HERO ─── */}
      <section className="hero-section" style={{ padding: "140px 40px 80px", textAlign: "center", maxWidth: 900, margin: "0 auto" }}>
        <span style={{
          display: "inline-block", background: "#F5ECD8", color: "#C5A059",
          fontSize: 13, fontWeight: 600, padding: "6px 16px", borderRadius: 20, marginBottom: 24,
        }}>
          Subscription Billing Platform
        </span>
        <h1 className="hero-title" style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.15, marginBottom: 20 }}>
          Manage Subscriptions,<br />
          <em style={{ fontStyle: "normal", color: "#C5A059" }}>Billing & Invoices</em> Effortlessly
        </h1>
        <p className="hero-desc" style={{ fontSize: 18, color: "#7A7A7A", maxWidth: 600, margin: "0 auto 36px", lineHeight: 1.7 }}>
          A complete billing engine for SaaS businesses. Automate subscriptions, track payments, generate invoices, and manage customer plans — all in one place.
        </p>
        <div className="hero-buttons" style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          <button
            onClick={() => navigate("/signup")}
            style={{ padding: "14px 32px", borderRadius: 12, fontSize: 16, fontWeight: 600, background: "#C5A059", color: "#fff", border: "none", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#D4B76A"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#C5A059"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            Start Free Trial
          </button>
          <a
            href="#features"
            style={{ padding: "14px 32px", borderRadius: 12, fontSize: 16, fontWeight: 600, background: "#fff", color: "#2B2420", border: "1.5px solid #F0E6D2", textDecoration: "none", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C5A059"; e.currentTarget.style.color = "#C5A059"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#F0E6D2"; e.currentTarget.style.color = "#2B2420"; }}
          >
            Learn More
          </a>
        </div>
      </section>

      {/* ─── STATS BAR ─── */}
      <div className="stats-bar" style={{
        display: "flex", justifyContent: "center", gap: 60,
        padding: 40, margin: "20px 40px",
        background: "#fff", borderRadius: 16,
        border: "1px solid #F0E6D2",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}>
        {stats.map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div className="stat-value" style={{ fontSize: 32, fontWeight: 800, color: "#C5A059" }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#7A7A7A", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ─── FEATURES ─── */}
      <section id="features" style={{ padding: "80px 40px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#C5A059", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Features</div>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#2B2420", marginBottom: 16 }}>Everything You Need to Bill</h2>
        <p style={{ fontSize: 16, color: "#7A7A7A", maxWidth: 560, marginBottom: 50 }}>
          From subscription management to invoice generation, we've got every billing workflow covered.
        </p>

        <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                background: "#fff", border: "1px solid #F0E6D2", borderRadius: 16, padding: 32,
                transition: "all 0.3s", cursor: "default",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 40px rgba(0,0,0,0.1)"; e.currentTarget.style.borderColor = "#F5ECD8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#F0E6D2"; }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: "#F5ECD8",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, marginBottom: 18,
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#2B2420", marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "#7A7A7A", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" style={{ padding: "80px 40px", background: "#FAF6EE" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#C5A059", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Pricing</div>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: "#2B2420", marginBottom: 16 }}>Simple, Transparent Pricing</h2>
          <p style={{ fontSize: 16, color: "#7A7A7A", maxWidth: 560, margin: "0 auto" }}>
            Choose the plan that fits your business. Upgrade or downgrade anytime.
          </p>

          <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginTop: 50 }}>
            {plans.map((p) => (
              <div
                key={p.name}
                style={{
                  background: "#fff", borderRadius: 20, padding: "36px 28px", textAlign: "left",
                  transition: "all 0.3s", position: "relative",
                  border: p.featured ? "2px solid #C5A059" : "1px solid #F0E6D2",
                  boxShadow: p.featured ? "0 8px 30px rgba(197,160,89,0.15)" : "none",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 40px rgba(0,0,0,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = p.featured ? "0 8px 30px rgba(197,160,89,0.15)" : "none"; }}
              >
                {p.featured && (
                  <span style={{
                    position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                    background: "#C5A059", color: "#fff", fontSize: 12, fontWeight: 600,
                    padding: "4px 16px", borderRadius: 20,
                  }}>
                    Most Popular
                  </span>
                )}
                <div style={{ fontSize: 18, fontWeight: 700, color: "#2B2420", marginBottom: 8 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: "#7A7A7A", marginBottom: 20 }}>{p.desc}</div>
                <div style={{ fontSize: 40, fontWeight: 800, color: "#C5A059" }}>
                  ₹{p.price}<span style={{ fontSize: 16, fontWeight: 400, color: "#7A7A7A" }}>/mo</span>
                </div>
                <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 24 }}>{p.period}</div>
                <ul style={{ listStyle: "none", marginBottom: 28 }}>
                  {p.features.map((f) => (
                    <li key={f} style={{ fontSize: 14, color: "#2B2420", padding: "8px 0", borderBottom: "1px solid #F0E6D2" }}>
                      <span style={{ color: "#C5A059", fontWeight: 700, marginRight: 6 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate("/signup")}
                  style={{
                    display: "block", width: "100%", padding: 14, borderRadius: 12,
                    fontSize: 15, fontWeight: 600, textAlign: "center", cursor: "pointer",
                    background: p.featured ? "#C5A059" : "transparent",
                    color: p.featured ? "#fff" : "#2B2420",
                    border: p.featured ? "none" : "1.5px solid #F0E6D2",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (p.featured) e.currentTarget.style.background = "#D4B76A";
                    else { e.currentTarget.style.borderColor = "#C5A059"; e.currentTarget.style.color = "#C5A059"; }
                  }}
                  onMouseLeave={(e) => {
                    if (p.featured) e.currentTarget.style.background = "#C5A059";
                    else { e.currentTarget.style.borderColor = "#F0E6D2"; e.currentTarget.style.color = "#2B2420"; }
                  }}
                >
                  {p.name === "Enterprise" ? "Contact Sales" : "Get Started"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section style={{ padding: "80px 40px", textAlign: "center", maxWidth: 700, margin: "0 auto" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#2B2420", marginBottom: 16 }}>
          Ready to Simplify Your Billing?
        </h2>
        <p style={{ fontSize: 16, color: "#7A7A7A", marginBottom: 32 }}>
          Join hundreds of businesses already using BillingEngine to manage their subscriptions and revenue.
        </p>
        <button
          onClick={() => navigate("/signup")}
          style={{ padding: "14px 32px", borderRadius: 12, fontSize: 16, fontWeight: 600, background: "#C5A059", color: "#fff", border: "none", cursor: "pointer", transition: "all 0.2s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#D4B76A"; e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#C5A059"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          Start Your Free Trial
        </button>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ background: "#181F2C", color: "#9CA3AF", padding: "50px 40px 30px" }}>
        <div className="footer-inner" style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#C5A059", marginBottom: 8 }}>BillingEngine</div>
            <p style={{ fontSize: 13, maxWidth: 280, lineHeight: 1.6 }}>
              The complete SaaS billing platform. Manage subscriptions, invoices, and payments with ease.
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 12 }}>Product</h4>
            <a href="#features" style={{ display: "block", fontSize: 13, color: "#9CA3AF", padding: "4px 0", textDecoration: "none" }}>Features</a>
            <a href="#pricing" style={{ display: "block", fontSize: 13, color: "#9CA3AF", padding: "4px 0", textDecoration: "none" }}>Pricing</a>
            <a href="#" style={{ display: "block", fontSize: 13, color: "#9CA3AF", padding: "4px 0", textDecoration: "none" }}>Documentation</a>
          </div>
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 12 }}>Company</h4>
            <a href="#" style={{ display: "block", fontSize: 13, color: "#9CA3AF", padding: "4px 0", textDecoration: "none" }}>About Us</a>
            <a href="#" style={{ display: "block", fontSize: 13, color: "#9CA3AF", padding: "4px 0", textDecoration: "none" }}>Careers</a>
            <a href="#" style={{ display: "block", fontSize: 13, color: "#9CA3AF", padding: "4px 0", textDecoration: "none" }}>Contact</a>
          </div>
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 12 }}>Legal</h4>
            <a href="#" style={{ display: "block", fontSize: 13, color: "#9CA3AF", padding: "4px 0", textDecoration: "none" }}>Privacy Policy</a>
            <a href="#" style={{ display: "block", fontSize: 13, color: "#9CA3AF", padding: "4px 0", textDecoration: "none" }}>Terms of Service</a>
          </div>
        </div>
        <div style={{
          maxWidth: 1100, margin: "30px auto 0", paddingTop: 20,
          borderTop: "1px solid #283346", fontSize: 12, textAlign: "center",
        }}>
          &copy; 2026 BillingEngine. All rights reserved.
        </div>
      </footer>

    </div>
  );
}
