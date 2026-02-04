"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function NewProductPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [formData, setFormData] = useState({
        barcode: "",
        name: "",
        brand: "",
        category: "",
        ingredients: "",
    });

    useEffect(() => {
        const barcodeParam = searchParams.get("barcode");
        if (barcodeParam) {
            setFormData(prev => ({ ...prev, barcode: barcodeParam }));
        }
    }, [searchParams]);

    const createProductMutation = useMutation(orpc.scanner.createProduct.mutationOptions({
        onSuccess: (data) => {
            toast.success("Product created successfully");
            // Redirect to scanner test page to try it out
            router.push("/admin/scanner");
        },
        onError: (error) => {
            toast.error(error.message);
        },
    }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createProductMutation.mutate(formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin/scanner">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Add Product</h1>
                    <p className="text-muted-foreground">Manually add a product to the database.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Product Details</CardTitle>
                    <CardDescription>Enter the product information as it appears on the label.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="barcode">Barcode (EAN/UPC)</Label>
                            <Input
                                id="barcode"
                                name="barcode"
                                value={formData.barcode}
                                onChange={handleChange}
                                placeholder="e.g. 1234567890123"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="brand">Brand</Label>
                                <Input
                                    id="brand"
                                    name="brand"
                                    value={formData.brand}
                                    onChange={handleChange}
                                    placeholder="e.g. Cerave"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Input
                                    id="category"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    placeholder="e.g. Moisturizer"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Product Name</Label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g. Daily Moisturizing Lotion"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="ingredients">Ingredients List</Label>
                            <Textarea
                                id="ingredients"
                                name="ingredients"
                                value={formData.ingredients}
                                onChange={handleChange}
                                placeholder="Paste comma-separated ingredients here..."
                                className="min-h-[150px]"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={createProductMutation.isPending}
                        >
                            {createProductMutation.isPending ? "Creating..." : "Save Product"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
