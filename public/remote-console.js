// Banter WebSocket Log Forwarder by Gemini
// This script intercepts console logs and forwards them to a WebSocket server for remote debugging.

if (window.isBanter) {
    (function() {
        // --- Configuration ---
        // The WebSocket URL of your logging server.
        // IMPORTANT: This should be the URL of your Render.com service.
        // Use wss:// for secure connections (e.g., 'wss://your-app-name.onrender.com').
        const WEBSOCKET_URL = 'wss://quest-console-logger.onrender.com';

        let websocket = null;

        // Keep a reference to the original console methods to avoid infinite loops
        const originalConsole = {
            log: console.log.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console),
            info: console.info.bind(console),
        };

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

        /**
         * Intercepts log arguments and simplifies them if they match a known problematic pattern.
         * This prevents sending huge, recursive objects over the WebSocket.
         * @param {any[]} args - The arguments passed to the console function.
         * @returns {any[]} The original or simplified arguments.
         */
        function simplifyLogArguments(args) {
            // Filter for "user joined:" or "user left:" events which log a massive user object.
            const logString = args.length > 0 && typeof args[0] === 'string' ? args[0].trim() : '';
            const isUserEvent = logString.endsWith('user joined:') ||
                                logString.endsWith('user left:') ||
                                logString.endsWith('got user-joined event for user that already joined:');

            if (isUserEvent && args.length > 1 && typeof args[1] === 'object' && args[1] !== null) {
                const user = args[1];
                // Create a new, clean object with only the essential, non-recursive properties.
                const simplifiedUser = {
                    id: user.id,
                    name: user.name,
                    uid: user.uid,
                    isLocal: user.isLocal,
                    color: user.color
                };
                // Return a new arguments array with the simplified object.
                return [args[0], simplifiedUser, ...args.slice(2)];
            }

            // Filter for "FIRESCREEN2: user-joined" which logs a massive scene object.
            const isFirescreenUserJoined = logString.endsWith('user-joined');
            if (isFirescreenUserJoined && args.length > 1 && typeof args[1] === 'object' && args[1] !== null) {
                // The second argument is a massive scene object. We don't need to log it.
                // Just return the message and a placeholder.
                return [args[0], '[Large scene object omitted]', ...args.slice(2)];
            }

            // If no filter matches, return the original arguments.
            return args;
        }

        // Safely gets a user identifier, falling back gracefully if not available.
        function getUserIdentifier() {
            if (window.user) {
                // Prefer ID, but fall back to name.
                return window.user.id || window.user.name || 'anonymous';
            }
            // Return a temporary identifier if the user object isn't ready yet.
            return 'loading...';
        }

        // Function to send the formatted log to the browser page
        function sendLogToServer(level, message) {
            // Only send if the websocket is connected and ready
            if (websocket && websocket.readyState === WebSocket.OPEN) {
                const logPayload = {
                    type: 'BanterLog',
                    data: { user: getUserIdentifier(), level: level, message: message, timestamp: new Date().toISOString() }
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
        function main() {
            try {
                initializeWebSocket();

                // Override all console methods to intercept, simplify, and forward logs.
                const levels = ['log', 'warn', 'error', 'info'];
                levels.forEach(level => {
                    const originalFunc = originalConsole[level];
                    console[level] = (...args) => {
                        // 1. Log to the original console so it's visible locally.
                        originalFunc(...args);
                        // 2. Simplify known large objects to avoid sending massive payloads.
                        const processedArgs = simplifyLogArguments(args);
                        // 3. Format and send to the server.
                        sendLogToServer(level, formatLogArguments(processedArgs));
                    };
                });

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