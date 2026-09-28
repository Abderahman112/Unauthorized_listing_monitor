#!/bin/bash
# Restart loop for dubizzle.py — restarts with a fresh browser when Incapsula blocks
# Usage: bash run_dubizzle.sh

cd "$(dirname "$0")"
source ../.venv/bin/activate 2>/dev/null || true

while true; do
    echo "[$(date)] Starting scraper..."
    python3 -u dubizzle.py

    # Check if we're done (no more pages to scrape)
    NEXT=$(python3 -c "import json; d=json.load(open('output/dubizzle_progress.json')); print(d.get('next_page',999))" 2>/dev/null || echo "999")
    TOTAL=$(python3 -c "import json; d=json.load(open('output/dubizzle_listings.json')); print(d.get('count',0))" 2>/dev/null || echo "0")

    echo "[$(date)] Scraper exited. Next page: $NEXT | Collected: $TOTAL"

    if [ "$NEXT" -ge 175 ]; then
        echo "All pages done. Exiting."
        break
    fi

    echo "[$(date)] Waiting 3 minutes before restart to let Incapsula cooldown..."
    sleep 180
done

echo "Done. Total collected: $TOTAL"
