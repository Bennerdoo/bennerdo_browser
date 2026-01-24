import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Tab management
    createTab: (url?: string) => ipcRenderer.invoke('create-tab', url),
    closeTab: (tabId: string) => ipcRenderer.invoke('close-tab', tabId),
    switchTab: (tabId: string) => ipcRenderer.invoke('switch-tab', tabId),
    getTabs: () => ipcRenderer.invoke('get-tabs'),

    // Navigation
    navigate: (tabId: string, url: string) => ipcRenderer.invoke('navigate', tabId, url),
    goBack: (tabId: string) => ipcRenderer.invoke('go-back', tabId),
    goForward: (tabId: string) => ipcRenderer.invoke('go-forward', tabId),
    reload: (tabId: string) => ipcRenderer.invoke('reload', tabId),

    // Privacy
    getPrivacyStats: () => ipcRenderer.invoke('get-privacy-stats'),

    // Window controls
    minimizeWindow: () => ipcRenderer.send('window-minimize'),
    maximizeWindow: () => ipcRenderer.send('window-maximize'),
    closeWindow: () => ipcRenderer.send('window-close'),

    // Event listeners
    onTabUpdated: (callback: (data: any) => void) => {
        ipcRenderer.on('tab-updated', (event, data) => callback(data));
    },
    onTabsUpdated: (callback: (data: any) => void) => {
        ipcRenderer.on('tabs-updated', (event, data) => callback(data));
    }
});
