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
exports.BrowserManager = void 0;
const electron_1 = require("electron");
const crypto = __importStar(require("crypto"));
class BrowserManager {
    constructor(mainWindow, privacyEngine) {
        this.tabs = new Map();
        this.activeTabId = null;
        this.mainWindow = mainWindow;
        this.privacyEngine = privacyEngine;
        // Create initial tab
        this.createTab('https://www.google.com');
    }
    createTab(url) {
        const tabId = crypto.randomBytes(16).toString('hex');
        const defaultUrl = url || 'https://www.google.com';
        // Create BrowserView for this tab
        const view = new electron_1.BrowserView({
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                webSecurity: true,
                sandbox: true,
                partition: 'persist:main' // Isolated session
            }
        });
        // Apply privacy settings to this view
        this.privacyEngine.applyToSession(view.webContents.session);
        const tab = {
            id: tabId,
            url: defaultUrl,
            title: 'New Tab',
            favicon: '',
            loading: false,
            canGoBack: false,
            canGoForward: false,
            view: view
        };
        this.tabs.set(tabId, tab);
        // Setup event listeners for this tab
        this.setupTabEvents(tab);
        // Navigate to URL
        view.webContents.loadURL(defaultUrl);
        // Switch to this tab
        this.switchTab(tabId);
        return tabId;
    }
    setupTabEvents(tab) {
        if (!tab.view)
            return;
        const webContents = tab.view.webContents;
        // Update tab info on navigation
        webContents.on('did-start-loading', () => {
            tab.loading = true;
            this.notifyTabUpdate(tab.id);
        });
        webContents.on('did-stop-loading', () => {
            tab.loading = false;
            tab.url = webContents.getURL();
            tab.title = webContents.getTitle();
            tab.canGoBack = webContents.canGoBack();
            tab.canGoForward = webContents.canGoForward();
            this.notifyTabUpdate(tab.id);
        });
        webContents.on('page-title-updated', (event, title) => {
            tab.title = title;
            this.notifyTabUpdate(tab.id);
        });
        webContents.on('page-favicon-updated', (event, favicons) => {
            tab.favicon = favicons[0] || '';
            this.notifyTabUpdate(tab.id);
        });
        // Handle new window requests (open in new tab)
        webContents.setWindowOpenHandler(({ url }) => {
            this.createTab(url);
            return { action: 'deny' };
        });
    }
    switchTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab || !tab.view)
            return false;
        // Remove current view
        if (this.activeTabId) {
            const currentTab = this.tabs.get(this.activeTabId);
            if (currentTab?.view) {
                this.mainWindow.removeBrowserView(currentTab.view);
            }
        }
        // Add new view
        this.mainWindow.addBrowserView(tab.view);
        // Set bounds (leave space for UI at top and side)
        const bounds = this.mainWindow.getBounds();
        const SIDEBAR_WIDTH = 240;
        const TITLEBAR_HEIGHT = 32; // Custom titlebar
        const NAVBAR_HEIGHT = 60; // Navigation bar
        const TOTAL_TOP_OFFSET = TITLEBAR_HEIGHT + NAVBAR_HEIGHT; // 92px
        const viewBounds = {
            x: SIDEBAR_WIDTH,
            y: TOTAL_TOP_OFFSET,
            width: Math.max(bounds.width - SIDEBAR_WIDTH, 100),
            height: Math.max(bounds.height - TOTAL_TOP_OFFSET, 100)
        };
        console.log('=== BrowserView Bounds Debug ===');
        console.log('Window bounds:', bounds);
        console.log('Setting view bounds:', viewBounds);
        console.log('================================');
        tab.view.setBounds(viewBounds);
        // Enable autoresize so view adjusts with window
        tab.view.setAutoResize({
            width: true,
            height: true,
            horizontal: false,
            vertical: false
        });
        this.activeTabId = tabId;
        this.notifyTabUpdate(tabId);
        return true;
    }
    closeTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab)
            return false;
        // Destroy the view
        if (tab.view) {
            if (this.activeTabId === tabId) {
                this.mainWindow.removeBrowserView(tab.view);
            }
            tab.view.webContents.destroy();
        }
        this.tabs.delete(tabId);
        // If this was the active tab, switch to another
        if (this.activeTabId === tabId) {
            const remainingTabs = Array.from(this.tabs.keys());
            if (remainingTabs.length > 0) {
                this.switchTab(remainingTabs[0]);
            }
            else {
                // Create a new tab if none remain
                this.createTab();
            }
        }
        this.notifyTabsUpdate();
        return true;
    }
    navigate(tabId, url) {
        const tab = this.tabs.get(tabId);
        if (!tab || !tab.view)
            return false;
        // Ensure URL has protocol
        if (!url.match(/^https?:\/\//)) {
            // Check if it looks like a URL or a search query
            if (url.includes('.') && !url.includes(' ')) {
                url = 'https://' + url;
            }
            else {
                // Use Google search
                url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
            }
        }
        tab.view.webContents.loadURL(url);
        return true;
    }
    goBack(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab || !tab.view)
            return false;
        if (tab.view.webContents.canGoBack()) {
            tab.view.webContents.goBack();
            return true;
        }
        return false;
    }
    goForward(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab || !tab.view)
            return false;
        if (tab.view.webContents.canGoForward()) {
            tab.view.webContents.goForward();
            return true;
        }
        return false;
    }
    reload(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab || !tab.view)
            return false;
        tab.view.webContents.reload();
        return true;
    }
    getTabs() {
        return Array.from(this.tabs.values()).map(tab => ({
            id: tab.id,
            url: tab.url,
            title: tab.title,
            favicon: tab.favicon,
            loading: tab.loading,
            canGoBack: tab.canGoBack,
            canGoForward: tab.canGoForward,
            active: tab.id === this.activeTabId
        }));
    }
    notifyTabUpdate(tabId) {
        this.mainWindow.webContents.send('tab-updated', {
            tabId,
            tabs: this.getTabs()
        });
    }
    notifyTabsUpdate() {
        this.mainWindow.webContents.send('tabs-updated', {
            tabs: this.getTabs()
        });
    }
}
exports.BrowserManager = BrowserManager;
