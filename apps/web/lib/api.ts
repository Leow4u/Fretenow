export type {
  Account,
  Address,
  CargoItem,
  Draft,
  Rate,
  Shipment,
  Snapshot,
} from "../../../packages/contracts/src/index";
export class ApiFailure extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body != null && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  const response = await fetch(`/api/${path}`, {
    ...options,
    credentials: "include",
    cache: "no-store",
    headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({
      error: { code: "HTTP_ERROR", message: "Please try again." },
    }));
    if (response.status === 401)
      window.dispatchEvent(new Event("session-expired"));
    throw new ApiFailure(
      response.status,
      body.error.code,
      body.error.message,
      body.error.fields,
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export const money = (minor: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    minor / 100,
  );
// Pickup dates use the API's UTC calendar, independent of browser timezone.
// Inject an instant in tests; never replace the process/global clock.
export function utcDate(offset = 0, now = new Date()) {
  const date = new Date(now.getTime());
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
export function errorText(error: unknown) {
  return error instanceof ApiFailure
    ? `${error.message}${
        error.fields
          ? " · " +
            Object.entries(error.fields)
              .map(([k, v]) => `${k}: ${v}`)
              .join("; ")
          : ""
      } (${error.code})`
    : error instanceof Error
      ? error.message
      : "Something went wrong. Please try again.";
}
