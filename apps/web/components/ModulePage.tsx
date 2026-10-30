"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText, Download, Building2 } from "lucide-react";
import { api, errorText, money, type Account, type Shipment } from "../lib/api";
const modules: Record<
  string,
  { title: string; copy: string; empty: string; link: string; linkText: string }
> = {
  documents: {
    title: "Documents",
    copy: "Shipping paperwork, together in one place.",
    empty:
      "No documents yet. Document generation and uploads are unavailable in this demo.",
    link: "/shipments",
    linkText: "View shipments",
  },
  payments: {
    title: "Payments",
    copy: "A clear view of your shipping payments.",
    empty:
      "No payments. Payment methods, credit and invoices are unavailable in this demo. Demo bookings do not take payment.",
    link: "/ship",
    linkText: "Get a demo rate",
  },
  claims: {
    title: "Claims",
    copy: "Keep freight issues in view.",
    empty:
      "No claims. Filing claims and carrier claim handling are unavailable in this demo.",
    link: "/shipments",
    linkText: "View shipments",
  },
  schedules: {
    title: "Schedules",
    copy: "A place for your recurring shipments.",
    empty:
      "No schedules. Recurring bookings and scheduling are unavailable in this demo.",
    link: "/ship",
    linkText: "Book a single demo shipment",
  },
  "price-matches": {
    title: "Price matches",
    copy: "A place for your quote comparisons.",
    empty:
      "No price matches. Submitting and matching external quotes are unavailable in this demo.",
    link: "/ship",
    linkText: "Compare demo rates",
  },
};
type Analytics = {
  totalShipments: number;
  bookedAmountMinor: number;
  currency: string;
  byStatus: Record<string, number>;
};
type SettingsData = {
  organization: { name: string };
  preferences: {
    currency: string;
    weightUnit: string;
    dimensionUnit: string;
    timezone: string;
  };
  members: { name: string; role: string }[];
  locations: unknown[];
};
export default function ModulePage({
  path,
  account,
  shipments,
}: {
  path: string;
  account: Account;
  shipments: Shipment[];
}) {
  const name = path.slice(1);
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await api(`v1/${name}`));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [name]);
  function exportCsv() {
    const rows = [
      [
        "ID",
        "Status",
        "Origin",
        "Destination",
        "Pickup date",
        "Carrier",
        "Amount USD",
      ],
      ...shipments.map((s) => [
        s.id,
        s.status,
        `${s.origin.city} ${s.origin.state}`,
        `${s.destination.city} ${s.destination.state}`,
        s.pickupDate,
        s.carrier,
        (s.amountMinor / 100).toFixed(2),
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map(
            (value) =>
              '"' +
              String(value)
                .replace(/^[=+@-]/, "'$&")
                .replaceAll('"', '""') +
              '"',
          )
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "fretenow-demo-shipments.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  if (loading) return <p role="status">Loading {name}…</p>;
  if (error)
    return (
      <div className="error" role="alert">
        {error}
        <button onClick={() => void load()}>Retry</button>
      </div>
    );
  if (name === "analytics") {
    const a = data as Analytics;
    return (
      <>
        <div className="page-heading">
          <div>
            <h1>Analytics</h1>
            <p>Your freight activity at a glance. Demo data.</p>
          </div>
          <button className="secondary" onClick={exportCsv}>
            <Download size={17} />
            Export shipments CSV
          </button>
        </div>
        <div className="metrics">
          <section className="panel">
            <p>Total shipments</p>
            <strong>{a.totalShipments}</strong>
          </section>
          <section className="panel">
            <p>Booked amount</p>
            <strong>{money(a.bookedAmountMinor)}</strong>
            <small>Excludes cancelled shipments · USD</small>
          </section>
        </div>
        <section className="panel">
          <h2>Shipments by status</h2>
          {Object.entries(a.byStatus).map(([status, value]) => (
            <div className="bar-row" key={status}>
              <span>{status.replaceAll("_", " ")}</span>
              <div className="bar-track">
                <div
                  style={{
                    width: `${a.totalShipments ? (value / a.totalShipments) * 100 : 0}%`,
                  }}
                />
              </div>
              <strong>{value}</strong>
            </div>
          ))}
          {!a.totalShipments && (
            <p className="muted">
              Book your first demo shipment to start seeing activity.
            </p>
          )}
        </section>
      </>
    );
  }
  if (name === "settings") {
    const s = data as SettingsData;
    return (
      <>
        <div className="page-heading">
          <div>
            <h1>Settings</h1>
            <p>Your company and shipping preferences.</p>
          </div>
          <span className="demo-label">Read only · Demo</span>
        </div>
        <section className="panel">
          <div className="panel-heading">
            <Building2 size={22} />
            <h2>{s.organization.name}</h2>
          </div>
          <div className="detail-facts">
            <div>
              <small>Account</small>
              <strong>{account.name}</strong>
              <span>{account.email}</span>
            </div>
            <div>
              <small>Source units</small>
              <strong>
                {s.preferences.currency} · {s.preferences.weightUnit} ·{" "}
                {s.preferences.dimensionUnit}
              </strong>
              <span>{s.preferences.timezone}</span>
            </div>
          </div>
          <h3>Team</h3>
          {s.members.map((m) => (
            <p key={m.name}>
              {m.name} <span className="status booked">{m.role}</span>
            </p>
          ))}
          <hr />
          <h3>Saved locations</h3>
          <p className="muted">
            {s.locations.length} saved locations. Saving locations, inviting
            members and editing company details are unavailable in this demo.
          </p>
        </section>
      </>
    );
  }
  const m = modules[name];
  if (!m)
    return (
      <div className="empty-state">
        <h1>Page not found</h1>
        <Link href="/">Back to Home</Link>
      </div>
    );
  const items =
    (data as Record<string, unknown[]>)[
      name === "price-matches" ? "priceMatches" : name
    ] || [];
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{m.title}</h1>
          <p>{m.copy}</p>
        </div>
        <span className="demo-label">Demo · Read only</span>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>{m.title}</h2>
          <span className="count">{items.length}</span>
        </div>
        <div className="empty-state">
          <span className="empty-icon">
            <FileText size={29} />
          </span>
          <h3>{`Your ${m.title.toLowerCase()} will live here`}</h3>
          <p>{m.empty}</p>
          <Link className="secondary" href={m.link}>
            {m.linkText}
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
