// ═══════════════════════════════════════════════════════════════════
// InstallPWA.jsx — PWA Install Prompt Component
// Place this in your src/components/ folder
// ═══════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from "react";

function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the PWA install prompt");
    }

    setDeferredPrompt(null);
    setShowInstall(false);
  };

  const handleDismiss = () => {
    setShowInstall(false);
  };

  if (!showInstall) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        background: "#FAF6EE",
        borderRadius: 16,
        padding: "16px 20px",
        boxShadow: "8px 8px 16px rgba(163,150,128,0.25), -8px -8px 16px rgba(255,255,255,0.7)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        zIndex: 9999,
        maxWidth: 360,
        border: "1px solid rgba(197,160,89,0.15)",
      }}
    >
      <div style={{ fontSize: 24 }}>📲</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: "#2B2420" }}>
          Install BillingEngine
        </div>
        <div style={{ fontSize: 12, color: "#8A7F6D", marginTop: 2 }}>
          Add to home screen for quick access
        </div>
      </div>
      <button
        onClick={handleInstall}
        style={{
          padding: "8px 16px",
          background: "#C5A059",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        style={{
          background: "none",
          border: "none",
          color: "#8A7F6D",
          fontSize: 18,
          cursor: "pointer",
          padding: "4px 8px",
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}

export default InstallPWA;
