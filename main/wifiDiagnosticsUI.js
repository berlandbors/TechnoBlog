// WiFi Diagnostics UI Module - Модуль UI для диагностики WiFi
// Создает интерфейс для отображения результатов диагностики

class WiFiDiagnosticsUI {
    constructor(diagnostics) {
        this.diagnostics = diagnostics;
        this.modal = null;
        this.isRunning = false;
    }

    // Создание модального окна
    createModal() {
        // Создаем модальное окно
        this.modal = document.createElement('div');
        this.modal.id = 'wifiDiagnosticsModal';
        this.modal.className = 'wifi-modal';
        this.modal.style.display = 'none';
        
        this.modal.innerHTML = `
            <div class="wifi-modal-content">
                <div class="wifi-modal-header">
                    <h2>🌐 Диагностика WiFi и сети</h2>
                    <span class="wifi-close" id="wifiCloseModal">&times;</span>
                </div>
                
                <div class="wifi-modal-body">
                    <!-- Статус соединения -->
                    <div class="wifi-status-section">
                        <h3>Текущий статус</h3>
                        <div id="wifiCurrentStatus" class="wifi-status-card">
                            <div class="wifi-status-indicator" id="wifiStatusIndicator">
                                <span class="wifi-status-icon">🔄</span>
                                <span class="wifi-status-text">Проверка...</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Информация о соединении -->
                    <div class="wifi-info-section">
                        <h3>Информация о соединении</h3>
                        <div id="wifiConnectionInfo" class="wifi-info-grid">
                            <p class="wifi-loading">Загрузка данных...</p>
                        </div>
                    </div>
                    
                    <!-- Результаты тестов -->
                    <div class="wifi-tests-section">
                        <h3>Результаты тестов</h3>
                        <div id="wifiTestResults" class="wifi-test-results">
                            <p class="wifi-info">Нажмите "Запустить диагностику" для начала тестов</p>
                        </div>
                    </div>
                    
                    <!-- Кнопки управления -->
                    <div class="wifi-actions">
                        <button id="wifiRunDiagnostics" class="wifi-btn wifi-btn-primary">
                            🔍 Запустить диагностику
                        </button>
                        <button id="wifiRefreshInfo" class="wifi-btn wifi-btn-secondary">
                            🔄 Обновить информацию
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
        this.attachEventListeners();
        this.updateCurrentStatus();
        this.updateConnectionInfo();
    }

    // Присоединение обработчиков событий
    attachEventListeners() {
        // Закрытие модального окна
        const closeBtn = document.getElementById('wifiCloseModal');
        closeBtn.addEventListener('click', () => this.hide());
        
        // Закрытие при клике вне окна
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
        
        // Кнопка запуска диагностики
        const runBtn = document.getElementById('wifiRunDiagnostics');
        runBtn.addEventListener('click', () => this.runDiagnostics());
        
        // Кнопка обновления информации
        const refreshBtn = document.getElementById('wifiRefreshInfo');
        refreshBtn.addEventListener('click', () => {
            this.updateCurrentStatus();
            this.updateConnectionInfo();
        });
        
        // Обновление статуса при изменении соединения
        this.diagnostics.onStatusChange = () => this.updateCurrentStatus();
        this.diagnostics.onConnectionChange = () => this.updateConnectionInfo();
    }

    // Показать модальное окно
    show() {
        if (!this.modal) {
            this.createModal();
        }
        this.modal.style.display = 'block';
        this.updateCurrentStatus();
        this.updateConnectionInfo();
    }

    // Скрыть модальное окно
    hide() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }

    // Обновление текущего статуса
    updateCurrentStatus() {
        const statusIndicator = document.getElementById('wifiStatusIndicator');
        if (!statusIndicator) return;
        
        const quality = this.diagnostics.getConnectionQuality();
        
        const icons = {
            'offline': '🔴',
            'online': '🟢',
            'excellent': '🟢',
            'good': '🟡',
            'poor': '🟠',
            'slow': '🔴'
        };
        
        statusIndicator.innerHTML = `
            <span class="wifi-status-icon" style="color: ${quality.color};">${icons[quality.status] || '🔵'}</span>
            <span class="wifi-status-text">${quality.message}</span>
        `;
    }

    // Обновление информации о соединении
    updateConnectionInfo() {
        const infoContainer = document.getElementById('wifiConnectionInfo');
        if (!infoContainer) return;
        
        const info = this.diagnostics.getConnectionInfo();
        const formatted = this.diagnostics.formatDiagnosticData(info);
        
        let html = '';
        for (const [key, value] of Object.entries(formatted)) {
            html += `
                <div class="wifi-info-item">
                    <span class="wifi-info-label">${key}:</span>
                    <span class="wifi-info-value">${value}</span>
                </div>
            `;
        }
        
        infoContainer.innerHTML = html;
    }

    // Запуск диагностики
    async runDiagnostics() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        const runBtn = document.getElementById('wifiRunDiagnostics');
        const resultsContainer = document.getElementById('wifiTestResults');
        
        // Изменяем текст кнопки
        const originalText = runBtn.innerHTML;
        runBtn.innerHTML = '⏳ Выполнение тестов...';
        runBtn.disabled = true;
        
        // Показываем индикатор загрузки
        resultsContainer.innerHTML = `
            <div class="wifi-loading-spinner">
                <div class="spinner"></div>
                <p>Выполнение диагностики...</p>
            </div>
        `;
        
        try {
            // Запускаем диагностику
            const results = await this.diagnostics.runFullDiagnostics();
            
            // Отображаем результаты
            this.displayResults(results);
        } catch (error) {
            resultsContainer.innerHTML = `
                <div class="wifi-error">
                    <p>❌ Ошибка при выполнении диагностики:</p>
                    <p>${error.message}</p>
                </div>
            `;
        } finally {
            // Восстанавливаем кнопку
            runBtn.innerHTML = originalText;
            runBtn.disabled = false;
            this.isRunning = false;
        }
    }

    // Отображение результатов
    displayResults(results) {
        const resultsContainer = document.getElementById('wifiTestResults');
        
        let html = '<div class="wifi-results">';
        
        // Результаты теста задержки
        if (results.latency && results.latency.success) {
            const lat = results.latency;
            html += `
                <div class="wifi-result-card">
                    <h4>📊 Задержка (Ping)</h4>
                    <div class="wifi-result-details">
                        <p><strong>Средняя:</strong> ${lat.avgLatency} мс</p>
                        <p><strong>Минимальная:</strong> ${lat.minLatency} мс</p>
                        <p><strong>Максимальная:</strong> ${lat.maxLatency} мс</p>
                        <p><strong>Успешных попыток:</strong> ${lat.successful} из ${lat.attempts}</p>
                    </div>
                    <div class="wifi-quality-bar">
                        ${this.getLatencyQualityBar(lat.avgLatency)}
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="wifi-result-card wifi-error">
                    <h4>📊 Задержка (Ping)</h4>
                    <p>❌ Не удалось измерить задержку</p>
                </div>
            `;
        }
        
        // Результаты теста скорости
        if (results.downloadSpeed && results.downloadSpeed.success) {
            const speed = results.downloadSpeed;
            html += `
                <div class="wifi-result-card">
                    <h4>⬇️ Скорость загрузки</h4>
                    <div class="wifi-result-details">
                        <p><strong>Скорость:</strong> ${speed.speedKbps} Кбит/с (${speed.speedMbps} Мбит/с)</p>
                        <p><strong>Размер файла:</strong> ${speed.fileSizeKb} КБ</p>
                        <p><strong>Время загрузки:</strong> ${speed.durationMs} мс</p>
                    </div>
                    <div class="wifi-quality-bar">
                        ${this.getSpeedQualityBar(speed.speedMbps)}
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="wifi-result-card wifi-error">
                    <h4>⬇️ Скорость загрузки</h4>
                    <p>❌ Не удалось измерить скорость</p>
                </div>
            `;
        }
        
        // Информация о соединении
        html += `
            <div class="wifi-result-card">
                <h4>ℹ️ Информация о соединении</h4>
                <div class="wifi-result-details">
                    <p><strong>Статус:</strong> ${results.connection.online ? '🟢 Онлайн' : '🔴 Оффлайн'}</p>
                    ${results.connection.connectionType ? `<p><strong>Тип:</strong> ${this.diagnostics.formatConnectionType(results.connection.connectionType)}</p>` : ''}
                    ${results.connection.effectiveType ? `<p><strong>Эффективный тип:</strong> ${this.diagnostics.formatEffectiveType(results.connection.effectiveType)}</p>` : ''}
                    ${results.connection.downlink ? `<p><strong>Downlink:</strong> ${results.connection.downlink} Мбит/с</p>` : ''}
                    ${results.connection.rtt ? `<p><strong>RTT:</strong> ${results.connection.rtt} мс</p>` : ''}
                </div>
            </div>
        `;
        
        html += '</div>';
        
        resultsContainer.innerHTML = html;
    }

    // Индикатор качества задержки
    getLatencyQualityBar(latency) {
        let quality, color, width;
        
        if (latency < 50) {
            quality = 'Отлично';
            color = '#4CAF50';
            width = '100%';
        } else if (latency < 100) {
            quality = 'Хорошо';
            color = '#8BC34A';
            width = '75%';
        } else if (latency < 200) {
            quality = 'Удовлетворительно';
            color = '#FFC107';
            width = '50%';
        } else if (latency < 500) {
            quality = 'Плохо';
            color = '#FF9800';
            width = '25%';
        } else {
            quality = 'Очень плохо';
            color = '#F44336';
            width = '10%';
        }
        
        return `
            <div class="quality-bar-container">
                <div class="quality-bar" style="width: ${width}; background-color: ${color};"></div>
            </div>
            <p class="quality-text">${quality}</p>
        `;
    }

    // Индикатор качества скорости
    getSpeedQualityBar(speedMbps) {
        let quality, color, width;
        
        if (speedMbps > 10) {
            quality = 'Отлично';
            color = '#4CAF50';
            width = '100%';
        } else if (speedMbps > 5) {
            quality = 'Хорошо';
            color = '#8BC34A';
            width = '75%';
        } else if (speedMbps > 1) {
            quality = 'Удовлетворительно';
            color = '#FFC107';
            width = '50%';
        } else if (speedMbps > 0.5) {
            quality = 'Плохо';
            color = '#FF9800';
            width = '25%';
        } else {
            quality = 'Очень плохо';
            color = '#F44336';
            width = '10%';
        }
        
        return `
            <div class="quality-bar-container">
                <div class="quality-bar" style="width: ${width}; background-color: ${color};"></div>
            </div>
            <p class="quality-text">${quality}</p>
        `;
    }

    // Создание кнопки для открытия диагностики
    createTriggerButton() {
        const button = document.createElement('button');
        button.id = 'wifiDiagnosticsButton';
        button.className = 'wifi-trigger-button';
        button.innerHTML = '📶 WiFi';
        button.title = 'Диагностика WiFi и сети';
        
        button.addEventListener('click', () => this.show());
        
        document.body.appendChild(button);
        
        return button;
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WiFiDiagnosticsUI;
}
