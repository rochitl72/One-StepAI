import { redirect } from "next/navigation";
import { auth0 } from "../../lib/auth0";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login");

  return <DashboardClient user={session.user} />;
}
