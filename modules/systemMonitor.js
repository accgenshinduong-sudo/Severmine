/**
 * ============================================
 * MODULE GIÁM SÁT HỆ THỐNG
 * ============================================
 * Quản lý thông tin CPU, RAM, uptime
 */

const os = require('os');
const https = require('https');
const config = require('../config');

class SystemMonitor {
    constructor() {
        this.publicIP = null;
    }

    /**
     * Lấy IP public của server
     */
    async getPublicIP() {
        if (this.publicIP) return this.publicIP;

        return new Promise((resolve) => {
            https.get('https://api.ipify.org', { timeout: 5000 }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    this.publicIP = data.trim();
                    resolve(this.publicIP);
                });
            }).on('error', () => {
                // Fallback: lấy IP local
                const nets = os.networkInterfaces();
                for (const name of Object.keys(nets)) {
                    for (const net of nets[name]) {
                        if (net.family === 'IPv4' && !net.internal) {
                            this.publicIP = net.address;
                            resolve(this.publicIP);
                            return;
                        }
                    }
                }
                this.publicIP = 'localhost';
                resolve(this.publicIP);
            });
        });
    }

    /**
     * Lấy thông tin CPU
     */
    getCPUInfo() {
        const cpus = os.cpus();
        let cpuUsage = 0;

        cpus.forEach(cpu => {
            const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
            cpuUsage += ((total - cpu.times.idle) / total) * 100;
        });

        return {
            model: cpus[0]?.model || 'Unknown',
            cores: cpus.length,
            usage: Math.round(cpuUsage / cpus.length)
        };
    }

    /**
     * Lấy thông tin RAM
     */
    getMemoryInfo() {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        return {
            total: totalMem,
            used: usedMem,
            free: freeMem,
            percent: Math.round((usedMem / totalMem) * 100)
        };
    }

    /**
     * Lấy toàn bộ thông tin hệ thống
     */
    getSystemInfo(serverState) {
        return {
            cpu: this.getCPUInfo(),
            memory: this.getMemoryInfo(),
            uptime: os.uptime(),
            platform: os.platform(),
            hostname: os.hostname(),
            serverUptime: serverState.startTime 
                ? Math.floor((Date.now() - serverState.startTime) / 1000) 
                : 0,
            serverRunning: serverState.process !== null,
            players: serverState.players,
            playerPositions: serverState.positions,
            playerStats: serverState.stats,
            playerPlayTime: serverState.playTime,
            serverStats: serverState.serverStats,
            maxPlayers: config.minecraft.maxPlayers,
            dynmapUrl: config.dynmap.url
        };
    }

    /**
     * Format bytes sang đơn vị dễ đọc
     */
    static formatBytes(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Format thời gian
     */
    static formatTime(seconds) {
        if (!seconds) return '0 phút';
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) return `${days} ngày ${hours} giờ`;
        if (hours > 0) return `${hours} giờ ${minutes} phút`;
        return `${minutes} phút`;
    }
}

module.exports = new SystemMonitor();
