/**
 * ============================================
 * MINECRAFT PANEL - APP CORE
 * ============================================
 * Quản lý state và WebSocket connection
 */

// ==================== STATE ====================
const AppState = {
    ws: null,
    auth: false,
    running: false,
    players: [],
    positions: {},
    items: {},
    currentPath: '',
    editingFile: '',
    selectedItem: null,
    dynmapUrl: 'http://localhost:8123'
};

// ==================== WEBSOCKET ====================
const WS = {
    connect() {
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        AppState.ws = new WebSocket(`${protocol}//${location.host}`);
        
        AppState.ws.onopen = () => {
            console.log('✅ WebSocket connected');
            document.getElementById('disconnectOverlay').classList.add('hidden');
        };
        AppState.ws.onclose = () => {
            AppState.auth = false;
            document.getElementById('disconnectOverlay').classList.remove('hidden');
            setTimeout(() => WS.connect(), 3000);
        };
        AppState.ws.onmessage = (e) => WS.handleMessage(JSON.parse(e.data));
    },

    send(data) {
        if (AppState.ws && AppState.ws.readyState === 1) {
            AppState.ws.send(JSON.stringify(data));
        }
    },

    handleMessage(data) {
        const handlers = {
            'auth_required': () => UI.showLogin(),
            'auth_success': () => {
                AppState.auth = true;
                UI.hideLogin();
            },
            'auth_failed': () => UI.showLoginError(),
            'init': (d) => App.handleInit(d),
            'status': (d) => App.handleStatus(d),
            'system': (d) => App.updateSystem(d.data),
            'log': (d) => Console.addLog(d),
            'clear': () => Console.clear(),
            'files': (d) => Files.render(d.path, d.files),
            'file_content': (d) => d.error ? UI.toast(d.error, 'error') : Files.openEditor(d.path, d.content),
            'file_saved': (d) => d.success ? (UI.toast('Đã lưu!', 'success'), Files.closeEditor()) : UI.toast(d.error, 'error'),
            'player_update': (d) => Players.update(d),
            'position_update': (d) => {
                Players.updatePosition(d.player, d.position);
                // Cập nhật coordinate map
                if (typeof CoordMap !== 'undefined' && CoordMap.canvas) {
                    CoordMap.updatePlayer(d.player, d.position);
                }
            },
            'notification': (d) => UI.toast(d.message, d.level),
            // Upload handlers
            'upload_info': (d) => Upload.renderUploadInfo(d.info),
            'upload_list': (d) => Upload.renderFileList(d.files || []),
            'upload_result': (d) => Upload.handleUploadResult(d),
            'delete_result': (d) => Upload.handleDeleteResult(d)
        };

        const handler = handlers[data.type];
        if (handler) handler(data);
    }
};

// ==================== APP ====================
const App = {
    init() {
        WS.connect();
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Login
        document.getElementById('loginBtn').onclick = Auth.authenticate;
        document.getElementById('loginPass').onkeypress = (e) => {
            if (e.key === 'Enter') Auth.authenticate();
        };

        // Navigation
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.onclick = () => {
                const page = nav.dataset.page;
                if (page === 'more') {
                    UI.showModal('moreModal');
                } else {
                    Navigation.switchPage(page);
                }
            };
        });

        // Header buttons
        document.getElementById('btnStart').onclick = () => WS.send({ action: 'start' });
        document.getElementById('btnStop').onclick = () => WS.send({ action: 'stop' });
        document.getElementById('btnRestart').onclick = () => WS.send({ action: 'restart' });

        // Console
        document.getElementById('consoleInput').onkeypress = (e) => {
            if (e.key === 'Enter') Console.send();
        };

        // Header scroll effect
        window.addEventListener('scroll', () => {
            const header = document.getElementById('header');
            header.classList.toggle('scrolled', window.scrollY > 10);
        });
    },

    handleInit(data) {
        document.getElementById('serverName').textContent = data.serverName;
        document.getElementById('infoDir').textContent = data.workDir;
        
        this.updateSystem(data.system);
        AppState.running = data.serverRunning;
        UI.updateStatus(AppState.running ? 'online' : 'offline');
        
        if (data.players) AppState.players = data.players;
        if (data.positions) AppState.positions = data.positions;
        if (data.items) {
            AppState.items = data.items;
            Items.render();
        }
        
        Players.update({ players: AppState.players, positions: AppState.positions });
        Files.load('');

        // Khởi tạo Coordinate Map
        setTimeout(() => {
            if (typeof CoordMap !== 'undefined') {
                CoordMap.init();
                // Cập nhật vị trí người chơi lên map
                Object.entries(AppState.positions).forEach(([name, pos]) => {
                    CoordMap.updatePlayer(name, pos);
                });
            }
        }, 500);

        // Khởi tạo Upload
        if (typeof Upload !== 'undefined') {
            Upload.init();
            const dropzone = document.getElementById('uploadDropzone');
            if (dropzone) Upload.setupDragDrop(dropzone);
        }
    },

    handleStatus(data) {
        AppState.running = data.running;
        UI.updateStatus(data.status || (data.running ? 'online' : 'offline'));
    },

    updateSystem(sys) {
        if (!sys) return;
        
        document.getElementById('cpuUsage').textContent = sys.cpu.usage + '%';
        document.getElementById('cpuBar').style.width = sys.cpu.usage + '%';
        document.getElementById('memUsage').textContent = sys.memory.percent + '%';
        document.getElementById('memBar').style.width = sys.memory.percent + '%';
        document.getElementById('serverUptime').textContent = 
            sys.serverUptime > 0 ? Utils.formatTime(sys.serverUptime) : '--';
        
        document.getElementById('infoPlatform').textContent = sys.platform;
        document.getElementById('infoHostname').textContent = sys.hostname;
        document.getElementById('infoCores').textContent = sys.cpu.cores;
        document.getElementById('infoRAM').textContent = Utils.formatSize(sys.memory.total);
    }
};

// ==================== AUTH ====================
const Auth = {
    authenticate() {
        const password = document.getElementById('loginPass').value;
        WS.send({ action: 'auth', password });
    }
};

// ==================== UTILS ====================
const Utils = {
    formatTime(seconds) {
        const d = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (d > 0) return `${d}d ${h}h`;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    },

    formatSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
};

// ==================== COMMANDS ====================
function cmd(command) {
    if (command && command !== 'null' && !command.includes('null')) {
        WS.send({ action: 'command', command });
    }
}

function promptCmd(action) {
    const player = prompt('Nhập tên người chơi:');
    if (player) cmd(`${action} ${player}`);
}

function promptTp() {
    const from = prompt('Dịch chuyển ai:');
    const to = prompt('Đến đâu:');
    if (from && to) cmd(`tp ${from} ${to}`);
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => App.init());
