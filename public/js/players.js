/**
 * ============================================
 * MINECRAFT PANEL - PLAYERS MODULE
 * ============================================
 * Quản lý hiển thị người chơi
 */

const Players = {
    worldNames: {
        overworld: '🌍 Overworld',
        the_nether: '🔥 Nether',
        the_end: '🌑 The End',
        'DIM-1': '🔥 Nether',
        'DIM1': '🌑 The End'
    },

    update(data) {
        if (data.players) AppState.players = data.players;
        if (data.positions) AppState.positions = data.positions;
        
        this.updateCounts();
        this.updateGiveSelect();
        this.renderDashboard();
        this.renderPlayerList();
        this.renderMapList();
    },

    updatePosition(player, position) {
        AppState.positions[player] = position;
        this.update({ players: AppState.players, positions: AppState.positions });
    },

    updateCounts() {
        const count = AppState.players.length;
        document.getElementById('playerCount').textContent = count;
        document.getElementById('playerBadge').textContent = count;
        document.getElementById('onlineCount').textContent = count;
    },

    updateGiveSelect() {
        const select = document.getElementById('givePlayer');
        select.innerHTML = '<option value="">Chọn người chơi</option>' +
            AppState.players.map(p => `<option value="${p}">${p}</option>`).join('');
    },

    renderDashboard() {
        const container = document.getElementById('dashPlayers');
        const count = AppState.players.length;
        
        if (count === 0) {
            container.innerHTML = this.getNoDataHtml();
            return;
        }
        
        container.innerHTML = AppState.players.slice(0, 5)
            .map(p => this.renderPlayerSimple(p))
            .join('');
    },

    renderPlayerList() {
        const container = document.getElementById('playerList');
        const count = AppState.players.length;
        
        if (count === 0) {
            container.innerHTML = this.getNoDataHtml();
            return;
        }
        
        container.innerHTML = AppState.players
            .map(p => this.renderPlayerFull(p))
            .join('');
    },

    renderMapList() {
        const container = document.getElementById('mapPlayerList');
        const count = AppState.players.length;
        
        if (count === 0) {
            container.innerHTML = this.getNoDataHtml();
            return;
        }
        
        container.innerHTML = AppState.players.map(p => {
            const pos = AppState.positions[p] || { x: 0, y: 64, z: 0 };
            return `
                <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
                    <div class="player-avatar" style="width:36px;height:36px;font-size:18px">👤</div>
                    <div style="flex:1;font-weight:600;font-size:14px">${p}</div>
                    <div style="font-family:'JetBrains Mono';font-size:12px;color:var(--text-muted)">${pos.x}, ${pos.y}, ${pos.z}</div>
                </div>
            `;
        }).join('');
    },

    renderPlayerSimple(player) {
        const pos = AppState.positions[player] || { x: 0, y: 64, z: 0, world: 'overworld' };
        const worldName = this.worldNames[pos.world] || pos.world;
        
        return `
            <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
                <div class="player-avatar" style="width:40px;height:40px;font-size:20px">👤</div>
                <div style="flex:1">
                    <div style="font-weight:600;font-size:14px">${player}</div>
                    <div style="font-size:12px;color:var(--text-muted)">${worldName}</div>
                </div>
                <button class="cmd-chip" onclick="cmd('gamemode creative ${player}')">🎨</button>
            </div>
        `;
    },

    renderPlayerFull(player) {
        const pos = AppState.positions[player] || { x: 0, y: 64, z: 0, world: 'overworld', health: 20, food: 20 };
        const worldName = this.worldNames[pos.world] || pos.world;
        
        return `
            <div class="player-card" id="player-${player}">
                <div class="player-card-header" onclick="togglePlayer('${player}')">
                    <div class="player-avatar">👤</div>
                    <div class="player-info">
                        <div class="player-name">${player}</div>
                        <div class="player-meta">${worldName}</div>
                    </div>
                    <span class="player-toggle">▼</span>
                </div>
                <div class="player-details">
                    <div class="player-details-inner">
                        <div class="player-stats-row">
                            <div class="player-stat">
                                <div class="player-stat-value">${pos.x}</div>
                                <div class="player-stat-label">X</div>
                            </div>
                            <div class="player-stat">
                                <div class="player-stat-value">${pos.y}</div>
                                <div class="player-stat-label">Y</div>
                            </div>
                            <div class="player-stat">
                                <div class="player-stat-value">${pos.z}</div>
                                <div class="player-stat-label">Z</div>
                            </div>
                        </div>
                        <div class="player-actions-grid">
                            <button class="player-action-btn" onclick="cmd('gamemode survival ${player}')">
                                <span class="icon">⚔️</span>Sinh tồn
                            </button>
                            <button class="player-action-btn" onclick="cmd('gamemode creative ${player}')">
                                <span class="icon">🎨</span>Sáng tạo
                            </button>
                            <button class="player-action-btn" onclick="cmd('gamemode spectator ${player}')">
                                <span class="icon">👻</span>Quan sát
                            </button>
                            <button class="player-action-btn success" onclick="cmd('op ${player}')">
                                <span class="icon">👑</span>OP
                            </button>
                            <button class="player-action-btn" onclick="cmd('deop ${player}')">
                                <span class="icon">👤</span>DeOP
                            </button>
                            <button class="player-action-btn" onclick="giveItemTo('${player}')">
                                <span class="icon">🎁</span>Cho đồ
                            </button>
                            <button class="player-action-btn danger" onclick="cmd('kick ${player}')">
                                <span class="icon">🚫</span>Đuổi
                            </button>
                            <button class="player-action-btn danger" onclick="cmd('ban ${player}')">
                                <span class="icon">⛔</span>Cấm
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    getNoDataHtml() {
        return `
            <div class="no-data">
                <div class="no-data-text">Không có người chơi online</div>
            </div>
        `;
    }
};

// Global functions for onclick handlers
function togglePlayer(name) {
    const card = document.getElementById(`player-${name}`);
    if (card) card.classList.toggle('expanded');
}

function giveItemTo(player) {
    document.getElementById('givePlayer').value = player;
    Navigation.switchPage('items');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector('.nav-item[data-page="items"]')?.classList.add('active');
}
