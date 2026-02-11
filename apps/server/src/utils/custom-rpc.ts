import { type Request, type Response } from "express";
import { appRouter } from "@chi-and-rose/api/routers/index";
import { createContext } from "@chi-and-rose/api/context";

export async function handleRPC(req: Request, res: Response) {
    const tid = Math.random().toString(36).substring(7);
    try {
        // Use originalUrl to ensure we have the full path even if mounted on a sub-route
        // Strip /rpc/ or /api/ if present at the start
        const fullPath = req.originalUrl.split('?')[0]; // Remove query string
        const path = fullPath.replace(/^\/rpc\//, "").replace(/^\/rpc$/, "").replace(/^\//, "");

        // Support both styles: users/listUsers and users.listUsers
        const parts = path.includes("/") ? path.split("/") : path.split(".");

        console.log(`[CustomRPC:${tid}] Resolving path: ${parts.join(".")} (Full: ${fullPath}, Rel: ${req.path})`);

        // Traverse router
        let current: any = appRouter;
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                console.error(`[CustomRPC:${tid}] Path segment not found: ${part}`);
                return res.status(404).json({ error: `Procedure not found: ${parts.join(".")}` });
            }
        }

        const ctx = await createContext({ req });
        // Attach requestId to context if it matches our extended type
        (ctx as any).requestId = tid;

        let input = req.body.json ?? req.body;

        // Handle GET query input
        if (req.method === 'GET' && req.query.input) {
            try {
                input = JSON.parse(decodeURIComponent(String(req.query.input)));
            } catch (e) {
                console.error(`[CustomRPC:${tid}] Invalid JSON input in query`);
            }
        }

        // Execute
        if (current && current['~orpc'] && current['~orpc'].handler) {
            try {
                console.log(`[CustomRPC:${tid}] Executing procedure: ${parts.join(".")}`);
                const result = await current['~orpc'].handler({ input, context: ctx });
                return res.json({ json: result });
            } catch (handlerErr: any) {
                console.error(`[CustomRPC:${tid}] Handler execution error:`, handlerErr.message);
                return res.status(handlerErr.status || 500).json({
                    error: handlerErr.message || "Internal server error",
                    code: handlerErr.code
                });
            }
        } else {
            console.error(`[CustomRPC:${tid}] Target is not a procedure`);
            return res.status(404).json({ error: "Target is not a procedure" });
        }

    } catch (err: any) {
        console.error(`[CustomRPC:${tid}] Execution error:`, err.message);
        return res.status(500).json({ error: err.message });
    }
}
