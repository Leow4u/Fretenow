"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Package,
  Search,
  Truck,
  ArrowLeft,
  CalendarDays,
  X,
} from "lucide-react";
import {
  api,
  errorText,
  utcDate,
  money,
  type Shipment,
  type Address,
} from "../lib/api";
import { recentShipments } from "../lib/shipments";
const labels: Record<string, string> = {
  booked: "Booked",
  in_transit: "On the road",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
export function Status({ status }: { status: string }) {
  return (
    <span className={`status ${status}`}>
      <i />
      {labels[status] || status}
    </span>
  );
}
export function ShipmentList({
  shipments,
  home = false,
}: {
  shipments: Shipment[];
  home?: boolean;
}) {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const params = useSearchParams();
  useEffect(() => {
    setQ(params.get("q") || "");
    setTab(params.get("status") || "all");
  }, [params]);
  const tabs = [
    ["all", "All"],
    ["booked", "Needs you"],
    ["in_transit", "On the road"],
    ["delivered", "Delivered"],
  ];
  const filtered = shipments.filter(
    (s) =>
      (tab === "all" || s.status === tab) &&
      `${s.id} ${s.carrier} ${s.origin.city} ${s.destination.city} ${s.origin.name} ${s.destination.name}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <section className="shipment-section">
      <div className="tabs">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "selected" : ""}
            onClick={() => setTab(key)}
          >
            {label}
            <span>
              {
                shipments.filter((s) => key === "all" || s.status === key)
                  .length
              }
            </span>
          </button>
        ))}
      </div>
      <div className="list-header">
        <h2>{home ? "Recent shipments" : "Your shipments"}</h2>
        <label className="search-box">
          <Search size={17} />
          <input
            aria-label="Filter shipments"
            placeholder="Search by city, carrier or ID"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>
      {filtered.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Shipment / route</th>
                <th>Status</th>
                <th>Pickup</th>
                <th>Carrier</th>
                <th className="align-right">Amount</th>
                <th>
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(home ? recentShipments(filtered) : filtered).map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link className="route-link" href={`/shipments/${s.id}`}>
                      {s.origin.city}, {s.origin.state}
                      <ArrowRight size={14} />
                      {s.destination.city}, {s.destination.state}
                    </Link>
                    <small>
                      {s.mode} · {s.id.slice(0, 8)}
                    </small>
                  </td>
                  <td>
                    <Status status={s.status} />
                  </td>
                  <td>{s.pickupDate}</td>
                  <td>{s.carrier}</td>
                  <td className="align-right">
                    <strong>{money(s.amountMinor)}</strong>
                  </td>
                  <td>
                    <Link
                      className="icon-button"
                      aria-label={`View shipment ${s.id}`}
                      href={`/shipments/${s.id}`}
                    >
                      <ArrowRight size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">
            <Package size={28} />
          </span>
          <h3>
            {q
              ? "No matching shipments"
              : tab === "all"
                ? "Your next move starts here"
                : `No ${tabs.find((t) => t[0] === tab)?.[1].toLowerCase()} shipments`}
          </h3>
          <p>
            {q
              ? "Try a different city, carrier or shipment ID."
              : "Get a rate, choose your carrier and book a demo shipment in a few simple steps."}
          </p>
          <Link href="/ship" className="primary">
            Ship something
            <ArrowRight size={17} />
          </Link>
        </div>
      )}
      {home && shipments.length > 0 && (
        <Link
          className="text-link list-footer"
          href={`/shipments?status=${tab}`}
        >
          View all shipments
          <ArrowRight size={16} />
        </Link>
      )}
    </section>
  );
}
export function AddressSummary({
  address,
  title,
}: {
  address: Address;
  title: string;
}) {
  return (
    <div className="address-summary">
      <p className="eyebrow">{title}</p>
      <strong>{address.name}</strong>
      <p>
        {address.address}
        <br />
        {address.city}, {address.state} {address.postalCode}
        <br />
        United States
      </p>
    </div>
  );
}
export function CargoSummary({
  shipment,
}: {
  shipment: Pick<Shipment, "items" | "accessorials">;
}) {
  return (
    <>
      {shipment.items.map((i, n) => (
        <div key={n} className="cargo-summary">
          <strong>{i.description}</strong>
          <span>
            {i.quantity} items · {i.weightLb} lb each · {i.lengthIn} ×{" "}
            {i.widthIn} × {i.heightIn} in
          </span>
        </div>
      ))}
      <p className="muted">
        {shipment.accessorials.join(" · ") || "No additional services"}
      </p>
    </>
  );
}
export function ShipmentDetail({
  id,
  onChanged,
}: {
  id: string;
  onChanged: () => Promise<void>;
}) {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<"cancel" | "reschedule" | null>(null);
  const [date, setDate] = useState(utcDate(1));
  const [busy, setBusy] = useState(false);
  const actionKey = useRef("");
  const lock = useRef(false);
  const [attempted, setAttempted] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!action || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus();
    };
  }, [action]);
  async function load() {
    setError("");
    setLoading(true);
    try {
      setShipment(await api<Shipment>(`v1/shipments/${id}`));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [id]);
  function begin(type: "cancel" | "reschedule") {
    setAction(type);
    actionKey.current = crypto.randomUUID();
    setAttempted(false);
    setError("");
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current || !action) return;
    lock.current = true;
    setBusy(true);
    setAttempted(true);
    setError("");
    try {
      await api(`v1/shipments/${id}/actions`, {
        method: "POST",
        headers: { "Idempotency-Key": actionKey.current },
        body: JSON.stringify(
          action === "cancel"
            ? { type: action }
            : { type: action, pickupDate: date },
        ),
      });
      setShipment(await api<Shipment>(`v1/shipments/${id}`));
      setAction(null);
      await onChanged();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  if (loading) return <p role="status">Loading shipment…</p>;
  if (!shipment)
    return (
      <div className="error" role="alert">
        {error}
        <button onClick={() => void load()}>Retry</button>
      </div>
    );
  return (
    <>
      <Link className="text-link" href="/shipments">
        <ArrowLeft size={16} />
        All shipments
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SHIPMENT {id.slice(0, 8)}</p>
          <h1>
            {shipment.origin.city} <span className="heading-arrow">→</span>{" "}
            {shipment.destination.city}
          </h1>
          <Status status={shipment.status} />
        </div>
        <Link href={`/ship?repeat=${id}`} className="secondary">
          Repeat shipment
          <ArrowRight size={17} />
        </Link>
      </div>
      {error && !action && (
        <div className="error" role="alert">
          {error}
          <button onClick={() => void load()}>Refresh shipment</button>
        </div>
      )}
      <div className="detail-layout">
        <div>
          <section className="panel">
            <div className="panel-heading">
              <Truck size={20} />
              <h2>Shipment details</h2>
              <span className="demo-label">Demo booking</span>
            </div>
            <div className="address-grid">
              <AddressSummary address={shipment.origin} title="Pickup" />
              <AddressSummary address={shipment.destination} title="Delivery" />
            </div>
            <div className="detail-facts">
              <div>
                <small>Pickup date</small>
                <strong>{shipment.pickupDate}</strong>
              </div>
              <div>
                <small>Mode</small>
                <strong>{shipment.mode}</strong>
              </div>
              <div>
                <small>Carrier</small>
                <strong>{shipment.carrier}</strong>
              </div>
            </div>
            <h3>Freight</h3>
            <CargoSummary shipment={shipment} />
          </section>
          <section className="panel">
            <h2>Tracking timeline</h2>
            <p className="muted">
              Local demo events. Live carrier tracking is unavailable.
            </p>
            <ol className="timeline">
              {[...shipment.events].reverse().map((event) => (
                <li key={event.id}>
                  <span className="timeline-dot" />
                  <strong>{event.type.replaceAll("_", " ")}</strong>
                  <time>{new Date(event.at).toLocaleString("en-US")}</time>
                  {event.pickupDate && <p>Pickup: {event.pickupDate}</p>}
                  <small>{event.actor} · Demo</small>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <aside>
          <section className="panel">
            <p className="eyebrow">BOOKING AMOUNT</p>
            <div className="price">{money(shipment.amountMinor)}</div>
            <p className="muted">USD · No payment taken</p>
            <hr />
            <p>
              This booking is a local demonstration. No carrier has been
              contacted.
            </p>
            {shipment.status === "booked" ? (
              <div className="stack">
                <button
                  className="secondary"
                  onClick={() => begin("reschedule")}
                >
                  <CalendarDays size={17} />
                  Reschedule pickup
                </button>
                <button
                  className="danger-outline"
                  onClick={() => begin("cancel")}
                >
                  Cancel shipment
                </button>
              </div>
            ) : (
              <p className="muted">
                Changes are available only for booked shipments.
              </p>
            )}
          </section>
        </aside>
      </div>
      {action && (
        <dialog
          ref={dialogRef}
          className="modal"
          aria-labelledby="action-title"
          onCancel={(event) => {
            event.preventDefault();
            if (!busy) setAction(null);
          }}
        >
          <button
            className="modal-close icon-button"
            aria-label="Close dialog"
            disabled={busy}
            onClick={() => setAction(null)}
          >
            <X size={20} />
          </button>
          <h2 id="action-title">
            {action === "cancel"
              ? "Cancel this demo shipment?"
              : "Reschedule pickup"}
          </h2>
          <p>
            {action === "cancel"
              ? "This records a cancellation in your workspace. Cancelled shipments cannot be changed."
              : "Choose a new pickup date. This does not contact or reprice a carrier."}
          </p>
          <form onSubmit={submit}>
            {action === "reschedule" && (
              <label>
                New pickup date (UTC)
                <input
                  type="date"
                  autoFocus
                  required
                  min={utcDate()}
                  max={utcDate(366)}
                  value={date}
                  disabled={attempted}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            )}
            {error && (
              <div className="error" role="alert">
                {error}
                <p>Retry uses the same action request.</p>
              </div>
            )}
            <div className="button-row">
              <button
                type="button"
                className="secondary"
                autoFocus={action === "cancel"}
                disabled={busy}
                onClick={() => setAction(null)}
              >
                Keep shipment
              </button>
              <button
                className={action === "cancel" ? "danger" : "primary"}
                disabled={busy}
              >
                {busy
                  ? "Saving…"
                  : attempted
                    ? "Retry action"
                    : action === "cancel"
                      ? "Cancel demo shipment"
                      : "Confirm new date"}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}
