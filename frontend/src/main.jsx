import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import InstallPWA from "./components/InstallPWA";
import { BrowserRouter } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <LanguageProvider>
        <App />
        <InstallPWA />
      </LanguageProvider>
    </AuthProvider>
  </BrowserRouter>
);
