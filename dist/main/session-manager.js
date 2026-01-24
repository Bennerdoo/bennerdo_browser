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
exports.SessionManager = void 0;
const electron_1 = require("electron");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class SessionManager {
    constructor() {
        this.configPath = path.join(electron_1.app.getPath('userData'), 'trusted-domains.json');
        this.trustedDomains = new Set(this.getDefaultTrustedDomains());
        this.loadTrustedDomains();
    }
    getDefaultTrustedDomains() {
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
    loadTrustedDomains() {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf-8');
                const domains = JSON.parse(data);
                domains.forEach((domain) => this.trustedDomains.add(domain));
                console.log('Loaded trusted domains:', Array.from(this.trustedDomains));
            }
        }
        catch (error) {
            console.error('Failed to load trusted domains:', error);
        }
    }
    saveTrustedDomains() {
        try {
            const data = JSON.stringify(Array.from(this.trustedDomains), null, 2);
            fs.writeFileSync(this.configPath, data, 'utf-8');
            console.log('Saved trusted domains');
        }
        catch (error) {
            console.error('Failed to save trusted domains:', error);
        }
    }
    isTrustedDomain(domain) {
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
    addTrustedDomain(domain) {
        this.trustedDomains.add(domain);
        this.saveTrustedDomains();
    }
    removeTrustedDomain(domain) {
        this.trustedDomains.delete(domain);
        this.saveTrustedDomains();
    }
    getTrustedDomains() {
        return Array.from(this.trustedDomains);
    }
}
exports.SessionManager = SessionManager;
