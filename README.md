# Bennerdo Browser

> A privacy-first browser with a unique, lightweight UI built with Electron and TypeScript.

Bennerdo Browser is designed to provide a fast, secure, and private browsing experience. It combines robust privacy features like ad-blocking and HTTPS enforcement with a custom, minimalist user interface.

## 🚀 Features

### 🛡️ Privacy First
-   **Built-in Ad & Tracker Blocking**: Automatically blocks ads and tracking scripts using `@cliqz/adblocker-electron`.
-   **HTTPS Upgrades**: Automatically upgrades insecure HTTP requests to HTTPS.
-   **Permission Monitoring**: enhanced control and logging of website permission requests.
-   **Privacy Headers**: Enforces security headers like `X-Context-Type-Options`, `X-Frame-Options`, and `X-XSS-Protection`.

### 🔒 Secure Architecture
-   **Sandboxed Tabs**: Each tab runs in a separate, sandboxed process.
-   **Context Isolation**: Ensures renderer processes cannot directly access Node.js APIs.
-   **Partitioned Sessions**: Exploring/guest modes use isolated sessions.

### 🎨 Lightweight & Functional UI
-   **Custom Tab System**: A built-in, lightweight tab manager.
-   **Real-time Privacy Stats**: See how many ads and trackers have been blocked in real-time.
-   **Minimalist Design**: A clean interface focused on content.

## 🛠️ Tech Stack

-   **Electron**: Framework for building cross-platform desktop apps.
-   **TypeScript**: For type-safe, maintainable code.
-   **Vanilla JavaScript**: Lightweight renderer without heavy frontend framework overhead.
-   **Node.js**: Backend runtime.

## 🏁 Getting Started

### Prerequisites

-   Node.js (v16 or higher recommended)
-   npm (comes with Node.js)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/bennerdo-browser.git
    cd bennerdo-browser
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Running Development Build

Start the application in development mode with hot-reloading:

```bash
npm run dev
```

### Building for Production

To create a production build for your OS:

```bash
npm run build     # Compiles TypeScript
npm run package   # Packages the Electron app
```

 The output will be in the `release` directory.

 ##To download the desktop app, go to releases and find the file that mtches your os and architecture.

## 📂 Project Structure

-   `src/main`: Electron main process code (window management, privacy engine, session handling).
-   `src/renderer`: UI code (HTML, CSS, TypeScript for the browser interface).
-   `dist`: Compiled JavaScript files.
-   `build`: Build resources.

## 📝 License

This project is licensed under the MIT License.
