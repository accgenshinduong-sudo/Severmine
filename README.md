# 🎮 Minecraft Server Control Panel v3.0

Web-based control panel để quản lý Minecraft Server với giao diện hiện đại, dễ sử dụng.

## 📁 Cấu Trúc Dự Án

```
minecraft-panel/
├── server.js              # Entry point - Khởi động server
├── package.json           # Dependencies
├── README.md              # Hướng dẫn
│
├── config/                # ⚙️ CẤU HÌNH
│   ├── index.js           # Cấu hình chính (port, password, paths...)
│   └── items.js           # Danh sách vật phẩm Minecraft
│
├── modules/               # 🔧 BACKEND MODULES
│   ├── index.js           # Export tất cả modules
│   ├── systemMonitor.js   # Giám sát CPU, RAM, uptime
│   ├── playerManager.js   # Quản lý người chơi, vị trí, stats
│   ├── fileManager.js     # Đọc/ghi file server
│   ├── logParser.js       # Parse log Minecraft (join, leave, death...)
│   ├── minecraftServer.js # Quản lý MC server process
│   ├── wsHandler.js       # WebSocket handler
│   └── httpRouter.js      # HTTP API routes
│
└── public/                # 🌐 FRONTEND
    ├── index.html         # Trang chính
    ├── css/
    │   ├── main.css       # Styles cơ bản
    │   ├── components.css # Players, Items, Map...
    │   └── utilities.css  # Navigation, Modal, Utils
    └── js/
        ├── app.js         # Core app & WebSocket
        ├── ui.js          # UI functions (toast, modal...)
        ├── console.js     # Console module
        ├── players.js     # Players module
        ├── items.js       # Items module
        ├── files.js       # File browser module
        ├── broadcast.js   # Broadcast module
        └── dynmap.js      # Dynmap integration
```

## 🚀 Cài Đặt

```bash
# Clone hoặc copy files
cd minecraft-panel

# Cài dependencies
npm install

# Chạy server
npm start

# Hoặc với nodemon (auto-reload)
npm run dev
```

## ⚙️ Cấu Hình

Chỉnh sửa file `config/index.js`:

```javascript
module.exports = {
    server: {
        port: 3000,           // Port web panel
        host: '0.0.0.0'
    },
    minecraft: {
        workDir: '/mine',     // Thư mục Minecraft server
        serverName: 'My Server',
        startScript: 'run.sh' // Script khởi động
    },
    auth: {
        password: 'your_password'
    },
    dynmap: {
        url: 'http://localhost:8123'
    }
};
```

Hoặc dùng environment variables:
```bash
PORT=3000
WORK_DIR=/path/to/minecraft
SERVER_NAME="My Minecraft Server"
PASSWORD=secret123
DYNMAP_URL=http://localhost:8123
```

## 🔌 Thêm Tính Năng Mới

### Thêm vật phẩm mới

Chỉnh sửa `config/items.js`:

```javascript
module.exports = {
    // Thêm category mới
    '🧪 Thuốc': [
        { id: 'potion', name: 'Thuốc', icon: '🧪' },
        { id: 'splash_potion', name: 'Thuốc Ném', icon: '💥' }
    ]
};
```

### Thêm module backend mới

1. Tạo file trong `modules/`:
```javascript
// modules/myModule.js
class MyModule {
    doSomething() {
        // ...
    }
}
module.exports = new MyModule();
```

2. Export trong `modules/index.js`:
```javascript
module.exports = {
    // ...existing
    myModule: require('./myModule')
};
```

3. Sử dụng trong `wsHandler.js`:
```javascript
const { myModule } = require('./modules');

// Trong routeAction
'my_action': () => myModule.doSomething()
```

### Thêm module frontend mới

1. Tạo file trong `public/js/`:
```javascript
// public/js/myFeature.js
const MyFeature = {
    init() { /* ... */ },
    render() { /* ... */ }
};
```

2. Import trong `public/index.html`:
```html
<script src="js/myFeature.js"></script>
```

### Thêm trang mới

1. Thêm HTML trong `public/index.html`:
```html
<div class="page" id="page-mypage">
    <h2 class="page-title">...</h2>
    <!-- Content -->
</div>
```

2. Thêm navigation:
```html
<div class="nav-item" data-page="mypage">...</div>
```

## 📡 WebSocket Events

### Client → Server
- `auth` - Xác thực
- `start/stop/restart/kill` - Điều khiển server
- `command` - Gửi lệnh Minecraft
- `get_files` - Lấy danh sách file
- `read_file/write_file` - Đọc/ghi file
- `give_item` - Cấp vật phẩm
- `broadcast_msg` - Gửi thông báo

### Server → Client
- `auth_required/auth_success/auth_failed`
- `init` - Dữ liệu khởi tạo
- `status` - Trạng thái server
- `system` - Thông tin hệ thống
- `log` - Console log
- `player_update` - Cập nhật người chơi
- `notification` - Toast notification

## 🎨 Tùy Chỉnh Giao Diện

CSS variables trong `public/css/main.css`:

```css
:root {
    --primary: #f97316;      /* Màu chính */
    --secondary: #22c55e;    /* Màu phụ */
    --danger: #ef4444;       /* Màu nguy hiểm */
    --bg-primary: #ffffff;   /* Nền chính */
    --text-primary: #1e293b; /* Màu chữ */
    /* ... */
}
```

## 📝 License

MIT License
