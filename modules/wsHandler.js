/**
 * ============================================
 * MODULE WEBSOCKET HANDLER
 * ============================================
 * Quản lý kết nối WebSocket và xử lý messages
 */

const { WebSocketServer } = require('ws');
const config = require('../config');
const systemMonitor = require('./systemMonitor');
const minecraftServer = require('./minecraftServer');
const playerManager = require('./playerManager');
const fileManager = require('./fileManager');
const uploadManager = require('./uploadManager');
const items = require('../config/items');

class WebSocketHandler {
    constructor() {
        this.wss = null;
        this.clients = new Set();
        this.intervals = [];
    }

    /**
     * Khởi tạo WebSocket server
     */
    init(httpServer) {
        this.wss = new WebSocketServer({ server: httpServer });

        this.wss.on('connection', (ws) => this.handleConnection(ws));

        // Setup event listeners từ minecraftServer
        this.setupMinecraftListeners();

        // Setup event listeners từ playerManager
        this.setupPlayerListeners();

        // Setup intervals
        this.setupIntervals();

        return this.wss;
    }

    /**
     * Xử lý kết nối mới
     */
    handleConnection(ws) {
        ws.isAuthenticated = false;

        // Yêu cầu đăng nhập
        this.send(ws, { type: 'auth_required' });

        ws.on('message', (message) => this.handleMessage(ws, message));

        ws.on('close', () => {
            this.clients.delete(ws);
        });

        ws.on('error', (err) => {
            console.error('WebSocket error:', err);
            this.clients.delete(ws);
        });
    }

    /**
     * Xử lý message từ client
     */
    async handleMessage(ws, message) {
        try {
            const data = JSON.parse(message);

            // Xử lý xác thực
            if (data.action === 'auth') {
                if (data.password === config.auth.password) {
                    ws.isAuthenticated = true;
                    this.clients.add(ws);
                    console.log(`[${new Date().toLocaleTimeString()}] ✅ Client authenticated`);

                    this.send(ws, { type: 'auth_success' });
                    this.sendInitData(ws);
                } else {
                    this.send(ws, { type: 'auth_failed' });
                }
                return;
            }

            // Các action khác yêu cầu xác thực
            if (!ws.isAuthenticated) return;

            // Router các actions
            await this.routeAction(ws, data);
        } catch (err) {
            console.error('Error handling message:', err);
        }
    }

    /**
     * Route action đến handler tương ứng
     */
    async routeAction(ws, data) {
        const handlers = {
            // Server control
            'start': () => minecraftServer.start(),
            'stop': () => minecraftServer.stop(),
            'restart': () => minecraftServer.restart(),
            'kill': () => minecraftServer.kill(),
            'command': () => minecraftServer.sendCommand(data.command),
            'clear': () => minecraftServer.clearHistory(),

            // System
            'get_system': () => {
                this.send(ws, {
                    type: 'system',
                    data: systemMonitor.getSystemInfo(minecraftServer.getState())
                });
            },

            // Files
            'get_files': () => {
                const result = fileManager.getFiles(data.path || '');
                this.send(ws, {
                    type: 'files',
                    path: data.path || '',
                    files: Array.isArray(result) ? result : [],
                    error: result.error
                });
            },
            'read_file': () => {
                const result = fileManager.readFile(data.path);
                this.send(ws, {
                    type: 'file_content',
                    path: data.path,
                    ...result
                });
            },
            'write_file': () => {
                const result = fileManager.writeFile(data.path, data.content);
                this.send(ws, {
                    type: 'file_saved',
                    path: data.path,
                    ...result
                });
            },
            'delete_file': () => {
                const result = fileManager.deleteFile(data.path);
                this.send(ws, {
                    type: 'file_deleted',
                    path: data.path,
                    ...result
                });
            },
            'create_folder': () => {
                const result = fileManager.createFolder(data.path);
                this.send(ws, {
                    type: 'folder_created',
                    path: data.path,
                    ...result
                });
            },

            // Players
            'get_positions': () => minecraftServer.requestPlayerPositions(),
            'get_player_stats': () => {
                if (data.player) {
                    this.send(ws, {
                        type: 'player_stats',
                        player: data.player,
                        stats: playerManager.stats[data.player] || { deaths: 0, kills: 0, playTime: 0 }
                    });
                }
            },
            'teleport_player': () => {
                if (data.fromPlayer && data.toPlayer && data.fromPlayer !== data.toPlayer) {
                    minecraftServer.sendCommand(`tp ${data.fromPlayer} ${data.toPlayer}`);
                }
            },

            // Broadcast
            'broadcast_msg': () => {
                if (data.message) {
                    minecraftServer.broadcastMessage(data.message);
                }
            },

            // Announcements
            'add_announcement': () => {
                if (data.text) {
                    minecraftServer.addAnnouncement(data.text, data.type);
                }
            },
            'remove_announcement': () => {
                minecraftServer.removeAnnouncement(data.id);
            },

            // Items
            'give_item': () => {
                if (data.player && data.item) {
                    minecraftServer.giveItem(data.player, data.item, data.amount || 1);
                }
            },

            // Dynmap
            'get_dynmap_info': () => {
                this.send(ws, {
                    type: 'dynmap_info',
                    url: config.dynmap.url
                });
            },

            // Upload files
            'upload_file': () => {
                if (data.type && data.filename && data.data) {
                    const result = uploadManager.saveFile(data.type, data.filename, data.data);
                    this.send(ws, {
                        type: 'upload_result',
                        ...result
                    });
                    if (result.success) {
                        this.broadcast({
                            type: 'notification',
                            level: 'success',
                            message: `Đã upload ${result.filename}`
                        });
                    }
                }
            },
            'list_uploads': () => {
                const uploadType = data.type || 'mods';
                const result = uploadManager.listFiles(uploadType);
                this.send(ws, {
                    type: 'upload_list',
                    uploadType,
                    ...result
                });
            },
            'delete_upload': () => {
                if (data.type && data.filename) {
                    const result = uploadManager.deleteFile(data.type, data.filename);
                    this.send(ws, {
                        type: 'delete_result',
                        ...result
                    });
                    if (result.success) {
                        this.broadcast({
                            type: 'notification',
                            level: 'info',
                            message: result.message
                        });
                    }
                }
            },
            'get_upload_info': () => {
                this.send(ws, {
                    type: 'upload_info',
                    info: uploadManager.getUploadInfo()
                });
            }
        };

        const handler = handlers[data.action];
        if (handler) {
            await handler();
        }
    }

    /**
     * Gửi dữ liệu khởi tạo cho client mới
     */
    sendInitData(ws) {
        const state = minecraftServer.getState();

        this.send(ws, {
            type: 'init',
            serverName: config.minecraft.serverName,
            workDir: config.minecraft.workDir,
            dynmapUrl: config.dynmap.url,
            system: systemMonitor.getSystemInfo(state),
            serverRunning: minecraftServer.isRunning(),
            players: playerManager.players,
            positions: playerManager.positions,
            playerStats: playerManager.stats,
            items: items,
            announcements: minecraftServer.announcements
        });

        // Gửi command history
        minecraftServer.getHistory().forEach(log => {
            this.send(ws, { type: 'log', ...log });
        });

        // Nếu server đang chạy, request danh sách người chơi
        if (minecraftServer.isRunning()) {
            setTimeout(() => minecraftServer.sendCommand('list'), 1000);
        }
    }

    /**
     * Setup listeners từ minecraftServer
     */
    setupMinecraftListeners() {
        minecraftServer.on('log', (log) => {
            this.broadcast({ type: 'log', ...log });
        });

        minecraftServer.on('statusChange', (status) => {
            this.broadcast({
                type: 'status',
                running: minecraftServer.isRunning(),
                status
            });
        });

        minecraftServer.on('notification', (level, message) => {
            this.broadcast({
                type: 'notification',
                level,
                message
            });
        });

        minecraftServer.on('clear', () => {
            this.broadcast({ type: 'clear' });
        });

        minecraftServer.on('announcementsUpdate', (announcements) => {
            this.broadcast({
                type: 'announcements_update',
                announcements
            });
        });

        minecraftServer.on('playerUpdate', (data) => {
            this.broadcast({
                type: 'player_update',
                ...data
            });
        });
    }

    /**
     * Setup listeners từ playerManager
     */
    setupPlayerListeners() {
        playerManager.on('update', () => {
            this.broadcast({
                type: 'player_update',
                ...playerManager.getUpdateData()
            });
        });

        playerManager.on('positionUpdate', (player, position) => {
            this.broadcast({
                type: 'position_update',
                player,
                position
            });
        });

        playerManager.on('playerDeath', (player, stats) => {
            this.broadcast({
                type: 'player_stats_update',
                player,
                stats,
                event: 'death'
            });
        });

        playerManager.on('playerKill', (player, stats) => {
            this.broadcast({
                type: 'player_stats_update',
                player,
                stats,
                event: 'kill'
            });
        });

        playerManager.on('playerAchievement', (player, achievement) => {
            this.broadcast({
                type: 'player_stats_update',
                player,
                stats: playerManager.stats[player],
                event: 'achievement'
            });
        });
    }

    /**
     * Setup intervals cho cập nhật định kỳ
     */
    setupIntervals() {
        // Cập nhật system info
        const sysInterval = setInterval(() => {
            this.broadcast({
                type: 'system',
                data: systemMonitor.getSystemInfo(minecraftServer.getState())
            });
        }, config.monitoring.systemUpdateInterval);

        // Cập nhật vị trí người chơi
        const posInterval = setInterval(() => {
            if (minecraftServer.isRunning() && playerManager.players.length > 0) {
                minecraftServer.requestPlayerPositions();
            }
        }, config.monitoring.positionUpdateInterval);

        // Cập nhật thời gian chơi
        const playTimeInterval = setInterval(() => {
            playerManager.updatePlayTimes();
        }, config.monitoring.playTimeUpdateInterval);

        this.intervals.push(sysInterval, posInterval, playTimeInterval);
    }

    /**
     * Gửi message đến một client
     */
    send(ws, data) {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify(data));
        }
    }

    /**
     * Broadcast message đến tất cả clients đã xác thực
     */
    broadcast(data) {
        const msg = JSON.stringify(data);
        this.clients.forEach(client => {
            if (client.readyState === 1 && client.isAuthenticated) {
                client.send(msg);
            }
        });
    }

    /**
     * Cleanup
     */
    destroy() {
        this.intervals.forEach(interval => clearInterval(interval));
        this.clients.clear();
        if (this.wss) {
            this.wss.close();
        }
    }
}

module.exports = new WebSocketHandler();
