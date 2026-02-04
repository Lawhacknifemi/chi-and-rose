import { ArticleForm } from "@/components/article-form";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditArticlePage({ params }: PageProps) {
    const { id } = await params;
    console.log("EditArticlePage id:", id);
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Edit Article</h1>
            <ArticleForm articleId={id} />
        </div>
    );
}
