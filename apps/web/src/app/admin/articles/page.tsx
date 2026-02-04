"use client";

import { useState } from "react";
import { orpc } from "@/utils/orpc"; // Client-side ORPC
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { format } from "date-fns";
import { toast } from "sonner";

export default function ArticlesPage() {
    const { data: articles, isLoading, refetch } = useQuery(
        orpc.cms.listArticles.queryOptions()
    );

    const deleteArticle = useMutation(orpc.cms.deleteArticle.mutationOptions({
        onSuccess: () => {
            toast.success("Article deleted");
            refetch();
        },
        onError: (err) => {
            toast.error("Failed to delete article");
        }
    }));


    if (isLoading) return <div>Loading articles...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Articles</h1>
                <Link href="/admin/articles/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New Article
                    </Button>
                </Link>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {articles?.map((article) => (
                            <TableRow key={article.id}>
                                <TableCell className="font-medium">{article.title}</TableCell>
                                <TableCell>{article.category}</TableCell>
                                <TableCell>
                                    {article.isPublished ? (
                                        <span className="text-green-600 font-medium">Published</span>
                                    ) : (
                                        <span className="text-yellow-600">Draft</span>
                                    )}
                                </TableCell>
                                <TableCell>{format(new Date(article.createdAt), "MMM d, yyyy")}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Link href={`/admin/articles/${article.id}`}>
                                        <Button variant="ghost" size="icon">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => {
                                            if (confirm('Are you sure?')) deleteArticle.mutate({ id: article.id })
                                        }}
                                    >
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {articles?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No articles found. Create one to get started.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
