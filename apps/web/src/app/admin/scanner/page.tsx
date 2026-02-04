"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, AlertTriangle, ScanLine, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { Html5Qrcode } from "html5-qrcode";

export default function ScannerPage() {
    const [ingredients, setIngredients] = useState("Water, Glycerin, Methylparaben, Fragrance");
    const [barcode, setBarcode] = useState("");
    const [isScanning, setIsScanning] = useState(false);

    // Mutation for ingredient text analysis
    const analyzeMutation = useMutation(orpc.scanner.analyzeIngredients.mutationOptions({
        onSuccess: (data) => {
            toast.success("Analysis complete");
        },
        onError: (error) => {
            toast.error(error.message);
        },
    }));

    // Mutation for barcode scan
    const scanMutation = useMutation(orpc.scanner.scanBarcode.mutationOptions({
        onSuccess: (data) => {
            if (data.found) {
                toast.success("Product found: " + (data.product.name || "Unknown"));
            }
        },
        onError: (error) => {
            toast.error(error.message);
        },
    }));

    const handleAnalyze = () => {
        if (!ingredients.trim()) return;
        const ingredientList = ingredients.split(",").map(i => i.trim()).filter(i => i.length > 0);
        analyzeMutation.mutate({
            ingredients: ingredientList,
            productName: "Test Product via Admin",
        });
    };

    const handleScan = () => {
        if (!barcode.trim()) return;
        scanMutation.mutate({ barcode: barcode.trim(), suppressError: true });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) {
            return;
        }

        const file = e.target.files[0];
        setIsScanning(true);

        // Reset input value so the same file handles change event if selected again
        e.target.value = "";

        const readerId = "reader-hidden";
        let html5QrCodeScanner: Html5Qrcode | null = null;

        try {
            // Attempt to get existing instance or create new one
            // Note: Html5Qrcode doesn't have a static 'getInstance', but creating new one throws if exists.
            // We'll rely on clearing it in finally.
            try {
                html5QrCodeScanner = new Html5Qrcode(readerId);
            } catch (e) {
                // If it exists, we might need to handle it, but usually standard flow prevents this if we clear.
                // If we really stuck, we might logging.
                console.warn("Scanner instance might already exist", e);
                // Try to proceed assuming we can't get the old one easily without storing refs. 
                // Currently assume we are fresh due to 'finally' cleanup.
                throw e;
            }

            const decodedText = await html5QrCodeScanner.scanFile(file, true);

            setBarcode(decodedText);
            toast.success("Barcode detected: " + decodedText);
            scanMutation.mutate({ barcode: decodedText, suppressError: true });

        } catch (err) {
            console.error("Scan error:", err);
            toast.error("Could not detect a barcode. Please try a clearer image.");
        } finally {
            setIsScanning(false);
            if (html5QrCodeScanner) {
                try {
                    await html5QrCodeScanner.clear();
                } catch (e) {
                    // Ignore clear errors (e.g. if not running)
                    console.log("Cleanup warning:", e);
                }
            }
        }
    };

    // Determine which result to show (scan takes precedence if active)
    // Note: TypeScript might not narrow the type union perfectly here without checks
    const scanData = scanMutation.data;
    const resultData = (scanData && scanData.found) ? scanData.analysis : analyzeMutation.data;
    const productInfo = (scanData && scanData.found) ? scanData.product : undefined;

    // Check if we have a "Not Found" result from scan
    const isScanNotFound = scanData && !scanData.found;

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Scanner / Analyzer</h1>
                    <p className="text-muted-foreground">Test the ingredient analysis engine manually or by barcode.</p>
                </div>
                <Link href="/admin/scanner/new" className={buttonVariants({ variant: "outline" })}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle>Input Method</CardTitle>
                        <CardDescription>Choose how you want to check a product.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div id="reader-hidden" className="hidden"></div>
                        <Tabs defaultValue="ingredients" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 mb-4">
                                <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
                                <TabsTrigger value="barcode">Barcode</TabsTrigger>
                                <TabsTrigger value="upload">Upload Image</TabsTrigger>
                            </TabsList>

                            <TabsContent value="ingredients" className="space-y-4">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Paste Ingredients</p>
                                    <Textarea
                                        value={ingredients}
                                        onChange={(e) => setIngredients(e.target.value)}
                                        placeholder="Water, Glycerin, ..."
                                        className="min-h-[200px]"
                                    />
                                    <Button
                                        onClick={handleAnalyze}
                                        disabled={analyzeMutation.isPending}
                                        className="w-full"
                                    >
                                        {analyzeMutation.isPending ? "Analyzing..." : "Analyze Ingredients"}
                                    </Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="barcode" className="space-y-4">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Enter Barcode</p>
                                    <div className="flex gap-2">
                                        <Input
                                            value={barcode}
                                            onChange={(e) => setBarcode(e.target.value)}
                                            placeholder="e.g. 12345678"
                                        />
                                        <Button
                                            onClick={handleScan}
                                            disabled={scanMutation.isPending}
                                            size="icon"
                                        >
                                            <Search className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="upload" className="space-y-4">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Upload Image</p>
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={isScanning}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Upload an image specifically containing a clear barcode.
                                    </p>
                                    {isScanning && <p className="text-sm text-yellow-600">Scanning image for barcode...</p>}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    {/* Product Details Header if from Scan */}
                    {productInfo && (
                        <Card>
                            <CardHeader className="pb-2">
                                <div className="flex gap-4">
                                    {productInfo.imageUrl && (
                                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border">
                                            <img
                                                src={productInfo.imageUrl}
                                                alt={productInfo.name || "Product"}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <CardTitle>{productInfo.name || "Unknown Product"}</CardTitle>
                                        <CardDescription>{productInfo.brand} - {productInfo.category || "No Category"}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground line-clamp-3">
                                    {productInfo.ingredients}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {resultData && (
                        <>
                            <Card>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle>Safety Score</CardTitle>
                                        <span className={`text-2xl font-bold ${resultData.overallSafetyScore > 80 ? "text-green-600" :
                                            resultData.overallSafetyScore > 50 ? "text-yellow-600" : "text-red-600"
                                            }`}>
                                            {resultData.overallSafetyScore}/100
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Badge variant={
                                            resultData.safetyLevel === "Good" ? "default" :
                                                resultData.safetyLevel === "Caution" ? "secondary" : "destructive"
                                        } className={
                                            resultData.safetyLevel === "Good" ? "bg-green-600 hover:bg-green-700" :
                                                resultData.safetyLevel === "Caution" ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200" : ""
                                        }>
                                            {resultData.safetyLevel.toUpperCase()}
                                        </Badge>
                                        <span className="text-sm text-muted-foreground">
                                            {resultData.summary}
                                        </span>
                                    </div>

                                    {resultData.concerns.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="font-semibold text-sm">Health Concerns</h4>
                                            {resultData.concerns.map((concern, i) => (
                                                <div key={i} className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                                                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                                                    <div>
                                                        <p className="font-medium text-sm text-destructive">{concern.ingredient}</p>
                                                        <p className="text-xs text-muted-foreground">{concern.reason}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {resultData.concerns.length === 0 && (
                                        <div className="flex items-start gap-2 p-3 rounded-md bg-green-50 border border-green-200">
                                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                                            <div>
                                                <p className="font-medium text-sm text-green-700">Clean Formula</p>
                                                <p className="text-xs text-green-600">No harmful ingredients detected based on your profile.</p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {resultData.alternatives && resultData.alternatives.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Alternatives</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2">
                                            {resultData.alternatives.map((alt: any, i: number) => (
                                                <li key={i} className="text-sm">
                                                    <span className="font-medium">{alt.productName}</span>
                                                    <span className="text-muted-foreground"> - {alt.reason}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    )}

                    {!resultData && !isScanNotFound && !analyzeMutation.isPending && !scanMutation.isPending && (
                        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground border rounded-lg h-full border-dashed min-h-[300px]">
                            <ScanLine className="h-8 w-8 mb-2 opacity-50" />
                            <p>Ready to analyze</p>
                        </div>
                    )}

                    {isScanNotFound && (
                        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground border rounded-lg h-full border-dashed min-h-[300px]">
                            <div className="space-y-4">
                                <AlertTriangle className="h-10 w-10 mx-auto text-yellow-500 mb-2" />
                                <h3 className="font-semibold text-foreground">Product Not Found</h3>
                                <p className="max-w-xs mx-auto">
                                    We couldn't find a product with barcode <span className="font-mono bg-muted px-1 rounded">{barcode}</span>.
                                </p>
                                <Button asChild>
                                    <Link href={`/admin/scanner/new?barcode=${barcode}`}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add This Product
                                    </Link>
                                </Button>
                                <Button variant="ghost" onClick={() => scanMutation.reset()}>
                                    Try Another Scan
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
