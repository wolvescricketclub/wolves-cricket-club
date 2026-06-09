const puppeteer = require('puppeteer-core');

async function run() {
    const browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const url = 'https://cricclubs.com/mwcl/viewPlayer.do?playerId=3626346&clubId=93';
    console.log(`Navigating to player page: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for the tables to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log("Analyzing tables...");
    const tableInfo = await page.evaluate(() => {
        const results = [];
        const tables = document.querySelectorAll('table');
        tables.forEach((table, index) => {
            const ths = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
            const rows = [];
            table.querySelectorAll('tbody tr').forEach(tr => {
                const tds = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
                rows.push(tds);
            });
            results.push({
                index,
                headers: ths,
                rows: rows.slice(0, 5) // log first 5 rows
            });
        });
        return results;
    });

    console.log("TABLE INVENTORIES:");
    tableInfo.forEach(t => {
        if (t.headers.length > 0) {
            console.log(`\n--- TABLE ${t.index} ---`);
            console.log("HEADERS:", t.headers.join(" | "));
            console.log("ROWS:");
            t.rows.forEach((r, idx) => {
                console.log(`  Row ${idx+1}:`, r.join(" | "));
            });
        }
    });

    await browser.close();
}

run().catch(console.error);
