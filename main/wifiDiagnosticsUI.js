// WiFi Diagnostics UI Controller
// Контроллер интерфейса для диагностики WiFi

document.addEventListener('DOMContentLoaded', () => {
    const diagnostics = new WiFiDiagnostics();
    let isMonitoring = false;
    let monitoringLogs = [];
    
    // Элементы DOM
    const runDiagnosticsBtn = document.getElementById('runDiagnostics');
    const startMonitoringBtn = document.getElementById('startMonitoring');
    const stopMonitoringBtn = document.getElementById('stopMonitoring');
    const exportResultsBtn = document.getElementById('exportResults');
    
    const statusValue = document.getElementById('statusValue');
    const onlineStatusContainer = document.getElementById('onlineStatus');
    const connectionInfoContainer = document.getElementById('connectionInfo');
    const latencyInfoContainer = document.getElementById('latencyInfo');
    const speedInfoContainer = document.getElementById('speedInfo');
    const systemInfoContainer = document.getElementById('systemInfo');
    const monitoringCard = document.getElementById('monitoringCard');
    const monitoringLog = document.getElementById('monitoringLog');
    
    // Обновить статус онлайн/офлайн
    function updateOnlineStatus() {
        const status = diagnostics.getOnlineStatus();
        const statusText = status.online ? 
            '<span class="status-online">🟢 Онлайн</span>' : 
            '<span class="status-offline">🔴 Офлайн</span>';
        
        statusValue.innerHTML = statusText;
        
        onlineStatusContainer.innerHTML = `
            <div class="info-row">
                <span class="info-label">Статус:</span>
                <span class="info-value">${statusText}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Последняя проверка:</span>
                <span class="info-value">${new Date(status.timestamp).toLocaleString('ru-RU')}</span>
            </div>
        `;
    }
    
    // Отобразить информацию о соединении
    function displayConnectionInfo(connectionInfo) {
        if (!connectionInfo.supported) {
            connectionInfoContainer.innerHTML = `
                <div class="alert alert-warning">
                    ⚠️ ${connectionInfo.message}
                    <br><small>Network Information API поддерживается в Chrome, Edge и Opera</small>
                </div>
            `;
            return;
        }
        
        const typeEmoji = {
            'wifi': '📶',
            'cellular': '📱',
            'ethernet': '🔌',
            'unknown': '❓'
        };
        
        const effectiveTypeText = {
            'slow-2g': 'Очень медленное (Slow 2G)',
            '2g': 'Медленное (2G)',
            '3g': 'Среднее (3G)',
            '4g': 'Быстрое (4G/LTE)',
            'unknown': 'Неизвестно'
        };
        
        connectionInfoContainer.innerHTML = `
            <div class="info-row">
                <span class="info-label">Тип соединения:</span>
                <span class="info-value">${typeEmoji[connectionInfo.type] || '❓'} ${connectionInfo.type}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Качество соединения:</span>
                <span class="info-value">${effectiveTypeText[connectionInfo.effectiveType] || connectionInfo.effectiveType}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Скорость загрузки:</span>
                <span class="info-value">${connectionInfo.downlink} Mbps</span>
            </div>
            ${connectionInfo.downlinkMax ? `
            <div class="info-row">
                <span class="info-label">Максимальная скорость:</span>
                <span class="info-value">${connectionInfo.downlinkMax} Mbps</span>
            </div>
            ` : ''}
            <div class="info-row">
                <span class="info-label">RTT (Round Trip Time):</span>
                <span class="info-value">${connectionInfo.rtt} ms</span>
            </div>
            <div class="info-row">
                <span class="info-label">Режим экономии трафика:</span>
                <span class="info-value">${connectionInfo.saveData ? '✅ Включен' : '❌ Выключен'}</span>
            </div>
        `;
    }
    
    // Отобразить информацию о задержке
    function displayLatencyInfo(latencyInfo) {
        if (!latencyInfo.success) {
            latencyInfoContainer.innerHTML = `
                <div class="alert alert-warning">
                    ⚠️ Ошибка при измерении задержки: ${latencyInfo.error}
                </div>
            `;
            return;
        }
        
        const getLatencyQuality = (latency) => {
            if (latency < 50) return { text: 'Отлично', color: '#27ae60' };
            if (latency < 100) return { text: 'Хорошо', color: '#f39c12' };
            if (latency < 200) return { text: 'Средне', color: '#e67e22' };
            return { text: 'Плохо', color: '#e74c3c' };
        };
        
        const quality = getLatencyQuality(parseFloat(latencyInfo.average));
        
        latencyInfoContainer.innerHTML = `
            <div class="info-row">
                <span class="info-label">Средняя задержка:</span>
                <span class="info-value" style="color: ${quality.color}; font-weight: bold;">
                    ${latencyInfo.average} ms (${quality.text})
                </span>
            </div>
            <div class="info-row">
                <span class="info-label">Минимальная:</span>
                <span class="info-value">${latencyInfo.min} ms</span>
            </div>
            <div class="info-row">
                <span class="info-label">Максимальная:</span>
                <span class="info-value">${latencyInfo.max} ms</span>
            </div>
            <div class="info-row">
                <span class="info-label">Все измерения:</span>
                <span class="info-value">${latencyInfo.measurements.join(', ')} ms</span>
            </div>
        `;
    }
    
    // Отобразить информацию о скорости
    function displaySpeedInfo(speedInfo) {
        if (!speedInfo.success) {
            speedInfoContainer.innerHTML = `
                <div class="alert alert-warning">
                    ⚠️ Ошибка при измерении скорости: ${speedInfo.error}
                </div>
            `;
            return;
        }
        
        const speedMbps = parseFloat(speedInfo.speedMbps);
        const getSpeedQuality = (speed) => {
            if (speed > 10) return { text: 'Отлично', color: '#27ae60', percent: 100 };
            if (speed > 5) return { text: 'Хорошо', color: '#2ecc71', percent: 75 };
            if (speed > 2) return { text: 'Средне', color: '#f39c12', percent: 50 };
            return { text: 'Медленно', color: '#e74c3c', percent: 25 };
        };
        
        const quality = getSpeedQuality(speedMbps);
        
        speedInfoContainer.innerHTML = `
            <div class="info-row">
                <span class="info-label">Скорость загрузки:</span>
                <span class="info-value" style="color: ${quality.color}; font-weight: bold;">
                    ${speedInfo.speedMbps} Mbps (${quality.text})
                </span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${quality.percent}%">
                    ${quality.percent}%
                </div>
            </div>
            <div class="info-row">
                <span class="info-label">Скорость (Kbps):</span>
                <span class="info-value">${speedInfo.speedKbps} Kbps</span>
            </div>
            <div class="info-row">
                <span class="info-label">Размер тестового файла:</span>
                <span class="info-value">${(speedInfo.fileSize / 1024).toFixed(2)} KB</span>
            </div>
            <div class="info-row">
                <span class="info-label">Время загрузки:</span>
                <span class="info-value">${speedInfo.duration.toFixed(2)} ms</span>
            </div>
        `;
    }
    
    // Отобразить информацию о системе
    function displaySystemInfo(systemInfo) {
        systemInfoContainer.innerHTML = `
            <div class="info-row">
                <span class="info-label">Платформа:</span>
                <span class="info-value">${systemInfo.platform}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Язык:</span>
                <span class="info-value">${systemInfo.language}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Cookies включены:</span>
                <span class="info-value">${systemInfo.cookieEnabled ? '✅ Да' : '❌ Нет'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Память устройства:</span>
                <span class="info-value">${systemInfo.deviceMemory !== 'unknown' ? systemInfo.deviceMemory + ' GB' : 'Неизвестно'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Процессорные ядра:</span>
                <span class="info-value">${systemInfo.hardwareConcurrency !== 'unknown' ? systemInfo.hardwareConcurrency : 'Неизвестно'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Сенсорные точки:</span>
                <span class="info-value">${systemInfo.maxTouchPoints}</span>
            </div>
            <div class="info-row" style="border-bottom: none;">
                <span class="info-label">User Agent:</span>
                <span class="info-value" style="font-size: 12px; word-break: break-all;">${systemInfo.userAgent}</span>
            </div>
        `;
    }
    
    // Запустить полную диагностику
    async function runFullDiagnostics() {
        runDiagnosticsBtn.disabled = true;
        runDiagnosticsBtn.innerHTML = '<span class="loading-spinner"></span> Диагностика...';
        
        try {
            const results = await diagnostics.runFullDiagnostics();
            
            updateOnlineStatus();
            displayConnectionInfo(results.connectionType);
            displayLatencyInfo(results.latency);
            displaySpeedInfo(results.downloadSpeed);
            displaySystemInfo(results.systemInfo);
            
            exportResultsBtn.disabled = false;
            
            // Показать уведомление об успехе
            showNotification('✅ Диагностика завершена успешно!', 'success');
        } catch (error) {
            showNotification('❌ Ошибка при выполнении диагностики: ' + error.message, 'error');
        } finally {
            runDiagnosticsBtn.disabled = false;
            runDiagnosticsBtn.innerHTML = '🔍 Запустить диагностику';
        }
    }
    
    // Начать мониторинг
    function startMonitoring() {
        isMonitoring = true;
        monitoringLogs = [];
        monitoringCard.style.display = 'block';
        startMonitoringBtn.disabled = true;
        stopMonitoringBtn.disabled = false;
        
        addLogEntry('📊 Мониторинг начат');
        
        diagnostics.startMonitoring((event, data) => {
            const timestamp = new Date().toLocaleTimeString('ru-RU');
            let message = '';
            
            switch(event) {
                case 'connection':
                    message = `Изменение соединения: ${data.effectiveType || 'unknown'} (${data.downlink} Mbps, RTT: ${data.rtt} ms)`;
                    break;
                case 'online':
                    message = '🟢 Соединение восстановлено';
                    updateOnlineStatus();
                    break;
                case 'offline':
                    message = '🔴 Соединение потеряно';
                    updateOnlineStatus();
                    break;
            }
            
            addLogEntry(`[${timestamp}] ${message}`);
        });
        
        showNotification('📊 Мониторинг запущен', 'info');
    }
    
    // Остановить мониторинг
    function stopMonitoring() {
        isMonitoring = false;
        diagnostics.stopMonitoring();
        startMonitoringBtn.disabled = false;
        stopMonitoringBtn.disabled = true;
        
        addLogEntry('⏹ Мониторинг остановлен');
        showNotification('⏹ Мониторинг остановлен', 'info');
    }
    
    // Добавить запись в журнал
    function addLogEntry(message) {
        monitoringLogs.push(message);
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.textContent = message;
        
        if (monitoringLog.firstChild && monitoringLog.firstChild.textContent === 'Мониторинг не запущен') {
            monitoringLog.innerHTML = '';
        }
        
        monitoringLog.appendChild(logEntry);
        monitoringLog.scrollTop = monitoringLog.scrollHeight;
    }
    
    // Экспортировать результаты
    function exportResults() {
        const results = diagnostics.exportResults('json');
        const blob = new Blob([results], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wifi-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('💾 Результаты экспортированы', 'success');
    }
    
    // Показать уведомление
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type}`;
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        notification.style.minWidth = '300px';
        notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    // Обработчики событий
    runDiagnosticsBtn.addEventListener('click', runFullDiagnostics);
    startMonitoringBtn.addEventListener('click', startMonitoring);
    stopMonitoringBtn.addEventListener('click', stopMonitoring);
    exportResultsBtn.addEventListener('click', exportResults);
    
    // Обновить начальный статус
    updateOnlineStatus();
    
    // Обработчики событий онлайн/офлайн
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
});
