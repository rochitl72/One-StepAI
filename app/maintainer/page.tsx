import { redirect } from "next/navigation";
import { auth0 } from "../../lib/auth0";
import MaintainerClient from "./MaintainerClient";

export default async function MaintainerPage() {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login");

  // Check Auth0 FGA role
  const roles = (session.user["https://openstep.ai/roles"] as string[]) || [];
  if (!roles.includes("maintainer")) {
    redirect("/dashboard?error=not_maintainer");
  }

  return <MaintainerClient user={session.user} />;
}
