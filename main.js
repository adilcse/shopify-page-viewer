const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();
const { runScript } = require('./index');
const BilledTransaction = require('./models/BilledTransaction');

let mainWindow;
let scriptController = null;
let storeNames = [];
let processedStores = {
    total: 0,
    succeeded: 0,
    failed: 0
};

async function connectToDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connection successful');
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        // We should quit the app if we can't connect to the DB
        app.quit();
    }
}

async function loadStoreNames() {
    try {
        console.log('Loading store names');
        const transactions = await BilledTransaction.find({ status: 'ACTIVE' });
        storeNames = transactions.map(transaction => 
            transaction.shop?.replace('https://', '')?.replace('.myshopify.com', '')
        ).filter(Boolean);
        
        processedStores.total = storeNames.length;
        return storeNames;
    } catch (error) {
        console.error('Error loading stores:', error);
        return [];
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');

    mainWindow.on('closed', async () => {
        mainWindow = null;
    });
}

app?.whenReady()?.then(async () => {
    try {
        createWindow();
        await connectToDB();
    } catch (error) {
        console.error('Failed to initialize:', error);
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.on('get-stores', async (event) => {
    await loadStoreNames();
    event.reply('stores-loaded', {
        stores: storeNames,
        total: processedStores.total
    });
});

ipcMain.on('start-script', async (event, { browserWait, pageWait }) => {
    if (scriptController) {
        await scriptController.stop();
        scriptController = null;
    }

    // Reset progress
    processedStores.succeeded = 0;
    processedStores.failed = 0;
    if (mainWindow) {
        mainWindow.webContents.send('progress-update', processedStores);
    }

    const onProgress = (message) => {
        console.log('Script progress:', message);
        if (mainWindow) {
            mainWindow.webContents.send('script-output', message + '\n');
        }

        if (message.includes('Successfully navigated to')) {
            processedStores.succeeded++;
        } else if (message.includes('Failed to navigate to')) {
            processedStores.failed++;
        }
        if (mainWindow) {
            mainWindow.webContents.send('progress-update', processedStores);
        }
    };

    const newScriptController = runScript({
        browserWait,
        pageWait,
        onProgress
    });

    scriptController = newScriptController;

    newScriptController.scriptPromise().catch(error => {
        const errorMsg = `Script execution failed: ${error.message}`;
        console.error(errorMsg);
        if (mainWindow) {
            mainWindow.webContents.send('script-error', errorMsg);
        }
    }).finally(() => {
        if (scriptController === newScriptController) {
            scriptController = null;
        }
        console.log('Script controller cleaned up.');
    });
});

ipcMain.on('stop-script', async () => {
    if (scriptController) {
        mainWindow.webContents.send('script-output', 'Stopping script...\n');
        await scriptController.stop();
    } else {
        mainWindow.webContents.send('script-output', 'No script running to stop.\n');
    }
});

