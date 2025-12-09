/**
 * ============================================
 * MODULE PARSER LOG MINECRAFT
 * ============================================
 * Phân tích log để trích xuất thông tin
 */

const EventEmitter = require('events');

class LogParser extends EventEmitter {
    constructor() {
        super();
        this.patterns = this.initPatterns();
    }

    /**
     * Khởi tạo các pattern regex
     */
    initPatterns() {
        return {
            // Player join patterns
            playerJoin: [
                /(\w+)\[.*\] logged in/,
                /(\w+) joined the game/
            ],

            // Player leave patterns
            playerLeave: [
                /(\w+) left the game/,
                /(\w+) lost connection/
            ],

            // Player count from /list
            playerCount: /There are (\d+) of a max of (\d+) players online/,
            playerList: /online: (.+)/,

            // Position data
            position: /(\w+) has the following entity data:.*?(-?[\d.]+)d?,\s*(-?[\d.]+)d?,\s*(-?[\d.]+)d?/,

            // Teleport feedback
            teleportToPlayer: /Teleported (\w+) to (\w+)/,
            teleportToCoords: /Teleported (\w+) to (-?[\d.]+),?\s*(-?[\d.]+),?\s*(-?[\d.]+)/,

            // Dimension
            dimension: /(\w+).*Dimension:\s*"?minecraft:(\w+)"?/,

            // Death messages
            death: [
                /(\w+) was slain/,
                /(\w+) was killed/,
                /(\w+) drowned/,
                /(\w+) fell/,
                /(\w+) burned/,
                /(\w+) tried to swim in lava/,
                /(\w+) suffocated/,
                /(\w+) starved/,
                /(\w+) was blown up/,
                /(\w+) was shot/,
                /(\w+) withered/,
                /(\w+) was pricked/,
                /(\w+) walked into a cactus/,
                /(\w+) was roasted/,
                /(\w+) was impaled/,
                /(\w+) was squished/,
                /(\w+) experienced kinetic energy/,
                /(\w+) was poked/,
                /(\w+) was stung/,
                /(\w+) was squashed/
            ],

            // Kill messages (PvP)
            kill: [
                /(\w+) was slain by (\w+)/,
                /(\w+) was shot by (\w+)/,
                /(\w+) was killed by (\w+)/
            ],

            // Achievements
            achievement: /(\w+) has (made the advancement|completed the challenge) \[(.+)\]/,

            // Command usage
            command: /(\w+) issued server command:/,

            // Server warnings
            serverOverload: /Can't keep up!/,
            serverReady: /Done \(\d+\.\d+s\)!/,
            serverStopping: /Stopping server/
        };
    }

    /**
     * Parse một dòng log
     */
    parseLine(line) {
        const events = [];

        // Check player join
        for (const pattern of this.patterns.playerJoin) {
            const match = line.match(pattern);
            if (match) {
                events.push({
                    type: 'playerJoin',
                    player: match[1]
                });
                break;
            }
        }

        // Check player leave
        for (const pattern of this.patterns.playerLeave) {
            const match = line.match(pattern);
            if (match) {
                events.push({
                    type: 'playerLeave',
                    player: match[1]
                });
                break;
            }
        }

        // Check player count
        const countMatch = line.match(this.patterns.playerCount);
        if (countMatch) {
            events.push({
                type: 'playerCount',
                online: parseInt(countMatch[1]),
                max: parseInt(countMatch[2])
            });
        }

        // Check player list
        const listMatch = line.match(this.patterns.playerList);
        if (listMatch) {
            const players = listMatch[1].split(', ').filter(p => p.trim());
            events.push({
                type: 'playerList',
                players
            });
        }

        // Check position
        const posMatch = line.match(this.patterns.position);
        if (posMatch) {
            events.push({
                type: 'position',
                player: posMatch[1],
                x: parseFloat(posMatch[2]),
                y: parseFloat(posMatch[3]),
                z: parseFloat(posMatch[4])
            });
        }

        // Check teleport to player
        const tpPlayerMatch = line.match(this.patterns.teleportToPlayer);
        if (tpPlayerMatch && !line.match(this.patterns.teleportToCoords)) {
            events.push({
                type: 'teleport',
                player: tpPlayerMatch[1],
                target: tpPlayerMatch[2],
                targetType: 'player'
            });
        }

        // Check teleport to coords
        const tpCoordsMatch = line.match(this.patterns.teleportToCoords);
        if (tpCoordsMatch) {
            events.push({
                type: 'teleport',
                player: tpCoordsMatch[1],
                x: parseFloat(tpCoordsMatch[2]),
                y: parseFloat(tpCoordsMatch[3]),
                z: parseFloat(tpCoordsMatch[4]),
                targetType: 'coords'
            });
        }

        // Check dimension
        const dimMatch = line.match(this.patterns.dimension);
        if (dimMatch) {
            events.push({
                type: 'dimension',
                player: dimMatch[1],
                world: dimMatch[2]
            });
        }

        // Check deaths
        for (const pattern of this.patterns.death) {
            const match = line.match(pattern);
            if (match) {
                events.push({
                    type: 'death',
                    player: match[1],
                    message: match[0]
                });
                break;
            }
        }

        // Check kills (PvP)
        for (const pattern of this.patterns.kill) {
            const match = line.match(pattern);
            if (match) {
                events.push({
                    type: 'kill',
                    victim: match[1],
                    killer: match[2]
                });
                break;
            }
        }

        // Check achievements
        const advMatch = line.match(this.patterns.achievement);
        if (advMatch) {
            events.push({
                type: 'achievement',
                player: advMatch[1],
                achievement: advMatch[3]
            });
        }

        // Check command usage
        const cmdMatch = line.match(this.patterns.command);
        if (cmdMatch) {
            events.push({
                type: 'command',
                player: cmdMatch[1]
            });
        }

        // Check server status
        if (this.patterns.serverOverload.test(line)) {
            events.push({ type: 'serverOverload' });
        }

        if (this.patterns.serverReady.test(line)) {
            events.push({ type: 'serverReady' });
        }

        if (this.patterns.serverStopping.test(line)) {
            events.push({ type: 'serverStopping' });
        }

        // Emit các events
        events.forEach(event => {
            this.emit(event.type, event);
            this.emit('any', event);
        });

        return events;
    }

    /**
     * Phân loại log level
     */
    getLogLevel(line) {
        if (line.includes('[ERROR]') || line.includes('ERROR')) return 'stderr';
        if (line.includes('[WARN]') || line.includes('WARN')) return 'warn';
        if (line.includes('[INFO]') || line.includes('INFO')) return 'info';
        return 'stdout';
    }

    /**
     * Thêm pattern mới
     */
    addPattern(name, pattern) {
        this.patterns[name] = pattern;
    }

    /**
     * Xóa pattern
     */
    removePattern(name) {
        delete this.patterns[name];
    }
}

module.exports = new LogParser();
