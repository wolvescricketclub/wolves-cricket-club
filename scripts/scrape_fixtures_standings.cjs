const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

function convertCplkcDate(dateText) {
    // dateText e.g.: "Saturday, Jun 27, 2026 7:45 AM"
    const m = dateText.match(/^(?:[A-Za-z]+),\s+([A-Za-z]+)\s+(\d+),\s+(\d{4})\s+(.*)$/);
    if (!m) return { dateStr: '', timeStr: '' };
    
    const monthMap = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
    };
    
    const month = monthMap[m[1]] || '01';
    const day = m[2].padStart(2, '0');
    const year = m[3];
    const timeStr = m[4].trim();
    
    return {
        dateStr: `${month}/${day}/${year}`,
        timeStr: timeStr
    };
}

async function scrape() {
    console.log("Starting scraping of CricClubs fixtures and standings...");
    const isActions = !!process.env.GITHUB_ACTIONS;
    
    const launchOptions = {
        headless: isActions ? true : false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1280,800'
        ]
    };

    if (isActions) {
        launchOptions.executablePath = '/usr/bin/google-chrome';
    } else {
        launchOptions.executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }

    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    // 1. Scrape MWCL Fixtures (League 68 is DIV B)
    console.log("Navigating to MWCL Fixtures...");
    await page.goto('https://cricclubs.com/mwcl/fixtures.do?league=68&teamId=665&internalClubId=null&year=2026&clubId=93', { waitUntil: 'networkidle2', timeout: 90000 });
    console.log("Waiting 15 seconds for Cloudflare challenge to pass...");
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    const mwclFixtures = await page.evaluate(() => {
        const rows = [];
        const trs = document.querySelectorAll('table tr');
        trs.forEach(tr => {
            const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
            if (cells.length >= 7) {
                rows.push({ cells });
            }
        });
        return rows;
    });
    console.log(`Found ${mwclFixtures.length} MWCL Fixtures.`);

    // 2. Scrape CPLKC Schedule (Div B)
    console.log("Navigating to CPLKC Wolves Schedule page...");
    await page.goto('https://cricclubs.com/cplkc/fixtures.do?teamId=1096&clubId=85', { waitUntil: 'networkidle2', timeout: 90000 });
    console.log("Waiting 15 seconds for Cloudflare challenge to pass...");
    await new Promise(resolve => setTimeout(resolve, 15000));

    const cplkcFixtures = await page.evaluate(() => {
        const rows = [];
        const trs = document.querySelectorAll('table tr');
        trs.forEach(tr => {
            const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim().replace(/\s+/g, ' '));
            if (cells.length >= 7 && /^\d+$/.test(cells[0])) {
                rows.push({ cells });
            }
        });
        return rows;
    });
    console.log(`Found ${cplkcFixtures.length} CPLKC Fixtures.`);

    // 3. Scrape MWCL Standings (Div B)
    console.log("Navigating to MWCL Standings...");
    await page.goto('https://cricclubs.com/mwcl/pointsTable.do?clubId=93', { waitUntil: 'networkidle2', timeout: 90000 });
    console.log("Waiting 15 seconds...");
    await new Promise(resolve => setTimeout(resolve, 15000));

    console.log("Clicking '2026 DIV B' tab...");
    await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('li'));
        const target = tabs.find(li => li.textContent.trim() === '2026 DIV B');
        if (target) target.click();
    });
    await new Promise(resolve => setTimeout(resolve, 5000));

    const mwclStandings = await page.evaluate(() => {
        const rows = [];
        const tables = Array.from(document.querySelectorAll('table'));
        const standingsTable = tables.find(t => t.textContent.includes('Wolves'));
        if (standingsTable) {
            const trs = standingsTable.querySelectorAll('tr');
            trs.forEach(tr => {
                const cells = Array.from(tr.children)
                    .filter(child => child.tagName === 'TD' || child.tagName === 'TH')
                    .map(cell => cell.textContent.trim().replace(/\s+/g, ' '));
                if (cells.length >= 8 && /^\d+$/.test(cells[0])) {
                    rows.push({ cells });
                }
            });
        }
        return rows;
    });
    console.log(`Found ${mwclStandings.length} MWCL Standings rows.`);

    // 4. Scrape CPLKC Standings (Div B)
    console.log("Navigating to CPLKC points table...");
    await page.goto('https://cricclubs.com/cplkc/pointsTable.do?clubId=85', { waitUntil: 'networkidle2', timeout: 90000 });
    console.log("Waiting 15 seconds...");
    await new Promise(resolve => setTimeout(resolve, 15000));

    console.log("Clicking 'Div B' option programmatically...");
    await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('*'));
        const target = items.find(el => el.textContent.trim() === 'Div B' && el.children.length === 0);
        if (target) target.click();
    });
    console.log("Waiting 5 seconds for Division B table to load...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    const cplkcStandings = await page.evaluate(() => {
        const rows = [];
        const tables = Array.from(document.querySelectorAll('table'));
        const standingsTable = tables.find(t => {
            const text = t.textContent;
            return text.includes('Wolves') && text.includes('Pts') && (text.includes('Net RR') || text.includes('NRR'));
        });
        if (standingsTable) {
            const trs = standingsTable.querySelectorAll('tr');
            trs.forEach(tr => {
                const cells = Array.from(tr.children)
                    .filter(child => child.tagName === 'TD' || child.tagName === 'TH')
                    .map(cell => cell.textContent.trim().replace(/\s+/g, ' '));
                if (cells.length >= 8 && /^\d+$/.test(cells[0])) {
                    rows.push({ cells });
                }
            });
        }
        return rows;
    });
    console.log(`Found ${cplkcStandings.length} CPLKC Standings rows.`);

    // Save to files
    const projectDir = path.join(__dirname, '..');
    
    if (mwclFixtures.length > 0 || cplkcFixtures.length > 0) {
        const scrapedFixtures = {
            mwcl: mwclFixtures,
            cplkc: cplkcFixtures,
            timestamp: new Date().toISOString()
        };
        fs.writeFileSync(path.join(projectDir, 'src', 'assets', 'scraped_fixtures.json'), JSON.stringify(scrapedFixtures, null, 2));
        console.log("Saved scraped_fixtures.json!");
    } else {
        console.log("⚠️ No fixtures found! Skipping save to protect assets.");
    }

    if (mwclStandings.length > 0 || cplkcStandings.length > 0) {
        const scrapedStandings = {
            mwcl: mwclStandings,
            cplkc: cplkcStandings,
            timestamp: new Date().toISOString()
        };
        fs.writeFileSync(path.join(projectDir, 'src', 'assets', 'scraped_standings.json'), JSON.stringify(scrapedStandings, null, 2));
        console.log("Saved scraped_standings.json!");
    } else {
        console.log("⚠️ No standings found! Skipping save to protect assets.");
    }

    await browser.close();
    console.log("Scraping finished successfully!");
}

scrape().catch(err => {
    console.error("Critical error during fixtures scraping:", err);
    process.exit(1);
});
