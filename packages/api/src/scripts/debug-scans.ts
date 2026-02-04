
import { db, scans, eq } from "@chi-and-rose/db";

async function main() {
    const TARGET_USER_ID = "DZc2Rvjz3Xn8jfG4PPFFADu63zA11vh8";
    console.log(`Testing query for specific user: ${TARGET_USER_ID}`);

    const userScans = await db.query.scans.findMany({
        where: eq(scans.userId, TARGET_USER_ID),
        orderBy: (scans, { desc }) => [desc(scans.createdAt)],
        limit: 10,
    });

    console.log(`Found ${userScans.length} scans for this user.`);

    if (userScans.length > 0) {
        console.log("First match:", userScans[0].barcode);
    } else {
        console.log("Query returned EMPTY list despite data existing!");
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
