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
    const session = await authClient.getSession({
        fetchOptions: {
            headers: await headers(),
            throw: true,
        },
    });
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
