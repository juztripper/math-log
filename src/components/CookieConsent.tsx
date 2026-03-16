"use client";

import { useState, useEffect } from "react";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) setVisible(true);
  }, []);

  const respond = (choice: "accepted" | "rejected") => {
    localStorage.setItem("cookie-consent", choice);
    setVisible(false);
    window.dispatchEvent(new Event("cookie-consent-changed"));
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner">
      <div className="cookie-banner-inner">
        <p className="cookie-banner-text">
          Utilizamos cookies analíticos para compreender como o site é
          utilizado. Os dados recolhidos são anónimos.{" "}
          <a href="/privacidade">Saber mais</a>
        </p>
        <div className="cookie-banner-actions">
          <button
            onClick={() => respond("rejected")}
            className="cookie-btn cookie-btn-reject"
          >
            Rejeitar
          </button>
          <button
            onClick={() => respond("accepted")}
            className="cookie-btn cookie-btn-accept"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
