const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('start-script');
    const stopButton = document.getElementById('stop-script');
    const getStoresButton = document.getElementById('get-stores');
    const output = document.getElementById('output');
    const browserWaitInput = document.getElementById('browser-wait');
    const pageWaitInput = document.getElementById('page-wait');
    const storeCount = document.getElementById('store-count');
    const succeededCount = document.getElementById('succeeded-count');
    const failedCount = document.getElementById('failed-count');
    const errorMessage = document.getElementById('error-message');

    getStoresButton.addEventListener('click', () => {
        output.textContent = 'Fetching stores...\n';
        ipcRenderer.send('get-stores');
    });

    startButton.addEventListener('click', () => {
        output.textContent = ''; // Clear previous output
        const browserWait = parseInt(browserWaitInput.value, 10) || 0;
        const pageWait = parseInt(pageWaitInput.value, 10) || 0;
        ipcRenderer.send('start-script', { browserWait, pageWait });
    });

    stopButton.addEventListener('click', () => {
        ipcRenderer.send('stop-script');
    });

    ipcRenderer.on('stores-loaded', (event, { stores, total, error }) => {
        if (error) {
            storeCount.textContent = `Error: ${error}`;
            return;
        }
        storeCount.textContent = `Total stores to process: ${total}`;
        output.textContent = `Found ${total} stores. Click "Start Script" to begin.\n`;
    });

    ipcRenderer.on('script-output', (event, data) => {
        output.textContent += data;
        output.scrollTop = output.scrollHeight; // Auto-scroll
    });
    
    ipcRenderer.on('progress-update', (event, { succeeded, failed }) => {
        succeededCount.textContent = `Succeeded: ${succeeded}`;
        failedCount.textContent = `Failed: ${failed}`;
    });

    ipcRenderer.on('script-error', (event, errorMsg) => {
        output.textContent += `ERROR: ${errorMsg}\n`;
        output.scrollTop = output.scrollHeight;
    });

    ipcRenderer.on('error-message', (event, message) => {
        errorMessage.textContent = message;
    });
}); 