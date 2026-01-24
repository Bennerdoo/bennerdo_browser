import { session, Session } from 'electron';
import { ElectronBlocker } from '@cliqz/adblocker-electron';
import fetch from 'cross-fetch';
import { SessionManager } from './session-manager';
import { PermissionMonitor } from './permission-monitor';

interface PrivacyStats {
    adsBlocked: number;
    trackersBlocked: number;
    cookiesBlocked: number;
    scriptsBlocked: number;
}

export class PrivacyEngine {
    private blocker: ElectronBlocker | null = null;
    private sessionManager: SessionManager;
    private permissionMonitor: PermissionMonitor | null = null;
    private stats: PrivacyStats = {
        adsBlocked: 0,
        trackersBlocked: 0,
        cookiesBlocked: 0,
        scriptsBlocked: 0
    };

    constructor(sessionManager: SessionManager) {
        this.sessionManager = sessionManager;
    }

    setPermissionMonitor(monitor: PermissionMonitor): void {
        this.permissionMonitor = monitor;
    }

    async initialize() {
        console.log('Initializing Privacy Engine...');

        // Load ad blocker with filter lists
        try {
            this.blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
            console.log('Ad blocker loaded successfully');
        } catch (error) {
            console.error('Failed to load ad blocker:', error);
        }
    }

    applyToSession(sess: Session) {
        // Enable blocker for this session
        if (this.blocker) {
            this.blocker.enableBlockingInSession(sess);
            console.log('Ad blocker enabled');
        }

        // Track blocked requests using heuristics and force HTTPS
        sess.webRequest.onBeforeRequest((details, callback) => {
            const url = details.url.toLowerCase();

            // Track potential trackers/ads
            if (url.includes('doubleclick') || url.includes('analytics') ||
                url.includes('tracker') || url.includes('facebook') ||
                url.includes('google-analytics')) {
                this.stats.adsBlocked++;
                this.stats.trackersBlocked++;
            }

            // Upgrade HTTP to HTTPS (but don't block localhost)
            if (details.url.startsWith('http://') && !details.url.startsWith('http://localhost')) {
                const httpsUrl = details.url.replace('http://', 'https://');
                callback({ redirectURL: httpsUrl });
            } else {
                callback({});
            }
        });

        // Enhanced permission policy with monitoring
        sess.setPermissionRequestHandler((webContents, permission, callback) => {
            const url = webContents.getURL();
            const domain = new URL(url).hostname;

            let granted = false;

            // Allow clipboard for better UX
            if (permission === 'clipboard-sanitized-write') {
                granted = true;
            }

            // Log the permission request
            if (this.permissionMonitor) {
                this.permissionMonitor.logPermission(domain, permission, granted);
            }

            callback(granted);
        });

        // Add privacy headers (but keep cookies functional)
        sess.webRequest.onHeadersReceived((details, callback) => {
            const headers = details.responseHeaders || {};

            // Add privacy headers (don't remove Set-Cookie!)
            headers['X-Content-Type-Options'] = ['nosniff'];
            headers['X-Frame-Options'] = ['SAMEORIGIN']; // Changed from DENY to allow some iframes
            headers['X-XSS-Protection'] = ['1; mode=block'];
            headers['Referrer-Policy'] = ['strict-origin-when-cross-origin']; // Less strict

            callback({ responseHeaders: headers });
        });

        // Enhanced privacy settings
        sess.setUserAgent(sess.getUserAgent().replace(/Electron\/[^\s]+/, ''));

        console.log('Privacy settings applied to session');
    }

    getStats(): PrivacyStats {
        return { ...this.stats };
    }

    resetStats() {
        this.stats = {
            adsBlocked: 0,
            trackersBlocked: 0,
            cookiesBlocked: 0,
            scriptsBlocked: 0
        };
    }
}
