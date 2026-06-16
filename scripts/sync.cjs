const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

// Excluded players requested by user
const BLACKLIST = [
    "ashu marneni",
    "kalyan neelam",
    "sri ram meka",
    "vamshi krishna chanda",
    "vamsi krishna chanda",
    "vijay kumar burada"
];

const LEAGUE_SOURCES = [
    { name: "MWCL", url: "https://cricclubs.com/mwcl/viewTeam.do?teamId=665&clubId=93" },
    { name: "CPLKC", url: "https://cricclubs.com/cplkc/viewTeam.do?teamId=1096&clubId=85" }
];

function isBlacklisted(name) {
    const norm = name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    for (const b of BLACKLIST) {
        const bNorm = b.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
        if (norm === bNorm || norm.includes(bNorm) || bNorm.includes(norm)) {
            return true;
        }
    }
    return false;
}

function normalizeName(name) {
    return name
        .replace(/\.\.$/, '') // strip trailing dots
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

async function run() {
    const isActions = !!process.env.GITHUB_ACTIONS;
    console.log(`Starting Chrome (${isActions ? 'headless' : 'headful'} mode) for Wolves multi-league stats sync...`);
    
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

    const allBasicPlayers = [];

    for (const source of LEAGUE_SOURCES) {
        console.log(`\n--------------------------------------------`);
        console.log(`Navigating to ${source.name} team page: ${source.url}`);
        console.log(`--------------------------------------------`);
        try {
            await page.goto(source.url, { waitUntil: 'networkidle2', timeout: 90000 });
            console.log("Waiting 15 seconds for Cloudflare challenge to pass...");
            await new Promise(resolve => setTimeout(resolve, 15000));

            console.log(`Scraping players list from ${source.name} page...`);
            const list = await page.evaluate((leagueName) => {
                const results = [];
                const divs = document.querySelectorAll('#allPlayersDiv > div');
                for (const div of divs) {
                    const nameEl = div.querySelector('h4');
                    const roleEl = div.querySelector('h5');
                    const linkEl = div.querySelector('a.btn-team');
                    
                    if (nameEl && linkEl) {
                        const name = nameEl.textContent.trim();
                        const role = roleEl ? roleEl.textContent.trim() : '';
                        const href = linkEl.getAttribute('href');
                        const url = href.startsWith('http') ? href : 'https://cricclubs.com' + href;
                        
                        const match = href.match(/playerId=(\d+)/);
                        const playerId = match ? match[1] : '';
                        
                        results.push({
                            playerId,
                            name,
                            role,
                            profileUrl: url,
                            league: leagueName
                        });
                    }
                }
                return results;
            }, source.name);

            console.log(`Found ${list.length} players in ${source.name}.`);
            allBasicPlayers.push(...list);
        } catch (err) {
            console.error(`Failed to scrape team page for ${source.name}:`, err.message);
        }
    }

    // Filter out blacklisted players
    console.log(`\nFiltering out blacklisted players...`);
    const filteredBasicPlayers = allBasicPlayers.filter(p => {
        if (isBlacklisted(p.name)) {
            console.log(`❌ Excluding blacklisted player: "${p.name}" (${p.league})`);
            return false;
        }
        return true;
    });

    // Group players by normalized name for deduplication
    console.log(`\nGrouping players for deduplication...`);
    const playerGroups = {};
    for (const p of filteredBasicPlayers) {
        const norm = normalizeName(p.name);
        if (!playerGroups[norm]) {
            playerGroups[norm] = {
                name: p.name,
                profiles: []
            };
        }
        playerGroups[norm].profiles.push(p);
    }

    const uniqueKeys = Object.keys(playerGroups);
    console.log(`Found ${uniqueKeys.length} unique players across all leagues.`);

    const finalRoster = [];

    // Detailed scraping for each unique player (avoiding duplicate stats downloads)
    for (let i = 0; i < uniqueKeys.length; i++) {
        const key = uniqueKeys[i];
        const group = playerGroups[key];
        
        console.log(`\n[${i+1}/${uniqueKeys.length}] Processing player: ${group.name}`);
        
        // Keep primary profile from MWCL if available, otherwise first discovered profile
        const mwclProfile = group.profiles.find(p => p.league === 'MWCL');
        const primaryProfile = mwclProfile || group.profiles[0];
        
        console.log(`   Scraping primary profile from ${primaryProfile.league}: ${primaryProfile.profileUrl}`);
        if (group.profiles.length > 1) {
            console.log(`   ℹ️ Note: Player also plays in ${group.profiles.map(p => p.league).filter(l => l !== primaryProfile.league).join(', ')}. Stats will not be counted twice.`);
        }
        
        try {
            await page.goto(primaryProfile.profileUrl, { waitUntil: 'networkidle2', timeout: 45000 });
            await new Promise(resolve => setTimeout(resolve, 3000)); // sleep 3s to be safe

            const details = await page.evaluate(() => {
                let matchesPlayed = 0;
                let runs = 0;
                let wickets = 0;
                let battingStyle = '';
                let bowlingStyle = '';
                let jerseyNumber = '';
                let photoUrl = '';

                const imgEl = document.querySelector('.profile-team-img img') || 
                              document.querySelector('.profile-pic img') || 
                              document.querySelector('.profile-team-text img') ||
                              document.querySelector('.matches-runs-wickets img') ||
                              document.querySelector('.profile-img img') ||
                              document.querySelector('img[src*="/profile/"]') ||
                              document.querySelector('img[src*="cricclubs.com/profile"]') ||
                              document.querySelector('img[src*="static.cricclubs.com"]');
                
                if (imgEl) {
                    const src = imgEl.getAttribute('src');
                    if (src) {
                        photoUrl = src.startsWith('http') ? src : 'https://cricclubs.com' + src;
                    }
                }

                const statItems = document.querySelectorAll('.matches-runs-wickets ul li');
                for (const li of statItems) {
                    const text = li.textContent || '';
                    const span = li.querySelector('span');
                    if (span) {
                        const val = parseInt(span.textContent.trim(), 10) || 0;
                        if (text.includes('Matches')) matchesPlayed = val;
                        if (text.includes('Runs')) runs = val;
                        if (text.includes('Wickets')) wickets = val;
                    }
                }

                const paragraphs = document.querySelectorAll('.profile-team-text-in p');
                for (const p of paragraphs) {
                    const text = p.textContent || '';
                    if (text.includes('Jersey Number')) {
                        const strong = p.querySelector('strong');
                        if (strong) jerseyNumber = strong.textContent.trim();
                    }
                    if (text.includes('Batting Style')) {
                        const strong = p.querySelector('strong');
                        if (strong) battingStyle = strong.textContent.trim();
                    }
                    if (text.includes('Bowling Style')) {
                        const strong = p.querySelector('strong');
                        if (strong) bowlingStyle = strong.textContent.trim();
                    }
                }

                let battingStats = {};
                let bowlingStats = {};

                // Helper to convert overs string to balls
                const oversToBalls = (oversStr) => {
                    const parts = String(oversStr).trim().split('.');
                    const o = parseInt(parts[0], 10) || 0;
                    const b = parseInt(parts[1], 10) || 0;
                    return o * 6 + b;
                };

                // Helper to convert balls back to overs string
                const ballsToOvers = (balls) => {
                    const o = Math.floor(balls / 6);
                    const b = balls % 6;
                    return b > 0 ? `${o}.${b}` : `${o}.0`;
                };

                const trs = document.querySelectorAll('tr');
                trs.forEach(tr => {
                    const cells = Array.from(tr.querySelectorAll('th, td')).map(c => c.textContent.trim());
                    if (cells.length >= 10) {
                        const rawFormat = cells[0];
                        
                        // Parse format
                        let format = null;
                        const lowerF = rawFormat.toLowerCase();
                        if (lowerF.includes('practice')) {
                            format = 'Practice';
                        } else if (lowerF.includes('1 day') || lowerF.includes('oneday') || lowerF.includes('t-30') || lowerF.includes('t30') || lowerF.includes('30 over')) {
                            format = '1 DAY';
                        } else if (lowerF.includes('t20') || lowerF.includes('t-20') || lowerF.includes('t18') || lowerF.includes('t-18') || lowerF.includes('twenty')) {
                            format = 'T20';
                        } else if (lowerF.includes('t10') || lowerF.includes('t-10') || lowerF.includes('ten')) {
                            format = 'T10';
                        } else if (lowerF.includes('league') || lowerF.includes('t15') || lowerF.includes('t-15') || lowerF.includes('15 over')) {
                            format = 'League';
                        } else if (rawFormat === 'T20' || rawFormat === '1 DAY' || rawFormat === 'T10' || rawFormat === 'League' || rawFormat === 'Practice') {
                            format = rawFormat;
                        }

                        if (format) {
                            const table = tr.closest('table');
                            if (table) {
                                const ths = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
                                if (ths.includes('HS') || ths.includes('NO')) {
                                    // Batting Table
                                    if (!battingStats[format]) {
                                        battingStats[format] = { Mat: 0, Inns: 0, NO: 0, Runs: 0, Balls: 0, HS: 0, isNotOutHS: false, '100s': 0, '50s': 0, '4s': 0, '6s': 0 };
                                    }
                                    const b = battingStats[format];
                                    b.Mat += parseInt(cells[1], 10) || 0;
                                    b.Inns += parseInt(cells[2], 10) || 0;
                                    b.NO += parseInt(cells[3], 10) || 0;
                                    b.Runs += parseInt(cells[4], 10) || 0;
                                    b.Balls += parseInt(cells[5], 10) || 0;
                                    
                                    // High Score calculation
                                    const hsStr = String(cells[8] || '0').trim();
                                    const isNO = hsStr.includes('*');
                                    const hsVal = parseInt(hsStr.replace('*', ''), 10) || 0;
                                    if (hsVal > b.HS) {
                                        b.HS = hsVal;
                                        b.isNotOutHS = isNO;
                                    }
                                    
                                    b['100s'] += parseInt(cells[9], 10) || 0;
                                    b['50s'] += parseInt(cells[10], 10) || 0;
                                    b['4s'] += parseInt(cells[13], 10) || 0;
                                    b['6s'] += parseInt(cells[14], 10) || 0;
                                }
                                if (ths.includes('Overs') || ths.includes('Wkts') || ths.includes('BBF')) {
                                    // Bowling Table
                                    if (!bowlingStats[format]) {
                                        bowlingStats[format] = { Mat: 0, Inns: 0, Balls: 0, Runs: 0, Wkts: 0, BBF: '', bestWkts: -1, bestRuns: 999, Mdns: 0, '4w': 0, '5w': 0 };
                                    }
                                    const bw = bowlingStats[format];
                                    bw.Mat += parseInt(cells[1], 10) || 0;
                                    bw.Inns += parseInt(cells[2], 10) || 0;
                                    bw.Balls += oversToBalls(cells[3] || '0.0');
                                    bw.Runs += parseInt(cells[4], 10) || 0;
                                    bw.Wkts += parseInt(cells[5], 10) || 0;
                                    
                                    // Best Bowling calculation
                                    const bbfStr = String(cells[6] || '').trim();
                                    const parts = bbfStr.split('/');
                                    if (parts.length === 2) {
                                        const r = parseInt(parts[0], 10) || 0;
                                        const w = parseInt(parts[1], 10) || 0;
                                        if (w > bw.bestWkts || (w === bw.bestWkts && r < bw.bestRuns)) {
                                            bw.bestWkts = w;
                                            bw.bestRuns = r;
                                            bw.BBF = bbfStr;
                                        }
                                    }
                                    
                                    bw.Mdns += parseInt(cells[7], 10) || 0;
                                    bw['4w'] += parseInt(cells[11], 10) || 0;
                                    bw['5w'] += parseInt(cells[12], 10) || 0;
                                }
                            }
                        }
                    }
                });

                // Final post-processing to compute averages, strike rates, economy, and formatting
                let finalBatting = {};
                for (const [fmt, b] of Object.entries(battingStats)) {
                    const den = b.Inns - b.NO;
                    const ave = den > 0 ? (b.Runs / den).toFixed(2) : b.Inns > 0 ? b.Runs.toFixed(2) : '0.00';
                    const sr = b.Balls > 0 ? ((b.Runs / b.Balls) * 100).toFixed(2) : '0.00';
                    finalBatting[fmt] = {
                        Mat: String(b.Mat),
                        Inns: String(b.Inns),
                        NO: String(b.NO),
                        Runs: String(b.Runs),
                        Balls: String(b.Balls),
                        Ave: ave,
                        SR: sr,
                        HS: `${b.HS}${b.isNotOutHS ? '*' : ''}`,
                        '100s': String(b['100s']),
                        '50s': String(b['50s']),
                        '4s': String(b['4s']),
                        '6s': String(b['6s'])
                    };
                }

                let finalBowling = {};
                for (const [fmt, bw] of Object.entries(bowlingStats)) {
                    const oversStr = ballsToOvers(bw.Balls);
                    const ave = bw.Wkts > 0 ? (bw.Runs / bw.Wkts).toFixed(2) : '0.00';
                    const econ = bw.Balls > 0 ? (bw.Runs / (bw.Balls / 6)).toFixed(2) : '0.00';
                    const sr = bw.Wkts > 0 ? (bw.Balls / bw.Wkts).toFixed(2) : '0.00';
                    finalBowling[fmt] = {
                        Mat: String(bw.Mat),
                        Inns: String(bw.Inns),
                        Overs: oversStr,
                        Runs: String(bw.Runs),
                        Wkts: String(bw.Wkts),
                        BBF: bw.BBF || '0/0',
                        Mdns: String(bw.Mdns),
                        Ave: ave,
                        Econ: econ,
                        SR: sr,
                        '4w': String(bw['4w']),
                        '5w': String(bw['5w'])
                    };
                }

                return {
                    matchesPlayed,
                    runs,
                    wickets,
                    battingStyle,
                    bowlingStyle,
                    jerseyNumber,
                    photoUrl,
                    battingStats: finalBatting,
                    bowlingStats: finalBowling
                };
            });

            const consolidated = {
                playerId: primaryProfile.playerId,
                name: group.name,
                role: primaryProfile.role || details.role || 'Player',
                profileUrl: primaryProfile.profileUrl,
                ...details
            };

            finalRoster.push(consolidated);
            console.log(`   ✅ Successfully loaded stats. Runs: ${consolidated.runs}, Wickets: ${consolidated.wickets}`);
        } catch (err) {
            console.error(`   ❌ Failed to scrape profile ${primaryProfile.profileUrl}:`, err.message);
        }
    }

    // Merge back any existing players in the file that weren't scraped in this run
    const outputPath = path.join(__dirname, '..', 'src', 'assets', 'wolves_roster.json');
    let existingRoster = [];
    if (fs.existsSync(outputPath)) {
        try {
            existingRoster = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        } catch (e) {
            console.log("Could not parse existing roster for merging:", e.message);
        }
    }
    const finalIds = new Set(finalRoster.map(p => String(p.playerId)));
    for (const p of existingRoster) {
        if (!finalIds.has(String(p.playerId))) {
            finalRoster.push(p);
            console.log(`ℹ️ Preserved existing unscraped player: ${p.name} (${p.playerId})`);
        }
    }

    // Save consolidated roster to assets and scratch backup
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(finalRoster, null, 2), 'utf8');
    console.log(`\n🎉 Consolidated multi-league roster successfully saved to ${outputPath}`);

    const backupPath = '/Users/srinadhreddy/.gemini/antigravity/scratch/wolves_roster.json';
    try {
        const backupDir = path.dirname(backupPath);
        if (fs.existsSync(backupDir)) {
            fs.writeFileSync(backupPath, JSON.stringify(finalRoster, null, 2), 'utf8');
            console.log(`🎉 Backup saved to ${backupPath}`);
        } else {
            console.log(`ℹ️ Backup directory ${backupDir} does not exist. Skipping backup.`);
        }
    } catch (e) {
        console.log("Could not write backup file:", e.message);
    }

    await browser.close();
    console.log("Synchronization and deduplication completed successfully!");
}

run().catch(err => {
    console.error("Critical error during multi-league sync:", err);
});
