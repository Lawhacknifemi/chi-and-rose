import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import Dashboard from "./dashboard";

export default async function DashboardPage() {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });
  console.log("Dashboard Session User:", session?.user);

  if (!session?.user) {
    redirect("/login");
  }

  // @ts-expect-error role is dynamic in DB
  if (session.user.role === "admin") {
    redirect("/admin");
  }

  const { data: customerState } = await authClient.customer.state({
    fetchOptions: {
      headers: await headers(),
    },
  });

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome {session.user.name}</p>
      <Dashboard session={session} customerState={customerState} />
    </div>
  );
}
