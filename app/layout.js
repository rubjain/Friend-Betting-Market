import "../styles.css";
import AppShell from "../components/AppShell";
import { FriendMarketProvider } from "../context/FriendMarketContext";

export const metadata = {
  title: "FriendMarket",
  description: "A responsive social prediction markets MVP.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <FriendMarketProvider>
          <AppShell>{children}</AppShell>
        </FriendMarketProvider>
      </body>
    </html>
  );
}
