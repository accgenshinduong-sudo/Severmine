/**
 * ============================================
 * UPLOAD MODULE
 * ============================================
 * Quản lý upload mods, plugins, v.v.
 */

const Upload = {
    currentType: 'mods',
    files: [],
    uploadInfo: {},

    init() {
        this.loadUploadInfo();
    },

    setType(type) {
        this.currentType = type;
        document.querySelectorAll('.upload-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });
        this.loadFileList();
    },

    loadUploadInfo() {
        WS.send({ action: 'get_upload_info' });
    },

    loadFileList() {
        WS.send({ action: 'list_uploads', type: this.currentType });
    },

    renderUploadInfo(info) {
        this.uploadInfo = info;
        const container = document.getElementById('uploadStats');
        if (!container) return;

        container.innerHTML = Object.entries(info).map(([type, data]) => `
            <div class="upload-stat-item ${type === this.currentType ? 'active' : ''}" onclick="Upload.setType('${type}')">
                <div class="upload-stat-icon">${this.getTypeIcon(type)}</div>
                <div class="upload-stat-info">
                    <div class="upload-stat-name">${this.getTypeName(type)}</div>
                    <div class="upload-stat-count">${data.count} files • ${this.formatSize(data.totalSize)}</div>
                </div>
            </div>
        `).join('');
    },

    renderFileList(files) {
        this.files = files;
        const container = document.getElementById('uploadFileList');
        if (!container) return;

        if (files.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <div class="no-data-icon">📁</div>
                    <div class="no-data-text">Chưa có file nào</div>
                </div>
            `;
            return;
        }

        container.innerHTML = files.map(file => `
            <div class="upload-file-item">
                <div class="upload-file-icon">${this.getFileIcon(file.name)}</div>
                <div class="upload-file-info">
                    <div class="upload-file-name">${file.name}</div>
                    <div class="upload-file-meta">
                        ${this.formatSize(file.size)} • ${this.formatDate(file.modified)}
                    </div>
                </div>
                <div class="upload-file-actions">
                    <button class="btn-icon danger" onclick="Upload.deleteFile('${file.name}')" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    },

    openUploadDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = '.jar,.zip,.json,.yml,.yaml,.properties,.txt,.cfg,.toml';
        
        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => this.uploadFile(file));
        };
        
        input.click();
    },

    async uploadFile(file) {
        const maxSize = 100 * 1024 * 1024; // 100MB
        
        if (file.size > maxSize) {
            showToast(`File ${file.name} quá lớn (tối đa 100MB)`, 'error');
            return;
        }

        showToast(`Đang upload ${file.name}...`, 'info');

        try {
            const base64 = await this.fileToBase64(file);
            
            WS.send({
                action: 'upload_file',
                type: this.currentType,
                filename: file.name,
                data: base64
            });
        } catch (err) {
            showToast(`Lỗi upload ${file.name}: ${err.message}`, 'error');
        }
    },

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    handleUploadResult(result) {
        if (result.success) {
            showToast(`Đã upload ${result.filename} (${this.formatSize(result.size)})`, 'success');
            if (result.warning) {
                showToast(result.warning, 'warning');
            }
            this.loadFileList();
            this.loadUploadInfo();
        } else {
            showToast(`Lỗi: ${result.error}`, 'error');
        }
    },

    deleteFile(filename) {
        if (!confirm(`Xóa file "${filename}"?`)) return;
        
        WS.send({
            action: 'delete_upload',
            type: this.currentType,
            filename: filename
        });
    },

    handleDeleteResult(result) {
        if (result.success) {
            showToast(result.message, 'success');
            this.loadFileList();
            this.loadUploadInfo();
        } else {
            showToast(`Lỗi: ${result.error}`, 'error');
        }
    },

    // Drag & Drop
    setupDragDrop(element) {
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            element.classList.add('drag-over');
        });

        element.addEventListener('dragleave', () => {
            element.classList.remove('drag-over');
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            element.classList.remove('drag-over');
            
            const files = Array.from(e.dataTransfer.files);
            files.forEach(file => this.uploadFile(file));
        });
    },

    // Helpers
    getTypeIcon(type) {
        const icons = {
            mods: '🔧',
            plugins: '🔌',
            datapacks: '📦',
            config: '⚙️',
            resourcepacks: '🎨'
        };
        return icons[type] || '📁';
    },

    getTypeName(type) {
        const names = {
            mods: 'Mods',
            plugins: 'Plugins',
            datapacks: 'Datapacks',
            config: 'Config',
            resourcepacks: 'Resource Packs'
        };
        return names[type] || type;
    },

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            jar: '☕',
            zip: '📦',
            json: '📋',
            yml: '📝',
            yaml: '📝',
            properties: '⚙️',
            txt: '📄',
            cfg: '⚙️',
            toml: '📝'
        };
        return icons[ext] || '📄';
    },

    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
};
