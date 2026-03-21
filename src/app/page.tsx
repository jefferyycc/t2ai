import { HomeClient } from "@/components/home-client";
import { getDashboardSnapshot } from "@/lib/mock-db";

export default function HomePage() {
  const snapshot = getDashboardSnapshot();

  return <HomeClient initialSnapshot={snapshot} />;
}
