import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { Update } from './types';

const url = 'https://disaster.ipswich.qld.gov.au/';

// Add browser-like headers for axios requests (used in alternative approach)
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0'
};

// New scraper using Puppeteer - this will execute JavaScript on the page
export const scrapeUpdates = async (): Promise<Update[]> => {
    let browser = null;
    try {
        console.log(`Launching Puppeteer browser to fetch ${url}...`);
        // Launch a headless browser
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Set viewport to desktop size
        await page.setViewport({ width: 1280, height: 800 });
        
        // Set a timeout for page navigation
        await page.goto(url, { timeout: 30000, waitUntil: 'networkidle2' });
        
        console.log('Page loaded, waiting for content to render...');
        
        // Wait for content to be available (try multiple possible selectors)
        try {
            await Promise.race([
                page.waitForSelector('#NewsWarningContent', { timeout: 5000 }),
                page.waitForSelector('.contentItem', { timeout: 5000 }),
                page.waitForSelector('.divToAppend1', { timeout: 5000 })
            ]);
        } catch (e) {
            // If none of the selectors are found, we'll continue anyway
            console.log('Specific selectors not found, continuing with page content');
        }
        
        // Extract page title for debugging
        const pageTitle = await page.title();
        console.log('Page title:', pageTitle);
        
        // Get all the HTML content after JavaScript execution
        const content = await page.content();
        console.log(`Retrieved ${content.length} bytes of rendered HTML content`);
        
        // Now we'll use cheerio to parse the content
        const $ = cheerio.load(content);
        
        const updates: Update[] = [];
        
        // Try to find the contentItem elements based on the structure we've seen
        console.log('Looking for contentItem elements...');
        const contentItems = $('.contentItem');
        console.log(`Found ${contentItems.length} contentItem elements`);
        
        if (contentItems.length > 0) {
            // Process each content item sequentially to click and extract modal content
            for (let i = 0; i < contentItems.length; i++) {
                const el = contentItems[i];
                const title = $(el).find('.contentTitle a').text().trim();
                const timestamp = $(el).find('.updateInfo').text().trim();
                const contentElement = $(el).find('.contentDetail');
                let contentHtml = contentElement.html() || '';
                
                // Truncate content if it's too long
                if (contentHtml.length > 500) {
                    contentHtml = contentHtml.substring(0, 500) + '...';
                }
                
                let fullContent = '';
                
                if (title) {
                    // Try to click on the title to open modal and extract detailed content
                    try {
                        console.log(`Attempting to click on update: "${title}"`);
                        
                        // Get the title selector to click
                        const titleSelector = '.contentTitle a, .conItem, .newsItem';
                        
                        // Wait for the element to be visible before clicking
                        await page.waitForSelector(titleSelector, { timeout: 5000 });
                        
                        // Click on the title element with index i (same as our current loop iteration)
                        await page.evaluate((selector, index) => {
                            const elements = document.querySelectorAll(selector);
                            if (elements.length > index) {
                                (elements[index] as HTMLElement).click();
                            }
                        }, titleSelector, i);
                        
                        // Wait for modal to appear
                        console.log('Waiting for modal to appear...');
                        await page.waitForSelector('.modal.fade.in, .modal-body, #newsModal', { timeout: 5000 });
                        
                        // Give the modal content a moment to load
                        await page.waitForTimeout(1000);
                        
                        // Extract content from the modal
                        fullContent = await page.evaluate(() => {
                            const modalBody = document.querySelector('.modal-body');
                            return modalBody ? modalBody.innerHTML : '';
                        });
                        
                        console.log(`Extracted ${fullContent.length} bytes of modal content`);
                        
                        // Close the modal by clicking close button or pressing ESC
                        await page.evaluate(() => {
                            const closeButton = document.querySelector('.modal .close, .modal-footer button');
                            if (closeButton) {
                                (closeButton as HTMLElement).click();
                            }
                        });
                        
                        // Wait a moment for modal to close
                        await page.waitForTimeout(500);
                        
                    } catch (modalError) {
                        console.log(`Could not extract modal content for "${title}": ${modalError}`);
                    }
                    
                    updates.push({
                        title,
                        timestamp,
                        content: contentHtml,
                        fullContent: fullContent || undefined
                    });
                    
                    console.log(`Found update: "${title}" (${timestamp})`);
                }
            }
        } else {
            // If we didn't find contentItems, try a more general approach
            console.log('No contentItem elements found, trying alternative selectors');
            
            // Look for divs that might contain updates based on content
            const potentialUpdateDivs = $('div').filter((i, el) => {
                const text = $(el).text().toLowerCase();
                return text.includes('last updated') && 
                       (text.includes('cyclone') || text.includes('flood') || text.includes('disaster'));
            });
            
            console.log(`Found ${potentialUpdateDivs.length} potential update divs`);
            
            potentialUpdateDivs.each((i, el) => {
                const fullText = $(el).text().trim();
                let title = '';
                let timestamp = '';
                
                // Try to extract the title from headings or first text block
                const headings = $(el).find('h1, h2, h3, h4, h5, h6, a, strong');
                if (headings.length > 0) {
                    title = headings.first().text().trim();
                } else {
                    // Take first line as title
                    title = fullText.split('\n')[0].trim();
                }
                
                // Try to extract timestamp
                if (fullText.includes('Last Updated')) {
                    timestamp = fullText.match(/Last Updated [^\\n]*/)?.[0] || '';
                }
                
                // Extract some content
                let contentText = fullText.replace(title, '').replace(timestamp, '').trim();
                if (contentText.length > 500) {
                    contentText = contentText.substring(0, 500) + '...';
                }
                
                if (title && title.length > 5) {
                    updates.push({
                        title: title.substring(0, 200), // Limit title length
                        timestamp,
                        content: contentText
                    });
                    
                    console.log(`Extracted update: "${title.substring(0, 50)}..." (${timestamp})`);
                }
            });
        }
        
        console.log(`Successfully parsed ${updates.length} updates`);
        return updates;
    } catch (error) {
        console.error('Error in Puppeteer scraping:', error);
        return [];
    } finally {
        // Always close the browser to prevent resource leaks
        if (browser) {
            await browser.close();
            console.log('Browser closed');
        }
    }
};

// Existing alternative approach as fallback if Puppeteer fails
export const tryAlternativeApproach = async (): Promise<Update[]> => {
    try {
        // Try to access a potential API endpoint
        const apiUrl = 'https://disaster.ipswich.qld.gov.au/api/updates';
        console.log(`Trying alternative approach: ${apiUrl}`);
        
        const { data } = await axios.get(apiUrl, { 
            timeout: 8000,
            headers
        });
        
        if (Array.isArray(data)) {
            return data.map(item => ({
                title: item.title || item.heading || 'Untitled',
                timestamp: item.timestamp || item.date || item.updatedAt,
                content: item.content || item.description
            }));
        }
        
        return [];
    } catch (error) {
        console.log('Alternative approach failed, this is expected if no API exists');
        return [];
    }
};