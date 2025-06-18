require('dotenv').config();
const { getBrowser } = require('./browser');
const BilledTransaction = require('./models/BilledTransaction');

console.log('Script started');

const randomizeArray = (array) => {
    return array.sort(() => Math.random() - 0.5);
}

function runScript({ browserWait, pageWait, onProgress }) {
    onProgress("Starting main script logic...");
    let browser = null;
    let running = true;
    
    let stopSignalResolve;
    const stopSignal = new Promise(resolve => {
        stopSignalResolve = resolve;
    });

    const interruptibleWait = (ms) => {
        return Promise.race([
            new Promise(resolve => setTimeout(resolve, ms)),
            stopSignal
        ]);
    };
    
    const stop = async () => {
        if (!running) return;
        running = false;
        stopSignalResolve();

        if (browser) {
            onProgress('User requested stop. Closing browser...');
            await browser.close();
            browser = null; 
        }
    };

    const scriptPromise = async () => {
        try {
            // Launch browser with user profile
            onProgress('Launching browser...');
            browser = await getBrowser();
            onProgress('Browser launched successfully');
            
            if (!running) return;

            // Wait for specified minutes after browser launch
            if (browserWait > 0) {
                onProgress(`Waiting for ${browserWait}ms after browser launch...`);
                await interruptibleWait(browserWait);
                if (!running) return;
                onProgress('Browser wait completed');
            }
            
            // Get the shop names from billedTransaction collection
            onProgress('Fetching active stores...');
            const transactions = await BilledTransaction.find({ status: 'ACTIVE' });
            onProgress(`Found ${transactions.length} transactions`);
            
            const shopNames = transactions
                .map(transaction => transaction.shop?.replace('https://', '')?.replace('.myshopify.com', ''))
                .filter(Boolean);

            if (!shopNames || shopNames.length === 0) {
                throw new Error('No active shops found in billedTransaction collection');
            }

            onProgress(`Processing ${shopNames.length} active stores`);
            const shuffledShopNames = randomizeArray(shopNames);

            for (const shopName of shuffledShopNames) {
                if (!running) {
                    onProgress('Script stopped by user.');
                    break;
                }
                const targetUrl = `https://admin.shopify.com/store/${shopName}/apps/custom-banner-2/dashboard`;
                onProgress(`Navigating to: ${targetUrl}`);

                let page;
                try {
                    page = await browser.newPage();
                    if (!running) break;

                    await page.goto(targetUrl, { 
                        waitUntil: 'networkidle0',
                        timeout: 60000 // 60 second timeout
                    });
                    if (!running) break;

                    // Wait after opening page
                    if (pageWait > 0) {
                        onProgress(`Waiting for ${pageWait}ms after opening page...`);
                        await interruptibleWait(pageWait);
                        if (!running) break;
                    }
                    const hasError = await page.evaluate(() => {
                        return !!document.querySelector('._ForbiddenError_4fob4_1');
                    });
                    if (!running) break;
    
                    if (hasError) {
                        onProgress(`Failed to navigate to ${shopName} (Forbidden Error)`);
                        await interruptibleWait(5000 + Math.random() * 2000);
                        if (!running) break;
                    } else {
                        try {
                            await page.waitForSelector('#page-title', { timeout: 30000 });
                            onProgress(`Successfully navigated to ${shopName}`);
                        } catch(e) {
                            onProgress(`Failed to navigate to ${shopName} (timeout waiting for #page-title)`);
                        }
                    }
                } catch (error) {
                    if (running) {
                        onProgress(`Failed to navigate to ${shopName}: ${error.message}`);
                    }
                } finally {
                    if (page) await page.close();
                }
            }
        } catch (error) {
            if (running) {
                console.error('Fatal error:', error);
                onProgress(`Fatal error: ${error.message}`);
                throw error;
            } else {
                onProgress('Script execution was successfully interrupted.');
            }
        } finally {
            if (browser) {
                onProgress('Closing browser...');
                await browser.close();
            }
            onProgress('Script finished');
        }
    };
    
    return {
        stop,
        scriptPromise
    };
}

module.exports = { runScript };
