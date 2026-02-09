// UI компонент для отображения WiFi диагностики

class WiFiDiagnosticsUI {
    constructor(diagnostics) {
        this.diagnostics = diagnostics || new WiFiDiagnostics();
        this.container = null;
        this.isMinimized = false;
        this.autoUpdate = true;
        this.updateInterval = null;
    }

    // Создание UI панели
    createPanel() {
        // Создаем контейнер для панели диагностики
        this.container = document.createElement('div');
        this.container.id = 'wifi-diagnostics-panel';
        this.container.className = 'wifi-diagnostics-panel';
        
        // Проверяем поддержку API
        if (!WiFiDiagnostics.isSupported()) {
            this.container.innerHTML = `
                <div class="wifi-diagnostics-header">
                    <span>🌐 Диагностика Сети</span>
                    <button class="close-btn" onclick="this.closest('.wifi-diagnostics-panel').remove()">✕</button>
                </div>
                <div class="wifi-diagnostics-content">
                    <p class="warning">⚠️ Network Information API не поддерживается в вашем браузере.</p>
                    <p class="info">Попробуйте использовать современный браузер (Chrome, Edge, Opera).</p>
                </div>
            `;
            return this.container;
        }

        // Создаем структуру панели
        this.container.innerHTML = `
            <div class="wifi-diagnostics-header">
                <span>🌐 Диагностика Сети</span>
                <div class="header-controls">
                    <button class="minimize-btn" title="Свернуть/Развернуть">_</button>
                    <button class="refresh-btn" title="Обновить">🔄</button>
                    <button class="close-btn" title="Закрыть">✕</button>
                </div>
            </div>
            <div class="wifi-diagnostics-content">
                <div class="diagnostics-info" id="diagnostics-info">
                    <div class="loading">Загрузка данных...</div>
                </div>
                <div class="diagnostics-controls">
                    <label>
                        <input type="checkbox" id="auto-update-checkbox" checked>
                        Автообновление (каждые 5 сек)
                    </label>
                    <button class="export-btn" id="export-json-btn">📋 Экспорт JSON</button>
                </div>
            </div>
        `;

        // Настройка обработчиков событий
        this.setupEventHandlers();
        
        // Первоначальное обновление данных
        this.updateDisplay();
        
        // Запуск автообновления
        this.startAutoUpdate();

        return this.container;
    }

    // Настройка обработчиков событий
    setupEventHandlers() {
        // Кнопка сворачивания
        const minimizeBtn = this.container.querySelector('.minimize-btn');
        minimizeBtn.addEventListener('click', () => this.toggleMinimize());

        // Кнопка обновления
        const refreshBtn = this.container.querySelector('.refresh-btn');
        refreshBtn.addEventListener('click', () => this.updateDisplay());

        // Кнопка закрытия
        const closeBtn = this.container.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => this.close());

        // Чекбокс автообновления
        const autoUpdateCheckbox = this.container.querySelector('#auto-update-checkbox');
        autoUpdateCheckbox.addEventListener('change', (e) => {
            this.autoUpdate = e.target.checked;
            if (this.autoUpdate) {
                this.startAutoUpdate();
            } else {
                this.stopAutoUpdate();
            }
        });

        // Кнопка экспорта JSON
        const exportBtn = this.container.querySelector('#export-json-btn');
        exportBtn.addEventListener('click', () => this.exportJSON());

        // Слушатель изменений соединения
        this.diagnostics.onChange((data) => {
            if (!this.autoUpdate) {
                this.showNotification('Соединение изменилось');
            }
        });
    }

    // Обновление отображаемых данных
    updateDisplay() {
        const infoContainer = this.container.querySelector('#diagnostics-info');
        const data = this.diagnostics.getDiagnostics();
        const quality = this.diagnostics.getConnectionQuality();

        if (!data) {
            infoContainer.innerHTML = '<p class="error">Не удалось получить данные</p>';
            return;
        }

        // Определение иконок и цветов качества
        const qualityConfig = {
            excellent: { icon: '🟢', color: '#27ae60', label: 'Отлично' },
            good: { icon: '🟡', color: '#f39c12', label: 'Хорошо' },
            fair: { icon: '🟠', color: '#e67e22', label: 'Средне' },
            poor: { icon: '🔴', color: '#e74c3c', label: 'Плохо' },
            unknown: { icon: '⚪', color: '#95a5a6', label: 'Неизвестно' }
        };

        const qConfig = qualityConfig[quality.quality] || qualityConfig.unknown;

        // Определение типа соединения
        const typeLabels = {
            'slow-2g': 'Медленное 2G',
            '2g': '2G',
            '3g': '3G',
            '4g': '4G',
            'wifi': 'WiFi',
            'cellular': 'Мобильная сеть',
            'ethernet': 'Ethernet',
            'bluetooth': 'Bluetooth',
            'unknown': 'Неизвестно'
        };

        // Проверка пригодности для различных типов медиа
        const videoCheck = this.diagnostics.isGoodForMedia('video');
        const audioCheck = this.diagnostics.isGoodForMedia('audio');

        infoContainer.innerHTML = `
            <div class="quality-indicator" style="background: ${qConfig.color};">
                <span class="quality-icon">${qConfig.icon}</span>
                <span class="quality-text">${quality.message}</span>
                <span class="quality-score">${quality.score}/6</span>
            </div>
            
            <div class="diagnostics-grid">
                <div class="diag-item">
                    <span class="diag-label">📱 Эффективный тип:</span>
                    <span class="diag-value">${typeLabels[data.effectiveType] || data.effectiveType}</span>
                </div>
                
                <div class="diag-item">
                    <span class="diag-label">🔌 Тип подключения:</span>
                    <span class="diag-value">${typeLabels[data.type] || data.type}</span>
                </div>
                
                <div class="diag-item">
                    <span class="diag-label">⬇️ Скорость загрузки:</span>
                    <span class="diag-value">${data.downlink} Мбит/с</span>
                </div>
                
                <div class="diag-item">
                    <span class="diag-label">⏱️ Задержка (RTT):</span>
                    <span class="diag-value">${data.rtt} мс</span>
                </div>
                
                <div class="diag-item">
                    <span class="diag-label">💾 Режим экономии:</span>
                    <span class="diag-value">${data.saveData ? '✅ Включен' : '❌ Выключен'}</span>
                </div>
                
                <div class="diag-item">
                    <span class="diag-label">🕐 Последнее обновление:</span>
                    <span class="diag-value">${new Date(data.timestamp).toLocaleTimeString()}</span>
                </div>
            </div>
            
            <div class="media-suitability">
                <h4>Пригодность для загрузки контента:</h4>
                <div class="media-checks">
                    <div class="media-check ${videoCheck?.suitable ? 'suitable' : 'not-suitable'}">
                        <span>${videoCheck?.suitable ? '✅' : '❌'}</span>
                        <span>Видео</span>
                    </div>
                    <div class="media-check ${audioCheck?.suitable ? 'suitable' : 'not-suitable'}">
                        <span>${audioCheck?.suitable ? '✅' : '❌'}</span>
                        <span>Аудио</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Сворачивание/разворачивание панели
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        const content = this.container.querySelector('.wifi-diagnostics-content');
        const minimizeBtn = this.container.querySelector('.minimize-btn');
        
        if (this.isMinimized) {
            content.style.display = 'none';
            minimizeBtn.textContent = '□';
        } else {
            content.style.display = 'block';
            minimizeBtn.textContent = '_';
        }
    }

    // Закрытие панели
    close() {
        this.stopAutoUpdate();
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }

    // Запуск автообновления
    startAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.updateInterval = setInterval(() => {
            if (this.autoUpdate && !this.isMinimized) {
                this.updateDisplay();
            }
        }, 5000); // Обновление каждые 5 секунд
    }

    // Остановка автообновления
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    // Экспорт данных в JSON
    exportJSON() {
        const jsonData = this.diagnostics.exportJSON();
        
        // Создание Blob и скачивание
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wifi-diagnostics-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('JSON экспортирован');
    }

    // Показать уведомление
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'wifi-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }

    // Показать панель на странице
    show() {
        if (!this.container) {
            this.createPanel();
        }
        document.body.appendChild(this.container);
    }
}

// Глобальная функция для быстрого запуска диагностики
function showWiFiDiagnostics() {
    const diagnostics = new WiFiDiagnostics();
    const ui = new WiFiDiagnosticsUI(diagnostics);
    ui.show();
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WiFiDiagnosticsUI;
}
