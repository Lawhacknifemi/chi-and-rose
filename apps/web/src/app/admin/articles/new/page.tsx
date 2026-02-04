import { ArticleForm } from "@/components/article-form";

export default function NewArticlePage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">New Article</h1>
            <ArticleForm />
        </div>
    );
}
