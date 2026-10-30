"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  ArrowDownUp,
  Plus,
  Trash2,
  Check,
  Package,
  MapPin,
} from "lucide-react";
import {
  api,
  errorText,
  utcDate,
  money,
  type Draft,
  type Address,
  type CargoItem,
  type Rate,
  type Shipment,
} from "../lib/api";
import { AddressSummary, CargoSummary } from "./Shipments";
import { BookingAttempt, QuoteRequest } from "../lib/quote-attempt";
const blankAddress = (): Address => ({
  name: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
});
const blankItem = (): CargoItem => ({
  description: "",
  quantity: 1,
  weightLb: 100,
  lengthIn: 48,
  widthIn: 40,
  heightIn: 36,
});
const initial = (): Draft => ({
  mode: "LTL",
  origin: blankAddress(),
  destination: blankAddress(),
  pickupDate: utcDate(1),
  items: [blankItem()],
  accessorials: [],
});
const services = [
  "Liftgate pickup",
  "Liftgate delivery",
  "Residential pickup",
  "Residential delivery",
  "Inside pickup",
  "Inside delivery",
  "Appointment required",
  "Limited access",
];
function AddressFields({
  title,
  address,
  onChange,
}: {
  title: string;
  address: Address;
  onChange: (a: Address) => void;
}) {
  return (
    <fieldset className="address-fields">
      <legend>
        <MapPin size={17} />
        {title}
      </legend>
      <div className="form-grid">
        {(
          [
            ["name", "Company / contact name"],
            ["address", "Street address"],
            ["city", "City"],
            ["state", "State"],
            ["postalCode", "ZIP code"],
          ] as const
        ).map(([key, label]) => (
          <label
            key={key}
            className={key === "name" || key === "address" ? "span-full" : ""}
          >
            {label}
            <input
              required
              maxLength={
                key === "state"
                  ? 2
                  : key === "postalCode"
                    ? 5
                    : key === "address"
                      ? 240
                      : 160
              }
              pattern={
                key === "postalCode"
                  ? "[0-9]{5}"
                  : key === "state"
                    ? "AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY"
                    : undefined
              }
              title={
                key === "state"
                  ? "Use a valid two-letter US state abbreviation"
                  : key === "postalCode"
                    ? "Use a 5-digit ZIP code"
                    : undefined
              }
              autoComplete="off"
              value={address[key]}
              onChange={(e) =>
                onChange({
                  ...address,
                  [key]:
                    key === "state"
                      ? e.target.value.toUpperCase()
                      : e.target.value,
                })
              }
            />
          </label>
        ))}
        <label>
          Country
          <input value="United States" readOnly />
        </label>
      </div>
    </fieldset>
  );
}
export default function ShipFlow({
  onBooked,
}: {
  onBooked: () => Promise<void>;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial);
  const [rates, setRates] = useState<Rate[]>([]);
  const [selected, setSelected] = useState<Rate | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const booking = useRef(new BookingAttempt());
  const quotes = useRef(new QuoteRequest());
  const lock = useRef(false);
  const [hasAttempt, setHasAttempt] = useState(false);
  useEffect(() => {
    const repeat = new URLSearchParams(window.location.search).get("repeat");
    if (repeat) {
      setBusy(true);
      api<Shipment>(`v1/shipments/${repeat}`)
        .then((s) =>
          setDraft({
            mode: s.mode,
            origin: s.origin,
            destination: s.destination,
            items: s.items,
            accessorials: s.accessorials,
            pickupDate: utcDate(1),
          }),
        )
        .catch((e) => setError(errorText(e)))
        .finally(() => setBusy(false));
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const total = draft.items.reduce((n, i) => n + i.quantity * i.weightLb, 0);
  const volume = draft.items.reduce(
    (n, i) => n + (i.quantity * i.lengthIn * i.widthIn * i.heightIn) / 1728,
    0,
  );
  const expired = selected
    ? new Date(selected.validUntilISO).getTime() <= now
    : false;
  function update(value: Partial<Draft>) {
    quotes.current.invalidate();
    setDraft((d) => ({ ...d, ...value }));
    setRates([]);
    setSelected(null);
    booking.current.clear();
    setHasAttempt(false);
    setStep(0);
    setError("");
  }
  function example() {
    update({
      mode: "LTL",
      origin: {
        name: "Demo Austin Warehouse",
        address: "120 Example Street",
        city: "Austin",
        state: "TX",
        postalCode: "78701",
        country: "US",
      },
      destination: {
        name: "Demo Denver Distribution",
        address: "210 Sample Avenue",
        city: "Denver",
        state: "CO",
        postalCode: "80202",
        country: "US",
      },
      pickupDate: utcDate(2),
      items: [
        {
          description: "Boxed plastic components on a pallet",
          quantity: 1,
          weightLb: 1000,
          lengthIn: 48,
          widthIn: 40,
          heightIn: 48,
        },
      ],
      accessorials: [],
    });
  }
  async function getRates(e?: React.FormEvent) {
    e?.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setSelected(null);
    setRates([]);
    booking.current.clear();
    setHasAttempt(false);
    try {
      const response = await quotes.current.run(() =>
        api<{ rates: Rate[] }>("v1/rates", {
          method: "POST",
          body: JSON.stringify(draft),
        }),
      );
      if (!response) return;
      setRates(
        [...response.rates].sort((a, b) => a.amountMinor - b.amountMinor),
      );
      setStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  async function book() {
    if (lock.current || !selected) return;
    if (!booking.current.pending && expired) {
      setError("This rate has expired. Get new rates to continue.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    const request = booking.current.request(selected.id, draft);
    setHasAttempt(true);
    try {
      const shipment = await api<Shipment>("v1/shipments", {
        method: "POST",
        headers: { "Idempotency-Key": request.key },
        body: request.body,
      });
      await onBooked();
      router.push(`/shipments/${shipment.id}`);
    } catch (e) {
      if (booking.current.reject(e)) {
        setHasAttempt(false);
        setSelected(null);
        setRates([]);
        setStep(0);
      }
      setError(errorText(e));
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  function choose(rate: Rate) {
    setSelected(rate);
    booking.current.clear();
    setStep(2);
    setError("");
    window.scrollTo({ top: 0 });
  }
  const header = (
    <>
      <div className="page-heading">
        <div>
          <h1>Ship something</h1>
          <p>A better way from pickup to delivery.</p>
        </div>
        {step === 0 && (
          <button className="secondary" disabled={busy} onClick={example}>
            Use example shipment
          </button>
        )}
      </div>
      {step > 0 && (
        <>
          <div className="route-strip">
            <strong>
              {draft.origin.city}, {draft.origin.state}
              <ArrowRight size={16} />
              {draft.destination.city}, {draft.destination.state}
            </strong>
            <span>
              {draft.pickupDate} · {draft.mode} ·{" "}
              {total.toLocaleString("en-US")} lb
            </span>
            <button
              className="text-link"
              disabled={busy || hasAttempt}
              onClick={() => update({})}
            >
              Edit shipment
            </button>
          </div>
          <ol className="steps">
            {["Choose a rate", "Pickup and delivery", "Confirm and book"].map(
              (s, i) => (
                <li
                  className={
                    step === i + 1 ? "current" : step > i + 1 ? "done" : ""
                  }
                  key={s}
                >
                  <span>{step > i + 1 ? <Check size={14} /> : i + 1}</span>
                  {s}
                </li>
              ),
            )}
          </ol>
        </>
      )}
    </>
  );
  if (step === 0)
    return (
      <div className="quote-page">
        {header}
        <form onSubmit={getRates}>
          <section className="form-section">
            <div className="section-heading">
              <h2>Route</h2>
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  update({
                    origin: draft.destination,
                    destination: draft.origin,
                  })
                }
              >
                <ArrowDownUp size={16} />
                Swap pickup and delivery
              </button>
            </div>
            <div className="address-grid">
              <AddressFields
                title="From · Pickup"
                address={draft.origin}
                onChange={(origin) => update({ origin })}
              />
              <AddressFields
                title="To · Delivery"
                address={draft.destination}
                onChange={(destination) => update({ destination })}
              />
            </div>
          </section>
          <section className="form-section">
            <h2>Freight</h2>
            <label>Mode</label>
            <div className="segmented">
              {(["LTL", "FTL", "Expedited"] as const).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  className={mode === draft.mode ? "selected" : ""}
                  onClick={() => update({ mode })}
                >
                  {mode}
                </button>
              ))}
            </div>
            {draft.items.map((item, index) => (
              <div key={index} className="cargo-fields">
                <div className="section-heading">
                  <h3>
                    {draft.items.length > 1
                      ? `Cargo ${index + 1}`
                      : "What you’re shipping"}
                  </h3>
                  {draft.items.length > 1 && (
                    <button
                      className="icon-button"
                      aria-label={`Remove cargo ${index + 1}`}
                      type="button"
                      onClick={() =>
                        update({
                          items: draft.items.filter((_, i) => i !== index),
                        })
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
                <label>
                  Description
                  <input
                    required
                    maxLength={240}
                    placeholder="e.g. Boxed components on a pallet"
                    value={item.description}
                    onChange={(e) =>
                      update({
                        items: draft.items.map((v, i) =>
                          i === index
                            ? { ...v, description: e.target.value }
                            : v,
                        ),
                      })
                    }
                  />
                </label>
                <div className="cargo-grid">
                  {(
                    [
                      ["quantity", "Quantity", 10000],
                      ["weightLb", "Weight per item (lb)", 100000],
                      ["lengthIn", "Length (in)", 1000],
                      ["widthIn", "Width (in)", 1000],
                      ["heightIn", "Height (in)", 1000],
                    ] as const
                  ).map(([field, label, max]) => (
                    <label key={field}>
                      {label}
                      <input
                        type="number"
                        required
                        min={field === "quantity" ? 1 : 0.01}
                        max={max}
                        step={field === "quantity" ? 1 : "any"}
                        value={item[field] || ""}
                        onChange={(e) =>
                          update({
                            items: draft.items.map((v, i) =>
                              i === index
                                ? { ...v, [field]: Number(e.target.value) }
                                : v,
                            ),
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="freight-total">
              <button
                className="text-link"
                type="button"
                disabled={draft.items.length >= 50}
                onClick={() => update({ items: [...draft.items, blankItem()] })}
              >
                <Plus size={16} />
                Add cargo
              </button>
              <span>
                Total weight <strong>{total.toLocaleString("en-US")} lb</strong>
                <span className="density">
                  Density{" "}
                  <strong>
                    {volume ? (total / volume).toFixed(1) : "0"} lb/ft³
                  </strong>
                </span>
              </span>
            </div>
          </section>
          <section className="form-section">
            <h2>Date</h2>
            <label className="date-field">
              Pickup date (UTC)
              <input
                type="date"
                required
                min={utcDate()}
                max={utcDate(366)}
                value={draft.pickupDate}
                onChange={(e) => update({ pickupDate: e.target.value })}
              />
            </label>
          </section>
          <section className="form-section">
            <h2>Pickup and delivery</h2>
            <p className="muted">
              Select any additional services your shipment needs.
            </p>
            <div className="accessorials">
              {services.map((service) => (
                <label key={service}>
                  <input
                    type="checkbox"
                    checked={draft.accessorials.includes(service)}
                    onChange={(e) =>
                      update({
                        accessorials: e.target.checked
                          ? [...draft.accessorials, service]
                          : draft.accessorials.filter((s) => s !== service),
                      })
                    }
                  />
                  {service}
                </label>
              ))}
            </div>
          </section>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <button className="primary wide" disabled={busy || total > 1000000}>
            {busy ? "Finding your rates…" : "Get rates"}
            <ArrowRight size={18} />
          </button>
          {total > 1000000 && (
            <p className="error">Total weight must be 1,000,000 lb or less.</p>
          )}
          <p className="form-footnote">
            Demo rates in USD. Nothing is booked until you confirm.
          </p>
        </form>
      </div>
    );
  if (step === 1)
    return (
      <div className="quote-page">
        {header}
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div className="rates-list">
          {rates.map((rate, index) => {
            const isExpired = new Date(rate.validUntilISO).getTime() <= now;
            return (
              <article
                key={rate.id}
                className={`rate-card ${index === 0 ? "recommended" : ""}`}
              >
                {index === 0 && (
                  <div className="recommendation">
                    <Check size={16} />
                    Recommended · Lowest demo rate
                  </div>
                )}
                <div className="rate-content">
                  <div>
                    <h2>{rate.carrier}</h2>
                    <p>
                      {draft.mode} · {rate.transitDays} transit days
                    </p>
                    <small>
                      Valid until{" "}
                      {new Date(rate.validUntilISO).toLocaleTimeString("en-US")}
                    </small>
                  </div>
                  <div className="rate-action">
                    <div className="price">
                      {money(rate.amountMinor)}
                      <small>USD TOTAL</small>
                    </div>
                    <button
                      className={index === 0 ? "primary" : "secondary"}
                      disabled={isExpired}
                      onClick={() => choose(rate)}
                    >
                      {isExpired
                        ? "Rate expired"
                        : index === 0
                          ? "Continue with this rate"
                          : "Choose"}
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {rates.some((r) => new Date(r.validUntilISO).getTime() <= now) && (
          <button
            className="primary"
            disabled={busy}
            onClick={() => void getRates()}
          >
            Get new rates
          </button>
        )}
        <div className="notice">
          These are synthetic demonstration rates, not market prices. Transit
          days are estimates from demo data.
        </div>
      </div>
    );
  return (
    <div className="quote-page">
      {header}
      <div className="review-layout">
        <div>
          <section className="panel">
            <h2>
              {step === 2 ? "Pickup and delivery" : "Review your shipment"}
            </h2>
            <p className="muted">
              {step === 2
                ? "Check the full addresses before continuing. To change an address, edit the shipment and get new rates."
                : "Please review all details before you book."}
            </p>
            <div className="address-grid">
              <AddressSummary address={draft.origin} title="Pickup" />
              <AddressSummary address={draft.destination} title="Delivery" />
            </div>
            <div className="detail-facts">
              <div>
                <small>Pickup date</small>
                <strong>{draft.pickupDate}</strong>
              </div>
              <div>
                <small>Mode</small>
                <strong>{draft.mode}</strong>
              </div>
            </div>
            <h3>Freight</h3>
            <CargoSummary shipment={draft} />
          </section>
        </div>
        <section className="panel rate-summary">
          <p className="eyebrow">YOUR RATE</p>
          <h2>{selected?.carrier}</h2>
          <p className="muted">
            {selected?.transitDays} transit days · {draft.mode}
          </p>
          <hr />
          <div className="price">{money(selected?.amountMinor || 0)}</div>
          <p className="muted">USD total · No payment taken</p>
          <small>
            Rate expires{" "}
            {selected &&
              new Date(selected.validUntilISO).toLocaleTimeString("en-US")}
          </small>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {expired && !hasAttempt ? (
            <div className="error">
              This rate has expired.
              <button
                className="primary"
                disabled={busy}
                onClick={() => void getRates()}
              >
                Get new rates
              </button>
            </div>
          ) : step === 2 ? (
            <button
              className="primary wide"
              onClick={() => {
                setStep(3);
                window.scrollTo({ top: 0 });
              }}
            >
              Continue to confirm
              <ArrowRight size={17} />
            </button>
          ) : (
            <>
              <div className="notice">
                This creates a local demo record. No freight is booked with a
                carrier.
              </div>
              <button
                className="primary wide"
                disabled={busy}
                onClick={() => void book()}
              >
                {busy
                  ? "Booking…"
                  : hasAttempt
                    ? "Retry demo booking"
                    : "Book demo shipment"}
                <ArrowRight size={17} />
              </button>
              {hasAttempt && (
                <small>Retry preserves your original booking request.</small>
              )}
            </>
          )}
          {!hasAttempt && (
            <button
              className="text-link"
              disabled={busy}
              onClick={() => setStep(step === 3 ? 2 : 1)}
            >
              <ArrowLeft size={15} />
              {step === 3 ? "Back to addresses" : "See all rates"}
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
