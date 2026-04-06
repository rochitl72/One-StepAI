import { redirect } from "next/navigation";
import { auth0 } from "../../../lib/auth0";
import WorkspaceClient from "./WorkspaceClient";

type WorkspacePageProps = {
  params: Promise<{ issueId: string }>;
};

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login");

  const { issueId } = await params;
  // Format: repoOwner__repoName__issueNumber
  const parts = issueId.split("__");
  const issueNumber = parseInt(parts[parts.length - 1]);
  const repoFullName = parts.slice(0, -1).join("/");

  return (
    <WorkspaceClient
      repoFullName={repoFullName}
      issueNumber={issueNumber}
      user={session.user}
    />
  );
}
