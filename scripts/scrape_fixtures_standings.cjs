const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

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

    // 1. Scrape MWCL Fixtures
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

    // 2. Scrape CPLKC Fixtures
    console.log("Navigating to CPLKC Fixtures...");
    await page.goto('https://cricclubs.com/cplkc/fixtures.do?league=100&teamId=1096&internalClubId=null&year=2026&clubId=85', { waitUntil: 'networkidle2', timeout: 90000 });
    console.log("Waiting 15 seconds for Cloudflare challenge to pass...");
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    const cplkcFixtures = await page.evaluate(() => {
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
    console.log(`Found ${cplkcFixtures.length} CPLKC Fixtures.`);

    // 3. Scrape MWCL Standings
    console.log("Navigating to MWCL Standings...");
    await page.goto('https://cricclubs.com/mwcl/pointsTable.do?league=68&clubId=93', { waitUntil: 'networkidle2', timeout: 90000 });
    console.log("Waiting 15 seconds...");
    await new Promise(resolve => setTimeout(resolve, 15000));
    const mwclStandings = await page.evaluate(() => {
        const rows = [];
        const trs = document.querySelectorAll('table tr');
        trs.forEach(tr => {
            const cells = Array.from(tr.children)
                .filter(child => child.tagName === 'TD' || child.tagName === 'TH')
                .map(cell => cell.textContent.trim().replace(/\s+/g, ' '));
            if (cells.length >= 8 && /^\d+$/.test(cells[0])) {
                rows.push({ cells });
            }
        });
        return rows;
    });
    console.log(`Found ${mwclStandings.length} MWCL Standings rows.`);

    // 4. Scrape CPLKC Standings
    console.log("Navigating to CPLKC Standings...");
    await page.goto('https://cricclubs.com/cplkc/pointsTable.do?league=100&clubId=85', { waitUntil: 'networkidle2', timeout: 90000 });
    console.log("Waiting 15 seconds...");
    await new Promise(resolve => setTimeout(resolve, 15000));
    const cplkcStandings = await page.evaluate(() => {
        const rows = [];
        const trs = document.querySelectorAll('table tr');
        trs.forEach(tr => {
            const cells = Array.from(tr.children)
                .filter(child => child.tagName === 'TD' || child.tagName === 'TH')
                .map(cell => cell.textContent.trim().replace(/\s+/g, ' '));
            if (cells.length >= 8 && /^\d+$/.test(cells[0])) {
                rows.push({ cells });
            }
        });
        return rows;
    });
    console.log(`Found ${cplkcStandings.length} CPLKC Standings rows.`);

    // Save to files
    const projectDir = '/Users/srinadhreddy/.gemini/antigravity/scratch/wolves-cricket-club';
    
    // Only write if we actually found data, to prevent blanking assets on scraping errors
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

scrape().catch(console.error);
