"use client";

// Autenticación, acceso y recuperación — ahora contra Supabase Auth real.
import { FormEvent, useEffect, useState } from "react";

import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { ROLE_META } from "../data";
import type { Account, Role } from "../types";
import { initials } from "../utils";
import { Brand, ModalLayer } from "../components/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

// Trae el perfil (rol, gimnasio, etc.) del usuario recién autenticado y lo
// convierte al formato Account que usa el resto de la aplicación.
//
// OJO: la cuenta también se arma en app/page.tsx (cuando se recarga la
// página con una sesión ya abierta). Si aquí se agrega un campo nuevo del
// gimnasio, hay que agregarlo allá también o la app se comportará distinto
// al iniciar sesión que al recargar.
async function loadAccountFromSession(): Promise<Account | null> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
        .select("id, name, email, role, status, initials, gym_id, must_change_password, gyms(name, medical_360_enabled, tagline, city, receipt_prefix)")
    .eq("id", user.id)
    .single();

  if (error || !profile) return null;

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role as Role,
    // @ts-expect-error -- el join de Supabase devuelve un objeto anidado
    gym: profile.gyms?.name ?? "",
    gymId: profile.gym_id,
    initials: profile.initials,
    active: profile.status === "active",
    // @ts-expect-error -- el join de Supabase devuelve un objeto anidado
    medical360Enabled: profile.gyms?.medical_360_enabled ?? false,
    // @ts-expect-error -- el join de Supabase devuelve un objeto anidado
    gymTagline: profile.gyms?.tagline ?? "",
    // @ts-expect-error -- el join de Supabase devuelve un objeto anidado
    gymCity: profile.gyms?.city ?? "",
    // @ts-expect-error -- el join de Supabase devuelve un objeto anidado
        receiptPrefix: profile.gyms?.receipt_prefix ?? "",
    mustChangePassword: profile.must_change_password ?? false,
  };
}

export function RecoveryModal({ initialEmail, onClose }: { initialEmail: string; onClose: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      setError("Escribe un correo válido.");
      return;
    }
    setError("");
    setSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    // Por seguridad, siempre mostramos el mismo mensaje de confirmación
    // exista o no una cuenta con ese correo — así nadie puede usar este
    // formulario para averiguar qué correos están registrados.
    await supabase.auth.resetPasswordForEmail(normalized, {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/restablecer-contrasena` : undefined,
    });
    setSubmitting(false);
    setConfirmed(true);
  }

  return (
    <ModalLayer onClose={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="recovery-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal__heading"><div><span>RECUPERAR ACCESO</span><h2 id="recovery-title">Restablecer contraseña</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={19} /></button></div>
        {confirmed ? (
          <div className="modal-success">
            <CheckCircle2 size={28} />
            <strong>Solicitud enviada</strong>
            <p>Si existe una cuenta con ese correo, recibirás un enlace seguro para restablecer tu contraseña.</p>
            <button type="button" className="primary-button primary-button--inline" onClick={onClose}>Entendido</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p className="modal-copy">Escribe el correo de tu cuenta y te enviaremos un enlace para restablecer tu contraseña.</p>
            <label className="form-field"><span className="form-field__label">Correo de acceso</span><span className="form-field__control"><Mail size={18} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@correo.com" autoFocus /></span></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="modal__actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button primary-button--inline" type="submit" disabled={submitting}>{submitting ? "Enviando..." : "Enviar enlace"}</button></div>
          </form>
        )}
      </section>
    </ModalLayer>
  );
}

export function AuthScreen({
  onLogin,
  onCreate,
}: {
  onLogin: (account: Account) => void;
  onCreate: (account: Account) => void;
}) {
  const [mode, setMode] = useState<"login" | "create">("login");
  const [email, setEmail] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [name, setName] = useState("");
  const [gym, setGym] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);

  useEffect(() => {
    const rememberedEmail = window.localStorage.getItem("aureus-remembered-email");
    if (!rememberedEmail) return;
    const timer = window.setTimeout(() => setEmail(rememberedEmail), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function switchMode(next: "login" | "create") {
    setMode(next);
    setError("");
    setSubmitting(false);
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setSubmitting(false);
      // Mensaje genérico a propósito: no revelamos si falló por correo
      // inexistente o por contraseña incorrecta (evita que alguien use el
      // formulario para "adivinar" qué correos están registrados).
      setError("Correo o contraseña incorrectos.");
      return;
    }

    if (remember) window.localStorage.setItem("aureus-remembered-email", email.trim());
    else window.localStorage.removeItem("aureus-remembered-email");

    const account = await loadAccountFromSession();
    setSubmitting(false);

    if (!account) {
      setError("Tu cuenta no tiene un perfil configurado. Contacta al dueño del gimnasio.");
      await supabase.auth.signOut();
      return;
    }
    if (!account.active) {
      setError("Esta cuenta está suspendida. El dueño del gimnasio debe reactivarla.");
      await supabase.auth.signOut();
      return;
    }

    onLogin(account);
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (name.trim().length < 3 || gym.trim().length < 3 || !/^\S+@\S+\.\S+$/.test(createEmail)) {
      setError("Completa tu nombre, el gimnasio y un correo válido.");
      return;
    }
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

    // 1. Crear el gimnasio (tenant) en el servidor.
    const gymResponse = await fetch("/api/gyms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gymName: gym.trim() }),
    });
    const gymData = await gymResponse.json().catch(() => null);

    if (!gymResponse.ok || !gymData?.gymId) {
      setSubmitting(false);
      setError(gymData?.error ?? "No se pudo crear el gimnasio. Intenta de nuevo.");
      return;
    }

    // 2. Crear el usuario dueño, enlazado a ese gimnasio. El perfil se crea
    //    solo, automáticamente, por un trigger en la base de datos.
    const { error: signUpError } = await supabase.auth.signUp({
      email: createEmail.trim(),
      password,
      options: {
        data: {
          gym_id: gymData.gymId,
          name: name.trim(),
          role: "owner",
        },
      },
    });

    if (signUpError) {
      setSubmitting(false);
      setError(
        signUpError.message.includes("already registered")
          ? "Ya existe una cuenta con ese correo."
          : "No se pudo crear la cuenta. Intenta de nuevo."
      );
      return;
    }

    const account = await loadAccountFromSession();
    setSubmitting(false);

    if (!account) {
      // Si tu proyecto de Supabase pide confirmar el correo antes de dar
      // sesión, aquí no habrá cuenta todavía — mostramos ese caso.
      setError("Revisa tu correo para confirmar la cuenta antes de continuar.");
      return;
    }

    onCreate(account);
  }

  return (
    <main className="login-page auth-page">
      <section className="login-visual auth-visual" aria-label="Presentación de Aureus Fitness Coach">
        <div className="login-visual__grid" />
        <div className="login-visual__orb login-visual__orb--one" />
        <div className="login-visual__orb login-visual__orb--two" />
        <div className="login-visual__top"><Brand /><span className="phase-pill"><i /> Tu equipo, en sintonía</span></div>
        <div className="login-visual__content auth-visual__content">
          <span className="eyebrow"><ShieldCheck size={15} /> UNA EXPERIENCIA · TODO TU EQUIPO</span>
          <h1>Tu gimnasio avanza<br /><em>cuando todos avanzan.</em></h1>
          <p>Una experiencia clara y elegante para dirigir el gimnasio, atender mejor y acompañar el progreso de cada persona.</p>
          <div className="role-preview-grid">
            {(Object.keys(ROLE_META) as Role[]).map((role) => {
              const meta = ROLE_META[role];
              const Icon = meta.icon;
              return <div className="role-preview" key={role}><span><Icon size={18} /></span><div><strong>{meta.label}</strong><small>{meta.description}</small></div><CheckCircle2 size={16} /></div>;
            })}
          </div>
        </div>
        <div className="login-visual__footer"><span>Operación completa del gimnasio</span><span>Panamá · 2026</span></div>
      </section>

      <section className="login-panel auth-panel">
        <div className="login-panel__mobile-brand"><Brand compact /></div>
        <div className="login-card auth-card">
          <div className="auth-tabs" role="tablist" aria-label="Opciones de acceso">
            <button className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")} role="tab" aria-selected={mode === "login"}>Iniciar sesión</button>
            <button className={mode === "create" ? "active" : ""} onClick={() => switchMode("create")} role="tab" aria-selected={mode === "create"}>Crear cuenta</button>
          </div>

          <div className="login-card__heading">
            <span className="login-card__icon">{mode === "login" ? <LockKeyhole size={22} /> : <Building2 size={22} />}</span>
            <p>{mode === "login" ? "Acceso del equipo" : "Nueva cuenta de gimnasio"}</p>
          </div>
          <h2>{mode === "login" ? "Bienvenido de vuelta" : "Crea tu espacio"}</h2>
          <p className="login-card__subtitle">{mode === "login" ? "Tu portal se abrirá según los permisos de tu cuenta." : "La primera cuenta será la del dueño y tendrá control administrativo."}</p>

          {mode === "login" ? (
            <form onSubmit={login} noValidate>
              <label className="form-field"><span className="form-field__label">Correo</span><span className="form-field__control"><Mail size={18} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@correo.com" autoComplete="email" /></span></label>
              <label className="form-field"><span className="form-field__label">Contraseña</span><span className="form-field__control"><LockKeyhole size={18} /><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Tu contraseña" autoComplete="current-password" /><button type="button" className="icon-button icon-button--field" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
              <div className="form-options"><label className="check-control"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span><Check size={13} /></span>Recordarme</label><button type="button" className="text-button" onClick={() => setRecoveryOpen(true)}>¿Olvidaste tu contraseña?</button></div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="primary-button" type="submit" disabled={submitting}><span>{submitting ? "Verificando cuenta..." : "Entrar a mi portal"}</span>{submitting ? <i className="button-spinner" /> : <ArrowRight size={19} />}</button>
            </form>
          ) : (
            <form onSubmit={createAccount} noValidate>
              <div className="auth-form-grid">
                <label className="form-field"><span className="form-field__label">Nombre del dueño</span><span className="form-field__control"><UserRound size={18} /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre completo" /></span></label>
                <label className="form-field"><span className="form-field__label">Nombre del gimnasio</span><span className="form-field__control"><Building2 size={18} /><input value={gym} onChange={(event) => setGym(event.target.value)} placeholder="Nombre comercial" /></span></label>
              </div>
              <label className="form-field"><span className="form-field__label">Correo administrativo</span><span className="form-field__control"><Mail size={18} /><input type="email" value={createEmail} onChange={(event) => setCreateEmail(event.target.value)} placeholder="administracion@gimnasio.com" autoComplete="email" /></span></label>
              <div className="auth-form-grid">
                <label className="form-field"><span className="form-field__label">Contraseña</span><span className="form-field__control"><LockKeyhole size={18} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 8 caracteres" /></span></label>
                <label className="form-field"><span className="form-field__label">Confirmar</span><span className="form-field__control"><ShieldCheck size={18} /><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repite la contraseña" /></span></label>
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="primary-button" type="submit" disabled={submitting}><span>{submitting ? "Creando espacio..." : "Crear cuenta del gimnasio"}</span>{submitting ? <i className="button-spinner" /> : <ArrowRight size={19} />}</button>
            </form>
          )}

          <div className="security-note"><ShieldCheck size={18} /><div><strong>Cada persona ve lo que necesita</strong><span>Accesos diferenciados para dueño, recepción y entrenadores.</span></div></div>
        </div>
        <p className="login-panel__legal">© 2026 Aureus Fitness Coach · Entrena. Gestiona. Evoluciona.</p>
      </section>
      {recoveryOpen && <RecoveryModal initialEmail={email} onClose={() => setRecoveryOpen(false)} />}
    </main>
  );
}