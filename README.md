# Disaster Watch

A real-time scraper for monitoring disaster updates from the Ipswich City Council Disaster Dashboard.

## Overview

Disaster Watch is a Node.js application that automatically scrapes and monitors disaster updates from the [Ipswich City Council Disaster Dashboard](https://disaster.ipswich.qld.gov.au/). It uses Puppeteer for browser automation to retrieve live updates about natural disasters, emergency alerts, and other critical information.

## Legal Disclaimer

**IMPORTANT: This software is created for EDUCATIONAL PURPOSES ONLY.**

This project is not affiliated with, endorsed by, or in any way officially connected to the Ipswich City Council or any governmental agency. It is an independent project designed to demonstrate web scraping techniques and provide a learning resource for developers.

### Usage Guidelines:
1. This software should only be used for personal, educational purposes.
2. Users are responsible for ensuring their use of this software complies with all applicable laws and regulations.
3. Be aware that web scraping may violate a website's terms of service. Always review a website's policies before scraping.
4. Do not use this software in a way that could overload or damage the target website's servers.

### Data Privacy and Security:
- This software does not collect or store personal data.
- All data obtained is publicly available on the Ipswich City Council Disaster Dashboard.
- No warranty is provided regarding the accuracy or reliability of the extracted information.

## Features

- **Real-time Monitoring**: Fetches disaster updates every 60 seconds
- **Robust Scraping**: Uses Puppeteer to render JavaScript and access dynamically loaded content
- **Fault Tolerance**: Multiple fallback mechanisms to ensure continuous operation
- **Detailed Logging**: Comprehensive logging to help troubleshoot any issues

## Requirements

- Node.js 14.x or higher
- npm or yarn package manager
- Chromium (automatically installed with Puppeteer)

## Installation

1. Clone this repository:
   ```bash
   git clone <your-repo-url>
   cd disaster-watch
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   # or
   bun install
   ```

3. Build the project:
   ```bash
   npm run build
   # or
   yarn build
   # or
   bun run build
   ```

## Usage

Start the application:

```bash
npm start
# or
yarn start
# or
bun start
```

The application will:
1. Start a headless Chrome browser
2. Navigate to the disaster dashboard
3. Extract update information
4. Log the data to the console
5. Repeat every 60 seconds

## Configuration

All configuration options are centralized in the `src/config.ts` file. You can modify these settings to customize the behavior of the application:

### Basic Settings

```typescript
export const config = {
  // URL to scrape for disaster updates
  scrapeUrl: 'https://disaster.ipswich.qld.gov.au/',
  
  // Time between update checks in milliseconds (default: 60000ms = 1 minute)
  intervalMs: 60000,
  
  // Number of consecutive failures before trying alternative approach
  maxFailuresBeforeAlternative: 2,
  
  // Number of consecutive failures before using fallback data
  maxConsecutiveFailures: 5,
  
  // ...other settings
}
```

### Notification Settings

You can customize how often summaries are displayed and enable/disable compact logging:

```typescript
notifications: {
  // How often to show a summary when no updates have changed (in hours)
  summaryInterval: 1,
  
  // Whether to use compact logging (dots) for repeated checks with no changes
  useCompactLogging: true
}
```

### Environment Variables

You can also use environment variables to configure some options without modifying the code:

1. Copy `.env.example` to `.env` in the project root
2. Edit the values in your `.env` file
3. Restart the application

Example `.env` file:
```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-url
```

## Discord Webhook Integration

This application can send disaster update notifications to a Discord channel using webhooks. To set this up:

1. In your Discord server, go to **Server Settings** → **Integrations** → **Webhooks**
2. Click **New Webhook**, give it a name (e.g., "Disaster Watch"), and select the channel where you want notifications
3. Copy the webhook URL
4. Create a `.env` file in the project root (copy from `.env.example`) and add your webhook URL:
   ```
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-url
   ```
   
Alternatively, you can directly edit the webhook URL in the `config.ts` file:

```typescript
discord: {
  url: process.env.DISCORD_WEBHOOK_URL || 'your-webhook-url-here',
  username: 'Disaster Watch',
  avatarUrl: 'https://i.imgur.com/GQgpIAX.png'
}
```

### Webhook Appearance

You can customize how the webhook appears in Discord:

- **Username**: Change the name that shows for the webhook messages
- **Avatar**: Set a custom avatar by updating the `avatarUrl` property

### Alert Colors

Disaster updates are automatically color-coded in Discord based on keywords in the title:

- 🔴 **Red**: Emergencies, warnings, alerts, evacuation notices, danger
- 🟡 **Yellow**: Watches, advisories, preparation notices
- 🟢 **Green**: Recovery information, all-clear notices, safety confirmations
- ⚪ **Gray**: General updates with no specific severity indication

To disable Discord notifications, leave the webhook URL empty.

## Understanding the Console Output

The application uses different types of console output:

- **Regular updates**: When new content is found, full details are displayed
- **Compact logging**: For unchanged content, a simple dot (`.`) is printed to reduce console clutter
- **Summary messages**: Displayed hourly to confirm the application is still running
- **Warning messages**: When fallback data is being used

## Advanced Customization

### Modifying Scraping Behavior

If the website structure changes, you may need to update the selectors in `scraper.ts`. The key parts to look for:

```typescript
// Find content items
const contentItems = $('.contentItem');

// Extract title
const title = $(el).find('.contentTitle a').text().trim();

// Extract timestamp
const timestamp = $(el).find('.updateInfo').text().trim();

// Extract content
const contentElement = $(el).find('.contentDetail');
```

### Changing the Fallback Data

The fallback data used when scraping fails can be modified in `index.ts`:

```typescript
const fallbackData: Update[] = [
  {
    title: "[FALLBACK DATA] Your custom title here",
    timestamp: "Last Updated time [FALLBACK DATA]",
    content: "[FALLBACK DATA] Your custom content here",
    isFallbackData: true
  },
  // Add more fallback items as needed
];
```

## Technical Details

### Architecture

This application uses:
- **TypeScript**: For type-safe code
- **Puppeteer**: For browser automation and rendering JavaScript-loaded content
- **Cheerio**: For HTML parsing
- **Axios**: For alternative HTTP requests when needed

### Scraping Strategy

The scraper tries multiple approaches to ensure reliable data:

1. Puppeteer-powered main scraping with full JavaScript rendering
2. Alternative API approach as backup
3. Hardcoded fallback data as a last resort after multiple failures

### Handling Failures

The system implements a progressive failure handling strategy:
- Retries with the main scraper first
- Attempts alternative scraping methods
- Falls back to saved data after multiple failures
- Provides detailed logging for debugging

## Development

For development, you can run the application with:

```bash
npm run dev
# or
yarn dev
# or
bun run dev
```

## Troubleshooting

Common issues and solutions:

- **No data returned**: The site structure may have changed. Check the console logs for HTML structure analysis.
- **Browser launch fails**: Ensure you have sufficient permissions and no firewalls blocking Chrome.
- **Memory usage concerns**: The application automatically closes the browser after each scraping session.
- **Discord webhook not working**: Verify your webhook URL is correct and has the proper permissions.
- **Repetitive logging**: Adjust the `notifications.useCompactLogging` and `notifications.summaryInterval` settings.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- This project was created as an educational demonstration of web scraping techniques.
- Thanks to the open-source community for the various libraries used in this project.