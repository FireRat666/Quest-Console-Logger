# Banter Remote Console Logger

A robust, real-time logging solution for Banter VR spaces. This project uses a WebSocket server to capture `console.log` messages from a Banter space and forward them to a server's system logs, making debugging on devices like the Quest much easier.

## Features

- **Real-Time Logging**: Uses WebSockets for low-latency log forwarding.
- **Server-Side Storage**: Logs are captured on a persistent server, so you don't lose them on a page refresh.
- **User Identification**: Automatically tags logs with the user's ID.
- **Handles Complex Objects**: Safely logs large, recursive objects (like the `user` or `scene` objects) by simplifying them into a clean, readable format.
- **Early Logging**: Starts capturing logs immediately, even before the Unity scene has fully loaded.
- **Easy Deployment**: Designed for one-click deployment on services like Render.com.

## How It Works

The system consists of two parts:

1.  **The Server**: A lightweight Node.js server that listens for WebSocket connections. When it receives a log message, it prints it to its standard output, which becomes the system log on your hosting provider.
2.  **The Client (`remote-console.js`)**: A JavaScript file loaded into your Banter space. It overrides the native `console` methods to send a copy of every log message to the WebSocket server.

## Setup Instructions

Follow these steps to get your own remote logging server up and running.

### Part 1: Deploying the Server

We will use Render.com for hosting, as it's free and simple to set up.

1.  **Fork/Clone this Repository**: Get a copy of this project into your own GitHub account.
2.  **Create a Render Account**: If you don't have one, sign up at Render.com.
3.  **Create a New Web Service**:
    - In your Render dashboard, click "New" -> "Web Service".
    - Connect your GitHub account and select the repository for this project.
    - Give your service a unique name (e.g., `my-banter-logger`).
    - Render will automatically detect the `package.json` and suggest settings. Ensure they are correct:
        - **Runtime**: `Node`
        - **Build Command**: `npm install` or `yarn install`. Render often defaults to `yarn install`, which works perfectly fine.
        - **Start Command**: `npm start`
4.  **Deploy**: Click "Create Web Service". Render will build and deploy your server. Once it's live, you will have a public URL like `https://my-banter-logger.onrender.com`.

### Part 2: Configuring the Client Script

Now you need to tell the client script where to connect.

1.  **Edit the Configuration**:
    - In your local copy of the repository, open the file `public/remote-console.js`.
    - Find the `WEBSOCKET_URL` constant at the top of the file.
    - Change the URL to match your new Render service URL, but make sure to use the `wss://` (secure WebSocket) protocol.

    ```javascript
    // Before
    const WEBSOCKET_URL = 'wss://your-app-name.onrender.com';

    // After
    const WEBSOCKET_URL = 'wss://my-banter-logger.onrender.com';
    ```

2.  **Commit and Push**: Save the file, commit the change to Git, and push it to your GitHub repository. Render will automatically detect the change and re-deploy your service with the updated configuration.

### Part 3: Integrating with Banter

The final step is to load the script into your Banter space.

1.  **Edit Your Space's HTML**: This method requires editing your space's HTML source file. Open the index.html file for your Banter space in a text editor.
2.  **Add the Script Tag**: Add the following `<script>` tag to your HTML file, ideally just before the closing `</body>` tag.

    ```html
    <script src="https://my-banter-logger.onrender.com/remote-console.js"></script>
    ```
    *Note: Remember to replace `my-banter-logger` with the actual name of your Render service from Part 1.*
3.  **Save and Upload**: Save your modified HTML file and upload it to your web host. The logger will now be active whenever your space is loaded.

## Usage

That's it! The setup is complete.

Now, whenever your Banter space is loaded, the script will activate and start forwarding all `console.log`, `console.warn`, and `console.error` messages to your server.

To view the logs, go to your Web Service on Render.com and open the **Logs** tab. You will see real-time output formatted like this:

```
[2025-07-27T11:10:05.123Z] [f67ed8a5ca07764685a64c7fef073ab9] [INFO] My log message
[2025-07-27T11:12:48.076Z] [d2e3ea3a-ac89-42d4-9fb4-352ece2d40dc] [WARN] user left: { "id": "...", "name": "..." }
```
