"use client";

import { useState, useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { orpc } from "@/utils/orpc";
import { queryClient } from "@/utils/orpc";

// Common lists for selection
const COMMON_CONDITIONS = [
    "Acne", "Eczema", "Rosacea", "Dry Skin", "Oily Skin", "Sensitive Skin", "Psoriasis", "Pregnancy"
];

const COMMON_SENSITIVITIES = [
    "Fragrance", "Sulfates", "Parabens", "Alcohol", "Essential Oils", "Gluten", "Nuts", "Dairy"
];

const COMMON_GOALS = [
    "Anti-aging", "Hydration", "Brightening", "Acne Control", "Soothing", "Sun Protection"
];

interface ProfileOnboardingProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    forceOpen?: boolean; // For initial onboarding
}

export default function ProfileOnboarding({ isOpen, onOpenChange, forceOpen = false }: ProfileOnboardingProps) {
    const [step, setStep] = useState(1);
    const [customCondition, setCustomCondition] = useState("");
    const [customSensitivity, setCustomSensitivity] = useState("");

    const { data: profile, isLoading } = useQuery(orpc.health.getProfile.queryOptions({}));

    const updateProfile = useMutation(orpc.health.updateProfile.mutationOptions({
        onSuccess: () => {
            toast.success("Profile updated successfully!");
            queryClient.invalidateQueries({ queryKey: orpc.health.getProfile.key });
            onOpenChange(false);
        },
        onError: (err) => {
            toast.error("Failed to update profile: " + err.message);
        }
    }));

    const form = useForm({
        defaultValues: {
            conditions: profile?.conditions || [],
            sensitivities: profile?.sensitivities || [],
            goals: profile?.goals || [],
            symptoms: profile?.symptoms || [], // Treating symptoms same as conditions for UI simplicity for now
            dietaryPreferences: profile?.dietaryPreferences || [],
        },
        onSubmit: async ({ value }) => {
            await updateProfile.mutateAsync(value);
        },
    });

    // Pre-fill form when profile loads
    useEffect(() => {
        if (profile) {
            form.setFieldValue("conditions", profile.conditions);
            form.setFieldValue("sensitivities", profile.sensitivities);
            form.setFieldValue("goals", profile.goals);
        }
    }, [profile, form]);


    const toggleItem = (field: any, item: string) => {
        const current = field.state.value as string[];
        if (current.includes(item)) {
            field.handleChange(current.filter((i) => i !== item));
        } else {
            field.handleChange([...current, item]);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(val) => !forceOpen && onOpenChange(val)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Personalize Your Experience</DialogTitle>
                    <DialogDescription>
                        Help our AI provide better safety analysis and recommendations for you.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        form.handleSubmit();
                    }}
                    className="space-y-6 py-4"
                >
                    {/* GOALS */}
                    <div>
                        <h3 className="text-lg font-medium mb-3">Health & Beauty Goals</h3>
                        <form.Field name="goals">
                            {(field) => (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {COMMON_GOALS.map((goal) => (
                                        <div key={goal} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`goal-${goal}`}
                                                checked={(field.state.value as string[]).includes(goal)}
                                                onCheckedChange={() => toggleItem(field, goal)}
                                            />
                                            <Label htmlFor={`goal-${goal}`}>{goal}</Label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </form.Field>
                    </div>

                    {/* CONDITIONS */}
                    <div>
                        <h3 className="text-lg font-medium mb-3">Skin & Health Conditions</h3>
                        <form.Field name="conditions">
                            {(field) => (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {COMMON_CONDITIONS.map((cond) => (
                                            <div key={cond} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`cond-${cond}`}
                                                    checked={(field.state.value as string[]).includes(cond)}
                                                    onCheckedChange={() => toggleItem(field, cond)}
                                                />
                                                <Label htmlFor={`cond-${cond}`}>{cond}</Label>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Custom Input */}
                                    <div className="flex gap-2 max-w-sm mt-2">
                                        <Input
                                            placeholder="Add other..."
                                            value={customCondition}
                                            onChange={(e) => setCustomCondition(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (customCondition) {
                                                        toggleItem(field, customCondition);
                                                        setCustomCondition("");
                                                    }
                                                }
                                            }}
                                        />
                                        <Button type="button" variant="secondary" onClick={() => {
                                            if (customCondition) {
                                                toggleItem(field, customCondition);
                                                setCustomCondition("");
                                            }
                                        }}>Add</Button>
                                    </div>
                                    {/* Show selected custom items that aren't in common list */}
                                    <div className="flex gap-2 flex-wrap">
                                        {(field.state.value as string[]).filter(c => !COMMON_CONDITIONS.includes(c)).map(c => (
                                            <div key={c} className="bg-secondary px-2 py-1 rounded text-sm flex items-center gap-1">
                                                {c}
                                                <button type="button" onClick={() => toggleItem(field, c)} className="text-muted-foreground hover:text-foreground">×</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </form.Field>
                    </div>

                    {/* SENSITIVITIES */}
                    <div>
                        <h3 className="text-lg font-medium mb-3">Allergies & Sensitivities</h3>
                        <DialogDescription className="mb-3">
                            Ingredients selected here will trigger "Avoid" warnings in the AI scanner.
                        </DialogDescription>
                        <form.Field name="sensitivities">
                            {(field) => (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {COMMON_SENSITIVITIES.map((sens) => (
                                            <div key={sens} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`sens-${sens}`}
                                                    checked={(field.state.value as string[]).includes(sens)}
                                                    onCheckedChange={() => toggleItem(field, sens)}
                                                />
                                                <Label htmlFor={`sens-${sens}`}>{sens}</Label>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Custom Input */}
                                    <div className="flex gap-2 max-w-sm mt-2">
                                        <Input
                                            placeholder="Add ingredient..."
                                            value={customSensitivity}
                                            onChange={(e) => setCustomSensitivity(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (customSensitivity) {
                                                        toggleItem(field, customSensitivity);
                                                        setCustomSensitivity("");
                                                    }
                                                }
                                            }}
                                        />
                                        <Button type="button" variant="secondary" onClick={() => {
                                            if (customSensitivity) {
                                                toggleItem(field, customSensitivity);
                                                setCustomSensitivity("");
                                            }
                                        }}>Add</Button>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        {(field.state.value as string[]).filter(c => !COMMON_SENSITIVITIES.includes(c)).map(c => (
                                            <div key={c} className="bg-destructive/10 text-destructive px-2 py-1 rounded text-sm flex items-center gap-1">
                                                {c}
                                                <button type="button" onClick={() => toggleItem(field, c)} className="hover:text-red-700">×</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </form.Field>
                    </div>

                    <div className="flex justify-end pt-4">
                        <form.Subscribe>
                            {(state) => (
                                <Button type="submit" disabled={state.isSubmitting}>
                                    {state.isSubmitting ? "Saving..." : "Save Profile"}
                                </Button>
                            )}
                        </form.Subscribe>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
