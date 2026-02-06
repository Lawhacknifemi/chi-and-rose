"use client";

import { useState } from "react";
import { orpc } from "@/utils/orpc";
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
import { Plus, Edit, Trash, MessageSquare, User, Calendar, MoreHorizontal, Copy } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function CommunityAdminPage() {
    const [activeTab, setActiveTab] = useState("groups");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupDescription, setNewGroupDescription] = useState("");

    const { data: groups, isLoading: isGroupsLoading, refetch: refetchGroups } = useQuery(
        orpc.community.getGroups.queryOptions()
    );

    const { data: allPosts, isLoading: isPostsLoading, refetch: refetchPosts } = useQuery(
        orpc.community.adminListAllPosts.queryOptions()
    );

    const createGroup = useMutation(orpc.community.createGroup.mutationOptions({
        onSuccess: () => {
            toast.success("Group created successfully");
            setIsCreateDialogOpen(false);
            setNewGroupName("");
            setNewGroupDescription("");
            refetchGroups();
        },
        onError: (err) => {
            toast.error("Failed to create group");
        }
    }));

    const deleteGroup = useMutation(orpc.community.adminDeleteGroup.mutationOptions({
        onSuccess: () => {
            toast.success("Group deleted successfully");
            refetchGroups();
        },
        onError: (err) => {
            toast.error("Failed to delete group");
        }
    }));

    const deletePost = useMutation(orpc.community.adminDeletePost.mutationOptions({
        onSuccess: () => {
            toast.success("Post deleted");
            refetchPosts();
        },
        onError: (err) => {
            toast.error("Failed to delete post");
        }
    }));

    const handleCreateGroup = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;
        createGroup.mutate({
            name: newGroupName,
            description: newGroupDescription
        });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.info("Copied to clipboard");
    };

    const isLoading = isGroupsLoading || isPostsLoading;

    if (isLoading && !groups && !allPosts) return <div className="p-8 text-center text-muted-foreground">Loading community data...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Community Management</h1>
                    <p className="text-muted-foreground">Manage groups and moderation</p>
                </div>

                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger
                        render={
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                New Group
                            </Button>
                        }
                    />
                    <DialogContent>
                        <form onSubmit={handleCreateGroup}>
                            <DialogHeader>
                                <DialogTitle>Create New Community Group</DialogTitle>
                                <DialogDescription>
                                    Create a new group for community discussions.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        placeholder="e.g. PCOS Support Group"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={newGroupDescription}
                                        onChange={(e) => setNewGroupDescription(e.target.value)}
                                        placeholder="Briefly describe what this group is for..."
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={createGroup.isPending}>
                                    {createGroup.isPending ? "Creating..." : "Create Group"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList>
                    <TabsTrigger value="groups">Groups</TabsTrigger>
                    <TabsTrigger value="posts">Global Feed (Moderation)</TabsTrigger>
                </TabsList>

                <TabsContent value="groups" className="space-y-4">
                    <div className="border rounded-lg bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Group Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-center">Members</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groups?.map((group) => (
                                    <TableRow key={group.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <MessageSquare className="h-4 w-4 text-primary" />
                                                </div>
                                                {group.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <p className="max-w-xs truncate text-muted-foreground">
                                                {group.description || "No description"}
                                            </p>
                                        </TableCell>
                                        <TableCell className="text-center font-semibold">
                                            {group.memberCount}
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                render={
                                                    <Link href={`/admin/community/groups/${group.id}`}>
                                                        <Edit className="h-4 w-4" />
                                                    </Link>
                                                }
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => {
                                                    if (confirm(`Are you sure you want to delete the group "${group.name}"? This will also delete all posts and comments in this group.`)) {
                                                        deleteGroup.mutate({ groupId: group.id });
                                                    }
                                                }}
                                                disabled={deleteGroup.isPending}
                                            >
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {groups?.length === 0 && !isGroupsLoading && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                            No community groups found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="posts" className="space-y-4">
                    <div className="border rounded-lg bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Author / Title</TableHead>
                                    <TableHead>Group</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-center">Comments</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allPosts?.map((post) => (
                                    <TableRow key={post.id}>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="font-medium truncate max-w-sm">{post.title}</div>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <User className="h-3 w-3" />
                                                    {post.authorName || "Unknown"}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                                                {post.groupName}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(post.createdAt), "MMM d, yyyy")}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-medium">
                                            {post.commentsCount}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger
                                                    render={
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    }
                                                />
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuGroup>
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => copyToClipboard(post.authorId || "")}>
                                                            <Copy className="mr-2 h-4 w-4" />
                                                            Copy Author ID
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => copyToClipboard(post.id)}>
                                                            <Copy className="mr-2 h-4 w-4" />
                                                            Copy Post ID
                                                        </DropdownMenuItem>
                                                    </DropdownMenuGroup>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={() => {
                                                            if (confirm("Are you sure you want to delete this post?")) {
                                                                deletePost.mutate({ postId: post.id });
                                                            }
                                                        }}
                                                        disabled={deletePost.isPending}
                                                    >
                                                        <Trash className="mr-2 h-4 w-4" />
                                                        Delete Post
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {allPosts?.length === 0 && !isPostsLoading && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                            No posts found across any groups.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
