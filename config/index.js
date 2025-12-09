/**
 * ============================================
 * CẤU HÌNH CHÍNH - MINECRAFT SERVER PANEL
 * ============================================
 * File này chứa tất cả cấu hình có thể tùy chỉnh
 */

const crypto = require('crypto');

module.exports = {
    // Server HTTP
    server: {
        port: process.env.PORT || 3000,
        host: '0.0.0.0'
    },

    // Minecraft Server
    minecraft: {
        workDir: process.env.WORK_DIR || '/mine',
        serverName: process.env.SERVER_NAME || 'Minecraft Server',
        
        // === CÁCH 1: Dùng script (mặc định) ===
        // startScript: 'run.sh',
        
        // === CÁCH 2: Dùng lệnh Java trực tiếp ===
        javaPath: process.env.JAVA_PATH || 'java',
        jarFile: process.env.JAR_FILE || 'server.jar',
        minMemory: process.env.MIN_MEM || '2G',
        maxMemory: process.env.MAX_MEM || '6G',
        jvmArgs: process.env.JVM_ARGS || '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200',
        
        // Chọn chế độ: 'script' hoặc 'java'
        startMode: process.env.START_MODE || 'java',
        startScript: 'run.sh', // Dùng khi startMode = 'script'
        
        maxPlayers: 20,
        startupDelay: 10000, // ms chờ server khởi động
        shutdownTimeout: 20000 // ms chờ trước khi force kill
    },

    // Xác thực
    auth: {
        password: process.env.PASSWORD || '12022001A@',
        sessionSecret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex')
    },

    // Dynmap
    dynmap: {
        url: process.env.DYNMAP_URL || 'http://localhost:8123'
    },

    // Console
    console: {
        maxHistory: 1000,
        maxDisplayLines: 500
    },

    // System monitoring
    monitoring: {
        systemUpdateInterval: 2000, // ms
        positionUpdateInterval: 3000, // ms
        playTimeUpdateInterval: 60000 // ms
    },

    // Files
    files: {
        maxFileSize: 1024 * 1024, // 1MB
        editableExtensions: ['txt', 'json', 'yml', 'yaml', 'properties', 'log', 'cfg', 'conf', 'md']
    }
};
