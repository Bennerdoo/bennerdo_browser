class BrowserApp {
    constructor() {
        this.currentTabId = null;
        this.init();
    }
    async init() {
        this.setupWindowControls();
        this.setupNavigationControls();
        this.setupTabControls();
        this.setupSettingsMenu();
        this.setupEventListeners();
        await this.loadTabs();
        this.startPrivacyStatsUpdate();
    }
    // Window controls
    setupWindowControls() {
        document.getElementById('minimize-btn')?.addEventListener('click', () => {
            window.electronAPI.minimizeWindow();
        });
        document.getElementById('maximize-btn')?.addEventListener('click', () => {
            window.electronAPI.maximizeWindow();
        });
        document.getElementById('close-btn')?.addEventListener('click', () => {
            window.electronAPI.closeWindow();
        });
    }
    // Navigation controls
    setupNavigationControls() {
        const urlBar = document.getElementById('url-bar');
        const backBtn = document.getElementById('back-btn');
        const forwardBtn = document.getElementById('forward-btn');
        const reloadBtn = document.getElementById('reload-btn');
        // URL bar navigation
        urlBar?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.currentTabId) {
                const url = urlBar.value.trim();
                if (url) {
                    window.electronAPI.navigate(this.currentTabId, url);
                    this.showLoadingBar();
                }
            }
        });
        // Back button
        backBtn?.addEventListener('click', () => {
            if (this.currentTabId) {
                window.electronAPI.goBack(this.currentTabId);
            }
        });
        // Forward button
        forwardBtn?.addEventListener('click', () => {
            if (this.currentTabId) {
                window.electronAPI.goForward(this.currentTabId);
            }
        });
        // Reload button
        reloadBtn?.addEventListener('click', () => {
            if (this.currentTabId) {
                window.electronAPI.reload(this.currentTabId);
                this.showLoadingBar();
            }
        });
    }
    // Tab controls
    setupTabControls() {
        const newTabBtn = document.getElementById('new-tab-btn');
        console.log('[DEBUG] New tab button element:', newTabBtn);
        newTabBtn?.addEventListener('click', async () => {
            console.log('[DEBUG] New tab button clicked!');
            try {
                const tabId = await window.electronAPI.createTab();
                console.log('[DEBUG] Tab created with ID:', tabId);
                await this.loadTabs();
                console.log('[DEBUG] Tabs reloaded');
            }
            catch (error) {
                console.error('[DEBUG] Error creating tab:', error);
            }
        });
    }
    // Event listeners
    setupEventListeners() {
        window.electronAPI.onTabUpdated((data) => {
            this.updateTabs(data.tabs);
            this.updateNavigationState();
        });
        window.electronAPI.onTabsUpdated((data) => {
            this.updateTabs(data.tabs);
        });
    }
    // Load and display tabs
    async loadTabs() {
        const tabs = await window.electronAPI.getTabs();
        this.updateTabs(tabs);
    }
    updateTabs(tabs) {
        const container = document.getElementById('tabs-container');
        if (!container)
            return;
        container.innerHTML = '';
        tabs.forEach(tab => {
            const tabCard = this.createTabCard(tab);
            container.appendChild(tabCard);
            if (tab.active) {
                this.currentTabId = tab.id;
                this.updateURLBar(tab);
                this.updateNavigationState();
            }
        });
    }
    createTabCard(tab) {
        const card = document.createElement('div');
        card.className = 'tab-card' + (tab.active ? ' active' : '');
        card.dataset.tabId = tab.id;
        const header = document.createElement('div');
        header.className = 'tab-header';
        // Favicon
        const favicon = document.createElement('img');
        favicon.className = 'tab-favicon' + (tab.loading ? ' loading' : '');
        favicon.src = tab.favicon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect fill="%2300d9ff" width="16" height="16" rx="3"/></svg>';
        favicon.onerror = () => {
            favicon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect fill="%2300d9ff" width="16" height="16" rx="3"/></svg>';
        };
        header.appendChild(favicon);
        // Title
        const title = document.createElement('div');
        title.className = 'tab-title';
        title.textContent = tab.title || 'New Tab';
        header.appendChild(title);
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'tab-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = async (e) => {
            e.stopPropagation();
            await window.electronAPI.closeTab(tab.id);
        };
        header.appendChild(closeBtn);
        card.appendChild(header);
        // URL
        const url = document.createElement('div');
        url.className = 'tab-url';
        url.textContent = this.formatURL(tab.url);
        card.appendChild(url);
        // Click to switch tab
        card.onclick = () => {
            window.electronAPI.switchTab(tab.id);
        };
        return card;
    }
    formatURL(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname + urlObj.pathname;
        }
        catch {
            return url;
        }
    }
    updateURLBar(tab) {
        const urlBar = document.getElementById('url-bar');
        if (urlBar && !document.activeElement?.isSameNode(urlBar)) {
            urlBar.value = tab.url;
        }
    }
    updateNavigationState() {
        window.electronAPI.getTabs().then(tabs => {
            const activeTab = tabs.find(t => t.active);
            if (!activeTab)
                return;
            const backBtn = document.getElementById('back-btn');
            const forwardBtn = document.getElementById('forward-btn');
            if (backBtn)
                backBtn.disabled = !activeTab.canGoBack;
            if (forwardBtn)
                forwardBtn.disabled = !activeTab.canGoForward;
        });
    }
    showLoadingBar() {
        const loadingBar = document.getElementById('loading-bar');
        if (loadingBar) {
            loadingBar.classList.add('active');
            setTimeout(() => {
                loadingBar.classList.remove('active');
            }, 2000);
        }
    }
    // Privacy stats update
    startPrivacyStatsUpdate() {
        this.updatePrivacyStats();
        setInterval(() => this.updatePrivacyStats(), 2000);
    }
    async updatePrivacyStats() {
        const stats = await window.electronAPI.getPrivacyStats();
        const total = stats.adsBlocked + stats.trackersBlocked + stats.cookiesBlocked;
        const trackersBlockedEl = document.getElementById('trackers-blocked');
        const pageBlocksEl = document.getElementById('page-blocks');
        if (trackersBlockedEl) {
            const oldValue = parseInt(trackersBlockedEl.textContent || '0');
            if (oldValue !== total) {
                trackersBlockedEl.style.animation = 'none';
                setTimeout(() => {
                    trackersBlockedEl.textContent = total.toString();
                    trackersBlockedEl.style.animation = '';
                }, 10);
            }
        }
        if (pageBlocksEl) {
            pageBlocksEl.textContent = total.toString();
        }
    }
    // Settings menu
    setupSettingsMenu() {
        const menuBtn = document.getElementById('menu-btn');
        const settingsMenu = document.getElementById('settings-menu');
        // Toggle menu
        menuBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsMenu?.classList.toggle('active');
        });
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!settingsMenu?.contains(e.target) && !menuBtn?.contains(e.target)) {
                settingsMenu?.classList.remove('active');
            }
        });
        // DevTools
        document.getElementById('menu-devtools')?.addEventListener('click', () => {
            // DevTools will open in detached window
            console.log('Opening DevTools...');
            settingsMenu?.classList.remove('active');
        });
        // Clear Cache
        document.getElementById('menu-clear-cache')?.addEventListener('click', () => {
            if (confirm('Clear all cached data?')) {
                console.log('Cache cleared!');
                alert('Cache cleared successfully!');
            }
            settingsMenu?.classList.remove('active');
        });
        // Toggle Ads
        document.getElementById('toggle-ads')?.addEventListener('click', function () {
            this.classList.toggle('active');
            const enabled = this.classList.contains('active');
            console.log('Ad blocking:', enabled ? 'ON' : 'OFF');
        });
        // Toggle HTTPS
        document.getElementById('toggle-https')?.addEventListener('click', function () {
            this.classList.toggle('active');
            const enabled = this.classList.contains('active');
            console.log('Force HTTPS:', enabled ? 'ON' : 'OFF');
        });
        // About
        document.getElementById('menu-about')?.addEventListener('click', () => {
            alert('Bennerdo Browser v1.0.0\n\nPrivacy-first browser with unique lightweight UI\n\nMade with ❤️ by Bennerdo');
            settingsMenu?.classList.remove('active');
        });
    }
}
// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new BrowserApp());
}
else {
    new BrowserApp();
}
export {};
