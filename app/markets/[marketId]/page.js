import MarketDetailPage from "../../../components/pages/MarketDetailPage";

export default async function MarketDetail({ params }) {
  const { marketId } = await params;
  return <MarketDetailPage marketId={marketId} />;
}
