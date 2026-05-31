import Link from "next/link";
import { SectionHead } from "../ui";

const faqItems = [
  {
    q: "What is Agora?",
    a: "Agora is a social prediction markets desk where you browse sports and other event markets, take positions with play credits, and see how prices move with the community. It is designed for friends to compare takes, use boosts, and follow live-linked games when feeds are available.",
  },
  {
    q: "Is this real-money gambling?",
    a: "The product is built as a demo and social experience. Play credits, balances, and flows you see are for testing the interface and workflows. Enabling real money or operating as a licensed gambling product would require separate legal, compliance, and product work in your jurisdiction.",
  },
  {
    q: "How do markets work here?",
    a: "Each market is a question with a clear resolution rule, such as which side wins a game or whether a threshold is met. When the event resolves under the posted rule, positions are settled. Read the resolution text on each market detail page before you commit size.",
  },
  {
    q: "What are YES and NO prices?",
    a: "Prices are shown as implied probabilities. A YES price of 0.60 means the market is trading as if there is a 60% chance the YES outcome happens, before fees. They can move as people trade, boost, or as new information appears.",
  },
  {
    q: "How do friends and boosts work?",
    a: "You can connect with friends, see activity in the feed, and use boosts to highlight markets you care about. Boosts are a social signal, not a guarantee of profit or a recommendation to trade.",
  },
  {
    q: "How do deposits and withdrawals work?",
    a: "Deposit and withdraw screens demonstrate how a funded account might work in production. In the demo environment, actions may be simulated or limited. Always confirm funding rules with your actual deployment and compliance requirements.",
  },
  {
    q: "Why do some markets show live scores?",
    a: "When a market is linked to a supported live feed, scores and clocks update for context. Feeds can lag or fail; the official result still controls resolution per the market rules.",
  },
  {
    q: "How do I verify my email?",
    a: "After sign-up, use the verify email flow linked from the auth pages or settings when email verification is enabled. Some features may stay restricted until verification completes.",
  },
  {
    q: "Who can I contact about my account?",
    a: "Use your deployment’s support channel. For this workspace, check with the operator running the instance. Agora does not provide legal, tax, or investment advice.",
  },
];

export default function FaqPage() {
  return (
    <section className="page active">
      <SectionHead
        title="FAQ"
        body="Quick answers about how Agora works, play credits, markets, and social features."
      />
      <p className="legal-summary">
        For binding terms, read the <Link href="/legal">Terms of Use</Link>. For how we handle personal data, see the{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
      <div className="faq-list list-card">
        {faqItems.map(({ q, a }) => (
          <details className="faq-item" key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
