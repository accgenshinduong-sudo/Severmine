/**
 * ============================================
 * MODULE QUẢN LÝ FILE
 * ============================================
 * Đọc, ghi, xóa file và thư mục
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');

class FileManager {
    constructor() {
        this.workDir = config.minecraft.workDir;
    }

    /**
     * Đặt thư mục làm việc
     */
    setWorkDir(dir) {
        this.workDir = dir;
    }

    /**
     * Lấy đường dẫn đầy đủ
     */
    getFullPath(relativePath) {
        return path.join(this.workDir, relativePath);
    }

    /**
     * Kiểm tra path có an toàn không (tránh path traversal)
     */
    isPathSafe(relativePath) {
        const fullPath = this.getFullPath(relativePath);
        const resolvedPath = path.resolve(fullPath);
        return resolvedPath.startsWith(path.resolve(this.workDir));
    }

    /**
     * Lấy danh sách file trong thư mục
     */
    getFiles(dirPath = '') {
        try {
            if (!this.isPathSafe(dirPath)) {
                return { error: 'Đường dẫn không hợp lệ' };
            }

            const fullPath = this.getFullPath(dirPath);
            const items = fs.readdirSync(fullPath, { withFileTypes: true });

            return items.map(item => {
                const itemPath = path.join(fullPath, item.name);
                let size = 0;
                let modified = new Date();

                try {
                    const stats = fs.statSync(itemPath);
                    size = stats.size;
                    modified = stats.mtime;
                } catch (e) {
                    // Ignore errors
                }

                return {
                    name: item.name,
                    isDirectory: item.isDirectory(),
                    size: item.isDirectory() ? 0 : size,
                    modified: modified,
                    extension: item.isDirectory() ? null : path.extname(item.name).slice(1).toLowerCase()
                };
            }).sort((a, b) => {
                // Thư mục trước, sau đó sắp xếp theo tên
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.name.localeCompare(b.name);
            });
        } catch (err) {
            return { error: err.message };
        }
    }

    /**
     * Đọc nội dung file
     */
    readFile(filePath) {
        try {
            if (!this.isPathSafe(filePath)) {
                return { error: 'Đường dẫn không hợp lệ' };
            }

            const fullPath = this.getFullPath(filePath);
            const stats = fs.statSync(fullPath);

            if (stats.size > config.files.maxFileSize) {
                return { error: `File quá lớn (>${config.files.maxFileSize / 1024 / 1024}MB)` };
            }

            const content = fs.readFileSync(fullPath, 'utf8');
            return { content, size: stats.size };
        } catch (err) {
            return { error: err.message };
        }
    }

    /**
     * Ghi nội dung vào file
     */
    writeFile(filePath, content) {
        try {
            if (!this.isPathSafe(filePath)) {
                return { error: 'Đường dẫn không hợp lệ' };
            }

            const fullPath = this.getFullPath(filePath);
            fs.writeFileSync(fullPath, content, 'utf8');
            return { success: true };
        } catch (err) {
            return { error: err.message };
        }
    }

    /**
     * Xóa file hoặc thư mục
     */
    deleteFile(filePath) {
        try {
            if (!this.isPathSafe(filePath)) {
                return { error: 'Đường dẫn không hợp lệ' };
            }

            const fullPath = this.getFullPath(filePath);
            const stats = fs.statSync(fullPath);

            if (stats.isDirectory()) {
                fs.rmSync(fullPath, { recursive: true });
            } else {
                fs.unlinkSync(fullPath);
            }

            return { success: true };
        } catch (err) {
            return { error: err.message };
        }
    }

    /**
     * Tạo thư mục mới
     */
    createFolder(folderPath) {
        try {
            if (!this.isPathSafe(folderPath)) {
                return { error: 'Đường dẫn không hợp lệ' };
            }

            const fullPath = this.getFullPath(folderPath);
            fs.mkdirSync(fullPath, { recursive: true });
            return { success: true };
        } catch (err) {
            return { error: err.message };
        }
    }

    /**
     * Đổi tên file/thư mục
     */
    rename(oldPath, newPath) {
        try {
            if (!this.isPathSafe(oldPath) || !this.isPathSafe(newPath)) {
                return { error: 'Đường dẫn không hợp lệ' };
            }

            const fullOldPath = this.getFullPath(oldPath);
            const fullNewPath = this.getFullPath(newPath);
            fs.renameSync(fullOldPath, fullNewPath);
            return { success: true };
        } catch (err) {
            return { error: err.message };
        }
    }

    /**
     * Kiểm tra file có tồn tại không
     */
    exists(filePath) {
        const fullPath = this.getFullPath(filePath);
        return fs.existsSync(fullPath);
    }

    /**
     * Lấy icon cho file dựa vào extension
     */
    static getFileIcon(extension) {
        const icons = {
            js: 'fa-file-code',
            json: 'fa-file-code',
            txt: 'fa-file-alt',
            yml: 'fa-file-code',
            yaml: 'fa-file-code',
            properties: 'fa-cog',
            log: 'fa-file-alt',
            jar: 'fa-java',
            png: 'fa-file-image',
            jpg: 'fa-file-image',
            jpeg: 'fa-file-image',
            gif: 'fa-file-image',
            zip: 'fa-file-archive',
            gz: 'fa-file-archive',
            tar: 'fa-file-archive',
            md: 'fa-file-alt',
            cfg: 'fa-cog',
            conf: 'fa-cog'
        };
        return icons[extension] || 'fa-file';
    }

    /**
     * Format kích thước file
     */
    static formatSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}

module.exports = new FileManager();
