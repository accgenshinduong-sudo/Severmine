/**
 * ============================================
 * MINECRAFT PANEL - DYNMAP MODULE
 * ============================================
 * Quản lý bản đồ Dynmap với Leaflet
 */

const DynMap = {
    map: null,
    markers: {},

    init() {
        if (this.map) return;
        
        const container = document.getElementById('dynmap-container');
        container.innerHTML = '';
        
        // Initialize Leaflet map
        this.map = L.map('dynmap-container').setView([0, 0], 0);
        
        // Setup tile layer
        this.updateLayer();
        
        // Add controls
        L.control.scale().addTo(this.map);
        
        // Events
        this.map.on('zoom', () => this.updateZoomDisplay());
        this.map.on('mousemove', (e) => this.updateCoordsDisplay(e));
        this.map.on('moveend', () => this.updateCoordsDisplay());
        
        // Load players
        this.updatePlayers();
        
        // Initial display
        this.updateZoomDisplay();
        this.updateCoordsDisplay();
        
        // Setup select listeners
        document.getElementById('dynmapWorld').addEventListener('change', () => {
            this.updateLayer();
            this.updatePlayers();
        });
        
        document.getElementById('dynmapMapType').addEventListener('change', () => {
            this.updateLayer();
        });
    },

    updateLayer() {
        if (!this.map) return;
        
        // Remove old layers
        this.map.eachLayer(layer => {
            if (layer instanceof L.TileLayer) {
                this.map.removeLayer(layer);
            }
        });
        
        const world = document.getElementById('dynmapWorld').value;
        const mapType = document.getElementById('dynmapMapType').value;
        
        const tileUrl = `${AppState.dynmapUrl}/tiles/${world}/${mapType}/{z}/{x}_{y}.png`;
        
        L.tileLayer(tileUrl, {
            minZoom: 0,
            maxZoom: 10,
            attribution: 'Dynmap',
            tileSize: 128,
            noWrap: true,
            errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
        }).addTo(this.map);
    },

    updateZoomDisplay() {
        if (!this.map) return;
        document.getElementById('dynmapZoom').textContent = this.map.getZoom();
    },

    updateCoordsDisplay(e) {
        if (!this.map) return;
        
        let lat, lng;
        if (e && e.latlng) {
            lat = e.latlng.lat.toFixed(2);
            lng = e.latlng.lng.toFixed(2);
        } else {
            const center = this.map.getCenter();
            lat = center.lat.toFixed(2);
            lng = center.lng.toFixed(2);
        }
        
        document.getElementById('dynmapCoords').textContent = `X: ${lng}, Z: ${lat}`;
    },

    updatePlayers() {
        if (!this.map) return;
        
        // Remove old markers
        Object.values(this.markers).forEach(marker => {
            if (marker && this.map.hasLayer(marker)) {
                this.map.removeLayer(marker);
            }
        });
        this.markers = {};
        
        const currentWorld = document.getElementById('dynmapWorld').value;
        
        AppState.players.forEach(player => {
            const pos = AppState.positions[player] || { x: 0, y: 64, z: 0, world: 'overworld' };
            const playerWorld = this.getWorldName(pos.world);
            
            if (playerWorld === currentWorld) {
                const color = this.getPlayerColor(player);
                
                const marker = L.marker([pos.z, pos.x], {
                    icon: L.divIcon({
                        className: 'player-marker',
                        html: `<div style="background:${color};width:20px;height:20px;border-radius:50%;border:2px solid white;box-shadow:0 0 10px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold;">${player.charAt(0)}</div>`,
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    })
                }).addTo(this.map);
                
                marker.bindPopup(`
                    <div style="font-weight:bold;margin-bottom:5px;">${player}</div>
                    <div>X: ${pos.x.toFixed ? pos.x.toFixed(1) : pos.x}</div>
                    <div>Y: ${pos.y.toFixed ? pos.y.toFixed(1) : pos.y}</div>
                    <div>Z: ${pos.z.toFixed ? pos.z.toFixed(1) : pos.z}</div>
                    <button onclick="cmd('tp @s ${player}')" style="margin-top:5px;padding:5px 10px;background:#f97316;color:white;border:none;border-radius:5px;cursor:pointer;">TP</button>
                `);
                
                this.markers[player] = marker;
            }
        });
    },

    getWorldName(mcWorld) {
        const mapping = {
            'overworld': 'world',
            'the_nether': 'DIM-1',
            'the_end': 'DIM1',
            'world': 'world',
            'world_nether': 'DIM-1',
            'world_the_end': 'DIM1'
        };
        return mapping[mcWorld] || 'world';
    },

    getPlayerColor(player) {
        const colors = [
            '#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899',
            '#10b981', '#6366f1', '#d946ef', '#f97316', '#0ea5e9'
        ];
        let hash = 0;
        for (let i = 0; i < player.length; i++) {
            hash = player.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    },

    center() {
        if (!this.map) return;
        this.map.setView([0, 0], 0);
    },

    zoomIn() {
        if (!this.map) return;
        this.map.zoomIn();
    },

    zoomOut() {
        if (!this.map) return;
        this.map.zoomOut();
    },

    refresh() {
        this.updateLayer();
        this.updatePlayers();
        UI.toast('Đã làm mới bản đồ', 'success');
    }
};

// Global functions for onclick handlers
function centerDynmap() {
    DynMap.center();
}

function zoomInDynmap() {
    DynMap.zoomIn();
}

function zoomOutDynmap() {
    DynMap.zoomOut();
}

function refreshDynmap() {
    DynMap.refresh();
}
