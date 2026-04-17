"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const browser_manager_1 = require("./browser-manager");
const privacy_engine_1 = require("./privacy-engine");
const session_manager_1 = require("./session-manager");
const permission_monitor_1 = require("./permission-monitor");
const settings_manager_1 = require("./settings-manager");
// State management
let mainWindow = null;
let browserManager = null;
let privacyEngine = null;
let sessionManager = null;
let permissionMonitor = null;
let settingsManager = null;
// Single instance lock
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('ready', onReady);
    electron_1.app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            electron_1.app.quit();
        }
    });
    electron_1.app.on('activate', () => {
        if (mainWindow === null) {
            createWindow();
        }
    });
}
async function onReady() {
    // Initialize settings manager
    settingsManager = new settings_manager_1.SettingsManager();
    // Initialize session manager
    sessionManager = new session_manager_1.SessionManager();
    // Initialize privacy engine with session manager
    privacyEngine = new privacy_engine_1.PrivacyEngine(sessionManager);
    await privacyEngine.initialize();
    createWindow();
}
function createWindow() {
    // Create the browser window with unique styling
    mainWindow = new electron_1.BrowserWindow({
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
    permissionMonitor = new permission_monitor_1.PermissionMonitor(mainWindow);
    privacyEngine.setPermissionMonitor(permissionMonitor);
    // Initialize browser manager
    browserManager = new browser_manager_1.BrowserManager(mainWindow, privacyEngine);
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
    electron_1.ipcMain.handle('create-tab', async (event, url) => {
        return browserManager?.createTab(url);
    });
    electron_1.ipcMain.handle('close-tab', async (event, tabId) => {
        return browserManager?.closeTab(tabId);
    });
    electron_1.ipcMain.handle('switch-tab', async (event, tabId) => {
        return browserManager?.switchTab(tabId);
    });
    electron_1.ipcMain.handle('get-tabs', async () => {
        return browserManager?.getTabs();
    });
    // Navigation
    electron_1.ipcMain.handle('navigate', async (event, tabId, url) => {
        return browserManager?.navigate(tabId, url);
    });
    electron_1.ipcMain.handle('go-back', async (event, tabId) => {
        return browserManager?.goBack(tabId);
    });
    electron_1.ipcMain.handle('go-forward', async (event, tabId) => {
        return browserManager?.goForward(tabId);
    });
    electron_1.ipcMain.handle('reload', async (event, tabId) => {
        return browserManager?.reload(tabId);
    });
    // Privacy stats
    electron_1.ipcMain.handle('get-privacy-stats', async () => {
        return privacyEngine?.getStats();
    });
    // Settings
    electron_1.ipcMain.handle('get-settings', async () => {
        return settingsManager?.getAll();
    });
    electron_1.ipcMain.handle('set-setting', async (event, key, value) => {
        settingsManager?.set(key, value);
        return true;
    });
    electron_1.ipcMain.handle('set-settings', async (event, updates) => {
        settingsManager?.setMany(updates);
        return true;
    });
    electron_1.ipcMain.handle('reset-settings', async () => {
        settingsManager?.reset();
        return settingsManager?.getAll();
    });
    electron_1.ipcMain.handle('pick-download-folder', async () => {
        const result = await electron_1.dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
            title: 'Choose Download Folder'
        });
        if (!result.canceled && result.filePaths.length > 0) {
            return result.filePaths[0];
        }
        return null;
    });
    electron_1.ipcMain.handle('open-path', async (event, folderPath) => {
        electron_1.shell.openPath(folderPath);
        return true;
    });
    electron_1.ipcMain.handle('get-search-url', async (event, query) => {
        return settingsManager?.getSearchUrl(query) || 'https://www.google.com/search?q=' + encodeURIComponent(query);
    });
    // Window controls
    electron_1.ipcMain.on('window-minimize', () => {
        mainWindow?.minimize();
    });
    electron_1.ipcMain.on('window-maximize', () => {
        if (mainWindow?.isMaximized()) {
            mainWindow.unmaximize();
        }
        else {
            mainWindow?.maximize();
        }
    });
    electron_1.ipcMain.on('window-close', () => {
        mainWindow?.close();
    });
}
