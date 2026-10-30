import localFont from "next/font/local";
import "./globals.css";
const body = localFont({
  src: "../public/brand/InstrumentSans-Variable.ttf",
  variable: "--font-body",
  display: "swap",
});
const display = localFont({
  src: "../public/brand/BricolageGrotesque-Variable.ttf",
  variable: "--font-display",
  display: "swap",
});
export const metadata = {
  title: "FreteNow · Your freight workspace",
  description: "FreteNow local freight demonstration workspace",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${body.variable} ${display.variable}`}>{children}</body>
    </html>
  );
}
