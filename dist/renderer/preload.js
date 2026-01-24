"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Tab management
    createTab: (url) => electron_1.ipcRenderer.invoke('create-tab', url),
    closeTab: (tabId) => electron_1.ipcRenderer.invoke('close-tab', tabId),
    switchTab: (tabId) => electron_1.ipcRenderer.invoke('switch-tab', tabId),
    getTabs: () => electron_1.ipcRenderer.invoke('get-tabs'),
    // Navigation
    navigate: (tabId, url) => electron_1.ipcRenderer.invoke('navigate', tabId, url),
    goBack: (tabId) => electron_1.ipcRenderer.invoke('go-back', tabId),
    goForward: (tabId) => electron_1.ipcRenderer.invoke('go-forward', tabId),
    reload: (tabId) => electron_1.ipcRenderer.invoke('reload', tabId),
    // Privacy
    getPrivacyStats: () => electron_1.ipcRenderer.invoke('get-privacy-stats'),
    // Window controls
    minimizeWindow: () => electron_1.ipcRenderer.send('window-minimize'),
    maximizeWindow: () => electron_1.ipcRenderer.send('window-maximize'),
    closeWindow: () => electron_1.ipcRenderer.send('window-close'),
    // Event listeners
    onTabUpdated: (callback) => {
        electron_1.ipcRenderer.on('tab-updated', (event, data) => callback(data));
    },
    onTabsUpdated: (callback) => {
        electron_1.ipcRenderer.on('tabs-updated', (event, data) => callback(data));
    }
});
