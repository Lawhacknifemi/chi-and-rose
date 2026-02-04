"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { orpc } from "@/utils/orpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

const tipSchema = z.object({
    phase: z.string().min(1, "Phase is required"),
    content: z.string().min(10, "Content must be at least 10 characters"),
    actionableTip: z.string().optional(),
    category: z.string().optional(),
});

type TipFormValues = z.infer<typeof tipSchema>;

interface TipFormProps {
    tipId?: string;
    initialData?: TipFormValues & { id: string };
}

export default function TipForm({ tipId, initialData }: TipFormProps) {
    const router = useRouter();
    const queryClient = useQueryClient();

    const form = useForm<TipFormValues>({
        resolver: zodResolver(tipSchema),
        defaultValues: initialData || {
            phase: "",
            content: "",
            actionableTip: "",
            category: "",
        },
    });

    const createTip = useMutation(orpc.cms.createTip.mutationOptions({
        onSuccess: () => {
            toast.success("Daily tip created successfully");
            router.push("/admin/tips");
            queryClient.invalidateQueries({ queryKey: orpc.cms.listTips.key({}) });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    }));

    const updateTip = useMutation(orpc.cms.updateTip.mutationOptions({
        onSuccess: () => {
            toast.success("Daily tip updated successfully");
            router.push("/admin/tips");
            queryClient.invalidateQueries({ queryKey: orpc.cms.listTips.key({}) });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    }));

    async function onSubmit(data: TipFormValues) {
        if (tipId) {
            updateTip.mutate({ id: tipId, ...data });
        } else {
            createTip.mutate(data);
        }
    }

    const isSubmitting = createTip.isPending || updateTip.isPending;

    return (
        <div className="max-w-2xl mx-auto p-6">
            <Button
                variant="ghost"
                onClick={() => router.back()}
                className="mb-4 pl-0 hover:bg-transparent hover:text-primary"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>

            <div className="mb-8">
                <h1 className="text-3xl font-bold">
                    {tipId ? "Edit Daily Tip" : "Create Daily Tip"}
                </h1>
                <p className="text-muted-foreground mt-2">
                    {tipId
                        ? "Update the details of this daily tip."
                        : "Add a new daily tip for a specific cycle phase."}
                </p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="phase"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cycle Phase</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a phase" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="menstrual">Menstrual</SelectItem>
                                        <SelectItem value="follicular">Follicular</SelectItem>
                                        <SelectItem value="ovulation">Ovulation</SelectItem>
                                        <SelectItem value="luteal">Luteal</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Category (Optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Nutrition, Exercise" {...field} />
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
                                <FormLabel>Main Content</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Write the daily advice here..."
                                        className="min-h-[150px]"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="actionableTip"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Actionable Tip (Optional)</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="A short, actionable step the user can take today."
                                        className="min-h-[80px]"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="flex justify-end gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting
                                ? "Saving..."
                                : tipId
                                    ? "Update Tip"
                                    : "Create Tip"}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
