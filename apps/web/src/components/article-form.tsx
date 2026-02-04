"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { orpc } from "@/utils/orpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useEffect } from "react";
import CloudinaryUploadWidget from "./cloudinary-upload-widget";

const articleSchema = z.object({
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
    summary: z.string().optional(),
    imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    category: z.string().min(1, "Category is required"),
    isPublished: z.boolean().default(false),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

interface ArticleFormProps {
    articleId?: string; // If present, edit mode
}

export function ArticleForm({ articleId }: ArticleFormProps) {
    console.log("ArticleForm articleId:", articleId);
    const router = useRouter();
    const form = useForm<ArticleFormValues>({
        resolver: zodResolver(articleSchema),
        defaultValues: {
            title: "",
            content: "",
            summary: "",
            imageUrl: "",
            category: "",
            isPublished: false,
        },
    });

    // Fetch data if edit mode
    const { data: article, isLoading } = useQuery({
        ...orpc.cms.getArticle.queryOptions({ input: { id: articleId! } }),
        enabled: !!articleId,
    });

    useEffect(() => {
        if (article) {
            form.reset({
                title: article.title,
                content: article.content,
                summary: article.summary || "",
                imageUrl: article.imageUrl || "",
                category: article.category,
                isPublished: article.isPublished,
            });
        }
    }, [article, form]);

    const createMutation = useMutation(orpc.cms.createArticle.mutationOptions({
        onSuccess: () => {
            toast.success("Article created successfully");
            router.push("/admin/articles");
        },
        onError: () => toast.error("Failed to create article")
    }));

    const updateMutation = useMutation(orpc.cms.updateArticle.mutationOptions({
        onSuccess: () => {
            toast.success("Article updated successfully");
            router.push("/admin/articles");
        },
        onError: () => toast.error("Failed to update article")
    }));

    function onSubmit(data: ArticleFormValues) {
        console.log("Submitting form data:", data);
        if (articleId) {
            updateMutation.mutate({ id: articleId, ...data });
        } else {
            createMutation.mutate(data);
        }
    }

    if (articleId && isLoading) return <div>Loading...</div>;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-3xl">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                                <Input placeholder="Article Title" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a category" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Health">Health</SelectItem>
                                        <SelectItem value="Nutrition">Nutrition</SelectItem>
                                        <SelectItem value="Lifestyle">Lifestyle</SelectItem>
                                        <SelectItem value="Wellness">Wellness</SelectItem>
                                        <SelectItem value="Cycle">Cycle Tracking</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                </div>

                <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Article Image</FormLabel>
                            <FormControl>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <CloudinaryUploadWidget onUpload={(url) => field.onChange(url)} />
                                        {field.value && (
                                            <div className="relative w-32 h-20 rounded overflow-hidden border">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={field.value} alt="Preview" className="object-cover w-full h-full" />
                                            </div>
                                        )}
                                    </div>
                                    <Input placeholder="Or paste image URL..." {...field} />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />


                <FormField
                    control={form.control}
                    name="summary"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Summary (Optional)</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Brief description..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Content (Markdown)</FormLabel>
                            <FormControl>
                                <Textarea placeholder="# Hello World..." className="min-h-[300px] font-mono" {...field} />
                            </FormControl>
                            <FormDescription>Supports basic markdown formatting.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="isPublished"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>
                                    Publish immediately
                                </FormLabel>
                                <FormDescription>
                                    This will make the article visible in the mobile app.
                                </FormDescription>
                            </div>
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {articleId ? "Update Article" : "Create Article"}
                </Button>
            </form>
        </Form >
    );
}
