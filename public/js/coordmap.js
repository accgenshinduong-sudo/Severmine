/**
 * ============================================
 * COORDINATE MAP MODULE
 * ============================================
 * Vẽ bản đồ tọa độ người chơi trên canvas
 */

const CoordMap = {
    canvas: null,
    ctx: null,
    players: {},
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    gridSize: 100,
    selectedPlayer: null,
    worldBounds: {
        minX: -1000,
        maxX: 1000,
        minZ: -1000,
        maxZ: 1000
    },
    colors: [
        '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
        '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#06b6d4'
    ],
    playerColors: {},

    init() {
        this.canvas = document.getElementById('coordCanvas');
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        this.setupEvents();
        this.render();
    },

    setupCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight || 400;
        
        // Căn giữa ban đầu
        this.offsetX = this.canvas.width / 2;
        this.offsetY = this.canvas.height / 2;
    },

    setupEvents() {
        // Resize
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.render();
        });

        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.onMouseUp());
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
        this.canvas.addEventListener('click', (e) => this.onClick(e));

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.onMouseUp());
    },

    onMouseDown(e) {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.canvas.style.cursor = 'grabbing';
    },

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Cập nhật tọa độ hiển thị
        const worldCoords = this.screenToWorld(mouseX, mouseY);
        const coordsDisplay = document.getElementById('mapCoords');
        if (coordsDisplay) {
            coordsDisplay.textContent = `X: ${Math.round(worldCoords.x)}, Z: ${Math.round(worldCoords.z)}`;
        }

        if (this.isDragging) {
            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;
            this.offsetX += dx;
            this.offsetY += dy;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.render();
        }
    },

    onMouseUp() {
        this.isDragging = false;
        this.canvas.style.cursor = 'grab';
    },

    onWheel(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldBefore = this.screenToWorld(mouseX, mouseY);
        
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        this.scale = Math.max(0.1, Math.min(10, this.scale * zoomFactor));

        const worldAfter = this.screenToWorld(mouseX, mouseY);
        
        this.offsetX += (worldAfter.x - worldBefore.x) * this.scale;
        this.offsetY += (worldAfter.z - worldBefore.z) * this.scale;

        // Cập nhật zoom display
        const zoomDisplay = document.getElementById('mapZoom');
        if (zoomDisplay) {
            zoomDisplay.textContent = (this.scale * 100).toFixed(0) + '%';
        }

        this.render();
    },

    onClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Kiểm tra click vào người chơi
        for (const [name, pos] of Object.entries(this.players)) {
            const screenPos = this.worldToScreen(pos.x, pos.z);
            const dist = Math.sqrt(Math.pow(mouseX - screenPos.x, 2) + Math.pow(mouseY - screenPos.y, 2));
            
            if (dist < 15) {
                this.selectedPlayer = name;
                this.showPlayerInfo(name, pos);
                this.render();
                return;
            }
        }
        
        this.selectedPlayer = null;
        this.hidePlayerInfo();
        this.render();
    },

    onTouchStart(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.isDragging = true;
            this.lastMouseX = touch.clientX;
            this.lastMouseY = touch.clientY;
        }
    },

    onTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1 && this.isDragging) {
            const touch = e.touches[0];
            const dx = touch.clientX - this.lastMouseX;
            const dy = touch.clientY - this.lastMouseY;
            this.offsetX += dx;
            this.offsetY += dy;
            this.lastMouseX = touch.clientX;
            this.lastMouseY = touch.clientY;
            this.render();
        }
    },

    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.offsetX) / this.scale,
            z: (screenY - this.offsetY) / this.scale
        };
    },

    worldToScreen(worldX, worldZ) {
        return {
            x: worldX * this.scale + this.offsetX,
            y: worldZ * this.scale + this.offsetY
        };
    },

    getPlayerColor(name) {
        if (!this.playerColors[name]) {
            const index = Object.keys(this.playerColors).length % this.colors.length;
            this.playerColors[name] = this.colors[index];
        }
        return this.playerColors[name];
    },

    updatePlayer(name, position) {
        this.players[name] = position;
        this.updateWorldBounds(position);
        this.render();
    },

    removePlayer(name) {
        delete this.players[name];
        if (this.selectedPlayer === name) {
            this.selectedPlayer = null;
            this.hidePlayerInfo();
        }
        this.render();
    },

    updateWorldBounds(pos) {
        const padding = 200;
        if (pos.x < this.worldBounds.minX + padding) this.worldBounds.minX = pos.x - padding;
        if (pos.x > this.worldBounds.maxX - padding) this.worldBounds.maxX = pos.x + padding;
        if (pos.z < this.worldBounds.minZ + padding) this.worldBounds.minZ = pos.z - padding;
        if (pos.z > this.worldBounds.maxZ - padding) this.worldBounds.maxZ = pos.z + padding;
    },

    render() {
        if (!this.ctx) return;

        const { width, height } = this.canvas;
        
        // Clear canvas
        this.ctx.fillStyle = '#1e293b';
        this.ctx.fillRect(0, 0, width, height);

        // Vẽ grid
        this.drawGrid();

        // Vẽ spawn point (0, 0)
        this.drawSpawn();

        // Vẽ người chơi
        this.drawPlayers();

        // Vẽ compass
        this.drawCompass();
    },

    drawGrid() {
        const { width, height } = this.canvas;
        this.ctx.strokeStyle = '#334155';
        this.ctx.lineWidth = 1;

        // Tính toán grid dựa trên scale
        let gridStep = this.gridSize;
        if (this.scale < 0.5) gridStep = 500;
        if (this.scale < 0.2) gridStep = 1000;
        if (this.scale > 2) gridStep = 50;
        if (this.scale > 5) gridStep = 20;

        // Vẽ grid lines dọc
        const startX = Math.floor((-this.offsetX / this.scale) / gridStep) * gridStep;
        const endX = Math.ceil((width - this.offsetX) / this.scale / gridStep) * gridStep;
        
        for (let x = startX; x <= endX; x += gridStep) {
            const screenX = x * this.scale + this.offsetX;
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, 0);
            this.ctx.lineTo(screenX, height);
            this.ctx.stroke();

            // Label
            if (x % (gridStep * 2) === 0) {
                this.ctx.fillStyle = '#64748b';
                this.ctx.font = '10px Inter';
                this.ctx.fillText(x.toString(), screenX + 2, height - 5);
            }
        }

        // Vẽ grid lines ngang
        const startZ = Math.floor((-this.offsetY / this.scale) / gridStep) * gridStep;
        const endZ = Math.ceil((height - this.offsetY) / this.scale / gridStep) * gridStep;
        
        for (let z = startZ; z <= endZ; z += gridStep) {
            const screenY = z * this.scale + this.offsetY;
            this.ctx.beginPath();
            this.ctx.moveTo(0, screenY);
            this.ctx.lineTo(width, screenY);
            this.ctx.stroke();

            // Label
            if (z % (gridStep * 2) === 0 && z !== 0) {
                this.ctx.fillStyle = '#64748b';
                this.ctx.font = '10px Inter';
                this.ctx.fillText(z.toString(), 5, screenY - 2);
            }
        }

        // Vẽ trục X và Z đậm hơn
        this.ctx.strokeStyle = '#475569';
        this.ctx.lineWidth = 2;

        // Trục X (z = 0)
        const yAxis = this.offsetY;
        if (yAxis >= 0 && yAxis <= height) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, yAxis);
            this.ctx.lineTo(width, yAxis);
            this.ctx.stroke();
        }

        // Trục Z (x = 0)
        const xAxis = this.offsetX;
        if (xAxis >= 0 && xAxis <= width) {
            this.ctx.beginPath();
            this.ctx.moveTo(xAxis, 0);
            this.ctx.lineTo(xAxis, height);
            this.ctx.stroke();
        }
    },

    drawSpawn() {
        const spawn = this.worldToScreen(0, 0);
        
        // Vòng tròn spawn
        this.ctx.beginPath();
        this.ctx.arc(spawn.x, spawn.y, 8, 0, Math.PI * 2);
        this.ctx.fillStyle = '#22c55e';
        this.ctx.fill();
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Label
        this.ctx.fillStyle = '#22c55e';
        this.ctx.font = 'bold 12px Inter';
        this.ctx.fillText('SPAWN', spawn.x + 12, spawn.y + 4);
    },

    drawPlayers() {
        for (const [name, pos] of Object.entries(this.players)) {
            const screen = this.worldToScreen(pos.x, pos.z);
            const color = this.getPlayerColor(name);
            const isSelected = this.selectedPlayer === name;

            // Vẽ hướng nhìn (nếu có)
            if (pos.yaw !== undefined) {
                const yawRad = (pos.yaw - 90) * Math.PI / 180;
                const arrowLength = 20;
                
                this.ctx.beginPath();
                this.ctx.moveTo(screen.x, screen.y);
                this.ctx.lineTo(
                    screen.x + Math.cos(yawRad) * arrowLength,
                    screen.y + Math.sin(yawRad) * arrowLength
                );
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }

            // Vẽ điểm người chơi
            this.ctx.beginPath();
            this.ctx.arc(screen.x, screen.y, isSelected ? 12 : 8, 0, Math.PI * 2);
            this.ctx.fillStyle = color;
            this.ctx.fill();
            
            if (isSelected) {
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
            }

            // Tên người chơi
            this.ctx.fillStyle = '#fff';
            this.ctx.font = isSelected ? 'bold 12px Inter' : '11px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(name, screen.x, screen.y - 15);

            // Tọa độ Y (độ cao)
            if (pos.y !== undefined) {
                this.ctx.fillStyle = '#94a3b8';
                this.ctx.font = '9px Inter';
                this.ctx.fillText(`Y: ${Math.round(pos.y)}`, screen.x, screen.y + 22);
            }

            this.ctx.textAlign = 'left';
        }
    },

    drawCompass() {
        const size = 40;
        const margin = 15;
        const cx = this.canvas.width - margin - size/2;
        const cy = margin + size/2;

        // Vòng tròn nền
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, size/2, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
        this.ctx.fill();
        this.ctx.strokeStyle = '#475569';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Các hướng
        const directions = [
            { label: 'N', angle: -90, color: '#ef4444' },
            { label: 'E', angle: 0, color: '#94a3b8' },
            { label: 'S', angle: 90, color: '#94a3b8' },
            { label: 'W', angle: 180, color: '#94a3b8' }
        ];

        directions.forEach(dir => {
            const rad = dir.angle * Math.PI / 180;
            const x = cx + Math.cos(rad) * (size/2 - 10);
            const y = cy + Math.sin(rad) * (size/2 - 10);
            
            this.ctx.fillStyle = dir.color;
            this.ctx.font = 'bold 10px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(dir.label, x, y);
        });
    },

    showPlayerInfo(name, pos) {
        const infoBox = document.getElementById('playerInfoBox');
        if (infoBox) {
            infoBox.innerHTML = `
                <div class="player-info-header">
                    <span class="player-info-dot" style="background:${this.getPlayerColor(name)}"></span>
                    <strong>${name}</strong>
                </div>
                <div class="player-info-coords">
                    <div>X: ${Math.round(pos.x)}</div>
                    <div>Y: ${Math.round(pos.y || 0)}</div>
                    <div>Z: ${Math.round(pos.z)}</div>
                </div>
                <div class="player-info-actions">
                    <button onclick="CoordMap.centerOnPlayer('${name}')" class="btn-small">
                        <i class="fas fa-crosshairs"></i> Theo dõi
                    </button>
                    <button onclick="cmd('tp @p ${name}')" class="btn-small">
                        <i class="fas fa-location-arrow"></i> TP đến
                    </button>
                </div>
            `;
            infoBox.style.display = 'block';
        }
    },

    hidePlayerInfo() {
        const infoBox = document.getElementById('playerInfoBox');
        if (infoBox) {
            infoBox.style.display = 'none';
        }
    },

    centerOnPlayer(name) {
        const pos = this.players[name];
        if (pos) {
            this.offsetX = this.canvas.width / 2 - pos.x * this.scale;
            this.offsetY = this.canvas.height / 2 - pos.z * this.scale;
            this.render();
        }
    },

    centerOnSpawn() {
        this.offsetX = this.canvas.width / 2;
        this.offsetY = this.canvas.height / 2;
        this.scale = 1;
        this.render();
    },

    zoomIn() {
        this.scale = Math.min(10, this.scale * 1.2);
        document.getElementById('mapZoom').textContent = (this.scale * 100).toFixed(0) + '%';
        this.render();
    },

    zoomOut() {
        this.scale = Math.max(0.1, this.scale / 1.2);
        document.getElementById('mapZoom').textContent = (this.scale * 100).toFixed(0) + '%';
        this.render();
    },

    fitAllPlayers() {
        const players = Object.values(this.players);
        if (players.length === 0) {
            this.centerOnSpawn();
            return;
        }

        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        players.forEach(p => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minZ = Math.min(minZ, p.z);
            maxZ = Math.max(maxZ, p.z);
        });

        const padding = 100;
        const rangeX = maxX - minX + padding * 2;
        const rangeZ = maxZ - minZ + padding * 2;

        this.scale = Math.min(
            this.canvas.width / rangeX,
            this.canvas.height / rangeZ,
            2
        );

        const centerX = (minX + maxX) / 2;
        const centerZ = (minZ + maxZ) / 2;

        this.offsetX = this.canvas.width / 2 - centerX * this.scale;
        this.offsetY = this.canvas.height / 2 - centerZ * this.scale;

        document.getElementById('mapZoom').textContent = (this.scale * 100).toFixed(0) + '%';
        this.render();
    }
};

// Global functions
function centerMap() { CoordMap.centerOnSpawn(); }
function zoomInMap() { CoordMap.zoomIn(); }
function zoomOutMap() { CoordMap.zoomOut(); }
function fitAllPlayers() { CoordMap.fitAllPlayers(); }
