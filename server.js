/**
 * ============================================
 * MINECRAFT SERVER CONTROL PANEL v3.0
 * ============================================
 * Entry point - Khởi động server
 * 
 * Cấu trúc dự án:
 * ├── server.js          # Entry point
 * ├── config/
 * │   ├── index.js       # Cấu hình chính
 * │   └── items.js       # Danh sách vật phẩm
 * ├── modules/
 * │   ├── index.js       # Export modules
 * │   ├── systemMonitor.js    # Giám sát hệ thống
 * │   ├── playerManager.js    # Quản lý người chơi
 * │   ├── fileManager.js      # Quản lý file
 * │   ├── logParser.js        # Parse log Minecraft
 * │   ├── minecraftServer.js  # Quản lý MC server
 * │   ├── wsHandler.js        # WebSocket handler
 * │   └── httpRouter.js       # HTTP routes
 * └── public/
 *     └── index.html     # Giao diện web
 */

const http = require('http');
const config = require('./config');
const {
    systemMonitor,
    wsHandler,
    httpRouter
} = require('./modules');

// Tạo HTTP server
const server = http.createServer((req, res) => {
    httpRouter.handle(req, res);
});

// Khởi tạo WebSocket
wsHandler.init(server);

// Khởi động server
server.listen(config.server.port, config.server.host, async () => {
    const ip = await systemMonitor.getPublicIP();

    console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
    console.log('║              🎮 MINECRAFT SERVER CONTROL PANEL v3.0                   ║');
    console.log('╠════════════════════════════════════════════════════════════════════════╣');
    console.log(`║  📡 URL: http://${ip}:${config.server.port}`.padEnd(68) + '║');
    console.log(`║  🗺️  Dynmap: ${config.dynmap.url}`.padEnd(68) + '║');
    console.log(`║  📂 Work Dir: ${config.minecraft.workDir}`.padEnd(68) + '║');
    console.log(`║  🔐 Password: ${config.auth.password}`.padEnd(68) + '║');
    console.log(`║  📊 Player Stats: Đã bật`.padEnd(68) + '║');
    console.log('╚════════════════════════════════════════════════════════════════════════╝\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Đang dừng server...');
    wsHandler.destroy();
    server.close(() => {
        console.log('✅ Server đã dừng');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Nhận tín hiệu SIGTERM...');
    wsHandler.destroy();
    server.close(() => {
        process.exit(0);
    });
});

module.exports = server;
