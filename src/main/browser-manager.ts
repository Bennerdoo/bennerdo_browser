import { BrowserWindow, BrowserView } from 'electron';
import { PrivacyEngine } from './privacy-engine';
import * as crypto from 'crypto';

interface Tab {
    id: string;
    url: string;
    title: string;
    favicon: string;
    loading: boolean;
    canGoBack: boolean;
    canGoForward: boolean;
    view?: BrowserView;
}

export class BrowserManager {
    private tabs: Map<string, Tab> = new Map();
    private activeTabId: string | null = null;
    private mainWindow: BrowserWindow;
    private privacyEngine: PrivacyEngine;

    constructor(mainWindow: BrowserWindow, privacyEngine: PrivacyEngine) {
        this.mainWindow = mainWindow;
        this.privacyEngine = privacyEngine;

        // Create initial tab
        this.createTab('https://www.google.com');
    }

    createTab(url?: string): string {
        const tabId = crypto.randomBytes(16).toString('hex');
        const defaultUrl = url || 'https://www.google.com';

        // Create BrowserView for this tab
        const view = new BrowserView({
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

        const tab: Tab = {
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

    private setupTabEvents(tab: Tab) {
        if (!tab.view) return;

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

    switchTab(tabId: string): boolean {
        const tab = this.tabs.get(tabId);
        if (!tab || !tab.view) return false;

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
        const TITLEBAR_HEIGHT = 32;  // Custom titlebar
        const NAVBAR_HEIGHT = 60;     // Navigation bar
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

    closeTab(tabId: string): boolean {
        const tab = this.tabs.get(tabId);
        if (!tab) return false;

        // Destroy the view
        if (tab.view) {
            if (this.activeTabId === tabId) {
                this.mainWindow.removeBrowserView(tab.view);
            }
            (tab.view.webContents as any).destroy();
        }

        this.tabs.delete(tabId);

        // If this was the active tab, switch to another
        if (this.activeTabId === tabId) {
            const remainingTabs = Array.from(this.tabs.keys());
            if (remainingTabs.length > 0) {
                this.switchTab(remainingTabs[0]);
            } else {
                // Create a new tab if none remain
                this.createTab();
            }
        }

        this.notifyTabsUpdate();
        return true;
    }

    navigate(tabId: string, url: string): boolean {
        const tab = this.tabs.get(tabId);
        if (!tab || !tab.view) return false;

        // Ensure URL has protocol
        if (!url.match(/^https?:\/\//)) {
            // Check if it looks like a URL or a search query
            if (url.includes('.') && !url.includes(' ')) {
                url = 'https://' + url;
            } else {
                // Use Google search
                url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
            }
        }

        tab.view.webContents.loadURL(url);
        return true;
    }

    goBack(tabId: string): boolean {
        const tab = this.tabs.get(tabId);
        if (!tab || !tab.view) return false;
        if (tab.view.webContents.canGoBack()) {
            tab.view.webContents.goBack();
            return true;
        }
        return false;
    }

    goForward(tabId: string): boolean {
        const tab = this.tabs.get(tabId);
        if (!tab || !tab.view) return false;
        if (tab.view.webContents.canGoForward()) {
            tab.view.webContents.goForward();
            return true;
        }
        return false;
    }

    reload(tabId: string): boolean {
        const tab = this.tabs.get(tabId);
        if (!tab || !tab.view) return false;
        tab.view.webContents.reload();
        return true;
    }

    getTabs(): any[] {
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

    private notifyTabUpdate(tabId: string) {
        this.mainWindow.webContents.send('tab-updated', {
            tabId,
            tabs: this.getTabs()
        });
    }

    private notifyTabsUpdate() {
        this.mainWindow.webContents.send('tabs-updated', {
            tabs: this.getTabs()
        });
    }
}
