
import { db, articles } from "@chi-and-rose/db";

async function main() {
    console.log("Checking DB Connection...");
    try {
        const allArticles = await db.select().from(articles);
        console.log(`\nFound ${allArticles.length} articles total.`);

        console.log("\n--- Articles List ---");
        allArticles.forEach(a => {
            console.log(`ID: ${a.id}`);
            console.log(`Title: ${a.title}`);
            console.log(`isPublished: ${a.isPublished} (${typeof a.isPublished})`);
            console.log(`ImageUrl: ${a.imageUrl}`);
            console.log(`Content Preview: ${a.content?.substring(0, 50)}...`);
            console.log(`Category: ${a.category}`);
            console.log("-------------------");
        });

        const published = allArticles.filter(a => a.isPublished === true);
        console.log(`\nTotal Published: ${published.length}`);

    } catch (e) {
        console.error("DB Error:", e);
    }
    process.exit(0);
}

main();
