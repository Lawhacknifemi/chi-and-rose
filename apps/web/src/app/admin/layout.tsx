export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AdminSidebar } from "@/components/admin-sidebar";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    console.log("AdminLayout: Fetching session...");
    let session;
    try {
        session = await authClient.getSession({
            fetchOptions: {
                headers: await headers(),
                throw: true, // This throws if fetch fails, so we catch it below
            },
        });
    } catch (error) {
        console.error("AdminLayout: Failed to fetch session (likely API connection error):", error);
        // If API is down or unreachable, we shouldn't crash with 500.
        // Redirect to login or show an error state is safer.
        redirect("/login?error=connection_failed");
    }

    console.log("AdminLayout: Session result:", session?.user ? "User Found" : "No User", session?.user?.role);

    if (!session?.user) {
        redirect("/login");
    }

    // @ts-expect-error role is dynamic in DB schema
    if (session.user.role !== "admin") {
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
                <p className="text-muted-foreground mt-2">You do not have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="flex h-full">
            <AdminSidebar />
            <div className="flex-1 overflow-y-auto p-8">
                {children}
            </div>
        </div>
    );
}
