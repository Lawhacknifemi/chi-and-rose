"use client";

import { use } from "react";
import TipForm from "@/components/tip-form";
import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";

export default function EditTipPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: tip, isLoading } = useQuery(orpc.cms.getTip.queryOptions({ input: { id } }));

    if (isLoading) {
        return <div className="p-8 text-center">Loading tip...</div>;
    }

    if (!tip) {
        return <div className="p-8 text-center">Tip not found</div>;
    }

    return (
        <TipForm
            tipId={id}
            initialData={{
                phase: tip.phase,
                content: tip.content,
                actionableTip: tip.actionableTip || "",
                category: tip.category || "",
                id: tip.id,
            }}
        />
    );
}
