import StrategyDetailPage from "../../../components/pages/StrategyDetailPage";

export default async function StrategyDetail({ params }) {
  const { profileId } = await params;
  return <StrategyDetailPage profileId={profileId} />;
}
