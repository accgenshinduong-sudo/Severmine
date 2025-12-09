/**
 * ============================================
 * MINECRAFT PANEL - ITEMS MODULE
 * ============================================
 * Quản lý vật phẩm và give items
 */

const Items = {
    render() {
        const container = document.getElementById('itemsContainer');
        let html = '';
        
        for (const [category, itemList] of Object.entries(AppState.items)) {
            html += `
                <div class="item-category">
                    <div class="item-category-title">${category}</div>
                    <div class="item-grid">
                        ${itemList.map(item => this.renderItem(item)).join('')}
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
    },

    renderItem(item) {
        const selected = AppState.selectedItem === item.id ? 'selected' : '';
        return `
            <button class="item-btn ${selected}" onclick="selectItem('${item.id}', '${item.name}')">
                <span class="icon">${item.icon}</span>
                ${item.name}
            </button>
        `;
    },

    select(id, name) {
        AppState.selectedItem = id;
        document.getElementById('selectedItemName').textContent = name;
        this.render();
    },

    giveSelected() {
        const player = document.getElementById('givePlayer').value;
        const amount = document.getElementById('giveAmount').value || 1;
        
        if (!player) {
            UI.toast('Chọn người chơi!', 'error');
            return;
        }
        
        if (!AppState.selectedItem) {
            UI.toast('Chọn vật phẩm!', 'error');
            return;
        }
        
        WS.send({
            action: 'give_item',
            player,
            item: AppState.selectedItem,
            amount: parseInt(amount)
        });
    },

    giveCustom() {
        const player = document.getElementById('givePlayer').value;
        const item = document.getElementById('customItem').value.trim();
        const amount = document.getElementById('giveAmount').value || 1;
        
        if (!player) {
            UI.toast('Chọn người chơi!', 'error');
            return;
        }
        
        if (!item) {
            UI.toast('Nhập ID vật phẩm!', 'error');
            return;
        }
        
        WS.send({
            action: 'give_item',
            player,
            item,
            amount: parseInt(amount)
        });
    }
};

// Global functions for onclick handlers
function selectItem(id, name) {
    Items.select(id, name);
}

function giveSelectedItem() {
    Items.giveSelected();
}

function giveCustomItem() {
    Items.giveCustom();
}
