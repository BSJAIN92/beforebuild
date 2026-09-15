import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Providers } from "../components/Providers";
import "./globals.css";
export const metadata: Metadata = {
  title: "BeforeBuild · Think first. Build better.",
  description: "Turn a rough idea into a business worth testing. A guided conversation, a live business model canvas, and a practical validation plan.",
  robots: { index: false, follow: false }
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><Providers>{children}</Providers><Link className="global-terms-link" href="/terms">Terms and Conditions</Link></body></html>;
}
