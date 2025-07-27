// Banter WebSocket Log Forwarder by Gemini
// This script intercepts console logs and forwards them to a WebSocket server for remote debugging.

if (window.isBanter) {
    (function() {
        // --- Configuration ---
        // The WebSocket URL of your logging server.
        // IMPORTANT: This should be the URL of your Render.com service.
        // Use wss:// for secure connections (e.g., 'wss://your-app-name.onrender.com').
        const WEBSOCKET_URL = 'wss://your-app-name.onrender.com';

        let websocket = null;

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
        function sendLogToServer(level, message) {
            // Only send if the websocket is connected and ready
            if (websocket && websocket.readyState === WebSocket.OPEN) {
                const logPayload = {
                    type: 'BanterLog',
                    data: { level: level, message: message, timestamp: new Date().toISOString() }
                };
                websocket.send(JSON.stringify(logPayload));
            }
        }

        // Establishes and manages the WebSocket connection
        function initializeWebSocket() {
            originalConsole.log(`Banter Log Forwarder: Attempting to connect to ${WEBSOCKET_URL}`);
            websocket = new WebSocket(WEBSOCKET_URL);

            websocket.onopen = () => {
                originalConsole.log('Banter Log Forwarder: WebSocket connection established.');
            };

            websocket.onclose = (event) => {
                originalConsole.warn('Banter Log Forwarder: WebSocket connection closed. Reconnecting in 5s...', event.reason);
                websocket = null; // Clear the old instance
                setTimeout(initializeWebSocket, 5000); // Reconnect logic
            };

            websocket.onerror = (error) => {
                originalConsole.error('Banter Log Forwarder: WebSocket error:', error);
                // onclose will likely fire after this, triggering the reconnect.
            };
        }

        // --- Main Initialization ---
        async function main() {
            try {
                await waitForBanterReady();
                initializeWebSocket();

                // Override default console methods
                console.log = (...args) => { originalConsole.log(...args); sendLogToServer('log', formatLogArguments(args)); };
                console.warn = (...args) => { originalConsole.warn(...args); sendLogToServer('warn', formatLogArguments(args)); };
                console.error = (...args) => { originalConsole.error(...args); sendLogToServer('error', formatLogArguments(args)); };
                console.info = (...args) => { originalConsole.info(...args); sendLogToServer('info', formatLogArguments(args)); };
                originalConsole.log("Banter Log Forwarder is active. Forwarding logs to server.");
            } catch (error) {
                // Use original console.error to report initialization failures.
                // This won't be sent to the remote console, but will appear in the native console if accessible.
                originalConsole.error("Banter Remote Console failed to initialize:", error);
            }
        }

        main();
    })(); // IIFE to avoid polluting the global scope
}