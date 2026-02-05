import { type Request, type Response } from "express";
import { appRouter } from "@chi-and-rose/api/routers/index";
import { createContext } from "@chi-and-rose/api/context";

export async function handleRPC(req: Request, res: Response) {
    try {
        const path = req.path.replace(/^\/rpc\//, "").replace(/^\//, "");
        // Support both styles: users/listUsers and users.listUsers
        const parts = path.includes("/") ? path.split("/") : path.split(".");

        console.log(`[CustomRPC] Resolving path: ${parts.join(".")}`);

        // Traverse router
        let current: any = appRouter;
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                console.error(`[CustomRPC] Path segment not found: ${part}`);
                return res.status(404).json({ error: `Procedure not found: ${parts.join(".")}` });
            }
        }

        // Check if leaf is a procedure
        // Procedures in ORPC usually have '~orpc' property or are functions
        // We can try to detect or just assume it is one if matched

        const ctx = await createContext({ req });
        let input = req.body.json ?? req.body;

        // Handle GET query input
        if (req.method === 'GET' && req.query.input) {
            try {
                input = JSON.parse(decodeURIComponent(String(req.query.input)));
            } catch (e) {
                console.error("Invalid JSON input in query");
            }
        }

        // Execute
        // Access internal handler. This is a hack but standard for ORPC v1
        // OR try to use caller?
        // Let's try internal handler first as seen in manual test
        if (current && current['~orpc'] && current['~orpc'].handler) {
            const result = await current['~orpc'].handler({ input, context: ctx });
            // Correct ORPC format: { json: <data>, meta: [...] }
            // We omit meta for simple cases.
            return res.json({ json: result });
        } else {
            console.error("[CustomRPC] Target is not a procedure");
            return res.status(404).json({ error: "Target is not a procedure" });
        }

    } catch (err: any) {
        console.error("[CustomRPC] Execution error:", err);
        return res.status(500).json({ error: err.message });
    }
}
