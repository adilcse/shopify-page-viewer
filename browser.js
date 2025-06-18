const puppeteer = require('puppeteer');
const { app } = require('electron');
const path = require('path');

let browser;

// Get the correct path for the bundled Chromium
function getChromiumExecutablePath() {
    if (app?.isPackaged) {
        // In the packaged app, Chromium will be in the 'puppeteer' folder in extraResources.
        // The exact path inside might vary based on puppeteer version and platform.
        // This structure assumes the latest versions of puppeteer.
        return path.join(process.resourcesPath, 'puppeteer', 'chrome', 'win64-137.0.7151.70', 'chrome-win64', 'chrome.exe');
    }
    // For development, let Puppeteer find the default installation.
    return puppeteer.executablePath();
}


async function createPuppeteerBrowser() {
    if (browser && browser.isConnected()) {
        return browser;
    }
    console.log('Creating browser');
    const options = {
        headless: false,
        userDataDir: process.env.APPDATA + '\\Local\\Google\\Chrome\\User Data',
        args: ['--profile-directory=Default'],
        defaultViewport: null
    };

    if (app?.isPackaged) {
        options.executablePath = getChromiumExecutablePath();
    }

    try {
        browser = await puppeteer.launch(options);
        return browser;
    } catch (error) {
        console.error('Failed to launch browser:', error);
        throw error;
    }
}

exports.getBrowser = createPuppeteerBrowser; 
