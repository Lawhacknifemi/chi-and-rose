"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    FileText,
    Lightbulb,
    Users,
    Settings,
    ScanBarcode,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
    {
        title: "Dashboard",
        url: "/admin",
        icon: LayoutDashboard,
    },
    {
        title: "Articles",
        url: "/admin/articles",
        icon: FileText,
    },
    {
        title: "Daily Tips",
        url: "/admin/tips",
        icon: Lightbulb,
    },
    {
        title: "Users",
        url: "/admin/users",
        icon: Users,
    },
    {
        title: "Scanner",
        url: "/admin/scanner",
        icon: ScanBarcode,
    },
];

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <div className="w-64 border-r bg-muted/20 h-full p-4 hidden md:block">
            <div className="mb-4 px-2 text-lg font-semibold text-primary">Admin Panel</div>
            <nav className="space-y-1">
                {items.map((item) => (
                    <Link
                        key={item.title}
                        href={item.url}
                        className={cn(
                            "flex items-center gap-2 px-2 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors",
                            pathname === item.url ? "bg-muted text-foreground" : "text-muted-foreground"
                        )}
                    >
                        <item.icon className="h-4 w-4" />
                        {item.title}
                    </Link>
                ))}
            </nav>
        </div>
    );
}
