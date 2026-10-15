"use client"; // Formulario con estado local y handlers de Firebase Auth.

import { useState } from "react";

const ERROR_MESSAGES = {
  "auth/email-already-in-use": "El email ya tiene una cuenta asociada.",
  "auth/invalid-credential": "El email o la contraseña no son correctos.",
  "auth/invalid-email": "El formato del email no es válido.",
  "auth/popup-closed-by-user": "La ventana de Google se cerró antes de completar el acceso.",
  "auth/weak-password": "La contraseña debe tener al menos seis caracteres.",
};

function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || `No se pudo completar la operación (${code}).`;
}

export default function AuthPanel({
  authError,
  authLoading,
  onClose,
  onContinueAsGuest,
  onGoogle,
  onSubmitEmail,
  user,
}) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      await onSubmitEmail({ email, password, mode });
      onClose();
    } catch {
      // El hook expone un codigo de error presentable en el panel.
    }
  }

  async function handleGoogle() {
    try {
      await onGoogle();
      onClose();
    } catch {
      // El hook expone un codigo de error presentable en el panel.
    }
  }

  async function handleGuest() {
    try {
      await onContinueAsGuest();
      onClose();
    } catch {
      // El hook expone un codigo de error presentable en el panel.
    }
  }

  return (
    <section className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="auth-panel">
        <button className="auth-close" onClick={onClose} aria-label="Cerrar acceso">×</button>
        <p className="kicker">IDENTIFICACIÓN / FIREBASE AUTH</p>
        <h2 id="auth-title">IDENTIFICAR OPERADOR</h2>

        {user && !user.isAnonymous ? (
          <div className="auth-current">
            <small>SESIÓN ACTIVA</small>
            <strong>{user.displayName || user.email}</strong>
            <span>{user.email}</span>
            <button onClick={handleGuest} disabled={authLoading}>CONTINUAR COMO INVITADO</button>
          </div>
        ) : (
          <>
            <div className="auth-tabs" aria-label="Modo de autenticación">
              <button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>INGRESAR</button>
              <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>CREAR CUENTA</button>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <label>
                <span>EMAIL</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
              </label>
              <label>
                <span>CONTRASEÑA</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  minLength={6}
                  required
                />
              </label>
              <button className="auth-primary" type="submit" disabled={authLoading}>
                {authLoading ? "PROCESANDO…" : mode === "signup" ? "CREAR CUENTA" : "INGRESAR"}
              </button>
            </form>

            <div className="auth-separator"><span>O</span></div>
            <button className="auth-google" onClick={handleGoogle} disabled={authLoading}>CONTINUAR CON GOOGLE</button>
            <p className="auth-note">El acceso como invitado utiliza una cuenta anónima de Firebase.</p>
          </>
        )}

        {authError && <p className="auth-error" role="alert">{getErrorMessage(authError)}</p>}
      </div>
    </section>
  );
}
