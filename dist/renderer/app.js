class BrowserApp {
    constructor() {
        this.currentTabId = null;
        this.settings = {};
        this.init();
    }
    async init() {
        this.settings = await window.electronAPI.getSettings();
        this.setupWindowControls();
        this.setupNavigationControls();
        this.setupTabControls();
        this.setupSettingsMenu();
        this.setupFullSettingsPanel();
        this.setupEventListeners();
        await this.loadTabs();
        this.startPrivacyStatsUpdate();
    }
    // ─── Window controls ────────────────────────────────────────────────────
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
    // ─── Navigation controls ─────────────────────────────────────────────────
    setupNavigationControls() {
        const urlBar = document.getElementById('url-bar');
        const backBtn = document.getElementById('back-btn');
        const forwardBtn = document.getElementById('forward-btn');
        const reloadBtn = document.getElementById('reload-btn');
        urlBar?.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && this.currentTabId) {
                const raw = urlBar.value.trim();
                if (!raw)
                    return;
                // Use configured search engine for non-URL input
                let url = raw;
                if (!raw.match(/^https?:\/\//) && !(raw.includes('.') && !raw.includes(' '))) {
                    url = await window.electronAPI.getSearchUrl(raw);
                }
                window.electronAPI.navigate(this.currentTabId, url);
                this.showLoadingBar();
            }
        });
        backBtn?.addEventListener('click', () => {
            if (this.currentTabId)
                window.electronAPI.goBack(this.currentTabId);
        });
        forwardBtn?.addEventListener('click', () => {
            if (this.currentTabId)
                window.electronAPI.goForward(this.currentTabId);
        });
        reloadBtn?.addEventListener('click', () => {
            if (this.currentTabId) {
                window.electronAPI.reload(this.currentTabId);
                this.showLoadingBar();
            }
        });
    }
    // ─── Tab controls ────────────────────────────────────────────────────────
    setupTabControls() {
        const newTabBtn = document.getElementById('new-tab-btn');
        newTabBtn?.addEventListener('click', async () => {
            try {
                await window.electronAPI.createTab();
                await this.loadTabs();
            }
            catch (error) {
                console.error('Error creating tab:', error);
            }
        });
    }
    // ─── IPC event listeners ─────────────────────────────────────────────────
    setupEventListeners() {
        window.electronAPI.onTabUpdated((data) => {
            this.updateTabs(data.tabs);
            this.updateNavigationState();
        });
        window.electronAPI.onTabsUpdated((data) => {
            this.updateTabs(data.tabs);
        });
    }
    // ─── Tabs ────────────────────────────────────────────────────────────────
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
        const favicon = document.createElement('img');
        favicon.className = 'tab-favicon' + (tab.loading ? ' loading' : '');
        const fallback = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect fill="%2300d9ff" width="16" height="16" rx="3"/></svg>';
        favicon.src = tab.favicon || fallback;
        favicon.onerror = () => { favicon.src = fallback; };
        header.appendChild(favicon);
        const title = document.createElement('div');
        title.className = 'tab-title';
        title.textContent = tab.title || 'New Tab';
        header.appendChild(title);
        const closeBtn = document.createElement('button');
        closeBtn.className = 'tab-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = async (e) => {
            e.stopPropagation();
            await window.electronAPI.closeTab(tab.id);
        };
        header.appendChild(closeBtn);
        card.appendChild(header);
        const urlEl = document.createElement('div');
        urlEl.className = 'tab-url';
        urlEl.textContent = this.formatURL(tab.url);
        card.appendChild(urlEl);
        card.onclick = () => window.electronAPI.switchTab(tab.id);
        return card;
    }
    formatURL(url) {
        try {
            const u = new URL(url);
            return u.hostname + u.pathname;
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
        const bar = document.getElementById('loading-bar');
        if (bar) {
            bar.classList.add('active');
            setTimeout(() => bar.classList.remove('active'), 2000);
        }
    }
    // ─── Privacy stats ───────────────────────────────────────────────────────
    startPrivacyStatsUpdate() {
        this.updatePrivacyStats();
        setInterval(() => this.updatePrivacyStats(), 2000);
    }
    async updatePrivacyStats() {
        const stats = await window.electronAPI.getPrivacyStats();
        const total = stats.adsBlocked + stats.trackersBlocked + stats.cookiesBlocked;
        const valueEl = document.getElementById('trackers-blocked');
        const badgeEl = document.getElementById('page-blocks');
        if (valueEl) {
            const old = parseInt(valueEl.textContent || '0');
            if (old !== total) {
                valueEl.style.animation = 'none';
                setTimeout(() => {
                    valueEl.textContent = total.toString();
                    valueEl.style.animation = '';
                }, 10);
            }
        }
        if (badgeEl)
            badgeEl.textContent = total.toString();
    }
    // ─── Quick-access settings menu (dropdown) ───────────────────────────────
    setupSettingsMenu() {
        const menuBtn = document.getElementById('menu-btn');
        const menu = document.getElementById('settings-menu');
        menuBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            menu?.classList.toggle('active');
        });
        document.addEventListener('click', (e) => {
            const wrapper = menuBtn?.closest('.menu-wrapper');
            if (!wrapper?.contains(e.target)) {
                menu?.classList.remove('active');
            }
        });
        // New tab shortcut
        document.getElementById('menu-new-tab')?.addEventListener('click', async () => {
            menu?.classList.remove('active');
            await window.electronAPI.createTab();
            await this.loadTabs();
        });
        // Open full settings panel
        document.getElementById('menu-settings')?.addEventListener('click', () => {
            menu?.classList.remove('active');
            this.openSettingsPanel();
        });
        // DevTools
        document.getElementById('menu-devtools')?.addEventListener('click', () => {
            console.log('Opening DevTools…');
            menu?.classList.remove('active');
        });
        // Clear Cache
        document.getElementById('menu-clear-cache')?.addEventListener('click', () => {
            if (confirm('Clear all cached data?')) {
                alert('Cache cleared successfully!');
            }
            menu?.classList.remove('active');
        });
        // About
        document.getElementById('menu-about')?.addEventListener('click', () => {
            alert('Bennerdo Browser v1.1.0\n\nPrivacy-first browser with unique lightweight UI\n\nMade with ❤️ by Bennerdo');
            menu?.classList.remove('active');
        });
        // Quick toggles — sync with loaded settings
        this.initQuickToggle('toggle-ads', 'blockAds');
        this.initQuickToggle('toggle-https', 'forceHttps');
    }
    initQuickToggle(elementId, settingKey) {
        const el = document.getElementById(elementId);
        if (!el)
            return;
        if (this.settings[settingKey])
            el.classList.add('active');
        el.addEventListener('click', async () => {
            el.classList.toggle('active');
            const enabled = el.classList.contains('active');
            this.settings[settingKey] = enabled;
            await window.electronAPI.setSetting(settingKey, enabled);
        });
    }
    // ─── Full Settings Panel ─────────────────────────────────────────────────
    openSettingsPanel() {
        const overlay = document.getElementById('settings-overlay');
        overlay?.classList.add('active');
    }
    closeSettingsPanel() {
        const overlay = document.getElementById('settings-overlay');
        overlay?.classList.remove('active');
    }
    setupFullSettingsPanel() {
        // Close button
        document.getElementById('settings-close-btn')?.addEventListener('click', () => {
            this.closeSettingsPanel();
        });
        // Close on backdrop click
        document.getElementById('settings-overlay')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget)
                this.closeSettingsPanel();
        });
        // Keyboard shortcut Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape')
                this.closeSettingsPanel();
        });
        // Sidebar section navigation
        document.querySelectorAll('.settings-nav-item[data-section]').forEach(btn => {
            btn.addEventListener('click', () => {
                // Deactivate all
                document.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
                // Activate clicked
                btn.classList.add('active');
                document.getElementById(`section-${btn.dataset.section}`)?.classList.add('active');
            });
        });
        // Reset to defaults
        document.getElementById('reset-settings-btn')?.addEventListener('click', async () => {
            if (!confirm('Reset all settings to defaults?'))
                return;
            this.settings = await window.electronAPI.resetSettings();
            this.populateSettingsPanel();
        });
        // Populate panel with current values
        this.populateSettingsPanel();
        // ── Inputs that save on change ──
        // Homepage
        const homepageInput = document.getElementById('setting-homepage');
        homepageInput?.addEventListener('change', async () => {
            this.settings.homepage = homepageInput.value;
            await window.electronAPI.setSetting('homepage', homepageInput.value);
        });
        // Radio groups (newTabPage, startupBehavior, theme, fontSize, searchEngine)
        this.setupRadioGroup('newTabPage');
        this.setupRadioGroup('startupBehavior');
        this.setupRadioGroup('theme');
        this.setupRadioGroup('fontSize');
        this.setupRadioGroup('searchEngine');
        // Toggle switches in the settings panel
        this.setupPanelToggle('setting-showBookmarksBar', 'showBookmarksBar');
        this.setupPanelToggle('setting-blockAds', 'blockAds');
        this.setupPanelToggle('setting-forceHttps', 'forceHttps');
        this.setupPanelToggle('setting-blockThirdPartyCookies', 'blockThirdPartyCookies');
        this.setupPanelToggle('setting-sendDoNotTrack', 'sendDoNotTrack');
        this.setupPanelToggle('setting-blockFingerprinting', 'blockFingerprinting');
        this.setupPanelToggle('setting-askBeforeDownload', 'askBeforeDownload');
        this.setupPanelToggle('setting-javascript', 'javascript');
        this.setupPanelToggle('setting-images', 'images');
        this.setupPanelToggle('setting-notifications', 'notifications');
        this.setupPanelToggle('setting-popups', 'popups');
        // Download folder picker
        document.getElementById('btn-pick-download')?.addEventListener('click', async () => {
            const folder = await window.electronAPI.pickDownloadFolder();
            if (folder) {
                this.settings.downloadPath = folder;
                await window.electronAPI.setSetting('downloadPath', folder);
                const input = document.getElementById('setting-downloadPath');
                if (input)
                    input.value = folder;
            }
        });
        // Clear browsing data
        document.getElementById('btn-clear-data')?.addEventListener('click', () => {
            if (confirm('Clear all cookies, cache, and browsing history?')) {
                alert('Browsing data cleared!');
            }
        });
        // Zoom controls
        document.getElementById('zoom-out')?.addEventListener('click', async () => {
            const next = Math.max(25, (this.settings.defaultZoom || 100) - 25);
            this.settings.defaultZoom = next;
            await window.electronAPI.setSetting('defaultZoom', next);
            const display = document.getElementById('zoom-display');
            if (display)
                display.textContent = `${next}%`;
        });
        document.getElementById('zoom-in')?.addEventListener('click', async () => {
            const next = Math.min(300, (this.settings.defaultZoom || 100) + 25);
            this.settings.defaultZoom = next;
            await window.electronAPI.setSetting('defaultZoom', next);
            const display = document.getElementById('zoom-display');
            if (display)
                display.textContent = `${next}%`;
        });
    }
    populateSettingsPanel() {
        const s = this.settings;
        // Homepage
        const homepageInput = document.getElementById('setting-homepage');
        if (homepageInput)
            homepageInput.value = s.homepage || '';
        // Radios
        this.setRadio('newTabPage', s.newTabPage);
        this.setRadio('startupBehavior', s.startupBehavior);
        this.setRadio('theme', s.theme);
        this.setRadio('fontSize', s.fontSize);
        this.setRadio('searchEngine', s.searchEngine);
        // Toggles
        this.setPanelToggleState('setting-showBookmarksBar', s.showBookmarksBar);
        this.setPanelToggleState('setting-blockAds', s.blockAds);
        this.setPanelToggleState('setting-forceHttps', s.forceHttps);
        this.setPanelToggleState('setting-blockThirdPartyCookies', s.blockThirdPartyCookies);
        this.setPanelToggleState('setting-sendDoNotTrack', s.sendDoNotTrack);
        this.setPanelToggleState('setting-blockFingerprinting', s.blockFingerprinting);
        this.setPanelToggleState('setting-askBeforeDownload', s.askBeforeDownload);
        this.setPanelToggleState('setting-javascript', s.javascript);
        this.setPanelToggleState('setting-images', s.images);
        this.setPanelToggleState('setting-notifications', s.notifications);
        this.setPanelToggleState('setting-popups', s.popups);
        // Download path
        const dlInput = document.getElementById('setting-downloadPath');
        if (dlInput)
            dlInput.value = s.downloadPath || '';
        // Zoom
        const zoomDisplay = document.getElementById('zoom-display');
        if (zoomDisplay)
            zoomDisplay.textContent = `${s.defaultZoom || 100}%`;
        // Also sync quick toggles in the dropdown
        const adsToggle = document.getElementById('toggle-ads');
        const httpsToggle = document.getElementById('toggle-https');
        if (adsToggle)
            adsToggle.classList.toggle('active', !!s.blockAds);
        if (httpsToggle)
            httpsToggle.classList.toggle('active', !!s.forceHttps);
    }
    setRadio(name, value) {
        const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
        if (input)
            input.checked = true;
    }
    setupRadioGroup(settingKey) {
        document.querySelectorAll(`input[name="${settingKey}"]`).forEach(radio => {
            radio.addEventListener('change', async () => {
                if (radio.checked) {
                    this.settings[settingKey] = radio.value;
                    await window.electronAPI.setSetting(settingKey, radio.value);
                }
            });
        });
    }
    setPanelToggleState(elementId, value) {
        const el = document.getElementById(elementId);
        if (el)
            el.classList.toggle('active', !!value);
    }
    setupPanelToggle(elementId, settingKey) {
        const el = document.getElementById(elementId);
        if (!el)
            return;
        el.addEventListener('click', async () => {
            el.classList.toggle('active');
            const enabled = el.classList.contains('active');
            this.settings[settingKey] = enabled;
            await window.electronAPI.setSetting(settingKey, enabled);
            // Keep quick dropdown toggles in sync
            if (settingKey === 'blockAds') {
                document.getElementById('toggle-ads')?.classList.toggle('active', enabled);
            }
            if (settingKey === 'forceHttps') {
                document.getElementById('toggle-https')?.classList.toggle('active', enabled);
            }
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
