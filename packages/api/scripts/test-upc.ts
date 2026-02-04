async function main() {
    const barcode = "3337875545822";
    console.log(`Checking UPCitemdb for: ${barcode}`);

    try {
        const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
        console.log("Status:", response.status);

        if (response.ok) {
            const data = await response.json();
            if (data.items && data.items.length > 0) {
                console.log("Item Keys:", Object.keys(data.items[0]));
                console.log("Description:", data.items[0].description);
            } else {
                console.log("No items found in response");
            }
        } else {
            console.log("Error body:", await response.text());
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

main();
