"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { orpc } from "@/utils/orpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import ProfileOnboarding from "@/components/profile-onboarding";

export default function AIPage() {
    const [ingredients, setIngredients] = useState("");
    const [productName, setProductName] = useState("");
    const [result, setResult] = useState<any>(null);
    const [showOnboarding, setShowOnboarding] = useState(false);

    const { mutate, isPending } = useMutation({
        ...orpc.scanner.analyzeIngredients.mutationOptions(),
        onSuccess: (data) => {
            setResult(data);
            toast.success("Analysis complete!");
        },
        onError: (err) => {
            toast.error(`Analysis failed: ${err.message}`);
        },
    });

    const handleAnalyze = () => {
        if (!ingredients.trim()) return;

        // Split by comma and clean
        const ingredientList = ingredients
            .split(",")
            .map((i) => i.trim())
            .filter((i) => i.length > 0);

        mutate({
            ingredients: ingredientList,
            productName: productName || undefined,
        });
    };

    return (
        <div className="container mx-auto p-8 max-w-4xl">
            <div className="flex flex-col gap-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">AI Playground 🧪</h1>
                        <p className="text-muted-foreground mt-2">
                            Test the AI Reasoning Engine by analyzing raw ingredient lists.
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => setShowOnboarding(true)}>
                        Edit Profile
                    </Button>
                </div>

                <ProfileOnboarding
                    isOpen={showOnboarding}
                    onOpenChange={setShowOnboarding}
                />

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Input Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Input</CardTitle>
                            <CardDescription>Enter product details manually.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Product Name (Optional)</label>
                                <Input
                                    placeholder="e.g. Mystery Serum"
                                    value={productName}
                                    onChange={(e) => setProductName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Ingredients (Comma Separated)</label>
                                <Textarea
                                    placeholder="Water, Glycerin, Fragrance, Parabens..."
                                    className="min-h-[200px]"
                                    value={ingredients}
                                    onChange={(e) => setIngredients(e.target.value)}
                                />
                            </div>

                            <Button
                                onClick={handleAnalyze}
                                disabled={isPending || !ingredients.trim()}
                                className="w-full"
                            >
                                {isPending ? "Analyzing..." : "Analyze Ingredients"}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Results Section */}
                    <Card className="bg-slate-50 dark:bg-slate-900 border-dashed">
                        <CardHeader>
                            <CardTitle>Analysis Results</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!result && !isPending && (
                                <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                                    Run an analysis to see results here.
                                </div>
                            )}

                            {isPending && (
                                <div className="flex items-center justify-center h-[300px]">
                                    <span className="loading loading-spinner loading-lg">Thinking... 🧠</span>
                                </div>
                            )}

                            {result && (
                                <div className="space-y-6">
                                    {/* Score Header */}
                                    <div className="flex items-center justify-between p-4 bg-white dark:bg-black rounded-lg border shadow-sm">
                                        <div className="text-center">
                                            <div className="text-4xl font-bold">{result.overallSafetyScore}</div>
                                            <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Score</div>
                                        </div>
                                        <Badge
                                            variant={result.safetyLevel === 'Good' ? 'default' : 'destructive'}
                                            className="text-lg px-4 py-1"
                                        >
                                            {result.safetyLevel}
                                        </Badge>
                                    </div>

                                    {/* Summary */}
                                    <div>
                                        <h4 className="text-sm font-semibold mb-2">AI Summary</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 italic">
                                            "{result.summary}"
                                        </p>
                                    </div>

                                    {/* Concerns */}
                                    <div>
                                        <h4 className="text-sm font-semibold mb-2">Concerns ({result.concerns.length})</h4>
                                        {result.concerns.length === 0 ? (
                                            <div className="text-sm text-green-600">✅ No concerns found.</div>
                                        ) : (
                                            <ul className="space-y-2">
                                                {result.concerns.map((c: any, idx: number) => (
                                                    <li key={idx} className="text-sm p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-100 dark:border-red-900/50">
                                                        <span className="font-bold text-red-700 dark:text-red-400">{c.ingredient}</span>: {c.reason}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    {/* Positives */}
                                    <div>
                                        <h4 className="text-sm font-semibold mb-2">Positives</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {result.positives.map((p: string, idx: number) => (
                                                <Badge key={idx} variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                    {p}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
