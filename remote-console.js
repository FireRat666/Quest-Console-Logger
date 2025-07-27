// Banter Remote Console by Gemini
// This script intercepts console logs and forwards them to the Banter Menu Browser for easy debugging on Quest.

if (window.isBanter) {
    (function() {
        // --- Configuration ---
        // The URL of your console.html page.
        // IMPORTANT: You MUST upload console.html to a web host (like GitHub Pages, Netlify, etc.)
        // and put the full, public URL here.
        const CONSOLE_HTML_URL = 'https://questlogs.firer.at/console.html';

        // Keep a reference to the original console methods to avoid infinite loops
        const originalConsole = {
            log: console.log.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console),
            info: console.info.bind(console),
        };

        // A simple check to ensure the user has configured the URL.
        if (CONSOLE_HTML_URL.includes('firer.at')) {
            originalConsole.error(
                'Banter Remote Console: Please edit remote-console.js and set the CONSOLE_HTML_URL variable to the public URL of your console.html file.'
            );
            // We stop execution here to prevent further errors.
            return; 
        }

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
            // Use the native API to send a message to the user's menu browser, as per documentation.
            scene.SendBrowserMessage(JSON.stringify(logPayload));
        }

        // Creates a clickable object in the scene to open the console
        async function createConsoleLauncher() {
            const launcher = new BS.GameObject("ConsoleLauncherButton");
            await launcher.AddComponent(new BS.BanterGeometry(BS.GeometryType.BoxGeometry));
            await launcher.AddComponent(new BS.BoxCollider(false));
            await launcher.AddComponent(new BS.BanterMaterial("Unlit/Color", "", new BS.Vector4(0.1, 0.4, 0.8, 1)));
            
            const transform = await launcher.AddComponent(new BS.Transform());
            transform.localPosition = new BS.Vector3(0, 1.5, -2); // Position it in front of the default spawn
            transform.localScale = new BS.Vector3(0.3, 0.3, 0.1);

            const text = await launcher.AddComponent(new BS.BanterText("Open\nConsole", new BS.Vector4(1, 1, 1, 1)));
            text.fontSize = 0.3;
            text.anchor = BS.TextAnchor.MiddleCenter;
        	await launcher.SetLayer(5); // Set to UI layer

            launcher.OnClicked = () => {
                originalConsole.log(`Remote Console: Opening menu browser to ${CONSOLE_HTML_URL}`);
                BS.BanterScene.GetInstance().OpenMenuPage(CONSOLE_HTML_URL);
            };
			setTimeout(() => { 
                BS.BanterScene.GetInstance().OpenMenuPage(CONSOLE_HTML_URL);
			}, 10000);
        }

        // --- Main Initialization ---
        async function main() {
            await waitForBanterReady();

            // Override default console methods
            console.log = (...args) => { originalConsole.log.apply(console, args); sendLogToMenuBrowser('log', formatLogArguments(args)); };
            console.warn = (...args) => { originalConsole.warn.apply(console, args); sendLogToMenuBrowser('warn', formatLogArguments(args)); };
            console.error = (...args) => { originalConsole.error.apply(console, args); sendLogToMenuBrowser('error', formatLogArguments(args)); };
            console.info = (...args) => { originalConsole.info.apply(console, args); sendLogToMenuBrowser('info', formatLogArguments(args)); };

            await createConsoleLauncher();
            originalConsole.log("Banter Remote Console is now active. Click the blue button to open the console in your menu.");
        }

        main();
    })(); // IIFE to avoid polluting the global scope
}