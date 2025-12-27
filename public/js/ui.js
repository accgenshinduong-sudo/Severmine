/**
 * ============================================
 * MINECRAFT PANEL - UI MODULE
 * ============================================
 * Quản lý giao diện người dùng
 */

const UI = {
    // ==================== LOGIN ====================
    showLogin() {
        document.getElementById('loginScreen').classList.remove('hidden');
    },

    hideLogin() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('loginError').classList.remove('show');
    },

    showLoginError() {
        document.getElementById('loginError').classList.add('show');
    },

    // ==================== STATUS ====================
    updateStatus(status) {
        const dot = document.getElementById('statusDot');
        const txt = document.getElementById('statusText');
        
        dot.className = 'status-dot';
        
        const statuses = {
            online: { class: 'online', text: 'Đang chạy' },
            starting: { class: 'starting', text: 'Khởi động...' },
            stopping: { class: 'starting', text: 'Đang dừng...' },
            offline: { class: '', text: 'Đã dừng' }
        };
        
        const st = statuses[status] || statuses.offline;
        if (st.class) dot.classList.add(st.class);
        txt.textContent = st.text;
        
        document.getElementById('btnStart').disabled = AppState.running;
        document.getElementById('btnStop').disabled = !AppState.running;
    },

    // ==================== TOAST ====================
    toast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warn: '⚠️'
        };
        
        toast.innerHTML = `<span>${icons[type] || '📢'}</span><span>${message}</span>`;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.transform = 'translateY(-10px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    // ==================== MODAL ====================
    showModal(id) {
        document.getElementById(id).classList.add('show');
    },

    hideModal(id) {
        document.getElementById(id).classList.remove('show');
    },

    // ==================== LOADING ====================
    setLoading(elementId, isLoading) {
        const el = document.getElementById(elementId);
        if (!el) return;

        if (isLoading) {
            el.classList.add('loading-state');
            el.disabled = true;
            // Store original text if not already stored
            if (!el.dataset.originalText) {
                el.dataset.originalText = el.innerHTML;
            }
            el.innerHTML = '<span class="loading"></span>';
        } else {
            el.classList.remove('loading-state');
            el.disabled = false;
            if (el.dataset.originalText) {
                el.innerHTML = el.dataset.originalText;
            }
        }
    }
};

// ==================== NAVIGATION ====================
const Navigation = {
    switchPage(page) {
        // Update nav items
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.classList.remove('active');
        });
        document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
        
        // Update pages
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`page-${page}`)?.classList.add('active');
        
        // Special handling
        if (page === 'map') {
            setTimeout(() => DynMap.init(), 100);
        }
        if (page === 'console') {
            Console.scrollToBottom();
        }
    }
};

// Global function for closing more modal
function closeMoreModal() {
    UI.hideModal('moreModal');
}

function switchPage(page) {
    Navigation.switchPage(page);
}
