import { scrapeUpdates, tryAlternativeApproach } from './scraper';
import { sendUpdateToDiscord } from './discord-webhook';
import { config } from './config';
import { Update } from './types';

// Use configuration from config.ts
const INTERVAL_MS = config.intervalMs;
const MAX_FAILURES_BEFORE_ALTERNATIVE = config.maxFailuresBeforeAlternative;
const MAX_CONSECUTIVE_FAILURES = config.maxConsecutiveFailures;

let lastSuccessfulScrape: Date | null = null;
let consecutiveFailures = 0;
let lastUpdateTitle: string | null = null;
let lastUpdateTimestamp: string | null = null;
let noChangeCount = 0;
let lastDisplayedUpdate: Date | null = null;

// Fallback data for when scraping fails completely
const fallbackData: Update[] = [
    {
        title: "[FALLBACK DATA] Update on community preparedness - Tropical Cyclone Alfred - 7 March 2025",
        timestamp: "Last Updated 4 hours ago [FALLBACK DATA]",
        content: "[FALLBACK DATA] Tropical Cyclone Alfred is continuing to move slowly towards the coast this morning (Friday 7 March).",
        isFallbackData: true
    },
    {
        title: "[FALLBACK DATA] WATCH & ACT – MONITOR CONDITIONS AS THEY ARE CHANGING Tropical Cyclone Alfred",
        timestamp: "Last Updated 17 hours ago [FALLBACK DATA]",
        content: "[FALLBACK DATA] Ipswich City Council advises people in the Ipswich City Council Local Government Area to MONITOR CONDITIONS AS THEY ARE CHANGING for Tropical Cyclone Alfred...",
        isFallbackData: true
    }
];

const startScraping = async () => {
    const currentTime = new Date();
    console.log(`[${currentTime.toISOString()}] Running update check...`);
    
    try {
        // First try normal scraping with Puppeteer
        let data = await scrapeUpdates();
        
        // If normal scraping fails, try alternative approach after a few failures
        if (data.length === 0 && consecutiveFailures >= MAX_FAILURES_BEFORE_ALTERNATIVE) {
            console.log(`Regular scraping failed ${consecutiveFailures} times, trying alternative approach...`);
            data = await tryAlternativeApproach();
        }
        
        if (data.length === 0) {
            consecutiveFailures++;
            console.warn(`No data returned. Consecutive failures: ${consecutiveFailures}`);
            
            // Help user debug with some suggestions
            if (consecutiveFailures === MAX_FAILURES_BEFORE_ALTERNATIVE) {
                console.log('Multiple failures detected. Possible reasons:');
                console.log('1. The website might be using JavaScript to load content dynamically');
                console.log('2. The website might be blocking scraping requests');
                console.log('3. There might be network connectivity issues');
                console.log('\nPossible solutions:');
                console.log('1. Consider using Puppeteer or Playwright for full browser rendering');
                console.log('2. Check if the site has a public API');
                console.log('3. Verify the site structure manually and update selectors');
            }
            
            // Use fallback data after MAX_CONSECUTIVE_FAILURES
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                console.log(`=========================================================`);
                console.log(`WARNING: Using fallback data after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`);
                console.log(`WARNING: This is NOT current disaster information`);
                console.log(`WARNING: This is sample data for testing purposes only`);
                console.log(`WARNING: DO NOT use this data for emergency decisions`);
                console.log(`=========================================================`);
                data = fallbackData;
            }
        } else {
            consecutiveFailures = 0;
            lastSuccessfulScrape = currentTime;
            
            // Check if the update is new or changed
            const latestUpdate = data[0];
            const isNewUpdate = latestUpdate.title !== lastUpdateTitle;
            const isChangedTimestamp = latestUpdate.timestamp !== lastUpdateTimestamp;
            
            if (isNewUpdate || isChangedTimestamp) {
                // We have a new or updated item
                console.log(`[${currentTime.toISOString()}] New or updated information detected!`);
                console.log('Latest update:', {
                    title: latestUpdate.title,
                    timestamp: latestUpdate.timestamp,
                    contentPreview: latestUpdate.content ? latestUpdate.content.substring(0, 100) + '...' : 'No content available',
                    fullContentAvailable: latestUpdate.fullContent ? true : false
                });
                
                if (latestUpdate.fullContent) {
                    console.log('Modal content sample:', latestUpdate.fullContent.substring(0, 200) + '...');
                }
                
                // Send Discord notification for new updates
                console.log('Sending Discord notification for new update');
                await sendUpdateToDiscord(latestUpdate, config.discord);
                
                // Reset counters and update tracking
                noChangeCount = 0;
                lastUpdateTitle = latestUpdate.title;
                lastUpdateTimestamp = latestUpdate.timestamp || null;
                lastDisplayedUpdate = currentTime;
            } else {
                // Same update as before
                noChangeCount++;
                
                // Only log "no changes" occasionally to reduce console spam
                if (noChangeCount === 1 || noChangeCount % 10 === 0) {
                    console.log(`No new updates found. Same content has been seen ${noChangeCount} times.`);
                    console.log(`Last update was: "${lastUpdateTitle}" (${lastUpdateTimestamp})`);
                } else {
                    // Minimalist log message for most checks
                    process.stdout.write('.');
                    
                    // Add a line break every 50 dots for readability
                    if (noChangeCount % 50 === 0) {
                        console.log('');
                    }
                }
                
                // Every hour, show a summary even if there are no updates
                const hoursSinceDisplay = lastDisplayedUpdate 
                    ? (currentTime.getTime() - lastDisplayedUpdate.getTime()) / (1000 * 60 * 60) 
                    : 0;
                
                if (hoursSinceDisplay >= 1) {
                    console.log(`\n[${currentTime.toISOString()}] Hourly summary (no changes in ${hoursSinceDisplay.toFixed(1)} hours):`);
                    console.log(`Latest update remains: "${lastUpdateTitle}" (${lastUpdateTimestamp})`);
                    lastDisplayedUpdate = currentTime;
                }
            }
            
            // Display warning for fallback data regardless of whether it's new
            if (latestUpdate.isFallbackData) {
                console.log('⚠️  SHOWING FALLBACK DATA - NOT CURRENT INFORMATION ⚠️');
                console.log('⚠️  FALLBACK DATA: This information is not current and should not be relied upon. ⚠️');
            }
        }
    } catch (error) {
        consecutiveFailures++;
        console.error('Error in scraping process:', error);
    }
    
    // Only show the "next scrape" message if we're not doing compact logging
    if (noChangeCount === 0 || noChangeCount === 1 || noChangeCount % 10 === 0) {
        console.log(`Next check scheduled in ${INTERVAL_MS/1000} seconds`);
    }
};

console.log('Disaster Watch scraper starting...');
console.log(`Check interval set to ${INTERVAL_MS/1000} seconds (${INTERVAL_MS/1000/60} minutes)`);
console.log(`Discord notifications: ${config.discord.url ? 'Enabled' : 'Disabled'}`);

// Start the interval
setInterval(startScraping, INTERVAL_MS);

// Initial call to scrape immediately
startScraping().catch(err => console.error('Initial scrape failed:', err));