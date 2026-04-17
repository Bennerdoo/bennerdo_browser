import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import { BrowserManager } from './browser-manager';
import { PrivacyEngine } from './privacy-engine';
import { SessionManager } from './session-manager';
import { PermissionMonitor } from './permission-monitor';
import { SettingsManager } from './settings-manager';

// State management
let mainWindow: BrowserWindow | null = null;
let browserManager: BrowserManager | null = null;
let privacyEngine: PrivacyEngine | null = null;
let sessionManager: SessionManager | null = null;
let permissionMonitor: PermissionMonitor | null = null;
let settingsManager: SettingsManager | null = null;

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('ready', onReady);
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
    app.on('activate', () => {
        if (mainWindow === null) {
            createWindow();
        }
    });
}

async function onReady() {
    // Initialize settings manager
    settingsManager = new SettingsManager();

    // Initialize session manager
    sessionManager = new SessionManager();

    // Initialize privacy engine with session manager
    privacyEngine = new PrivacyEngine(sessionManager);
    await privacyEngine.initialize();

    createWindow();
}

function createWindow() {
    // Create the browser window with unique styling
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        backgroundColor: '#0a0a0f', // Dark background
        frame: false, // Frameless for custom UI
        titleBarStyle: 'hidden',
        webPreferences: {
            preload: path.join(__dirname, '../renderer/preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true,
            sandbox: true
        }
    });

    // Initialize permission monitor
    permissionMonitor = new PermissionMonitor(mainWindow);
    privacyEngine!.setPermissionMonitor(permissionMonitor);

    // Initialize browser manager
    browserManager = new BrowserManager(mainWindow, privacyEngine!);

    // Load the UI
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // Setup IPC handlers
    setupIPC();

    mainWindow.on('closed', () => {
        mainWindow = null;
        browserManager = null;
    });
}

function setupIPC() {
    // Tab management
    ipcMain.handle('create-tab', async (event, url?: string) => {
        return browserManager?.createTab(url);
    });

    ipcMain.handle('close-tab', async (event, tabId: string) => {
        return browserManager?.closeTab(tabId);
    });

    ipcMain.handle('switch-tab', async (event, tabId: string) => {
        return browserManager?.switchTab(tabId);
    });

    ipcMain.handle('get-tabs', async () => {
        return browserManager?.getTabs();
    });

    // Navigation
    ipcMain.handle('navigate', async (event, tabId: string, url: string) => {
        return browserManager?.navigate(tabId, url);
    });

    ipcMain.handle('go-back', async (event, tabId: string) => {
        return browserManager?.goBack(tabId);
    });

    ipcMain.handle('go-forward', async (event, tabId: string) => {
        return browserManager?.goForward(tabId);
    });

    ipcMain.handle('reload', async (event, tabId: string) => {
        return browserManager?.reload(tabId);
    });

    // Privacy stats
    ipcMain.handle('get-privacy-stats', async () => {
        return privacyEngine?.getStats();
    });

    // Settings
    ipcMain.handle('get-settings', async () => {
        return settingsManager?.getAll();
    });

    ipcMain.handle('set-setting', async (event, key: string, value: any) => {
        settingsManager?.set(key as any, value);
        return true;
    });

    ipcMain.handle('set-settings', async (event, updates: any) => {
        settingsManager?.setMany(updates);
        return true;
    });

    ipcMain.handle('reset-settings', async () => {
        settingsManager?.reset();
        return settingsManager?.getAll();
    });

    ipcMain.handle('pick-download-folder', async () => {
        const result = await dialog.showOpenDialog(mainWindow!, {
            properties: ['openDirectory'],
            title: 'Choose Download Folder'
        });
        if (!result.canceled && result.filePaths.length > 0) {
            return result.filePaths[0];
        }
        return null;
    });

    ipcMain.handle('open-path', async (event, folderPath: string) => {
        shell.openPath(folderPath);
        return true;
    });

    ipcMain.handle('get-search-url', async (event, query: string) => {
        return settingsManager?.getSearchUrl(query) || 'https://www.google.com/search?q=' + encodeURIComponent(query);
    });

    // Window controls
    ipcMain.on('window-minimize', () => {
        mainWindow?.minimize();
    });

    ipcMain.on('window-maximize', () => {
        if (mainWindow?.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow?.maximize();
        }
    });

    ipcMain.on('window-close', () => {
        mainWindow?.close();
    });
}
