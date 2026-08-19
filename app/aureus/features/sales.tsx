"use client";

// Ventas externas: productos vendidos en recepción (bebidas, barras, etc.).
// No maneja inventario — solo el registro de qué se vendió y cómo pagaron.
import { FormEvent, useState } from "react";
import {
  CircleDollarSign,
  CreditCard,
  FileText,
  Receipt,
  ShoppingBasket,
} from "lucide-react";
import type { ExternalSale, PaymentMethod } from "../types";

const PAYMENT_METHODS: PaymentMethod[] = ["Efectivo", "Yappy", "Tarjeta"];

function formatDateTime(value: string) {
  try {
    const date = new Date(value);
    const day = date.toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" });
    const time = date.toLocaleTimeString("es-PA", { hour: "2-digit", minute: "2-digit", hour12: false });
    return { day, time };
  } catch {
    return { day: "—", time: "" };
  }
}

export function SalesView({ sales, onSave }: { sales: ExternalSale[]; onSave: (input: { product: string; amount: number; paymentMethod: PaymentMethod }) => void }) {
  const [product, setProduct] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Efectivo");
  const [error, setError] = useState("");

  const total = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const lastSale = sales[0];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount);
    if (product.trim().length < 2) {
      setError("Escribe qué producto se vendió.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError("Escribe un monto mayor que cero.");
      return;
    }
    onSave({ product: product.trim(), amount: value, paymentMethod });
    setProduct("");
    setAmount("");
    setPaymentMethod("Efectivo");
    setError("");
  }

  return (
    <section className="ops-page">
      <div className="ops-page__heading">
        <div>
          <span className="eyebrow"><ShoppingBasket size={14} /> VENTAS EXTERNAS</span>
          <h2>Registrar una venta</h2>
          <p>Registra el producto, el monto recibido y cómo pagó el cliente.</p>
        </div>
      </div>

      <section className="payment-summary">
        <div>
          <span>Total registrado</span>
          <strong>${total.toFixed(2)}</strong>
          <small>{sales.length} {sales.length === 1 ? "venta externa" : "ventas externas"}</small>
        </div>
        <div>
          <span>Última venta</span>
          <strong>{lastSale ? lastSale.product : "Sin ventas"}</strong>
          <small>{lastSale ? `$${lastSale.amount.toFixed(2)} · ${lastSale.paymentMethod} · ${formatDateTime(lastSale.createdAt).time}` : "Registra la primera venta"}</small>
        </div>
      </section>

      <div className="measurement-layout">
        <article className="panel measurement-form-card">
          <div className="measurement-card-heading">
            <div>
              <span>NUEVA OPERACIÓN</span>
              <h3>Venta externa</h3>
              <p>Completa los tres datos y guarda.</p>
            </div>
            <span className="icon-button icon-button--outlined"><ShoppingBasket size={18} /></span>
          </div>
          <form onSubmit={submit}>
            <label className="form-field">
              <span className="form-field__label">Producto vendido</span>
              <span className="form-field__control">
                <ShoppingBasket size={18} />
                <input value={product} onChange={(event) => { setProduct(event.target.value); setError(""); }} placeholder="Ej. Agua, Powerade o barra de proteína" autoFocus />
              </span>
            </label>
            <label className="form-field">
              <span className="form-field__label">Monto recibido</span>
              <span className="form-field__control">
                <CircleDollarSign size={18} />
                <input type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); setError(""); }} placeholder="0.00" />
              </span>
            </label>
            <label className="form-field">
              <span className="form-field__label">Método de pago</span>
              <span className="form-field__control">
                <CreditCard size={18} />
                <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
                  {PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}
                </select>
              </span>
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="measurement-actions">
              <button className="primary-button primary-button--inline" type="submit"><Receipt size={17} /> Guardar venta</button>
            </div>
          </form>
        </article>

        <article className="panel measurement-history-card">
          <div className="measurement-card-heading">
            <div>
              <span>MOVIMIENTOS</span>
              <h3>Ventas recientes</h3>
              <p>{sales.length ? `${sales.length} ${sales.length === 1 ? "venta registrada" : "ventas registradas"}` : "Todavía no hay ventas registradas"}</p>
            </div>
            <span className="measurement-count">{sales.length}</span>
          </div>
          {sales.length ? (
            <div className="measurement-table-wrap">
              <table className="measurement-table">
                <thead>
                  <tr><th>Producto</th><th>Fecha y hora</th><th>Pago</th><th>Monto</th></tr>
                </thead>
                <tbody>
                  {sales.map((sale) => {
                    const { day, time } = formatDateTime(sale.createdAt);
                    return (
                      <tr key={sale.id}>
                        <td><strong>{sale.product}</strong></td>
                        <td>{day}<small>{time}</small></td>
                        <td><em>{sale.paymentMethod}</em></td>
                        <td><strong>${sale.amount.toFixed(2)}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="measurement-empty">
              <FileText size={28} />
              <strong>Sin ventas todavía</strong>
              <p>Completa el formulario y pulsa “Guardar venta”.</p>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
