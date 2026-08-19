"use client";

// Recibo de pago: la secretaria (o el dueño) llena el monto, concepto,
// forma de pago y próxima fecha, y se genera un recibo imprimible con su
// número correlativo. El encabezado y el prefijo del número los configura
// cada gimnasio, porque el recibo se lo entrega a su propio cliente.
import { useState } from "react";
import { Printer, Save, X } from "lucide-react";
import type { Client, PaymentReceipt, ReceiptConcept, ReceiptPaymentMethod } from "../types";
import { ModalLayer } from "../components/shared";

const CONCEPTS: ReceiptConcept[] = ["Cancelación", "Abono"];
const METHODS: ReceiptPaymentMethod[] = ["Efectivo", "Transferencia", "Yappy", "Tarjeta"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function defaultNextDue(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
}

function longDate(value: string): string {
  if (!value) return "Por definir";
  const date = new Date(`${value}T12:00:00`);
  return `${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
}

// Al imprimir se oculta toda la aplicación y solo queda la hoja del recibo.
const printCss = `
@media print {
  body * { visibility: hidden !important; }
  #receipt-sheet, #receipt-sheet * { visibility: visible !important; }
  #receipt-sheet {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    margin: 0 !important;
    box-shadow: none !important;
  }
}
`;

// Estilos en línea para que el recibo se vea igual en pantalla y al
// imprimirlo, sin depender de la hoja de estilos de la aplicación.
const sheet: React.CSSProperties = { background: "#ffffff", color: "#111111", padding: "28px 32px", borderRadius: 10, fontFamily: "Georgia, 'Times New Roman', serif" };
const line: React.CSSProperties = { borderBottom: "1px solid #444", display: "inline-block", minWidth: 220, paddingLeft: 6 };
const cell: React.CSSProperties = { border: "1px solid #111", padding: "4px 14px", textAlign: "center" };
const box: React.CSSProperties = { border: "2px solid #111", borderRadius: 8, padding: "10px 18px", textAlign: "center" };

export function ReceiptModal({ client, gymName, gymTagline, gymCity, issuedByName, onClose, onIssue }: { client: Client; gymName: string; gymTagline?: string; gymCity?: string; issuedByName: string; onClose: () => void; onIssue: (input: { amount: number; concept: ReceiptConcept; paymentMethod: ReceiptPaymentMethod; balance: number; service: string; nextDue: string }) => Promise<PaymentReceipt | null> }) {
  const [amount, setAmount] = useState(String(client.price ?? ""));
  const [concept, setConcept] = useState<ReceiptConcept>("Cancelación");
  const [paymentMethod, setPaymentMethod] = useState<ReceiptPaymentMethod>("Efectivo");
  const [nextDue, setNextDue] = useState(defaultNextDue());
  const [issued, setIssued] = useState<PaymentReceipt | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const amountValue = Number(amount) || 0;
  const balance = concept === "Abono" ? Math.max(0, (client.price ?? 0) - amountValue) : 0;
  const service = `Mensualidad del plan ${client.plan}`;
  const today = new Date();
  const footerLine = [gymCity, "Gestionado con Aureus Fitness Coach"].filter(Boolean).join(" · ");

  async function submit() {
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError("Escribe un monto mayor que cero.");
      return;
    }
    setSaving(true);
    setError("");
    const saved = await onIssue({ amount: amountValue, concept, paymentMethod, balance, service, nextDue });
    setSaving(false);
    if (saved) setIssued(saved);
    else setError("No se pudo emitir el recibo. Intenta de nuevo.");
  }

  return (
    <ModalLayer onClose={onClose}>
      <style>{printCss}</style>
      <section className="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="receipt-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal__heading">
          <div><span>RECIBO DE PAGO</span><h2 id="receipt-title">{client.name}</h2></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={19} /></button>
        </div>

        {!issued && (
          <div className="entity-editor-grid">
            <label className="form-field"><span className="form-field__label">Monto recibido</span><span className="form-field__control"><input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => { setAmount(event.target.value); setError(""); }} autoFocus /></span></label>
            <label className="form-field"><span className="form-field__label">Concepto</span><span className="form-field__control"><select value={concept} onChange={(event) => setConcept(event.target.value as ReceiptConcept)}>{CONCEPTS.map((item) => <option key={item}>{item}</option>)}</select></span></label>
            <label className="form-field"><span className="form-field__label">Forma de pago</span><span className="form-field__control"><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as ReceiptPaymentMethod)}>{METHODS.map((item) => <option key={item}>{item}</option>)}</select></span></label>
            <label className="form-field"><span className="form-field__label">Fecha del próximo pago</span><span className="form-field__control"><input type="date" value={nextDue} onChange={(event) => setNextDue(event.target.value)} /></span></label>
          </div>
        )}

        <div id="receipt-sheet" style={sheet}>
          <header style={{ textAlign: "center", marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 26, letterSpacing: 1 }}>{gymName.toUpperCase()}</h3>
            {gymTagline && <p style={{ margin: "4px 0 0", fontSize: 13 }}>{gymTagline}</p>}
            <p style={{ margin: "2px 0 0", fontSize: 11, opacity: 0.7 }}>{footerLine}</p>
          </header>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <strong style={{ fontSize: 24, letterSpacing: 2 }}>RECIBO</strong>
            <span style={{ fontSize: 13 }}>No. <b style={{ color: "#b00020" }}>{issued ? issued.displayNumber : "por asignar"}</b></span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr><th style={cell}>DÍA</th><th style={cell}>MES</th><th style={cell}>AÑO</th></tr></thead>
              <tbody><tr><td style={cell}>{String(today.getDate()).padStart(2, "0")}</td><td style={cell}>{String(today.getMonth() + 1).padStart(2, "0")}</td><td style={cell}>{today.getFullYear()}</td></tr></tbody>
            </table>
            <div style={box}>
              <small style={{ fontSize: 10, letterSpacing: 1 }}>MONTO RECIBIDO</small>
              <div style={{ fontSize: 26, fontWeight: 700 }}>B/. {amountValue.toFixed(2)}</div>
            </div>
          </div>

          <p style={{ margin: "0 0 14px", fontSize: 14 }}>Hemos recibido de: <span style={line}>{client.name}</span></p>
          <p style={{ margin: "0 0 14px", fontSize: 14 }}>La suma de: <span style={line}>B/. {amountValue.toFixed(2)} balboas</span></p>
          <p style={{ margin: "0 0 14px", fontSize: 14, display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
            <span>En concepto de:</span>
            <span>[{concept === "Cancelación" ? "X" : " "}] Cancelación</span>
            <span>[{concept === "Abono" ? "X" : " "}] Abono</span>
            <span style={{ marginLeft: "auto" }}>Saldo B/. <span style={{ ...line, minWidth: 90 }}>{balance.toFixed(2)}</span></span>
          </p>
          <p style={{ margin: "0 0 18px", fontSize: 14 }}>Plan o servicio: <span style={{ ...line, minWidth: 300 }}>{service}</span></p>

          <div style={{ border: "1px solid #111", borderRadius: 6, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, gap: 12, flexWrap: "wrap" }}>
            <small style={{ fontSize: 11, letterSpacing: 1 }}>PRÓXIMO PAGO</small>
            <strong style={{ fontSize: 15 }}>{longDate(nextDue)}</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
            <div style={{ fontSize: 13 }}>
              <strong style={{ display: "block", marginBottom: 6 }}>Forma de pago</strong>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 20px" }}>
                {METHODS.map((item) => <span key={item}>[{paymentMethod === item ? "X" : " "}] {item}</span>)}
              </div>
            </div>
            <div style={{ textAlign: "center", minWidth: 200 }}>
              <div style={{ borderBottom: "1px solid #444", paddingBottom: 4, marginBottom: 4, fontStyle: "italic" }}>{issuedByName}</div>
              <small style={{ fontSize: 10, letterSpacing: 1 }}>RECIBIDO POR</small>
            </div>
          </div>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="modal__actions">
          <button type="button" className="secondary-button" onClick={onClose}>{issued ? "Cerrar" : "Cancelar"}</button>
          {issued
            ? <button type="button" className="primary-button primary-button--inline" onClick={() => window.print()}><Printer size={16} /> Imprimir recibo</button>
            : <button type="button" className="primary-button primary-button--inline" onClick={submit} disabled={saving}><Save size={16} /> {saving ? "Emitiendo…" : "Emitir recibo"}</button>}
        </div>
      </section>
    </ModalLayer>
  );
}