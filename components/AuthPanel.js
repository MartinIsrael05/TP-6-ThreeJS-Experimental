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
        <button className="auth-close" onClick={onClose} aria-label="Cerrar la carta">×</button>
        <p className="auth-seal">Colegio Hogwarts de Magia y Hechicería</p>
        <h2 id="auth-title">Carta de admisión</h2>
        <p className="auth-letter">Tenés una vacante en el castillo. Firmá con tu email o con Google y tu progreso te va a seguir a cualquier dispositivo.</p>

        {user && !user.isAnonymous ? (
          <div className="auth-current">
            <small>Ya firmaste tu carta</small>
            <strong>{user.displayName || user.email}</strong>
            <span>{user.email}</span>
            <button onClick={handleGuest} disabled={authLoading}>Seguir como visitante</button>
          </div>
        ) : (
          <>
            <div className="auth-tabs" aria-label="Modo de autenticación">
              <button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Ya tengo mi carta</button>
              <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Pedir mi carta</button>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <label>
                <span>Email</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
              </label>
              <label>
                <span>Contraseña</span>
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
                {authLoading ? "Enviando la lechuza…" : mode === "signup" ? "Pedir mi carta" : "Entrar al castillo"}
              </button>
            </form>

            <div className="auth-separator"><span>o</span></div>
            <button className="auth-google" onClick={handleGoogle} disabled={authLoading}>Entrar con Google</button>
            <p className="auth-note">Si no firmás, recorrés el castillo como visitante con una cuenta anónima y tu progreso se guarda igual.</p>
          </>
        )}

        {authError && <p className="auth-error" role="alert">{getErrorMessage(authError)}</p>}
      </div>
    </section>
  );
}
