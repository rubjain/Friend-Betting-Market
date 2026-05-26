import "../styles.css";
import AppShell from "../components/AppShell";
import { AgoraProvider } from "../context/AgoraContext";

export const metadata = {
  title: "Agora",
  description: "A responsive social prediction markets MVP.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body suppressHydrationWarning>
        <AgoraProvider>
          <AppShell>{children}</AppShell>
        </AgoraProvider>
      </body>
    </html>
  );
}
