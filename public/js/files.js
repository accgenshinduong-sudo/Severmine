/**
 * ============================================
 * MINECRAFT PANEL - FILES MODULE
 * ============================================
 * Quản lý file browser và editor
 */

const Files = {
    icons: {
        js: '<i class="fas fa-file-code"></i>',
        json: '<i class="fas fa-file-code"></i>',
        txt: '<i class="fas fa-file-alt"></i>',
        yml: '<i class="fas fa-file-code"></i>',
        yaml: '<i class="fas fa-file-code"></i>',
        properties: '<i class="fas fa-cog"></i>',
        log: '<i class="fas fa-file-alt"></i>',
        jar: '<i class="fab fa-java"></i>',
        png: '<i class="fas fa-file-image"></i>',
        jpg: '<i class="fas fa-file-image"></i>',
        zip: '<i class="fas fa-file-archive"></i>'
    },

    load(path) {
        AppState.currentPath = path;
        WS.send({ action: 'get_files', path });
    },

    render(path, files) {
        AppState.currentPath = path;
        this.renderBreadcrumb(path);
        this.renderFileList(path, files);
    },

    renderBreadcrumb(path) {
        const pathEl = document.getElementById('filePath');
        pathEl.innerHTML = '<span class="file-path-item" onclick="Files.load(\'\')"><i class="fas fa-home"></i> /</span>';
        
        if (path) {
            let acc = '';
            path.split('/').filter(x => x).forEach(part => {
                acc += '/' + part;
                const fullPath = acc;
                pathEl.innerHTML += `<span class="file-path-item" onclick="Files.load('${fullPath}')">${part}</span>`;
            });
        }
    },

    renderFileList(path, files) {
        const list = document.getElementById('fileList');
        list.innerHTML = '';
        
        // Back button
        if (path) {
            const back = document.createElement('div');
            back.className = 'file-item';
            back.innerHTML = '<span class="file-icon"><i class="fas fa-level-up-alt"></i></span><span class="file-name">..</span>';
            back.onclick = () => this.load(path.split('/').slice(0, -1).join('/'));
            list.appendChild(back);
        }
        
        // Files
        files.forEach(file => {
            const item = document.createElement('div');
            item.className = 'file-item';
            
            const ext = file.name.split('.').pop().toLowerCase();
            const icon = file.isDirectory 
                ? '<i class="fas fa-folder"></i>' 
                : (this.icons[ext] || '<i class="fas fa-file"></i>');
            
            item.innerHTML = `
                <span class="file-icon">${icon}</span>
                <span class="file-name">${file.name}</span>
                <span class="file-meta">${file.isDirectory ? '' : Utils.formatSize(file.size)}</span>
            `;
            
            item.onclick = () => {
                if (file.isDirectory) {
                    this.load(path ? `${path}/${file.name}` : file.name);
                } else {
                    this.edit(path ? `${path}/${file.name}` : file.name);
                }
            };
            
            list.appendChild(item);
        });
    },

    edit(path) {
        AppState.editingFile = path;
        WS.send({ action: 'read_file', path });
    },

    openEditor(path, content) {
        document.getElementById('editorTitle').textContent = path.split('/').pop();
        document.getElementById('editor').value = content;
        UI.showModal('editorModal');
    },

    closeEditor() {
        UI.hideModal('editorModal');
        AppState.editingFile = '';
    },

    save() {
        WS.send({
            action: 'write_file',
            path: AppState.editingFile,
            content: document.getElementById('editor').value
        });
    }
};

// Global functions for onclick handlers
function loadFiles(path) {
    Files.load(path);
}

function closeEditor() {
    Files.closeEditor();
}

function saveFile() {
    Files.save();
}
