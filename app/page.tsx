import { redirect } from "next/navigation";
import { auth0 } from "../lib/auth0";
import LandingPage from "./LandingPage";

export default async function Home() {
  const session = await auth0.getSession();
  if (session) redirect("/dashboard");
  return <LandingPage />;
}
