"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Plus,
  Package,
  ChartNoAxesCombined,
  FileText,
  CreditCard,
  TriangleAlert,
  Settings,
  CalendarDays,
  Tags,
  Search,
  ArrowUpRight,
  ChevronDown,
  Menu,
  LogOut,
  Truck,
  ArrowRight,
  Building2,
  Users,
} from "lucide-react";
import { api, ApiFailure, errorText, type Snapshot } from "../lib/api";
import ShipFlow from "./ShipFlow";
import { ShipmentList, ShipmentDetail } from "./Shipments";
import ModulePage from "./ModulePage";
const navigation = [
  ["/", "Home", Home],
  ["/ship", "Ship something", Plus],
  ["/shipments", "Shipments", Package],
  ["/analytics", "Analytics", ChartNoAxesCombined],
  ["/documents", "Documents", FileText],
  ["/payments", "Payments", CreditCard],
  ["/claims", "Claims", TriangleAlert],
  ["/settings", "Settings", Settings],
  ["/schedules", "Schedules", CalendarDays],
  ["/price-matches", "Price matches", Tags],
] as const;
export default function Portal() {
  const path = usePathname();
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [account, setAccount] = useState(false);
  const [search, setSearch] = useState("");
  const hadSession = useRef(false);
  const refresh = useCallback(async () => {
    try {
      setError("");
      setSnapshot(await api<Snapshot>("v1/snapshot"));
      hadSession.current = true;
    } catch (e) {
      if (e instanceof ApiFailure && e.status === 401) setSnapshot(null);
      else setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const expired = () => {
      setSnapshot(null);
      if (hadSession.current)
        setNotice(
          "Your session has expired. Open the demo workspace to continue.",
        );
      hadSession.current = false;
    };
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, [refresh]);
  useEffect(() => {
    setMenu(false);
    setAccount(false);
    setSearch("");
  }, [path]);
  async function signIn() {
    setBusy(true);
    setError("");
    try {
      await api("demo/session", { method: "POST" });
      await refresh();
      setNotice("");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    try {
      await api("auth/signout", { method: "POST" });
      hadSession.current = false;
      setSnapshot(null);
      router.push("/");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <div className="access">
        <img src="/brand/logo.svg" alt="FreteNow" />
        <p role="status">Opening your workspace…</p>
      </div>
    );
  if (!snapshot)
    return (
      <main className="access">
        <div className="access-card">
          <img src="/brand/logo.svg" alt="FreteNow" />
          <span className="demo-label">Local demo</span>
          <h1>
            Your freight.
            <br />
            Moving forward.
          </h1>
          <p>One workspace to quote, book and keep your shipments in view.</p>
          <div className="notice">
            This is a local demonstration. No real freight is booked and no
            payment is taken.
          </div>
          {notice && <p role="status">{notice}</p>}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary wide" onClick={signIn} disabled={busy}>
            {busy ? "Opening…" : "Open demo workspace"}
            <ArrowRight size={18} />
          </button>
          {error && (
            <button onClick={() => void refresh()}>Retry connection</button>
          )}
          <small>FreteNow Demo Company · USD / lb / in</small>
        </div>
      </main>
    );
  const first = snapshot.account.name.split(" ")[0];
  return (
    <div className="portal">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <Link href="/" className="brand">
          <img src="/brand/logo-white.svg" alt="FreteNow" />
        </Link>
        <div className="workspace-name">
          <span className="workspace-icon">F</span>
          <div>
            Demo Company<small>FreteNow workspace</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <nav aria-label="Main navigation">
          {navigation.map(([href, label, Icon], index) => (
            <Link
              key={href}
              href={href}
              className={`${index === 8 ? "secondary-nav " : ""}${(href === "/" ? path === "/" : path.startsWith(href)) ? "active" : ""}`}
            >
              <Icon size={19} />
              {label}
              {href === "/ship" && (
                <ArrowUpRight size={15} className="nav-end" />
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="demo-label">Demo workspace</span>
          <p>All freight activity stays local.</p>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Toggle navigation"
            onClick={() => setMenu(!menu)}
          >
            <Menu size={21} />
          </button>
          <form
            className="global-search"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/shipments?q=${encodeURIComponent(search)}`);
            }}
          >
            <Search size={18} />
            <input
              aria-label="Search shipments"
              placeholder="Search shipments"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <kbd>↵</kbd>
          </form>
          <span className="top-demo">Demo</span>
          <div className="account-wrap">
            <button
              className="account-button"
              aria-label="Account menu"
              aria-expanded={account}
              onClick={() => setAccount(!account)}
            >
              <span className="avatar">AD</span>
              <span>{snapshot.account.name}</span>
              <ChevronDown size={15} />
            </button>
            {account && (
              <div className="account-menu">
                <strong>{snapshot.account.organizationName}</strong>
                <small>{snapshot.account.email}</small>
                <Link href="/settings">
                  Account details
                  <ArrowUpRight size={16} />
                </Link>
                <button onClick={signOut} disabled={busy}>
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="content">
          {error && (
            <div className="error" role="alert">
              {error}
              <button onClick={() => void refresh()}>Retry</button>
            </div>
          )}
          {path === "/" ? (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">YOUR WORKSPACE</p>
                  <h1>Good day, {first}.</h1>
                  <p>Let’s get your freight moving.</p>
                </div>
                <Link className="primary" href="/ship">
                  <Plus size={19} />
                  Ship something
                </Link>
              </div>
              <ShipmentList shipments={snapshot.shipments} home />
              <div className="section-title">
                <h2>Make yourself at home</h2>
                <span>A few things to know</span>
              </div>
              <div className="setup-list">
                {[
                  [
                    CreditCard,
                    "Payments in your workspace",
                    "View payment availability for this demo.",
                    "/payments",
                  ],
                  [
                    Building2,
                    "Your company, in one place",
                    "View company details and shipping preferences.",
                    "/settings",
                  ],
                  [
                    Users,
                    "Your workspace team",
                    "See your demo account and membership.",
                    "/settings",
                  ],
                ].map(([Icon, title, copy, href]) => {
                  const I = Icon as typeof CreditCard;
                  return (
                    <Link
                      key={String(title)}
                      className="setup-row"
                      href={String(href)}
                    >
                      <span className="setup-icon">
                        <I size={22} />
                      </span>
                      <div>
                        <strong>{String(title)}</strong>
                        <p>{String(copy)}</p>
                      </div>
                      <ArrowUpRight size={18} />
                    </Link>
                  );
                })}
              </div>
              <div className="local-note">
                <Truck size={18} />
                <span>
                  A clear view of every move. Demo bookings appear here as soon
                  as you book.
                </span>
              </div>
            </>
          ) : path === "/ship" ? (
            <ShipFlow onBooked={refresh} />
          ) : path === "/shipments" ? (
            <>
              <div className="page-heading">
                <div>
                  <h1>Shipments</h1>
                  <p>Every shipment, from booking to delivery.</p>
                </div>
                <Link href="/ship" className="primary">
                  <Plus size={18} />
                  Ship something
                </Link>
              </div>
              <ShipmentList shipments={snapshot.shipments} />
            </>
          ) : path.startsWith("/shipments/") ? (
            <ShipmentDetail id={path.split("/")[2]} onChanged={refresh} />
          ) : (
            <ModulePage
              path={path}
              account={snapshot.account}
              shipments={snapshot.shipments}
            />
          )}
        </main>
        <footer className="page-footer">
          FreteNow <span>Local demonstration · No real freight is booked</span>
        </footer>
      </div>
    </div>
  );
}
