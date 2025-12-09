/**
 * ============================================
 * MINECRAFT PANEL - BROADCAST MODULE
 * ============================================
 * Quản lý gửi thông báo đến server
 */

const Broadcast = {
    getMessage() {
        return document.getElementById('broadcastMsg').value.trim();
    },

    clearMessage() {
        document.getElementById('broadcastMsg').value = '';
    },

    send() {
        const msg = this.getMessage();
        if (!msg) {
            UI.toast('Nhập nội dung!', 'error');
            return;
        }
        
        WS.send({ action: 'broadcast_msg', message: msg });
        this.clearMessage();
    },

    sendTitle() {
        const msg = this.getMessage();
        if (!msg) {
            UI.toast('Nhập nội dung!', 'error');
            return;
        }
        
        cmd(`title @a title {"text":"${msg}","color":"gold"}`);
        this.clearMessage();
    },

    sendChat() {
        const msg = this.getMessage();
        if (!msg) {
            UI.toast('Nhập nội dung!', 'error');
            return;
        }
        
        cmd(`say ${msg}`);
        this.clearMessage();
    },

    quick(message) {
        WS.send({ action: 'broadcast_msg', message });
    }
};

// Global functions for onclick handlers
function sendBroadcast() {
    Broadcast.send();
}

function sendTitle() {
    Broadcast.sendTitle();
}

function sendChat() {
    Broadcast.sendChat();
}

function quickBroadcast(msg) {
    Broadcast.quick(msg);
}
