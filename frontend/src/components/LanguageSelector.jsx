import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { Languages, ChevronDown, Check } from "lucide-react";

// All Indian languages + English
const LANGUAGES = [
  { code: "en",  name: "English",     native: "English",     flag: "🇬🇧" },
  { code: "hi",  name: "Hindi",       native: "हिन्दी",        flag: "🇮🇳" },
  { code: "bn",  name: "Bengali",     native: "বাংলা",         flag: "🇮🇳" },
  { code: "ta",  name: "Tamil",       native: "தமிழ்",         flag: "🇮🇳" },
  { code: "te",  name: "Telugu",      native: "తెలుగు",        flag: "🇮🇳" },
  { code: "mr",  name: "Marathi",     native: "मराठी",         flag: "🇮🇳" },
  { code: "gu",  name: "Gujarati",    native: "ગુજરાતી",       flag: "🇮🇳" },
  { code: "kn",  name: "Kannada",     native: "ಕನ್ನಡ",        flag: "🇮🇳" },
  { code: "ml",  name: "Malayalam",   native: "മലയാളം",        flag: "🇮🇳" },
  { code: "pa",  name: "Punjabi",     native: "ਪੰਜਾਬੀ",         flag: "🇮🇳" },
  { code: "ur",  name: "Urdu",        native: "اردو",         flag: "🇮🇳" },
  { code: "or",  name: "Odia",        native: "ଓଡ଼ିଆ",         flag: "🇮🇳" },
  { code: "as",  name: "Assamese",    native: "অসমীয়া",         flag: "🇮🇳" },
  { code: "sd",  name: "Sindhi",      native: "سنڌي",         flag: "🇮🇳" },
  { code: "sa",  name: "Sanskrit",    native: "संस्कृतम्",      flag: "🇮🇳" },
  { code: "ks",  name: "Kashmiri",    native: "कॉशुर",     flag: "🇮🇳" },
  { code: "ne",  name: "Nepali",      native: "नेपाली",         flag: "🇮🇳" },
  { code: "mai", name: "Maithili",    native: "मैथिली",         flag: "🇮🇳" },
  { code: "bho", name: "Bhojpuri",    native: "भोजपुरी",        flag: "🇮🇳" },
  { code: "doi", name: "Dogri",       native: "डोगरी",          flag: "🇮🇳" },
  { code: "mni", name: "Manipuri",    native: "মণিপুরী",       flag: "🇮🇳" },
  { code: "sat", name: "Santali",     native: "ᱥᱟᱱᱛᱟᱲᱤ",      flag: "🇮🇳" },
];

export default function LanguageSelector() {
  const { languageCode, nativeName, changeLanguage, loading } = useLanguage();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Flash animation when language changes
  useEffect(() => {
    if (selected) {
      const timer = setTimeout(() => setSelected(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [selected]);

  const handleSelect = (code) => {
    // Change language immediately (client-side)
    changeLanguage(code);
    setOpen(false);
    setSelected(true);
  };

  const currentLang = LANGUAGES.find((l) => l.code === languageCode) || LANGUAGES[0];

  // Theme colors
  const COLORS = {
    gold: "#C5A059",
    goldLight: "#F5ECD8",
    goldDark: "#D4B76A",
    cream: "#FDFBF7",
    cardBg: "#FFFFFF",
    border: "#F0E6D2",
    text: "#2B2420",
    muted: "#7A7A7A",
    success: "#10B981",
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      {/* Language Button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 14px",
          background: selected ? "#DCFCE7" : (open ? COLORS.goldLight : "transparent"),
          border: `1px solid ${selected ? COLORS.success : (open ? COLORS.gold : COLORS.border)}`,
          borderRadius: 10,
          cursor: "pointer",
          transition: "all 0.3s",
          color: selected ? COLORS.success : COLORS.text,
          fontSize: 13,
          fontWeight: 600,
        }}
        onClick={() => setOpen(!open)}
      >
        <Languages size={16} style={{ color: selected ? COLORS.success : COLORS.gold }} />
        <span>{currentLang.flag}</span>
        <span>{currentLang.native}</span>
        <ChevronDown
          size={14}
          style={{
            color: COLORS.muted,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 280,
            maxHeight: 400,
            overflowY: "auto",
            background: COLORS.cardBg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 14,
            boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
            zIndex: 9999,
            padding: 6,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "10px 14px",
              borderBottom: `1px solid ${COLORS.border}`,
              fontSize: 11,
              fontWeight: 700,
              color: COLORS.muted,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            Select Language
          </div>

          {/* Language List — using onMouseDown to prevent dropdown closing before click */}
          {LANGUAGES.map((lang) => {
            const isActive = languageCode === lang.code;
            return (
              <div
                key={lang.code}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevents mousedown from bubbling to document
                  handleSelect(lang.code);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 14px",
                  background: isActive ? COLORS.goldLight : "transparent",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  color: COLORS.text,
                  fontSize: 13,
                  textAlign: "left",
                  userSelect: "none",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "#FAFAF5";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{lang.flag}</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{lang.native}</div>
                    <div style={{ fontSize: 11, color: COLORS.muted }}>{lang.name}</div>
                  </div>
                </div>
                {isActive && (
                  <Check size={16} style={{ color: COLORS.gold }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
