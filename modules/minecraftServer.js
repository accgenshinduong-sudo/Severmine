/**
 * ============================================
 * MODULE QUẢN LÝ MINECRAFT SERVER PROCESS
 * ============================================
 * Khởi động, dừng, restart server
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const config = require('../config');
const logParser = require('./logParser');
const playerManager = require('./playerManager');

class MinecraftServer extends EventEmitter {
    constructor() {
        super();
        this.process = null;
        this.startTime = null;
        this.status = 'offline'; // offline, starting, online, stopping
        this.commandHistory = [];
        this.serverStats = {
            tps: 20,
            mspt: 0,
            loadedChunks: 0,
            entities: 0
        };
        this.announcements = [];

        // Lắng nghe events từ logParser
        this.setupLogParserListeners();
    }

    /**
     * Setup listeners cho logParser
     */
    setupLogParserListeners() {
        logParser.on('playerJoin', (data) => {
            if (playerManager.addPlayer(data.player)) {
                this.emit('notification', 'info', `${data.player} đã tham gia server`);
            }
        });

        logParser.on('playerLeave', (data) => {
            if (playerManager.removePlayer(data.player)) {
                this.emit('notification', 'warn', `${data.player} đã rời server`);
            }
        });

        logParser.on('playerList', (data) => {
            playerManager.syncPlayerList(data.players);
        });

        logParser.on('position', (data) => {
            playerManager.updatePosition(data.player, data.x, data.y, data.z);
        });

        logParser.on('dimension', (data) => {
            playerManager.updateWorld(data.player, data.world);
        });

        logParser.on('death', (data) => {
            playerManager.recordDeath(data.player);
            this.emit('notification', 'warn', `💀 ${data.message}`);
        });

        logParser.on('kill', (data) => {
            playerManager.recordKill(data.killer);
        });

        logParser.on('achievement', (data) => {
            playerManager.recordAchievement(data.player, data.achievement);
            this.emit('notification', 'success', `🏆 ${data.player} đạt: ${data.achievement}`);
        });

        logParser.on('command', (data) => {
            playerManager.recordCommand(data.player);
        });

        logParser.on('serverOverload', () => {
            this.emit('notification', 'error', 'Server đang quá tải!');
        });

        logParser.on('serverReady', () => {
            this.status = 'online';
            this.emit('statusChange', 'online');
            this.emit('notification', 'success', '✅ Server đã sẵn sàng!');
            // Lấy danh sách người chơi
            setTimeout(() => this.sendCommand('list'), 1000);
        });

        logParser.on('teleport', (data) => {
            if (data.targetType === 'player') {
                this.emit('notification', 'info', `📍 ${data.player} đã dịch chuyển đến ${data.target}`);
            } else {
                this.emit('notification', 'info', `📍 ${data.player} đã dịch chuyển đến ${data.x}, ${data.y}, ${data.z}`);
                playerManager.updatePosition(data.player, data.x, data.y, data.z);
            }
        });
    }

    /**
     * Kiểm tra server có đang chạy không
     */
    isRunning() {
        return this.process !== null;
    }

    /**
     * Lấy trạng thái hiện tại
     */
    getStatus() {
        return this.status;
    }

    /**
     * Lấy state để gửi qua WebSocket
     */
    getState() {
        return {
            process: this.process,
            startTime: this.startTime,
            players: playerManager.players,
            positions: playerManager.positions,
            stats: playerManager.stats,
            playTime: playerManager.playTime,
            serverStats: this.serverStats,
            announcements: this.announcements
        };
    }

    /**
     * Thêm log
     */
    addLog(level, text) {
        const log = {
            level,
            text,
            timestamp: new Date().toISOString()
        };

        this.commandHistory.push(log);
        if (this.commandHistory.length > config.console.maxHistory) {
            this.commandHistory.shift();
        }

        this.emit('log', log);

        // Parse log để trích xuất thông tin
        logParser.parseLine(text);
    }

    /**
     * Khởi động server
     */
    start() {
        if (this.process) {
            this.addLog('warn', '⚠️ Server đang chạy!');
            return false;
        }

        const workDir = config.minecraft.workDir;
        const startMode = config.minecraft.startMode || 'script';

        if (!fs.existsSync(workDir)) {
            this.addLog('error', `❌ Thư mục ${workDir} không tồn tại!`);
            return false;
        }

        let spawnCmd, spawnArgs;

        if (startMode === 'java') {
            // Chế độ Java trực tiếp
            const jarFile = config.minecraft.jarFile || 'server.jar';
            const jarPath = path.join(workDir, jarFile);

            if (!fs.existsSync(jarPath)) {
                this.addLog('error', `❌ Không tìm thấy ${jarFile}!`);
                return false;
            }

            const javaPath = config.minecraft.javaPath || 'java';
            const minMem = config.minecraft.minMemory || '2G';
            const maxMem = config.minecraft.maxMemory || '6G';
            const jvmArgs = config.minecraft.jvmArgs || '';

            spawnCmd = javaPath;
            spawnArgs = [
                `-Xms${minMem}`,
                `-Xmx${maxMem}`,
                ...jvmArgs.split(' ').filter(a => a),
                '-jar',
                jarFile,
                'nogui'
            ];

            this.addLog('info', `🚀 Khởi động: ${javaPath} -Xms${minMem} -Xmx${maxMem} ... -jar ${jarFile} nogui`);
        } else {
            // Chế độ Script (mặc định)
            const startScript = config.minecraft.startScript || 'run.sh';

            if (!fs.existsSync(path.join(workDir, startScript))) {
                this.addLog('error', `❌ Không tìm thấy ${startScript}!`);
                return false;
            }

            spawnCmd = 'bash';
            spawnArgs = [startScript];
            this.addLog('info', `🚀 Khởi động: bash ${startScript}`);
        }

        this.status = 'starting';
        this.emit('statusChange', 'starting');
        this.emit('notification', 'info', '🚀 Server đang khởi động...');

        // Reset player data
        playerManager.reset();

        // Spawn process
        this.process = spawn(spawnCmd, spawnArgs, {
            cwd: workDir,
            env: { ...process.env, FORCE_COLOR: '1' },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        this.startTime = Date.now();

        // Handle stdout
        this.process.stdout.on('data', (data) => {
            const lines = data.toString().split('\n').filter(l => l.trim());
            lines.forEach(line => this.addLog('stdout', line));
        });

        // Handle stderr
        this.process.stderr.on('data', (data) => {
            const lines = data.toString().split('\n').filter(l => l.trim());
            lines.forEach(line => this.addLog('stderr', line));
        });

        // Handle close
        this.process.on('close', (code) => {
            this.addLog('info', '━'.repeat(40));
            this.addLog(code === 0 ? 'success' : 'error',
                `${code === 0 ? '✅' : '❌'} Server đã dừng (code: ${code})`
            );

            this.status = 'offline';
            this.emit('statusChange', 'offline');
            this.emit('notification', code === 0 ? 'success' : 'error',
                `Server đã dừng (code: ${code})`
            );

            this.process = null;
            this.startTime = null;
            playerManager.reset();

            this.emit('playerUpdate', playerManager.getUpdateData());
        });

        // Handle error
        this.process.on('error', (err) => {
            this.addLog('error', `❌ Lỗi: ${err.message}`);
            this.status = 'offline';
            this.emit('statusChange', 'offline');
            this.emit('notification', 'error', `Lỗi: ${err.message}`);

            this.process = null;
            this.startTime = null;
        });

        // Set timeout để đánh dấu server ready (backup nếu không detect được)
        setTimeout(() => {
            if (this.process && this.status === 'starting') {
                this.status = 'online';
                this.emit('statusChange', 'online');
                this.addLog('success', '✅ Server đã sẵn sàng!');
                this.sendCommand('list');
            }
        }, config.minecraft.startupDelay);

        return true;
    }

    /**
     * Dừng server an toàn
     */
    stop() {
        if (!this.process) {
            this.addLog('warn', '⚠️ Server không chạy!');
            return false;
        }

        this.addLog('warn', '🛑 Đang dừng server...');
        this.status = 'stopping';
        this.emit('statusChange', 'stopping');
        this.emit('notification', 'warn', '🛑 Server đang dừng...');

        // Lưu world trước khi dừng
        if (this.process.stdin) {
            this.process.stdin.write('save-all\n');
            setTimeout(() => {
                if (this.process && this.process.stdin) {
                    this.process.stdin.write('stop\n');
                }
            }, 2000);
        }

        // Force kill nếu không dừng sau timeout
        setTimeout(() => {
            if (this.process) {
                this.process.kill('SIGTERM');
            }
        }, config.minecraft.shutdownTimeout);

        return true;
    }

    /**
     * Buộc dừng server
     */
    kill() {
        if (!this.process) {
            this.addLog('warn', '⚠️ Server không chạy!');
            return false;
        }

        this.addLog('error', '💀 Buộc dừng server!');
        this.emit('notification', 'error', '💀 Buộc dừng server!');
        this.process.kill('SIGKILL');
        return true;
    }

    /**
     * Restart server
     */
    restart() {
        this.addLog('info', '🔄 Đang restart server...');
        this.emit('notification', 'info', '🔄 Đang restart server...');

        if (this.process) {
            this.process.once('close', () => {
                setTimeout(() => this.start(), 3000);
            });
            this.stop();
        } else {
            this.start();
        }
    }

    /**
     * Gửi lệnh đến server
     */
    sendCommand(command) {
        if (!this.process || !this.process.stdin) {
            this.addLog('warn', '⚠️ Server không chạy!');
            return false;
        }

        this.addLog('command', `> ${command}`);
        this.process.stdin.write(command + '\n');
        return true;
    }

    /**
     * Yêu cầu vị trí tất cả người chơi
     */
    requestPlayerPositions() {
        if (!this.process || !this.process.stdin) return;

        playerManager.players.forEach(player => {
            this.process.stdin.write(`data get entity ${player} Pos\n`);
        });
    }

    /**
     * Broadcast tin nhắn
     */
    broadcastMessage(message) {
        const msg = message.replace(/"/g, '\\"');
        this.sendCommand(`tellraw @a {"text":"[📢] ${msg}","color":"gold"}`);
        this.sendCommand(`title @a title {"text":"📢","color":"gold"}`);
        this.sendCommand(`title @a subtitle {"text":"${msg}","color":"yellow"}`);
        this.emit('notification', 'success', `📢 Đã gửi: ${message}`);
    }

    /**
     * Cho vật phẩm
     */
    giveItem(player, item, amount = 1) {
        this.sendCommand(`give ${player} ${item} ${amount}`);
        this.emit('notification', 'success', `🎁 Đã cho ${player} x${amount} ${item}`);
    }

    /**
     * Thêm announcement
     */
    addAnnouncement(text, type = 'info') {
        const announcement = {
            id: Date.now(),
            text,
            type,
            time: new Date().toISOString()
        };
        this.announcements.push(announcement);
        if (this.announcements.length > 10) {
            this.announcements.shift();
        }
        this.emit('announcementsUpdate', this.announcements);
        return announcement;
    }

    /**
     * Xóa announcement
     */
    removeAnnouncement(id) {
        this.announcements = this.announcements.filter(a => a.id !== id);
        this.emit('announcementsUpdate', this.announcements);
    }

    /**
     * Clear command history
     */
    clearHistory() {
        this.commandHistory = [];
        this.emit('clear');
    }

    /**
     * Lấy command history
     */
    getHistory(limit = 200) {
        return this.commandHistory.slice(-limit);
    }
}

module.exports = new MinecraftServer();
