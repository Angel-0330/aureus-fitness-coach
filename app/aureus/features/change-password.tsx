"use client";

// Pantalla de cambio obligatorio de contraseña.
//
// Aparece la primera vez que entra alguien del equipo cuya cuenta creó el
// dueño. Hasta que no elija su propia contraseña no puede usar la
// aplicación: así el dueño deja de conocerla y cada quien responde por lo
// que hace en el sistema.
import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, LogOut, ShieldCheck } from "lucide-react";
import { Brand } from "../components/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function ChangePasswordScreen({ accountName, onDone, onLogout }: { accountName: string; onDone: () => void; onLogout: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Usa una contraseña de al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setSubmitting(false);
      setError(
        updateError.message.toLowerCase().includes("different")
          ? "Elige una contraseña distinta a la que te dieron."
          : "No se pudo cambiar la contraseña. Intenta de nuevo."
      );
      return;
    }

    const response = await fetch("/api/staff/password-changed", { method: "POST" });
    setSubmitting(false);

    if (!response.ok) {
      setError("La contraseña se cambió, pero no se pudo confirmar. Vuelve a iniciar sesión.");
      return;
    }

    onDone();
  }

  return (
    <main className="login-page auth-page">
      <section className="login-panel auth-panel">
        <div className="login-panel__mobile-brand"><Brand compact /></div>
        <div className="login-card auth-card">
          <div className="login-card__heading">
            <span className="login-card__icon"><LockKeyhole size={22} /></span>
            <p>Primer acceso</p>
          </div>
          <h2>Elige tu contraseña, {accountName.split(" ")[0]}</h2>
          <p className="login-card__subtitle">
            Tu cuenta se creó con una contraseña temporal que conoce quien te la entregó.
            Elige una propia para continuar.
          </p>

          <form onSubmit={submit} noValidate>
            <label className="form-field">
              <span className="form-field__label">Nueva contraseña</span>
              <span className="form-field__control">
                <LockKeyhole size={18} />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} placeholder="Mínimo 8 caracteres" autoComplete="new-password" autoFocus />
                <button type="button" className="icon-button icon-button--field" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </span>
            </label>
            <label className="form-field">
              <span className="form-field__label">Confirmar contraseña</span>
              <span className="form-field__control">
                <ShieldCheck size={18} />
                <input type="password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setError(""); }} placeholder="Repite la contraseña" autoComplete="new-password" />
              </span>
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button" type="submit" disabled={submitting}>
              <span>{submitting ? "Guardando..." : "Guardar y continuar"}</span>
              {submitting ? <i className="button-spinner" /> : <ArrowRight size={19} />}
            </button>
          </form>

          <div className="security-note">
            <ShieldCheck size={18} />
            <div>
              <strong>Solo tú conocerás esta contraseña</strong>
              <span>Ni el dueño ni el equipo pueden verla. Si la olvidas, podrás restablecerla desde la pantalla de acceso.</span>
            </div>
          </div>

          <div className="modal__actions">
            <button type="button" className="secondary-button" onClick={onLogout}><LogOut size={16} /> Cerrar sesión</button>
          </div>
        </div>
        <p className="login-panel__legal">© 2026 Aureus Fitness Coach · Entrena. Gestiona. Evoluciona.</p>
      </section>
    </main>
  );
}