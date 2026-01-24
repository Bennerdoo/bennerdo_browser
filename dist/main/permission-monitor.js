"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionMonitor = void 0;
class PermissionMonitor {
    constructor(mainWindow) {
        this.permissionHistory = [];
        this.mainWindow = mainWindow;
    }
    logPermission(domain, permission, granted) {
        const request = {
            timestamp: new Date(),
            domain,
            permission,
            granted
        };
        this.permissionHistory.push(request);
        // Keep only last 1000 entries
        if (this.permissionHistory.length > 1000) {
            this.permissionHistory.shift();
        }
        console.log(`[Permission] ${domain} requested ${permission}: ${granted ? 'GRANTED' : 'DENIED'}`);
        // Notify UI of permission request
        this.notifyUI(request);
    }
    notifyUI(request) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('permission-request', request);
        }
    }
    getPermissionHistory() {
        return [...this.permissionHistory];
    }
    getPermissionStats() {
        const stats = {};
        this.permissionHistory.forEach(req => {
            if (!stats[req.permission]) {
                stats[req.permission] = 0;
            }
            stats[req.permission]++;
        });
        return stats;
    }
    clearHistory() {
        this.permissionHistory = [];
        console.log('Permission history cleared');
    }
}
exports.PermissionMonitor = PermissionMonitor;
