/**
 * Upload Manager - Quản lý upload file (mods, plugins, v.v.)
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');

class UploadManager {
    constructor() {
        this.maxFileSize = 100 * 1024 * 1024; // 100MB
        this.allowedExtensions = ['.jar', '.zip', '.json', '.yml', '.yaml', '.properties', '.txt', '.cfg', '.toml'];
        this.uploadDirs = {
            mods: 'mods',
            plugins: 'plugins',
            datapacks: 'world/datapacks',
            config: 'config',
            resourcepacks: 'resourcepacks'
        };
    }

    /**
     * Lấy đường dẫn thư mục upload
     */
    getUploadPath(type) {
        const subDir = this.uploadDirs[type] || type;
        return path.join(config.minecraft.workDir, subDir);
    }

    /**
     * Đảm bảo thư mục tồn tại
     */
    ensureDir(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * Kiểm tra file hợp lệ
     */
    validateFile(filename, size) {
        const ext = path.extname(filename).toLowerCase();
        
        if (!this.allowedExtensions.includes(ext)) {
            return { valid: false, error: `Định dạng không hợp lệ. Chỉ chấp nhận: ${this.allowedExtensions.join(', ')}` };
        }
        
        if (size > this.maxFileSize) {
            return { valid: false, error: `File quá lớn. Tối đa ${this.maxFileSize / 1024 / 1024}MB` };
        }
        
        // Kiểm tra tên file an toàn
        // Ensure we only have the filename, strip any path
        let baseName = path.basename(filename);

        // Sanitize filename
        const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');

        if (safeName !== filename) {
            return { valid: true, warning: 'Tên file đã được chuẩn hóa', safeName };
        }
        
        return { valid: true, safeName: filename };
    }

    /**
     * Lưu file từ base64
     */
    saveFile(type, filename, base64Data) {
        try {
            const validation = this.validateFile(filename, base64Data.length * 0.75);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            const uploadDir = this.getUploadPath(type);
            this.ensureDir(uploadDir);

            const safeName = validation.safeName;
            const filePath = path.join(uploadDir, safeName);

            // Kiểm tra file đã tồn tại
            if (fs.existsSync(filePath)) {
                // Thêm timestamp vào tên file
                const ext = path.extname(safeName);
                const name = path.basename(safeName, ext);
                const newName = `${name}_${Date.now()}${ext}`;
                const newPath = path.join(uploadDir, newName);
                
                const buffer = Buffer.from(base64Data, 'base64');
                fs.writeFileSync(newPath, buffer);
                
                return { 
                    success: true, 
                    filename: newName, 
                    path: newPath,
                    size: buffer.length,
                    warning: `File đã tồn tại, lưu với tên mới: ${newName}`
                };
            }

            const buffer = Buffer.from(base64Data, 'base64');
            fs.writeFileSync(filePath, buffer);

            return { 
                success: true, 
                filename: safeName, 
                path: filePath,
                size: buffer.length
            };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Lấy danh sách file trong thư mục
     */
    listFiles(type) {
        try {
            const dirPath = this.getUploadPath(type);
            
            if (!fs.existsSync(dirPath)) {
                return { success: true, files: [] };
            }

            const files = fs.readdirSync(dirPath).map(filename => {
                const filePath = path.join(dirPath, filename);
                const stats = fs.statSync(filePath);
                return {
                    name: filename,
                    size: stats.size,
                    modified: stats.mtime,
                    isDirectory: stats.isDirectory()
                };
            }).filter(f => !f.isDirectory);

            return { success: true, files };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Xóa file
     */
    deleteFile(type, filename) {
        try {
            // Kiểm tra tên file an toàn
            if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
                return { success: false, error: 'Tên file không hợp lệ' };
            }

            const filePath = path.join(this.getUploadPath(type), filename);
            
            if (!fs.existsSync(filePath)) {
                return { success: false, error: 'File không tồn tại' };
            }

            fs.unlinkSync(filePath);
            return { success: true, message: `Đã xóa ${filename}` };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Lấy thông tin các thư mục upload
     */
    getUploadInfo() {
        const info = {};
        
        for (const [type, subDir] of Object.entries(this.uploadDirs)) {
            const dirPath = this.getUploadPath(type);
            let count = 0;
            let totalSize = 0;

            if (fs.existsSync(dirPath)) {
                const files = fs.readdirSync(dirPath);
                files.forEach(file => {
                    const filePath = path.join(dirPath, file);
                    const stats = fs.statSync(filePath);
                    if (!stats.isDirectory()) {
                        count++;
                        totalSize += stats.size;
                    }
                });
            }

            info[type] = {
                path: dirPath,
                count,
                totalSize,
                exists: fs.existsSync(dirPath)
            };
        }

        return info;
    }
}

module.exports = new UploadManager();
