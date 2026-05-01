import "../styles.css";
import AppShell from "../components/AppShell";
import { FriendMarketProvider } from "../context/FriendMarketContext";

export const metadata = {
  title: "Agora",
  description: "A responsive social prediction markets MVP.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body suppressHydrationWarning>
        <FriendMarketProvider>
          <AppShell>{children}</AppShell>
        </FriendMarketProvider>
      </body>
    </html>
  );
}
