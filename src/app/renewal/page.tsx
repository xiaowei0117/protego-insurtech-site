import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import RenewalAssistantClient from "./RenewalAssistantClient";

export default async function RenewalPage() {
  const session = await getServerSession(authOptions);

  // Not logged in -> go to login
  if (!session) {
    redirect("/login");
  }

  // Logged in but not an agent -> block access
  if (session.user.role !== "agent") {
    redirect("/dashboard");
  }

  // Pull the info we care about
  const agentInfo = {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: session.user.role,
  };

  return <RenewalAssistantClient agent={agentInfo} />;
}
