import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export class SessionManager {
    private trustedDomains: Set<string>;
    private configPath: string;

    constructor() {
        this.configPath = path.join(app.getPath('userData'), 'trusted-domains.json');
        this.trustedDomains = new Set(this.getDefaultTrustedDomains());
        this.loadTrustedDomains();
    }

    private getDefaultTrustedDomains(): string[] {
        return [
            'google.com',
            'youtube.com',
            'gmail.com',
            'drive.google.com',
            'docs.google.com',
            'accounts.google.com',
            'gstatic.com' // Google static content
        ];
    }

    private loadTrustedDomains(): void {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf-8');
                const domains = JSON.parse(data);
                domains.forEach((domain: string) => this.trustedDomains.add(domain));
                console.log('Loaded trusted domains:', Array.from(this.trustedDomains));
            }
        } catch (error) {
            console.error('Failed to load trusted domains:', error);
        }
    }

    private saveTrustedDomains(): void {
        try {
            const data = JSON.stringify(Array.from(this.trustedDomains), null, 2);
            fs.writeFileSync(this.configPath, data, 'utf-8');
            console.log('Saved trusted domains');
        } catch (error) {
            console.error('Failed to save trusted domains:', error);
        }
    }

    isTrustedDomain(domain: string): boolean {
        // Remove protocol and path
        const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

        // Check exact match or subdomain match
        for (const trusted of this.trustedDomains) {
            if (cleanDomain === trusted || cleanDomain.endsWith('.' + trusted)) {
                return true;
            }
        }
        return false;
    }

    addTrustedDomain(domain: string): void {
        this.trustedDomains.add(domain);
        this.saveTrustedDomains();
    }

    removeTrustedDomain(domain: string): void {
        this.trustedDomains.delete(domain);
        this.saveTrustedDomains();
    }

    getTrustedDomains(): string[] {
        return Array.from(this.trustedDomains);
    }
}
