/**
 * ============================================
 * MODULE QUẢN LÝ NGƯỜI CHƠI
 * ============================================
 * Theo dõi người chơi, vị trí, thống kê
 */

const EventEmitter = require('events');

class PlayerManager extends EventEmitter {
    constructor() {
        super();
        this.players = [];
        this.positions = {};
        this.stats = {};
        this.playTime = {};
        this.joinTimes = {};
    }

    /**
     * Reset tất cả dữ liệu người chơi
     */
    reset() {
        this.players = [];
        this.positions = {};
        // Giữ lại stats để lưu thông tin lâu dài
    }

    /**
     * Thêm người chơi mới
     */
    addPlayer(name) {
        if (!name || this.players.includes(name)) return false;

        this.players.push(name);
        this.positions[name] = {
            x: 0, y: 64, z: 0,
            world: 'overworld',
            health: 20,
            food: 20,
            gamemode: 'survival'
        };

        // Khởi tạo hoặc cập nhật stats
        if (!this.stats[name]) {
            this.stats[name] = {
                deaths: 0,
                kills: 0,
                playTime: 0,
                firstJoin: Date.now(),
                lastJoin: Date.now(),
                joinCount: 1,
                achievements: [],
                commandsUsed: 0
            };
        } else {
            this.stats[name].lastJoin = Date.now();
            this.stats[name].joinCount++;
        }

        this.joinTimes[name] = Date.now();

        this.emit('playerJoin', name);
        this.emit('update');
        return true;
    }

    /**
     * Xóa người chơi
     */
    removePlayer(name) {
        if (!name) return false;

        const index = this.players.indexOf(name);
        if (index === -1) return false;

        this.players.splice(index, 1);
        delete this.positions[name];

        // Cập nhật thời gian chơi
        if (this.joinTimes[name]) {
            const sessionTime = Math.floor((Date.now() - this.joinTimes[name]) / 1000);
            if (this.stats[name]) {
                this.stats[name].playTime += sessionTime;
            }
            delete this.joinTimes[name];
        }

        this.emit('playerLeave', name);
        this.emit('update');
        return true;
    }

    /**
     * Cập nhật vị trí người chơi
     */
    updatePosition(name, x, y, z, world = null) {
        if (!this.positions[name]) return false;

        this.positions[name].x = Math.round(x);
        this.positions[name].y = Math.round(y);
        this.positions[name].z = Math.round(z);
        if (world) this.positions[name].world = world;

        this.emit('positionUpdate', name, this.positions[name]);
        return true;
    }

    /**
     * Cập nhật world/dimension
     */
    updateWorld(name, world) {
        if (!this.positions[name]) return false;
        this.positions[name].world = world;
        return true;
    }

    /**
     * Ghi nhận người chơi chết
     */
    recordDeath(name) {
        if (!this.stats[name]) return false;
        this.stats[name].deaths++;
        this.emit('playerDeath', name, this.stats[name]);
        return true;
    }

    /**
     * Ghi nhận người chơi giết người khác
     */
    recordKill(killerName) {
        if (!this.stats[killerName]) return false;
        this.stats[killerName].kills++;
        this.emit('playerKill', killerName, this.stats[killerName]);
        return true;
    }

    /**
     * Ghi nhận achievement
     */
    recordAchievement(name, achievement) {
        if (!this.stats[name]) return false;
        if (!this.stats[name].achievements) {
            this.stats[name].achievements = [];
        }
        if (!this.stats[name].achievements.includes(achievement)) {
            this.stats[name].achievements.push(achievement);
            this.emit('playerAchievement', name, achievement);
        }
        return true;
    }

    /**
     * Ghi nhận lệnh được sử dụng
     */
    recordCommand(name) {
        if (!this.stats[name]) return false;
        this.stats[name].commandsUsed++;
        return true;
    }

    /**
     * Cập nhật danh sách người chơi từ lệnh /list
     */
    syncPlayerList(playerNames) {
        const newPlayers = playerNames.filter(p => p.trim());
        
        // Thêm người chơi mới
        newPlayers.forEach(name => {
            if (!this.players.includes(name)) {
                this.addPlayer(name);
            }
        });

        // Xóa người chơi không còn online
        this.players = this.players.filter(name => newPlayers.includes(name));
        
        // Cleanup positions
        Object.keys(this.positions).forEach(name => {
            if (!this.players.includes(name)) {
                delete this.positions[name];
            }
        });

        this.emit('update');
    }

    /**
     * Cập nhật thời gian chơi (gọi định kỳ)
     */
    updatePlayTimes() {
        const now = Date.now();
        for (const player in this.joinTimes) {
            const sessionTime = Math.floor((now - this.joinTimes[player]) / 1000);
            if (this.stats[player]) {
                this.stats[player].playTime += sessionTime;
                this.joinTimes[player] = now;
            }
        }
    }

    /**
     * Lấy dữ liệu để gửi qua WebSocket
     */
    getUpdateData() {
        return {
            players: this.players,
            positions: this.positions,
            stats: this.stats
        };
    }

    /**
     * Lấy số người chơi online
     */
    getOnlineCount() {
        return this.players.length;
    }

    /**
     * Format thời gian chơi
     */
    static formatPlayTime(seconds) {
        if (!seconds) return '0 phút';
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) return `${days} ngày ${hours} giờ`;
        if (hours > 0) return `${hours} giờ ${minutes} phút`;
        return `${minutes} phút`;
    }
}

module.exports = new PlayerManager();
