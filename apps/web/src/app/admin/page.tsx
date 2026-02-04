import { headers } from "next/headers";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";

export default async function AdminDashboardPage() {
    const session = await authClient.getSession({
        fetchOptions: { headers: await headers() },
    });

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {session?.user?.name}.</p>

            <div className="grid gap-4 md:grid-cols-3">
                <Link href="/admin/articles" className="block">
                    <div className="p-6 border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <h3 className="font-semibold mb-2">Articles</h3>
                        <p className="text-sm text-muted-foreground">Create and edit articles</p>
                    </div>
                </Link>
                <Link href="/admin/tips" className="block">
                    <div className="p-6 border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <h3 className="font-semibold mb-2">Daily Tips</h3>
                        <p className="text-sm text-muted-foreground">Manage daily insights</p>
                    </div>
                </Link>
                <Link href="/admin/users" className="block">
                    <div className="p-6 border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <h3 className="font-semibold mb-2">Users</h3>
                        <p className="text-sm text-muted-foreground">View signed up users</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}
