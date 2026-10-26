import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AccordOps AI",
    template: "%s · AccordOps AI",
  },
  description:
    "Turn contract commitments into monitored operational controls and keep every decision accountable.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
