import axios from 'axios';
import { Update } from './types';

/**
 * Configuration object for Discord webhook
 */
interface DiscordWebhookConfig {
    url: string;
    username?: string;
    avatarUrl?: string;
}

/**
 * Simplified structure for Discord embed objects
 */
interface DiscordEmbed {
    title: string;
    description: string;
    color?: number;
    fields?: { name: string; value: string; inline?: boolean }[];
    footer?: { text: string; icon_url?: string };
    timestamp?: string;
    url?: string;
}

/**
 * Send a notification to Discord about a disaster update
 * 
 * @param update The update to send to Discord
 * @param config Discord webhook configuration
 * @returns Promise that resolves when notification is sent
 */
export async function sendUpdateToDiscord(
    update: Update, 
    config: DiscordWebhookConfig
): Promise<boolean> {
    try {
        if (!config.url) {
            console.log('Discord webhook URL not configured, skipping notification');
            return false;
        }

        console.log(`Sending notification to Discord webhook for update: "${update.title}"`);
        
        // Determine embed color based on content
        let color = 0x2F3136; // Default gray
        
        // Red for urgent/emergency updates
        if (
            update.title.toLowerCase().includes('emergency') || 
            update.title.toLowerCase().includes('warning') ||
            update.title.toLowerCase().includes('alert') ||
            update.title.toLowerCase().includes('evacuate') ||
            update.title.toLowerCase().includes('danger')
        ) {
            color = 0xFF0000; // Red
        } 
        // Yellow for watches, advisories
        else if (
            update.title.toLowerCase().includes('watch') ||
            update.title.toLowerCase().includes('advisory') ||
            update.title.toLowerCase().includes('prepare')
        ) {
            color = 0xFFCC00; // Yellow
        }
        // Green for recovery, all-clear
        else if (
            update.title.toLowerCase().includes('recovery') ||
            update.title.toLowerCase().includes('all clear') ||
            update.title.toLowerCase().includes('safe')
        ) {
            color = 0x00FF00; // Green
        }
        
        // Format content for Discord - limit to 2000 chars
        const contentText = update.content 
            ? update.content.replace(/<[^>]*>/g, '') // Remove HTML tags
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim()
                .substring(0, 1500) + (update.content.length > 1500 ? '...' : '') 
            : 'No content available';
            
        // Create embed for the message
        const embed: DiscordEmbed = {
            title: update.title,
            description: contentText,
            color: color,
            fields: [
                {
                    name: 'Last Updated',
                    value: update.timestamp || 'Unknown',
                    inline: true
                }
            ],
            footer: {
                text: 'Disaster Watch - Ipswich City Council Dashboard'
            },
            timestamp: new Date().toISOString()
        };
        
        // Add field for full content availability
        if (update.fullContent) {
            embed.fields?.push({
                name: 'Detailed Information',
                value: 'Full update details available in the [dashboard](https://disaster.ipswich.qld.gov.au/)',
                inline: true
            });
        }
        
        // Prepare the webhook payload
        const payload = {
            username: config.username || 'Disaster Watch',
            avatar_url: config.avatarUrl || 'https://i.imgur.com/GQgpIAX.png', // Default icon
            content: '**New Disaster Update**',
            embeds: [embed],
        };
        
        // Check if this is fallback data and add warning if so
        if (update.isFallbackData) {
            payload.content = '⚠️ **TEST DATA - NOT ACTUAL EMERGENCY INFORMATION** ⚠️';
            payload.embeds[0].color = 0x808080; // Gray for test data
            payload.embeds[0].footer = { 
                text: 'TEST DATA - The actual dashboard is currently unavailable'
            };
        }

        // Send the webhook request
        await axios.post(config.url, payload);
        console.log('Discord notification sent successfully');
        return true;
    } catch (error) {
        console.error('Failed to send Discord notification:', error);
        return false;
    }
}
