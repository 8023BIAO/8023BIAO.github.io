// Kimi Code AI Chat Application
class ChatApp {
    constructor() {
        this.messages = [];
        this.currentChatId = null;
        this.chatHistory = [];
        this.attachedFiles = [];
        this.isGenerating = false;
        this.settings = {
            apiKey: '',
            baseUrl: 'https://api.moonshot.cn/v1',
            model: 'kimi-latest',
            temperature: 0.7,
            maxTokens: 4096
        };
        
        this.init();
    }
    
    init() {
        this.loadSettings();
        this.loadChatHistory();
        this.setupEventListeners();
        this.setupMarked();
        this.renderChatHistory();
        
        // Initialize KaTeX auto-render after page load
        if (typeof renderMathInElement !== 'undefined') {
            this.renderMath();
        }
    }
    
    setupMarked() {
        // Custom renderer for code blocks
        const renderer = new marked.Renderer();
        
        renderer.code = (code, language) => {
            const lang = language || 'text';
            const highlighted = this.highlightCode(code, lang);
            return `
                <div class="code-block">
                    <div class="code-header">
                        <span class="code-lang">${lang}</span>
                        <button class="copy-code-btn" onclick="chatApp.copyCode(this)" data-code="${this.escapeHtml(code)}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            复制
                        </button>
                    </div>
                    <div class="code-content">
                        <pre><code class="language-${lang}">${highlighted}</code></pre>
                    </div>
                </div>
            `;
        };
        
        renderer.codespan = (code) => {
            return `<code>${this.escapeHtml(code)}</code>`;
        };
        
        marked.setOptions({
            renderer: renderer,
            breaks: true,
            gfm: true
        });
    }
    
    highlightCode(code, language) {
        if (typeof hljs !== 'undefined' && hljs.getLanguage(language)) {
            try {
                return hljs.highlight(code, { language }).value;
            } catch (e) {
                console.error('Highlight error:', e);
            }
        }
        return this.escapeHtml(code);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    renderMath() {
        if (typeof renderMathInElement !== 'undefined') {
            renderMathInElement(document.getElementById('messagesList'), {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false}
                ],
                throwOnError: false
            });
        }
    }
    
    setupEventListeners() {
        // Message input
        const input = document.getElementById('messageInput');
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        input.addEventListener('input', () => {
            this.autoResizeTextarea(input);
        });
        
        // Drag and drop
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            document.getElementById('dragOverlay').classList.add('active');
        });
        
        document.addEventListener('dragleave', (e) => {
            if (e.target === document.getElementById('dragOverlay')) {
                document.getElementById('dragOverlay').classList.remove('active');
            }
        });
        
        document.addEventListener('drop', (e) => {
            e.preventDefault();
            document.getElementById('dragOverlay').classList.remove('active');
            
            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files);
        });
        
        // Close modal on overlay click
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeSettings();
            }
        });
        
        // Close sidebar on mobile when clicking outside
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            const toggle = document.querySelector('.sidebar-toggle');
            if (window.innerWidth <= 768 && 
                sidebar.classList.contains('open') &&
                !sidebar.contains(e.target) &&
                !toggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });
    }
    
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
    
    loadSettings() {
        const saved = localStorage.getItem('kimiSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
        
        // Apply settings to form
        document.getElementById('apiKey').value = this.settings.apiKey;
        document.getElementById('baseUrl').value = this.settings.baseUrl;
        document.getElementById('model').value = this.settings.model;
        document.getElementById('temperature').value = this.settings.temperature;
        document.getElementById('maxTokens').value = this.settings.maxTokens;
    }
    
    saveSettings() {
        this.settings = {
            apiKey: document.getElementById('apiKey').value.trim(),
            baseUrl: document.getElementById('baseUrl').value.trim() || 'https://api.moonshot.cn/v1',
            model: document.getElementById('model').value,
            temperature: parseFloat(document.getElementById('temperature').value) || 0.7,
            maxTokens: parseInt(document.getElementById('maxTokens').value) || 4096
        };
        
        localStorage.setItem('kimiSettings', JSON.stringify(this.settings));
        this.closeSettings();
        this.showToast('设置已保存', 'success');
    }
    
    openSettings() {
        document.getElementById('settingsModal').classList.add('active');
    }
    
    closeSettings() {
        document.getElementById('settingsModal').classList.remove('active');
    }
    
    loadChatHistory() {
        const saved = localStorage.getItem('kimiChatHistory');
        if (saved) {
            this.chatHistory = JSON.parse(saved);
        }
    }
    
    saveChatHistory() {
        localStorage.setItem('kimiChatHistory', JSON.stringify(this.chatHistory));
    }
    
    renderChatHistory() {
        const container = document.getElementById('chatHistory');
        container.innerHTML = '';
        
        this.chatHistory.forEach(chat => {
            const item = document.createElement('div');
            item.className = `chat-history-item ${chat.id === this.currentChatId ? 'active' : ''}`;
            item.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${chat.title}</span>
                <button class="delete-btn" onclick="event.stopPropagation(); chatApp.deleteChat('${chat.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            `;
            item.onclick = () => this.loadChat(chat.id);
            container.appendChild(item);
        });
    }
    
    newChat() {
        this.currentChatId = Date.now().toString();
        this.messages = [];
        this.attachedFiles = [];
        this.renderFileList();
        this.renderMessages();
        
        // Add to history
        const title = '新对话';
        this.chatHistory.unshift({ id: this.currentChatId, title, timestamp: Date.now() });
        this.saveChatHistory();
        this.renderChatHistory();
        
        // Update title
        document.getElementById('chatTitle').textContent = title;
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('open');
        }
    }
    
    loadChat(chatId) {
        const saved = localStorage.getItem(`kimiChat_${chatId}`);
        if (saved) {
            const chat = JSON.parse(saved);
            this.currentChatId = chatId;
            this.messages = chat.messages || [];
            document.getElementById('chatTitle').textContent = chat.title || '对话';
            this.renderMessages();
            this.renderChatHistory();
        }
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('open');
        }
    }
    
    deleteChat(chatId) {
        if (confirm('确定要删除这个对话吗？')) {
            this.chatHistory = this.chatHistory.filter(c => c.id !== chatId);
            localStorage.removeItem(`kimiChat_${chatId}`);
            this.saveChatHistory();
            this.renderChatHistory();
            
            if (this.currentChatId === chatId) {
                this.currentChatId = null;
                this.messages = [];
                this.renderMessages();
                document.getElementById('chatTitle').textContent = '新对话';
            }
        }
    }
    
    saveCurrentChat() {
        if (this.currentChatId && this.messages.length > 0) {
            // Update title from first message
            const firstUserMsg = this.messages.find(m => m.role === 'user');
            if (firstUserMsg) {
                const title = firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '');
                const chatIndex = this.chatHistory.findIndex(c => c.id === this.currentChatId);
                if (chatIndex >= 0) {
                    this.chatHistory[chatIndex].title = title;
                    document.getElementById('chatTitle').textContent = title;
                }
            }
            
            localStorage.setItem(`kimiChat_${this.currentChatId}`, JSON.stringify({
                id: this.currentChatId,
                title: document.getElementById('chatTitle').textContent,
                messages: this.messages,
                timestamp: Date.now()
            }));
            this.saveChatHistory();
            this.renderChatHistory();
        }
    }
    
    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('open');
    }
    
    clearChat() {
        if (this.messages.length === 0) return;
        
        if (confirm('确定要清空当前对话吗？')) {
            this.messages = [];
            this.renderMessages();
            this.saveCurrentChat();
        }
    }
    
    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        this.handleFiles(files);
        event.target.value = '';
    }
    
    handleFiles(files) {
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.attachedFiles.push({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    content: e.target.result
                });
                this.renderFileList();
            };
            
            if (file.type.startsWith('image/')) {
                reader.readAsDataURL(file);
            } else {
                reader.readAsText(file);
            }
        });
    }
    
    renderFileList() {
        const container = document.getElementById('fileList');
        container.innerHTML = '';
        
        this.attachedFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            
            let icon = '📄';
            if (file.type.startsWith('image/')) icon = '🖼️';
            else if (file.type.includes('javascript') || file.name.endsWith('.js')) icon = '📜';
            else if (file.type.includes('python') || file.name.endsWith('.py')) icon = '🐍';
            else if (file.name.endsWith('.java')) icon = '☕';
            else if (file.name.endsWith('.html')) icon = '🌐';
            else if (file.name.endsWith('.css')) icon = '🎨';
            else if (file.name.endsWith('.json')) icon = '📋';
            else if (file.name.endsWith('.md')) icon = '📝';
            
            item.innerHTML = `
                <span>${icon}</span>
                <span class="file-name">${file.name}</span>
                <button class="remove-file" onclick="chatApp.removeFile(${index})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            `;
            container.appendChild(item);
        });
    }
    
    removeFile(index) {
        this.attachedFiles.splice(index, 1);
        this.renderFileList();
    }
    
    async sendMessage() {
        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        
        if (!content && this.attachedFiles.length === 0) return;
        if (this.isGenerating) return;
        
        // Check API key
        if (!this.settings.apiKey) {
            this.showToast('请先设置 API Key', 'error');
            this.openSettings();
            return;
        }
        
        // Create new chat if needed
        if (!this.currentChatId) {
            this.newChat();
        }
        
        // Build message content with files
        let messageContent = content;
        if (this.attachedFiles.length > 0) {
            const fileContents = this.attachedFiles.map(f => {
                if (f.type.startsWith('image/')) {
                    return `![${f.name}](${f.content})`;
                } else {
                    return `\n\n---\n**文件: ${f.name}**\n\n\`\`\`\n${f.content.slice(0, 10000)}\n\`\`\``;
                }
            }).join('\n');
            messageContent += fileContents;
        }
        
        // Add user message
        const userMessage = {
            role: 'user',
            content: messageContent,
            timestamp: Date.now()
        };
        this.messages.push(userMessage);
        
        // Clear input and files
        input.value = '';
        input.style.height = 'auto';
        this.attachedFiles = [];
        this.renderFileList();
        this.renderMessages();
        this.scrollToBottom();
        
        // Save chat
        this.saveCurrentChat();
        
        // Generate AI response
        await this.generateResponse();
    }
    
    async generateResponse() {
        this.isGenerating = true;
        document.getElementById('sendBtn').disabled = true;
        
        // Add thinking indicator
        const thinkingId = 'thinking-' + Date.now();
        const thinkingMessage = {
            id: thinkingId,
            role: 'assistant',
            content: '',
            isThinking: true,
            timestamp: Date.now()
        };
        this.messages.push(thinkingMessage);
        this.renderMessages();
        this.scrollToBottom();
        
        try {
            const response = await fetch(`${this.settings.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.settings.apiKey}`
                },
                body: JSON.stringify({
                    model: this.settings.model,
                    messages: this.messages.filter(m => !m.isThinking).map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    temperature: this.settings.temperature,
                    max_tokens: this.settings.maxTokens,
                    stream: true
                })
            });
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error?.message || `HTTP ${response.status}`);
            }
            
            // Remove thinking indicator
            this.messages = this.messages.filter(m => m.id !== thinkingId);
            
            // Add assistant message
            const assistantMessage = {
                role: 'assistant',
                content: '',
                timestamp: Date.now()
            };
            this.messages.push(assistantMessage);
            
            // Stream response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        
                        try {
                            const parsed = JSON.parse(data);
                            const delta = parsed.choices?.[0]?.delta?.content;
                            if (delta) {
                                assistantMessage.content += delta;
                                this.updateLastMessage(assistantMessage.content);
                            }
                        } catch (e) {
                            // Ignore parse errors
                        }
                    }
                }
            }
            
            this.saveCurrentChat();
            
        } catch (error) {
            // Remove thinking indicator
            this.messages = this.messages.filter(m => m.id !== thinkingId);
            
            // Add error message
            this.messages.push({
                role: 'assistant',
                content: `❌ 错误: ${error.message}`,
                isError: true,
                timestamp: Date.now()
            });
            this.renderMessages();
            
            this.showToast(error.message, 'error');
        } finally {
            this.isGenerating = false;
            document.getElementById('sendBtn').disabled = false;
        }
    }
    
    updateLastMessage(content) {
        const messagesList = document.getElementById('messagesList');
        const lastMessage = messagesList.lastElementChild;
        if (lastMessage) {
            const contentDiv = lastMessage.querySelector('.message-content');
            if (contentDiv) {
                contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(content));
                if (typeof hljs !== 'undefined') {
                    contentDiv.querySelectorAll('pre code').forEach(block => {
                        hljs.highlightElement(block);
                    });
                }
                this.renderMath();
            }
        }
        this.scrollToBottom();
    }
    
    renderMessages() {
        const welcomeScreen = document.getElementById('welcomeScreen');
        const messagesList = document.getElementById('messagesList');
        
        if (this.messages.length === 0) {
            welcomeScreen.style.display = 'flex';
            messagesList.style.display = 'none';
            return;
        }
        
        welcomeScreen.style.display = 'none';
        messagesList.style.display = 'block';
        
        messagesList.innerHTML = this.messages.map((msg, index) => {
            if (msg.isThinking) {
                return `
                    <div class="message assistant">
                        <div class="message-avatar">🤖</div>
                        <div class="message-content-wrapper">
                            <div class="message-header">
                                <span>Kimi</span>
                                <span>${this.formatTime(msg.timestamp)}</span>
                            </div>
                            <div class="message-content">
                                <div class="thinking-indicator">
                                    <div class="thinking-dot"></div>
                                    <div class="thinking-dot"></div>
                                    <div class="thinking-dot"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            const isUser = msg.role === 'user';
            const avatar = isUser ? '👤' : '🤖';
            const name = isUser ? '我' : 'Kimi';
            
            let contentHtml;
            if (msg.isError) {
                contentHtml = msg.content;
            } else {
                contentHtml = DOMPurify.sanitize(marked.parse(msg.content));
            }
            
            return `
                <div class="message ${msg.role} ${msg.isError ? 'error' : ''}">
                    <div class="message-avatar">${avatar}</div>
                    <div class="message-content-wrapper">
                        <div class="message-header">
                            <span>${name}</span>
                            <span>${this.formatTime(msg.timestamp)}</span>
                        </div>
                        <div class="message-content">${contentHtml}</div>
                        <div class="message-actions">
                            <button class="message-action-btn" onclick="chatApp.copyMessage(${index})">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                复制
                            </button>
                            ${!isUser ? `
                            <button class="message-action-btn" onclick="chatApp.regenerate(${index})">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="23 4 23 10 17 10"></polyline>
                                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                                </svg>
                                重新生成
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Highlight code blocks
        if (typeof hljs !== 'undefined') {
            messagesList.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
            });
        }
        
        // Render math
        this.renderMath();
    }
    
    scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        container.scrollTop = container.scrollHeight;
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    
    async copyCode(button) {
        const code = button.getAttribute('data-code');
        try {
            await navigator.clipboard.writeText(code);
            button.classList.add('copied');
            button.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                已复制
            `;
            setTimeout(() => {
                button.classList.remove('copied');
                button.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    复制
                `;
            }, 2000);
        } catch (err) {
            this.showToast('复制失败', 'error');
        }
    }
    
    async copyMessage(index) {
        const msg = this.messages[index];
        if (!msg) return;
        
        try {
            await navigator.clipboard.writeText(msg.content);
            this.showToast('已复制到剪贴板', 'success');
        } catch (err) {
            this.showToast('复制失败', 'error');
        }
    }
    
    regenerate(index) {
        // Find the user message before this assistant message
        let userIndex = -1;
        for (let i = index - 1; i >= 0; i--) {
            if (this.messages[i].role === 'user') {
                userIndex = i;
                break;
            }
        }
        
        if (userIndex >= 0) {
            // Remove this and subsequent messages
            this.messages = this.messages.slice(0, index);
            this.renderMessages();
            this.generateResponse();
        }
    }
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';
        
        toast.innerHTML = `${icon} ${message}`;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize app
const chatApp = new ChatApp();
