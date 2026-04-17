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
exports.SettingsManager = void 0;
const electron_1 = require("electron");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const DEFAULT_SETTINGS = {
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
class SettingsManager {
    constructor() {
        const userDataPath = electron_1.app.getPath('userData');
        this.settingsPath = path.join(userDataPath, 'settings.json');
        // Set default download path
        DEFAULT_SETTINGS.downloadPath = electron_1.app.getPath('downloads');
        this.settings = this.load();
    }
    load() {
        try {
            if (fs.existsSync(this.settingsPath)) {
                const raw = fs.readFileSync(this.settingsPath, 'utf-8');
                const parsed = JSON.parse(raw);
                return { ...DEFAULT_SETTINGS, ...parsed };
            }
        }
        catch (e) {
            console.error('Failed to load settings:', e);
        }
        return { ...DEFAULT_SETTINGS };
    }
    save() {
        try {
            fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf-8');
        }
        catch (e) {
            console.error('Failed to save settings:', e);
        }
    }
    getAll() {
        return { ...this.settings };
    }
    get(key) {
        return this.settings[key];
    }
    set(key, value) {
        this.settings[key] = value;
        this.save();
    }
    setMany(updates) {
        this.settings = { ...this.settings, ...updates };
        this.save();
    }
    reset() {
        this.settings = { ...DEFAULT_SETTINGS, downloadPath: electron_1.app.getPath('downloads') };
        this.save();
    }
    getSearchUrl(query) {
        const engines = {
            google: 'https://www.google.com/search?q=',
            duckduckgo: 'https://duckduckgo.com/?q=',
            bing: 'https://www.bing.com/search?q=',
            brave: 'https://search.brave.com/search?q=',
            startpage: 'https://www.startpage.com/search?q=',
        };
        return (engines[this.settings.searchEngine] || engines.google) + encodeURIComponent(query);
    }
}
exports.SettingsManager = SettingsManager;
