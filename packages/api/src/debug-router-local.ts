
import { appRouter } from "./routers/index";

console.log("---------------------------------------------------");
console.log("DEBUG: Inspecting appRouter Structure");
console.log("---------------------------------------------------");

if (!appRouter) {
    console.error("❌ appRouter is undefined!");
    process.exit(1);
}

const keys = Object.keys(appRouter);
console.log(`✅ appRouter keys: [${keys.join(", ")}]`);

if (keys.includes("scanner")) {
    const scanner = (appRouter as any).scanner;
    const scannerKeys = Object.keys(scanner);
    console.log(`✅ scanner router found! Keys: [${scannerKeys.join(", ")}]`);

    if (scannerKeys.includes("scanBarcode")) {
        console.log("✅ scanBarcode procedure matched/found.");
    } else {
        console.error("❌ scanBarcode procedure MISSING from scanner router.");
    }
} else {
    console.error("❌ scanner router MISSING from appRouter keys.");
}
console.log("---------------------------------------------------");
