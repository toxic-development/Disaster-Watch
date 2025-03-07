/**
 * Application configuration
 */
export const config = {
    /**
     * URL to scrape for disaster updates
     */
    scrapeUrl: 'https://disaster.ipswich.qld.gov.au/',
    
    /**
     * Time between update checks in milliseconds
     */
    intervalMs: 60000,
    
    /**
     * Number of consecutive failures before trying alternative approach
     */
    maxFailuresBeforeAlternative: 2,
    
    /**
     * Number of consecutive failures before using fallback data
     */
    maxConsecutiveFailures: 5,
    
    /**
     * Notification configuration
     */
    notifications: {
        /**
         * How often to show a summary when no updates have changed (in hours)
         */
        summaryInterval: 1,
        
        /**
         * Whether to use compact logging (dots) for repeated checks with no changes
         */
        useCompactLogging: true
    },
    
    /**
     * Discord webhook configuration
     * To disable Discord notifications, leave the URL empty
     */
    discord: {
        /**
         * Discord webhook URL
         * Create one in your Discord server settings -> Integrations -> Webhooks
         */
        url: process.env.DISCORD_WEBHOOK_URL || '',
        
        /**
         * Username that will appear for the webhook messages
         */
        username: 'Disaster Watch',
        
        /**
         * Avatar URL for the webhook messages
         */
        avatarUrl: 'https://i.imgur.com/GQgpIAX.png'
    }
};
