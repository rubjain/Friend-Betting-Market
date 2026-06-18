import LiveGameDetailPage from "../../../components/pages/LiveGameDetailPage";

export default async function LiveGameRoute({ params }) {
  const { gameId } = await params;
  return <LiveGameDetailPage gameId={gameId} />;
}
