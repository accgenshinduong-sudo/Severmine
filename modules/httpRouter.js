/**
 * ============================================
 * MODULE HTTP ROUTES
 * ============================================
 * Xử lý các HTTP endpoints
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');
const systemMonitor = require('./systemMonitor');
const minecraftServer = require('./minecraftServer');
const items = require('../config/items');

class HttpRouter {
    constructor() {
        this.routes = new Map();
        this.setupRoutes();
    }

    /**
     * Setup các routes
     */
    setupRoutes() {
        // Trang chủ
        this.addRoute('GET', '/', (req, res) => {
            this.serveFile(res, 'public/index.html', 'text/html');
        });

        this.addRoute('GET', '/index.html', (req, res) => {
            this.serveFile(res, 'public/index.html', 'text/html');
        });

        // Static files
        this.addRoute('GET', '/css/*', (req, res) => {
            const file = req.url.replace('/css/', '');
            this.serveFile(res, `public/css/${file}`, 'text/css');
        });

        this.addRoute('GET', '/js/*', (req, res) => {
            const file = req.url.replace('/js/', '');
            this.serveFile(res, `public/js/${file}`, 'application/javascript');
        });

        // API endpoints
        this.addRoute('GET', '/api/system', (req, res) => {
            const data = systemMonitor.getSystemInfo(minecraftServer.getState());
            this.jsonResponse(res, data);
        });

        this.addRoute('GET', '/api/items', (req, res) => {
            this.jsonResponse(res, items);
        });

        this.addRoute('GET', '/api/dynmap', (req, res) => {
            this.jsonResponse(res, { url: config.dynmap.url });
        });

        this.addRoute('GET', '/api/players', (req, res) => {
            const playerManager = require('./playerManager');
            this.jsonResponse(res, {
                online: playerManager.players,
                positions: playerManager.positions,
                stats: playerManager.stats
            });
        });

        this.addRoute('GET', '/api/status', (req, res) => {
            this.jsonResponse(res, {
                running: minecraftServer.isRunning(),
                status: minecraftServer.getStatus(),
                uptime: minecraftServer.startTime
                    ? Math.floor((Date.now() - minecraftServer.startTime) / 1000)
                    : 0
            });
        });

        // Health check
        this.addRoute('GET', '/health', (req, res) => {
            this.jsonResponse(res, {
                status: 'ok',
                timestamp: new Date().toISOString()
            });
        });
    }

    /**
     * Thêm route
     */
    addRoute(method, path, handler) {
        const key = `${method}:${path}`;
        this.routes.set(key, { path, handler, isWildcard: path.includes('*') });
    }

    /**
     * Xử lý request
     */
    handle(req, res) {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // Handle preflight
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        // Tìm route phù hợp
        const url = req.url.split('?')[0]; // Loại bỏ query string
        const method = req.method;

        // Tìm exact match
        let route = this.routes.get(`${method}:${url}`);

        // Tìm wildcard match
        if (!route) {
            for (const [key, r] of this.routes) {
                if (r.isWildcard && key.startsWith(`${method}:`)) {
                    const pattern = r.path.replace('*', '');
                    if (url.startsWith(pattern)) {
                        route = r;
                        break;
                    }
                }
            }
        }

        if (route) {
            try {
                route.handler(req, res);
            } catch (err) {
                console.error('Route error:', err);
                this.errorResponse(res, 500, 'Internal Server Error');
            }
        } else {
            this.errorResponse(res, 404, 'Not Found');
        }
    }

    /**
     * Serve file tĩnh
     */
    serveFile(res, filePath, contentType) {
        const fullPath = path.join(__dirname, '..', filePath);

        if (!fs.existsSync(fullPath)) {
            this.errorResponse(res, 404, 'File Not Found');
            return;
        }

        res.writeHead(200, { 'Content-Type': `${contentType}; charset=utf-8` });
        fs.createReadStream(fullPath).pipe(res);
    }

    /**
     * JSON response
     */
    jsonResponse(res, data, statusCode = 200) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    }

    /**
     * Error response
     */
    errorResponse(res, statusCode, message) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: message }));
    }
}

module.exports = new HttpRouter();
