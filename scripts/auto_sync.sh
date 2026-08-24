#!/bin/bash
# Local auto-sync script for Wolves Cricket Club
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

cd /Users/srinadhreddy/.gemini/antigravity/scratch/wolves-cricket-club || exit 1

# Ensure logs directory exists
mkdir -p logs

# Run syncs and log outputs
echo "=== Auto-Sync Start: $(date) ===" >> logs/auto_sync.log

# Ensure git is clean and up to date
git pull origin main >> logs/auto_sync.log 2>&1

# Run scrapers headlessly
export AUTO_SYNC=true
npm run sync >> logs/auto_sync.log 2>&1
npm run sync-fixtures >> logs/auto_sync.log 2>&1

# Check for diffs in assets
git add src/assets/wolves_roster.json src/assets/scraped_fixtures.json src/assets/scraped_standings.json

if ! git diff-index --quiet HEAD; then
    echo "Changes detected, committing and pushing..." >> logs/auto_sync.log
    git commit -m "chore: local auto-update cricclubs stats and fixtures ($(date +'%Y-%m-%d'))" >> logs/auto_sync.log 2>&1
    git push origin main >> logs/auto_sync.log 2>&1
else
    echo "No changes detected." >> logs/auto_sync.log
fi

echo "=== Auto-Sync End: $(date) ===" >> logs/auto_sync.log
