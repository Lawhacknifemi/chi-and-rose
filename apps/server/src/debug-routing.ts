
import { os } from "@orpc/server";
import { RPCHandler } from "@orpc/server/node";
import { IncomingMessage } from "http";
import { Socket } from "net";

console.log("-----------------------------------------");
console.log("🕵️‍♀️ BRUTE FORCE ROUTER MATCHING (REAL STREAMS)");
console.log("-----------------------------------------");

// 1. Setup Mock Router
const o = os.$context<{}>();
const mockRouter = o.router({
    scanner: {
        scanBarcode: o.handler(async () => "SUCCESS"),
    },
});

const rpcHandler = new RPCHandler({
    router: mockRouter,
});

const variations = [
    "/scanner/scanBarcode",
    "scanner/scanBarcode",
    "/scanner.scanBarcode",
    "scanner.scanBarcode",
    "/rpc/scanner/scanBarcode",
    "/rpc/scanner.scanBarcode",
    "/scanner/scanBarcode/", // trailling slash
];

const methods = ["POST", "GET"];

async function runTests() {
    for (const method of methods) {
        for (const url of variations) {

            // USE REAL INCOMING MESSAGE
            const socket = new Socket();
            const req = new IncomingMessage(socket);
            req.method = method;
            req.url = url;
            req.headers = { host: "localhost" };

            // Mock response
            const res: any = {
                statusCode: 200,
                setHeader: () => { },
                end: () => { },
            };

            const result = await rpcHandler.handle(req, res, {
                prefix: "",
                context: {},
            });

            if (result.matched) {
                console.log(`✅ [${method}] URL: '${url.padEnd(25)}' -> MATCHED!`);
            } else {
                console.log(`❌ [${method}] URL: '${url.padEnd(25)}' -> Matched: false`);
            }
        }
    }
}

runTests();
