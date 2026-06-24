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
    await page.goto('https://cricclubs.com/cplkc/teams/AhPvVwv2nCTilahs0ZM4Vw?seriesId=is9jyGx-OJwWEqjmUwfVsg', { waitUntil: 'networkidle2', timeout: 90000 });
    console.log("Waiting 15 seconds for Cloudflare challenge to pass...");
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Click 'Schedule' tab
    await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        const scheduleTab = els.find(el => el.textContent.trim() === 'Schedule' && el.children.length === 0);
        if (scheduleTab) {
            scheduleTab.scrollIntoView({ block: 'center' });
            scheduleTab.click();
        }
    });
    await new Promise(resolve => setTimeout(resolve, 5000));

    const rawCplkcFixtures = await page.evaluate(() => {
        const list = [];
        const els = Array.from(document.querySelectorAll('*'));
        const vsElements = els.filter(el => el.children.length === 0 && el.textContent.trim() === 'vs');
        
        vsElements.forEach(vs => {
            let p = vs.parentElement;
            let levels = 0;
            while (p && levels < 5 && !p.className.includes('match-card') && !p.textContent.includes('League')) {
                p = p.parentElement;
                levels++;
            }
            if (p) {
                const lines = p.innerText.trim().split('\n').map(t => t.trim()).filter(Boolean);
                if (lines.length >= 7) {
                    list.push(lines);
                }
            }
        });
        return list;
    });

    const cplkcFixtures = [];
    for (const lines of rawCplkcFixtures) {
        const dateText = lines[0];
        const matchType = lines[1] || 'League';
        const team1 = lines[4];
        const team2 = lines[6];
        const venue = lines[3];
        
        const { dateStr, timeStr } = convertCplkcDate(dateText);
        if (dateStr) {
            cplkcFixtures.push({
                cells: [
                    "1",
                    matchType,
                    dateStr,
                    timeStr,
                    team1,
                    team2,
                    venue,
                    "Scorecard"
                ]
            });
        }
    }
    console.log(`Parsed ${cplkcFixtures.length} CPLKC Fixtures.`);

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
    console.log("Navigating to CPLKC homepage for Standings...");
    await page.goto('https://cricclubs.com/cplkc', { waitUntil: 'networkidle2', timeout: 90000 });
    console.log("Waiting 15 seconds...");
    await new Promise(resolve => setTimeout(resolve, 15000));

    console.log("Scrolling CPLKC 'Div' dropdown into view...");
    await page.evaluate(() => {
        const triggers = Array.from(document.querySelectorAll('.ant-dropdown-trigger'));
        const trigger = triggers.find(el => el.textContent.trim().startsWith('Div'));
        if (trigger) trigger.scrollIntoView({ block: 'center' });
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log("Clicking dropdown...");
    const dropdownRect = await page.evaluate(() => {
        const triggers = Array.from(document.querySelectorAll('.ant-dropdown-trigger'));
        const trigger = triggers.find(el => el.textContent.trim().startsWith('Div'));
        if (!trigger) return null;
        const r = trigger.getBoundingClientRect();
        return { x: r.left + r.width/2, y: r.top + r.height/2 };
    });

    if (dropdownRect) {
        await page.mouse.click(dropdownRect.x, dropdownRect.y);
    } else {
        await page.evaluate(() => {
            const triggers = Array.from(document.querySelectorAll('.ant-dropdown-trigger'));
            const trigger = triggers.find(el => el.textContent.trim().startsWith('Div'));
            if (trigger) trigger.click();
        });
    }
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log("Selecting 'Div B' option...");
    const optionRect = await page.evaluate(() => {
        const divs = Array.from(document.querySelectorAll('.ant-dropdown-menu-item, .ant-dropdown-menu li, .ant-dropdown *'));
        const opt = divs.find(d => d.textContent.trim() === 'Div B' && d.children.length === 0);
        if (!opt) return null;
        opt.scrollIntoView({ block: 'nearest' });
        const r = opt.getBoundingClientRect();
        return { x: r.left + r.width/2, y: r.top + r.height/2 };
    });

    if (optionRect) {
        await page.mouse.click(optionRect.x, optionRect.y);
    } else {
        await page.evaluate(() => {
            const divs = Array.from(document.querySelectorAll('.ant-dropdown-menu-item, .ant-dropdown-menu li, .ant-dropdown *'));
            const opt = divs.find(d => d.textContent.trim() === 'Div B' && d.children.length === 0);
            if (opt) opt.click();
        });
    }
    await new Promise(resolve => setTimeout(resolve, 5000));

    const cplkcStandings = await page.evaluate(() => {
        const rows = [];
        const tables = Array.from(document.querySelectorAll('table'));
        const standingsTable = tables.find(t => {
            const text = t.textContent;
            return text.includes('Team') && text.includes('Pts') && text.includes('NRR');
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
