"use client";

import { useState, use } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
    Save,
    Trash,
    MessageSquare,
    User,
    Calendar,
    ArrowLeft,
    Users,
    MoreHorizontal,
    Copy,
    ShieldAlert,
    ShieldCheck
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function GroupAdminDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: groupId } = use(params);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [iconUrl, setIconUrl] = useState("");
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

    const { data: group, isLoading: isGroupLoading } = useQuery(
        orpc.community.getGroupDetails.queryOptions({ input: { groupId } }, {
            onSuccess: (data) => {
                setName(data.name);
                setDescription(data.description || "");
                setIconUrl(data.iconUrl || "");
            }
        })
    );

    const { data: posts, isLoading: isPostsLoading, refetch: refetchPosts } = useQuery(
        orpc.community.listGroupPosts.queryOptions({ input: { groupId } })
    );

    const { data: members, isLoading: isMembersLoading } = useQuery(
        orpc.community.adminListGroupMembers.queryOptions({ input: { groupId } })
    );

    const updateGroup = useMutation(orpc.community.adminUpdateGroup.mutationOptions({
        onSuccess: () => {
            toast.success("Group updated successfully");
        },
        onError: (err) => {
            toast.error("Failed to update group");
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

    const toggleCommenting = useMutation(orpc.community.adminToggleCommentPermission.mutationOptions({
        onSuccess: (data) => {
            toast.success(`User commenting permission ${data.canComment ? "restored" : "suspended"}`);
            queryClient.invalidateQueries({ queryKey: orpc.community.adminListGroupMembers.key({ groupId }) });
        },
        onError: (err) => {
            toast.error("Failed to update user permission");
        }
    }));

    const deleteComment = useMutation(orpc.community.adminDeleteComment.mutationOptions({
        onSuccess: () => {
            toast.success("Comment deleted");
        },
        onError: (err) => {
            toast.error("Failed to delete comment");
        }
    }));

    const { data: postWithComments, refetch: refetchComments } = useQuery(
        orpc.community.getPostDetails.queryOptions(
            { input: { postId: selectedPostId || "" } },
            { enabled: !!selectedPostId }
        )
    );

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.info("Copied to clipboard");
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        updateGroup.mutate({
            groupId,
            name,
            description,
            iconUrl
        });
    };

    if (isGroupLoading) return <div className="p-8 text-center text-muted-foreground">Loading group details...</div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" render={
                        <Link href="/admin/community">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    } />
                    <div>
                        <h1 className="text-3xl font-bold">Manage Group</h1>
                        <p className="text-muted-foreground">{group?.name}</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-4">
                {/* Sidebar: Group Settings */}
                <div className="lg:col-span-1">
                    <div className="p-6 border rounded-lg bg-card space-y-4">
                        <h2 className="text-xl font-semibold mb-4">Settings</h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Group Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="iconUrl">Icon URL</Label>
                                <Input
                                    id="iconUrl"
                                    value={iconUrl}
                                    onChange={(e) => setIconUrl(e.target.value)}
                                    placeholder="https://..."
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={updateGroup.isPending}>
                                <Save className="mr-2 h-4 w-4" />
                                {updateGroup.isPending ? "Saving..." : "Save Changes"}
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Main Content: Tabs for Posts and Members */}
                <div className="lg:col-span-3">
                    <Tabs defaultValue="posts" className="space-y-6">
                        <TabsList>
                            <TabsTrigger value="posts" className="gap-2">
                                <MessageSquare className="h-4 w-4" />
                                Posts ({posts?.length || 0})
                            </TabsTrigger>
                            <TabsTrigger value="members" className="gap-2">
                                <Users className="h-4 w-4" />
                                Members ({members?.length || 0})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="posts" className="space-y-4">
                            <div className="border rounded-lg bg-card overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Author / Title</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-center">Comments</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {posts?.map((post) => (
                                            <TableRow key={post.id}>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="font-medium truncate max-w-md">{post.title}</div>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <User className="h-3 w-3" />
                                                            {post.author?.name || "Unknown"}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
                                                        <Calendar className="h-3 w-3" />
                                                        {format(new Date(post.createdAt), "MMM d, yyyy")}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-medium">
                                                    {post.commentsCount}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Dialog>
                                                            <DialogTrigger
                                                                render={
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => {
                                                                            setSelectedPostId(post.id);
                                                                            refetchComments();
                                                                        }}
                                                                    >
                                                                        <MessageSquare className="h-4 w-4" />
                                                                    </Button>
                                                                }
                                                            />
                                                            <DialogContent className="max-w-2xl">
                                                                <DialogHeader>
                                                                    <DialogTitle>Moderate Comments</DialogTitle>
                                                                    <DialogDescription>
                                                                        Post: {post.title}
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <div className="max-h-[60vh] overflow-y-auto space-y-4 py-4">
                                                                    {postWithComments?.comments?.map((comment) => (
                                                                        <div key={comment.id} className="flex justify-between items-start gap-4 p-3 border rounded-lg bg-muted/30">
                                                                            <div className="space-y-1">
                                                                                <div className="flex items-center gap-2 text-sm font-medium">
                                                                                    <User className="h-3 w-3" />
                                                                                    {comment.author?.name}
                                                                                    <span className="text-xs text-muted-foreground font-normal">
                                                                                        • {format(new Date(comment.createdAt), "MMM d, HH:mm")}
                                                                                    </span>
                                                                                </div>
                                                                                <p className="text-sm">{comment.content}</p>
                                                                            </div>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="text-destructive h-8 w-8"
                                                                                onClick={() => {
                                                                                    if (confirm("Delete this comment?")) {
                                                                                        deleteComment.mutate({ commentId: comment.id }, {
                                                                                            onSuccess: () => refetchComments()
                                                                                        });
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <Trash className="h-3 w-3" />
                                                                            </Button>
                                                                        </div>
                                                                    ))}
                                                                    {(!postWithComments?.comments || postWithComments.comments.length === 0) && (
                                                                        <p className="text-center text-muted-foreground py-8">No comments yet.</p>
                                                                    )}
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => {
                                                                if (confirm("Are you sure you want to delete this post and all its comments?")) {
                                                                    deletePost.mutate({ postId: post.id });
                                                                }
                                                            }}
                                                            disabled={deletePost.isPending}
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {posts?.length === 0 && !isPostsLoading && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                                    No posts in this group yet.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>

                        <TabsContent value="members" className="space-y-4">
                            <div className="border rounded-lg bg-card overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Joined At</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {members?.map((member) => (
                                            <TableRow key={member.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-4 w-4 text-muted-foreground" />
                                                        {member.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {member.email}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {member.joinedAt ? format(new Date(member.joinedAt), "MMM d, yyyy") : "N/A"}
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
                                                                <DropdownMenuItem onClick={() => copyToClipboard(member.id)}>
                                                                    <Copy className="mr-2 h-4 w-4" />
                                                                    Copy ID
                                                                </DropdownMenuItem>
                                                            </DropdownMenuGroup>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => toggleCommenting.mutate({ userId: member.id })}>
                                                                {member.canComment ? (
                                                                    <>
                                                                        <ShieldAlert className="mr-2 h-4 w-4 text-destructive" />
                                                                        Suspend Commenting
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <ShieldCheck className="mr-2 h-4 w-4 text-green-500" />
                                                                        Restore Commenting
                                                                    </>
                                                                )}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {members?.length === 0 && !isMembersLoading && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                                                    No members in this group yet.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div >
    );
}
