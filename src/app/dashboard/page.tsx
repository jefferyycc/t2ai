import { redirect } from "next/navigation";

import { DashboardClient } from "@/components/dashboard-client";
import { getDashboardSnapshot } from "@/lib/mock-db";

export default function DashboardPage() {
  const snapshot = getDashboardSnapshot();

  if (!snapshot.planBundle) {
    redirect("/");
  }

  return <DashboardClient initialSnapshot={snapshot} />;
}
