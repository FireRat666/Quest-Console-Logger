// Banter Remote Console by Gemini
// This script intercepts console logs and forwards them to the Banter Menu Browser for easy debugging on Quest.

if (window.isBanter) {
    (function() {
        // --- Configuration ---
        // The URL of your console.html page.
        // IMPORTANT: You MUST upload console.html to a web host (like GitHub Pages, Netlify, etc.)
        // and put the full, public URL here.
        const CONSOLE_HTML_URL = 'https://questlogs.firer.at/console.html';

        // Time in milliseconds to wait before automatically opening the console viewer.
        const AUTO_OPEN_DELAY_MS = 10000;

        // Keep a reference to the original console methods to avoid infinite loops
        const originalConsole = {
            log: console.log.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console),
            info: console.info.bind(console),
        };

        // Wait for the Banter environment and Unity to be fully loaded
        async function waitForBanterReady() {
            const chatscene = BS.BanterScene.GetInstance();
            while (!chatscene || !chatscene.unityLoaded) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            return chatscene;
        }

        // Helper to format any kind of argument into a readable string
        function formatLogArguments(args) {
            return args.map(arg => {
                if (typeof arg === 'object' && arg !== null) {
                    try {
                        // Handle circular references when stringifying objects
                        const cache = new Set();
                        return JSON.stringify(arg, (key, value) => {
                            if (typeof value === 'object' && value !== null) {
                                if (cache.has(value)) { return '[Circular Reference]'; }
                                cache.add(value);
                            }
                            return value;
                        }, 2); // Pretty print with 2 spaces
                    } catch (e) {
                        return '[Unserializable Object]';
                    }
                }
                return String(arg);
            }).join(' ');
        }

        // Function to send the formatted log to the browser page
        function sendLogToMenuBrowser(level, message) {
            const scene = BS.BanterScene.GetInstance();
            if (!scene) return;

            const logPayload = {
                type: 'BanterLog',
                data: { level: level, message: message, timestamp: new Date().toISOString() }
            };
			originalConsole.log("Sending log to Banter Menu Browser:", logPayload);
            // Use the native API to send a message to the user's menu browser, as per documentation.
            window.sendMenuBrowserMessage(JSON.stringify(logPayload));
        }

        // Creates a clickable object in the scene to open the console
        async function ConsoleLauncher() {
			setTimeout(() => { 
                BS.BanterScene.GetInstance().OpenPage(CONSOLE_HTML_URL);
			}, AUTO_OPEN_DELAY_MS);
        }

        // --- Main Initialization ---
        async function main() {
            try {
                await waitForBanterReady();

                // Override default console methods
                console.log = (...args) => { originalConsole.log(...args); sendLogToMenuBrowser('log', formatLogArguments(args)); };
                console.warn = (...args) => { originalConsole.warn(...args); sendLogToMenuBrowser('warn', formatLogArguments(args)); };
                console.error = (...args) => { originalConsole.error(...args); sendLogToMenuBrowser('error', formatLogArguments(args)); };
                console.info = (...args) => { originalConsole.info(...args); sendLogToMenuBrowser('info', formatLogArguments(args)); };

                await ConsoleLauncher();
                originalConsole.log("Banter Remote Console is now active. Open the Banter Menu to view logs.");
            } catch (error) {
                // Use original console.error to report initialization failures.
                // This won't be sent to the remote console, but will appear in the native console if accessible.
                originalConsole.error("Banter Remote Console failed to initialize:", error);
            }
        }

        main();
    })(); // IIFE to avoid polluting the global scope
}