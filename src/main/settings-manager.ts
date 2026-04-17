import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface BrowserSettings {
    // General
    homepage: string;
    newTabPage: 'homepage' | 'blank' | 'speed-dial';
    startupBehavior: 'last-session' | 'homepage' | 'blank';

    // Search
    searchEngine: 'google' | 'duckduckgo' | 'bing' | 'brave' | 'startpage';

    // Appearance
    theme: 'dark' | 'light' | 'system';
    fontSize: 'small' | 'medium' | 'large';
    showBookmarksBar: boolean;

    // Privacy & Security
    blockAds: boolean;
    forceHttps: boolean;
    blockThirdPartyCookies: boolean;
    sendDoNotTrack: boolean;
    blockFingerprinting: boolean;

    // Downloads
    downloadPath: string;
    askBeforeDownload: boolean;

    // Content
    defaultZoom: number;
    javascript: boolean;
    images: boolean;
    notifications: boolean;
    popups: boolean;
}

const DEFAULT_SETTINGS: BrowserSettings = {
    homepage: 'https://www.google.com',
    newTabPage: 'speed-dial',
    startupBehavior: 'homepage',
    searchEngine: 'google',
    theme: 'dark',
    fontSize: 'medium',
    showBookmarksBar: false,
    blockAds: true,
    forceHttps: true,
    blockThirdPartyCookies: true,
    sendDoNotTrack: true,
    blockFingerprinting: false,
    downloadPath: '',
    askBeforeDownload: true,
    defaultZoom: 100,
    javascript: true,
    images: true,
    notifications: false,
    popups: false,
};

export class SettingsManager {
    private settings: BrowserSettings;
    private settingsPath: string;

    constructor() {
        const userDataPath = app.getPath('userData');
        this.settingsPath = path.join(userDataPath, 'settings.json');

        // Set default download path
        DEFAULT_SETTINGS.downloadPath = app.getPath('downloads');

        this.settings = this.load();
    }

    private load(): BrowserSettings {
        try {
            if (fs.existsSync(this.settingsPath)) {
                const raw = fs.readFileSync(this.settingsPath, 'utf-8');
                const parsed = JSON.parse(raw);
                return { ...DEFAULT_SETTINGS, ...parsed };
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
        return { ...DEFAULT_SETTINGS };
    }

    private save() {
        try {
            fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf-8');
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }

    getAll(): BrowserSettings {
        return { ...this.settings };
    }

    get<K extends keyof BrowserSettings>(key: K): BrowserSettings[K] {
        return this.settings[key];
    }

    set<K extends keyof BrowserSettings>(key: K, value: BrowserSettings[K]) {
        this.settings[key] = value;
        this.save();
    }

    setMany(updates: Partial<BrowserSettings>) {
        this.settings = { ...this.settings, ...updates };
        this.save();
    }

    reset() {
        this.settings = { ...DEFAULT_SETTINGS, downloadPath: app.getPath('downloads') };
        this.save();
    }

    getSearchUrl(query: string): string {
        const engines: Record<string, string> = {
            google: 'https://www.google.com/search?q=',
            duckduckgo: 'https://duckduckgo.com/?q=',
            bing: 'https://www.bing.com/search?q=',
            brave: 'https://search.brave.com/search?q=',
            startpage: 'https://www.startpage.com/search?q=',
        };
        return (engines[this.settings.searchEngine] || engines.google) + encodeURIComponent(query);
    }
}
