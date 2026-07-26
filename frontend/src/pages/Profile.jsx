import React, { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { API_BASE_URL, useAuth } from "../context/AuthContext";

const COLORS = {
  bg: "#FAF6EE",
  card: "#FFFFFF",
  border: "#F0E6D2",
  gold: "#C5A059",
  text: "#2B2420",
  muted: "#7A7A7A",
  shadow: "0 6px 20px rgba(0,0,0,0.08)"
};

export default function Profile({ setCurrentPage }) {
  const { getAuthHeaders } = useAuth();

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    username: "",
    role: "",
    created_at: "",
    profile_picture: ""
  });

  const [previewImage, setPreviewImage] = useState("");

  const [passwords, setPasswords] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/profile`,
        { headers: getAuthHeaders() }
      );

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
        profile_picture: data.profile_picture || ""
      });
      if (data.profile_picture) {
        setPreviewImage(`${API_BASE_URL}${data.profile_picture}`);
      }
    } catch (err) {
      console.error("Profile load error:", err);
    }
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
      const response = await fetch(
        `${API_BASE_URL}/api/profile/picture`,
        {
          method: "POST",
          headers: {
            ...getAuthHeaders()  // Don't set Content-Type — let browser set it for FormData
          },
          body: formData
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert("Profile picture updated successfully!");
        setProfile({ ...profile, profile_picture: data.url });
      } else {
        alert(data.detail || "Failed to upload picture.");
        setPreviewImage(""); // Reset preview on error
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload picture.");
    }
  }

  async function saveProfile() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/profile`,
        {
          method: "PUT",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: profile.name,
            email: profile.email
          })
        }
      );

      if (response.ok) {
        alert("Profile updated successfully.");
      } else {
        alert("Failed to update profile.");
      }
    } catch (err) {
      console.error("Save profile error:", err);
    }
  }

  async function changePassword() {
    if (passwords.new_password !== passwords.confirm_password) {
      alert("Passwords do not match");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/profile/change-password`,
        {
          method: "PUT",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            current_password: passwords.current_password,
            new_password: passwords.new_password
          })
        }
      );

      if (response.ok) {
        alert("Password updated successfully.");
        setPasswords({
          current_password: "",
          new_password: "",
          confirm_password: ""
        });
      } else {
        alert("Current password is incorrect.");
      }
    } catch (err) {
      console.error("Change password error:", err);
    }
  }

  return (
    <div style={{ padding: 35, background: COLORS.bg, minHeight: "100vh" }}>

      <h1 style={{ fontSize: 34, color: COLORS.text }}>Profile</h1>
      <p style={{ color: COLORS.muted }}>Manage your account information and security.</p>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 30, marginTop: 30 }}>

        {/* LEFT - Personal Information */}
        <div style={{ background: "#fff", borderRadius: 20, padding: 30, boxShadow: COLORS.shadow }}>

          <h2 style={{ fontSize: 20, fontWeight: "bold", color: COLORS.text }}>Personal Information</h2>
            


          <label style={{ fontSize: 14, fontWeight: 500, color: COLORS.text }}>Full Name</label>
          <input
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            style={inputStyle}
          />

          <label style={{ fontSize: 14, fontWeight: 500, color: COLORS.text }}>Email</label>
          <input
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            style={inputStyle}
          />

          <label style={{ fontSize: 14, fontWeight: 500, color: COLORS.text }}>Username</label>
          <input
            value={profile.username || ""}
            disabled
            style={{ ...inputStyle, background: "#f5f5f5", color: "#999", cursor: "not-allowed" }}
          />

          <label style={{ fontSize: 14, fontWeight: 500, color: COLORS.text }}>Role</label>
          <input
            value={profile.role || ""}
            disabled
            style={{ ...inputStyle, background: "#f5f5f5", color: "#999", cursor: "not-allowed" }}
          />

          <label style={{ fontSize: 14, fontWeight: 500, color: COLORS.text }}>Member Since</label>
          <input
            value={profile.created_at || ""}
            disabled
            style={{ ...inputStyle, background: "#f5f5f5", color: "#999", cursor: "not-allowed" }}
          />

            

          <button style={buttonStyle} onClick={saveProfile}>Save Changes</button>
          {setCurrentPage && (
            <button
              style={{ ...buttonStyle, background: "#6B7280", marginLeft: 10 }}
              onClick={() => setCurrentPage('dashboard')}
            >
              Back to Dashboard
            </button>
          )}

        </div>

        {/* RIGHT - Avatar & Password */}
        <div>

          <div style={{ background: "#fff", borderRadius: 20, boxShadow: COLORS.shadow, padding: 30, textAlign: "center" }}>

            {/* Profile Picture with Upload */}
            <div style={{ position: "relative", width: 110, height: 110, margin: "0 auto" }}>
              {previewImage ? (
                <img
                  src={previewImage}
                  alt="Profile"
                  style={{
                    width: 110,
                    height: 110,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: `3px solid ${COLORS.gold}`
                  }}
                />
              ) : (
                <div style={{
                  width: 110,
                  height: 110,
                  borderRadius: "50%",
                  background: COLORS.gold,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 42,
                  fontWeight: "bold",
                  border: `3px solid ${COLORS.gold}`
                }}>
                  {profile.name ? profile.name.charAt(0).toUpperCase() : "U"}
                </div>
              )}

              {/* Camera overlay button */}
              <label
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: COLORS.gold,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  border: "3px solid #fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                }}
              >
                <Camera size={16} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: "none" }}
                />
              </label>
            </div>

            <h2 style={{ marginTop: 15, color: COLORS.text }}>{profile.name || "User"}</h2>
            <p style={{ color: COLORS.muted }}>{profile.email || ""}</p>

          </div>

          <div style={{ marginTop: 25, background: "#fff", padding: 30, borderRadius: 20, boxShadow: COLORS.shadow }}>

            <h2 style={{ fontSize: 20, fontWeight: "bold", color: COLORS.text }}>Change Password</h2>

            <input
              type="password"
              placeholder="Current Password"
              style={inputStyle}
              value={passwords.current_password}
              onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
            />

            <input
              type="password"
              placeholder="New Password"
              style={inputStyle}
              value={passwords.new_password}
              onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
            />

            <input
              type="password"
              placeholder="Confirm Password"
              style={inputStyle}
              value={passwords.confirm_password}
              onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
            />

            <button style={buttonStyle} onClick={changePassword}>Update Password</button>

          </div>

        </div>

      </div>

    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginTop: 8,
  marginBottom: 18,
  borderRadius: 10,
  border: "1px solid #ddd",
  fontSize: 15,
  boxSizing: "border-box",
  outline: "none"
};

const buttonStyle = {
  padding: "12px 20px",
  border: "none",
  background: "#C5A059",
  color: "#fff",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: 15
};
