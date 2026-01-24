import { BrowserWindow } from 'electron';

export interface PermissionRequest {
    timestamp: Date;
    domain: string;
    permission: string;
    granted: boolean;
}

export class PermissionMonitor {
    private permissionHistory: PermissionRequest[];
    private mainWindow: BrowserWindow | null;

    constructor(mainWindow: BrowserWindow) {
        this.permissionHistory = [];
        this.mainWindow = mainWindow;
    }

    logPermission(domain: string, permission: string, granted: boolean): void {
        const request: PermissionRequest = {
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

    private notifyUI(request: PermissionRequest): void {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('permission-request', request);
        }
    }

    getPermissionHistory(): PermissionRequest[] {
        return [...this.permissionHistory];
    }

    getPermissionStats(): { [key: string]: number } {
        const stats: { [key: string]: number } = {};

        this.permissionHistory.forEach(req => {
            if (!stats[req.permission]) {
                stats[req.permission] = 0;
            }
            stats[req.permission]++;
        });

        return stats;
    }

    clearHistory(): void {
        this.permissionHistory = [];
        console.log('Permission history cleared');
    }
}
