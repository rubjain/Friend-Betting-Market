import "../styles.css";
import { Playfair_Display, JetBrains_Mono } from "next/font/google";
import AppShell from "../components/AppShell";
import { AgoraProvider } from "../context/AgoraContext";

// High-contrast pairing for the data dashboard: a display serif for large
// probability figures, a monospace for ticker/market data. Exposed as CSS
// variables so only the terminal surfaces opt in — the rest of the app keeps
// its existing type.
const displaySerif = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const tickerMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata = {
  title: "Agora",
  description: "A responsive social prediction markets MVP.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${displaySerif.variable} ${tickerMono.variable}`} suppressHydrationWarning>
        <AgoraProvider>
          <AppShell>{children}</AppShell>
        </AgoraProvider>
      </body>
    </html>
  );
}
