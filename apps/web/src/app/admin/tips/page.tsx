"use client";

import { useState } from "react";
import { orpc } from "@/utils/orpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function TipsPage() {
    const queryClient = useQueryClient();
    const { data: tips, isLoading, refetch } = useQuery(orpc.cms.listTips.queryOptions({}));

    const deleteMutation = useMutation(orpc.cms.deleteTip.mutationOptions({
        onSuccess: () => {
            toast.success("Tip deleted successfully");
            queryClient.invalidateQueries({ queryKey: orpc.cms.listTips.key({}) });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    }));

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this tip?")) {
            deleteMutation.mutate({ id });
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center">Loading tips...</div>;
    }

    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Daily Tips</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage daily health tips for different cycle phases.
                    </p>
                </div>
                <Link href="/admin/tips/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New Tip
                    </Button>
                </Link>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Phase</TableHead>
                            <TableHead>Content</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tips?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    No tips found. Create your first one!
                                </TableCell>
                            </TableRow>
                        ) : (
                            tips?.map((tip) => (
                                <TableRow key={tip.id}>
                                    <TableCell className="capitalize font-medium">
                                        <Badge variant="outline">{tip.phase}</Badge>
                                    </TableCell>
                                    <TableCell className="max-w-md truncate">
                                        {tip.content}
                                    </TableCell>
                                    <TableCell>{tip.category || "-"}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Link href={`/admin/tips/${tip.id}`}>
                                                <Button variant="ghost" size="icon">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(tip.id)}
                                            >
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
