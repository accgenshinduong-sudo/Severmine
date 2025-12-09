/**
 * ============================================
 * MINECRAFT PANEL - CONSOLE MODULE
 * ============================================
 * Quản lý console output và input
 */

const Console = {
    element: null,
    maxLines: 500,

    init() {
        this.element = document.getElementById('console');
    },

    addLog(log) {
        if (!this.element) this.init();
        
        const line = document.createElement('div');
        line.className = `console-line ${log.level}`;
        line.textContent = log.text;
        this.element.appendChild(line);
        
        // Auto scroll if near bottom
        if (this.element.scrollHeight - this.element.scrollTop < this.element.clientHeight + 150) {
            this.scrollToBottom();
        }
        
        // Limit lines
        while (this.element.children.length > this.maxLines) {
            this.element.removeChild(this.element.firstChild);
        }
    },

    send() {
        const input = document.getElementById('consoleInput');
        const command = input.value.trim();
        
        if (command) {
            cmd(command);
            input.value = '';
        }
    },

    clear() {
        if (!this.element) this.init();
        this.element.innerHTML = '';
    },

    scrollToBottom() {
        if (!this.element) this.init();
        this.element.scrollTop = this.element.scrollHeight;
    }
};

// Global function for onclick handlers
function sendConsole() {
    Console.send();
}
