import React, { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { API_BASE_URL, useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext.jsx";

export default function Profile({ setCurrentPage }) {
  const { getAuthHeaders, getAuthHeadersMultipart } = useAuth();
  const { t } = useLanguage();
  const { theme, colors: C } = useTheme();

  const profileColors = {
    bg: C.bg,
    card: C.card,
    heading: C.heading,
    text: C.text,
    muted: C.muted,
    border: C.border,
    gold: C.gold,
    goldLight: C.goldBannerEnd,
    goldSoft: C.goldSoft,
    shadowLo: C.shadowLo,
    shadowHi: C.shadowHi,
    inputDisabled: theme === 'dark' ? '#242033' : '#E6DFD2',
  };

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    username: "",
    role: "",
    created_at: "",
    profile_picture: "",
  });

  const [previewImage, setPreviewImage] = useState("");

  const [passwords, setPasswords] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        console.error("Failed to load profile:", response.status);
        return;
      }

      const data = await response.json();
      console.log("Profile data:", data);
      setProfile({
        name: data.name || data.full_name || "",
        email: data.email || "",
        username: data.username || "",
        role: data.role || "",
        created_at: data.created_at || "",
        profile_picture: data.profile_picture || "",
      });
      if (data.profile_picture) {
        setPreviewImage(`${API_BASE_URL}${data.profile_picture}`);
      }
    } catch (err) {
      console.error("Profile load error:", err);
    }
  }

  function extractErrorMessage(data, fallback) {
    if (!data) return fallback;
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail.map((d) => d.msg || JSON.stringify(d)).join(", ");
    }
    if (data.detail && typeof data.detail === "object") {
      return data.detail.msg || JSON.stringify(data.detail);
    }
    return fallback;
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreviewImage(ev.target.result);
    };
    reader.readAsDataURL(file);

    // Upload to server
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/picture`, {
        method: "POST",
        headers: {
          ...getAuthHeadersMultipart(), // Only Authorization — browser sets multipart Content-Type/boundary
        },
        body: formData,
      });

      let data = null;
      try {
        data = await response.json();
      } catch (parseErr) {
        console.error("Failed to parse upload response:", parseErr);
      }

      if (response.ok) {
        alert(t('profile.picture_updated', 'Profile picture updated successfully!'));
        setProfile({ ...profile, profile_picture: data?.url || profile.profile_picture });
      } else {
        console.error("Upload failed:", data);
        alert(extractErrorMessage(data, t('profile.picture_upload_failed', 'Failed to upload picture.')));
        setPreviewImage(""); // Reset preview on error
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert(t('profile.picture_upload_failed', 'Failed to upload picture.'));
    }
  }

  async function saveProfile() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
        }),
      });

      if (response.ok) {
        alert(t('profile.updated_success', 'Profile updated successfully.'));
      } else {
        alert(t('profile.update_failed', 'Failed to update profile.'));
      }
    } catch (err) {
      console.error("Save profile error:", err);
    }
  }

  async function changePassword() {
    if (passwords.new_password !== passwords.confirm_password) {
      alert(t('profile.passwords_mismatch', 'Passwords do not match'));
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/change-password`, {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          current_password: passwords.current_password,
          new_password: passwords.new_password,
        }),
      });

      if (response.ok) {
        alert(t('profile.password_updated', 'Password updated successfully.'));
        setPasswords({
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
      } else {
        alert(t('profile.password_incorrect', 'Current password is incorrect.'));
      }
    } catch (err) {
      console.error("Change password error:", err);
    }
  }

  return (
    <div
      style={{
        padding: "40px",
        background: profileColors.bg,
        minHeight: "100vh",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* ─── NEUMORPHIC GLOBAL STYLES ─── */}
      <style>{`
        .neu-card {
          background: ${profileColors.card};
          border-radius: 20px;
          box-shadow: 8px 8px 18px ${profileColors.shadowLo}, -8px -8px 18px ${profileColors.shadowHi};
          padding: 30px;
        }
        .neu-input {
          width: 100%; padding: 12px 16px; border: none !important; border-radius: 12px;
          font-size: 14px; background-color: ${profileColors.bg}; color: ${profileColors.heading};
          outline: none; box-sizing: border-box;
          box-shadow: inset 3px 3px 6px ${profileColors.shadowLo}, inset -3px -3px 6px ${profileColors.shadowHi};
          transition: all 0.25s ease; margin-top: 6px; margin-bottom: 18px;
        }
        .neu-input:focus {
          box-shadow: inset 4px 4px 8px ${profileColors.shadowLo}, inset -4px -4px 8px ${profileColors.shadowHi};
        }
        .neu-input-disabled {
          background-color: ${profileColors.inputDisabled} !important;
          color: ${profileColors.muted} !important; cursor: not-allowed;
          box-shadow: inset 2px 2px 5px ${profileColors.shadowLo}, inset -2px -2px 5px ${profileColors.shadowHi} !important;
        }
        .neu-btn-gold {
          padding: 12px 24px; background: ${profileColors.gold}; color: #ffffff; border: none;
          border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; letter-spacing: 0.3px;
          box-shadow: 5px 5px 12px ${profileColors.shadowLo}, -5px -5px 12px ${profileColors.shadowHi}; transition: all 0.2s ease;
        }
        .neu-btn-gold:hover { background: ${profileColors.goldLight}; transform: translateY(-1px); }
        .neu-btn-gold:active { transform: translateY(1px); }
        .neu-btn-secondary {
          padding: 12px 24px; background: ${profileColors.muted}; color: #ffffff; border: none;
          border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer;
          box-shadow: 5px 5px 12px ${profileColors.shadowLo}, -5px -5px 12px ${profileColors.shadowHi};
          transition: all 0.2s ease; margin-left: 10px;
        }
        .neu-btn-secondary:hover { opacity: 0.85; transform: translateY(-1px); }
        .neu-camera-btn {
          position: absolute; bottom: 0; right: 0; width: 36px; height: 36px; border-radius: 50%;
          background: ${profileColors.gold}; color: #ffffff; display: flex; align-items: center; justify-content: center;
          cursor: pointer; box-shadow: 3px 3px 8px ${profileColors.shadowLo}, -3px -3px 8px ${profileColors.shadowHi}; transition: all 0.2s ease;
        }
        .neu-camera-btn:hover { background: ${profileColors.goldLight}; transform: scale(1.05); }
      `}</style>

      {/* ─── PAGE HEADER ─── */}
      <h1 style={{ fontSize: 32, fontWeight: 800, color: profileColors.heading, margin: 0 }}>
        {t('profile.page_title', 'Profile')}
      </h1>
      <p style={{ color: profileColors.muted, fontSize: 14, marginTop: 6, marginBottom: 30 }}>
        {t('profile.page_subtitle', 'Manage your account information and security.')}
      </p>

      {/* ─── MAIN GRID LAYOUT ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 30,
        }}
      >
        {/* ─── LEFT PANEL (PERSONAL INFORMATION) ─── */}
        <div className="neu-card">
          <h2
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: profileColors.heading,
              marginBottom: 24,
            }}
          >
            {t('profile.personal_info', 'Personal Information')}
          </h2>

          <label style={{ fontSize: 13, fontWeight: 700, color: profileColors.heading, paddingLeft: 2 }}>
            {t('profile.full_name', 'Full Name')}
          </label>
          <input
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            className="neu-input"
          />

          <label style={{ fontSize: 13, fontWeight: 700, color: profileColors.heading, paddingLeft: 2 }}>
            {t('profile.email', 'Email')}
          </label>
          <input
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            className="neu-input"
          />

          <label style={{ fontSize: 13, fontWeight: 700, color: profileColors.heading, paddingLeft: 2 }}>
            {t('profile.username', 'Username')}
          </label>
          <input
            value={profile.username || ""}
            disabled
            className="neu-input neu-input-disabled"
          />

          <label style={{ fontSize: 13, fontWeight: 700, color: profileColors.heading, paddingLeft: 2 }}>
            {t('profile.role', 'Role')}
          </label>
          <input
            value={profile.role || ""}
            disabled
            className="neu-input neu-input-disabled"
          />

          <label style={{ fontSize: 13, fontWeight: 700, color: profileColors.heading, paddingLeft: 2 }}>
            {t('profile.member_since', 'Member Since')}
          </label>
          <input
            value={profile.created_at || ""}
            disabled
            className="neu-input neu-input-disabled"
          />

          <div style={{ marginTop: 10 }}>
            <button className="neu-btn-gold" onClick={saveProfile}>
              {t('profile.save_changes', 'Save Changes')}
            </button>
            {setCurrentPage && (
              <button
                className="neu-btn-secondary"
                onClick={() => setCurrentPage("dashboard")}
              >
                {t('profile.back_to_dashboard', 'Back to Dashboard')}
              </button>
            )}
          </div>
        </div>

        {/* ─── RIGHT PANEL (AVATAR & PASSWORD) ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          {/* AVATAR CARD */}
          <div className="neu-card" style={{ textAlign: "center" }}>
            {/* Neumorphic Avatar Container */}
            <div
              style={{
                position: "relative",
                width: 110,
                height: 110,
                margin: "0 auto",
              }}
            >
              {previewImage ? (
                <img
                  src={previewImage}
                  alt="Profile"
                  style={{
                    width: 110,
                    height: 110,
                    borderRadius: "50%",
                    objectFit: "cover",
                    boxShadow: `5px 5px 12px ${profileColors.shadowLo}, -5px -5px 12px ${profileColors.shadowHi}`,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 110,
                    height: 110,
                    borderRadius: "50%",
                    background: profileColors.bg,
                    color: profileColors.gold,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 42,
                    fontWeight: 800,
                    boxShadow: `inset 4px 4px 8px ${profileColors.shadowLo}, inset -4px -4px 8px ${profileColors.shadowHi}`,
                  }}
                >
                  {profile.name ? profile.name.charAt(0).toUpperCase() : "U"}
                </div>
              )}

              {/* Camera Upload Button */}
              <label className="neu-camera-btn">
                <Camera size={16} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: "none" }}
                />
              </label>
            </div>

            <h2
              style={{
                marginTop: 18,
                marginBottom: 4,
                fontSize: 20,
                fontWeight: 800,
                color: profileColors.heading,
              }}
            >
              {profile.name || t('profile.default_user', 'User')}
            </h2>
            <p style={{ color: profileColors.muted, fontSize: 13, margin: 0 }}>
              {profile.email || ""}
            </p>
          </div>

          {/* CHANGE PASSWORD CARD */}
          <div className="neu-card">
            <h2
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: profileColors.heading,
                marginBottom: 20,
              }}
            >
              {t('profile.change_password', 'Change Password')}
            </h2>

            <input
              type="password"
              placeholder={t('profile.current_password', 'Current Password')}
              className="neu-input"
              value={passwords.current_password}
              onChange={(e) =>
                setPasswords({ ...passwords, current_password: e.target.value })
              }
            />

            <input
              type="password"
              placeholder={t('profile.new_password', 'New Password')}
              className="neu-input"
              value={passwords.new_password}
              onChange={(e) =>
                setPasswords({ ...passwords, new_password: e.target.value })
              }
            />

            <input
              type="password"
              placeholder={t('profile.confirm_password', 'Confirm Password')}
              className="neu-input"
              value={passwords.confirm_password}
              onChange={(e) =>
                setPasswords({ ...passwords, confirm_password: e.target.value })
              }
            />

            <button
              className="neu-btn-gold"
              style={{ width: "100%", marginTop: 4 }}
              onClick={changePassword}
            >
              {t('profile.update_password_btn', 'Update Password')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}