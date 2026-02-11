"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function UsersPage() {
    const queryClient = useQueryClient();
    const { data: users, isLoading } = useQuery(orpc.users.listUsers.queryOptions({}));

    const toggleSuspensionMutation = useMutation(orpc.users.toggleSuspension.mutationOptions({
        onSuccess: () => {
            toast.success("User suspension status updated");
            queryClient.invalidateQueries({ queryKey: orpc.users.listUsers.key({}) });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    }));

    const updatePlanMutation = useMutation(orpc.users.updateUserPlan.mutationOptions({
        onSuccess: () => {
            toast.success("User plan updated");
            queryClient.invalidateQueries({ queryKey: orpc.users.listUsers.key({}) });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    }));

    const updateRoleMutation = useMutation(orpc.users.updateUserRole.mutationOptions({
        onSuccess: () => {
            toast.success("User role updated");
            queryClient.invalidateQueries({ queryKey: orpc.users.listUsers.key({}) });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    }));

    const deleteUserMutation = useMutation(orpc.users.deleteUser.mutationOptions({
        onSuccess: () => {
            toast.success("User deleted");
            queryClient.invalidateQueries({ queryKey: orpc.users.listUsers.key({}) });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    }));

    const toggleCommentingMutation = useMutation(orpc.community.adminToggleCommentPermission.mutationOptions({
        onSuccess: () => {
            toast.success("User commenting permission updated");
            queryClient.invalidateQueries({ queryKey: orpc.users.listUsers.key({}) });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    }));

    if (isLoading) {
        return <div className="p-8 text-center">Loading users...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Users</h1>
                <Badge variant="outline">Total: {users?.length || 0}</Badge>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="w-[70px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users?.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                                        {user.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={user.plan === "pro" ? "default" : "outline"} className={user.plan === "pro" ? "bg-purple-500 hover:bg-purple-600" : ""}>
                                        {user.plan}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {user.isSuspended && (
                                        <Badge variant="destructive">Suspended</Badge>
                                    )}
                                    {!user.isSuspended && (
                                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Active</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {format(new Date(user.createdAt), "MMM d, yyyy")}
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 p-0")}>
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuGroup>
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem
                                                    onClick={() => navigator.clipboard.writeText(user.id)}
                                                >
                                                    Copy ID
                                                </DropdownMenuItem>
                                            </DropdownMenuGroup>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuGroup>
                                                <DropdownMenuLabel>Suspension</DropdownMenuLabel>
                                                <DropdownMenuItem
                                                    onClick={() => toggleSuspensionMutation.mutate({ id: user.id })}
                                                >
                                                    {user.isSuspended ? "Activate User" : "Suspend User"}
                                                </DropdownMenuItem>
                                            </DropdownMenuGroup>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuGroup>
                                                <DropdownMenuLabel>Pro Access</DropdownMenuLabel>
                                                <DropdownMenuItem
                                                    onClick={() => updatePlanMutation.mutate({ id: user.id, plan: "pro" })}
                                                    disabled={user.plan === "pro"}
                                                >
                                                    Grant Pro
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => updatePlanMutation.mutate({ id: user.id, plan: "free" })}
                                                    disabled={user.plan === "free"}
                                                >
                                                    Revoke Pro
                                                </DropdownMenuItem>
                                            </DropdownMenuGroup>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuGroup>
                                                <DropdownMenuLabel>Role Management</DropdownMenuLabel>
                                                <DropdownMenuItem
                                                    onClick={() => updateRoleMutation.mutate({ id: user.id, role: "admin" })}
                                                    disabled={user.role === "admin"}
                                                >
                                                    Grant Admin
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => updateRoleMutation.mutate({ id: user.id, role: "user" })}
                                                    disabled={user.role === "user"}
                                                >
                                                    Revoke Admin
                                                </DropdownMenuItem>
                                            </DropdownMenuGroup>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuGroup>
                                                <DropdownMenuLabel>Danger Zone</DropdownMenuLabel>
                                                <DropdownMenuItem
                                                    onClick={() => toggleCommentingMutation.mutate({ userId: user.id })}
                                                >
                                                    {user.canComment ? "Suspend Commenting" : "Restore Commenting"}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
                                                            deleteUserMutation.mutate({ id: user.id });
                                                        }
                                                    }}
                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                >
                                                    Delete User
                                                </DropdownMenuItem>
                                            </DropdownMenuGroup>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
