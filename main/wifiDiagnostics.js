// WiFi Diagnostics Module - Модуль диагностики WiFi и сети
// Использует браузерные API для получения информации о сетевом соединении

class WiFiDiagnostics {
    constructor() {
        this.diagnosticData = {
            online: navigator.onLine,
            connectionType: null,
            effectiveType: null,
            downlink: null,
            rtt: null,
            saveData: null,
            timestamp: null
        };
        
        this.initEventListeners();
    }

    // Инициализация слушателей событий
    initEventListeners() {
        // Отслеживание изменения статуса online/offline
        window.addEventListener('online', () => this.updateOnlineStatus(true));
        window.addEventListener('offline', () => this.updateOnlineStatus(false));
        
        // Отслеживание изменений в соединении (если API доступен)
        if (navigator.connection) {
            navigator.connection.addEventListener('change', () => this.updateConnectionInfo());
        }
    }

    // Обновление статуса online/offline
    updateOnlineStatus(isOnline) {
        this.diagnosticData.online = isOnline;
        this.diagnosticData.timestamp = new Date().toISOString();
        
        // Вызов callback если установлен
        if (this.onStatusChange) {
            this.onStatusChange(this.diagnosticData);
        }
    }

    // Получение информации о соединении
    getConnectionInfo() {
        if (navigator.connection) {
            const conn = navigator.connection;
            
            this.diagnosticData.connectionType = conn.type || 'unknown';
            this.diagnosticData.effectiveType = conn.effectiveType || 'unknown';
            this.diagnosticData.downlink = conn.downlink || null; // Мбит/с
            this.diagnosticData.rtt = conn.rtt || null; // Round-trip time в мс
            this.diagnosticData.saveData = conn.saveData || false;
        }
        
        this.diagnosticData.online = navigator.onLine;
        this.diagnosticData.timestamp = new Date().toISOString();
        
        return this.diagnosticData;
    }

    // Обновление информации о соединении
    updateConnectionInfo() {
        this.getConnectionInfo();
        
        if (this.onConnectionChange) {
            this.onConnectionChange(this.diagnosticData);
        }
    }

    // Измерение скорости загрузки (простой тест)
    // Можно передать собственный URL для тестирования
    async measureDownloadSpeed(testUrl = null) {
        // Если URL не указан, используем относительный путь к небольшому файлу на том же домене
        if (!testUrl) {
            // Пытаемся использовать небольшой локальный файл, если доступен
            testUrl = window.location.origin + '/icons/PBAB.jpg';
        }
        try {
            const startTime = performance.now();
            const response = await fetch(testUrl + '?t=' + Date.now(), {
                method: 'GET',
                cache: 'no-cache'
            });
            
            const blob = await response.blob();
            const endTime = performance.now();
            
            const durationMs = endTime - startTime;
            const fileSizeBytes = blob.size;
            const fileSizeKb = fileSizeBytes / 1024;
            const speedKbps = (fileSizeKb / durationMs) * 1000;
            
            return {
                success: true,
                durationMs: Math.round(durationMs),
                fileSizeKb: Math.round(fileSizeKb * 100) / 100,
                speedKbps: Math.round(speedKbps * 100) / 100,
                speedMbps: Math.round((speedKbps / 1024) * 100) / 100
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Измерение задержки (ping-подобный тест)
    // Можно передать собственный URL для тестирования
    async measureLatency(testUrl = null, attempts = 3) {
        // Если URL не указан, используем относительный путь к небольшому файлу на том же домене
        if (!testUrl) {
            // Пытаемся использовать небольшой локальный файл, если доступен
            testUrl = window.location.origin + '/icons/PBAB.jpg';
        }
        const results = [];
        
        for (let i = 0; i < attempts; i++) {
            try {
                const startTime = performance.now();
                await fetch(testUrl + '?t=' + Date.now(), {
                    method: 'HEAD',
                    cache: 'no-cache'
                });
                const endTime = performance.now();
                const latency = endTime - startTime;
                results.push(latency);
            } catch (error) {
                results.push(null);
            }
        }
        
        const validResults = results.filter(r => r !== null);
        if (validResults.length === 0) {
            return {
                success: false,
                error: 'Не удалось измерить задержку'
            };
        }
        
        const avgLatency = validResults.reduce((a, b) => a + b, 0) / validResults.length;
        const minLatency = Math.min(...validResults);
        const maxLatency = Math.max(...validResults);
        
        return {
            success: true,
            avgLatency: Math.round(avgLatency),
            minLatency: Math.round(minLatency),
            maxLatency: Math.round(maxLatency),
            attempts: attempts,
            successful: validResults.length
        };
    }

    // Полная диагностика
    async runFullDiagnostics() {
        const results = {
            timestamp: new Date().toISOString(),
            connection: this.getConnectionInfo(),
            latency: await this.measureLatency(),
            downloadSpeed: await this.measureDownloadSpeed()
        };
        
        return results;
    }

    // Получение человекочитаемого статуса качества соединения
    getConnectionQuality() {
        const info = this.getConnectionInfo();
        
        if (!info.online) {
            return {
                status: 'offline',
                message: 'Нет соединения',
                color: 'red'
            };
        }
        
        if (!navigator.connection) {
            return {
                status: 'online',
                message: 'Онлайн',
                color: 'green'
            };
        }
        
        const effectiveType = info.effectiveType;
        const rtt = info.rtt;
        
        if (effectiveType === '4g' || (rtt && rtt < 100)) {
            return {
                status: 'excellent',
                message: 'Отличное соединение',
                color: 'green'
            };
        } else if (effectiveType === '3g' || (rtt && rtt < 300)) {
            return {
                status: 'good',
                message: 'Хорошее соединение',
                color: 'yellowgreen'
            };
        } else if (effectiveType === '2g' || (rtt && rtt < 1000)) {
            return {
                status: 'poor',
                message: 'Слабое соединение',
                color: 'orange'
            };
        } else {
            return {
                status: 'slow',
                message: 'Медленное соединение',
                color: 'red'
            };
        }
    }

    // Форматирование данных для отображения
    formatDiagnosticData(data) {
        const formatted = {
            'Статус': data.online ? '🟢 Онлайн' : '🔴 Оффлайн',
            'Тип соединения': this.formatConnectionType(data.connectionType),
            'Эффективный тип': this.formatEffectiveType(data.effectiveType),
            'Скорость (downlink)': data.downlink ? `${data.downlink} Мбит/с` : 'Недоступно',
            'RTT (задержка)': data.rtt ? `${data.rtt} мс` : 'Недоступно',
            'Режим экономии': data.saveData ? 'Включен' : 'Выключен',
            'Время проверки': new Date(data.timestamp).toLocaleString('ru-RU')
        };
        
        return formatted;
    }

    // Форматирование типа соединения
    formatConnectionType(type) {
        const types = {
            'wifi': '📶 WiFi',
            'cellular': '📱 Сотовая сеть',
            'ethernet': '🔌 Ethernet',
            'bluetooth': '📶 Bluetooth',
            'unknown': '❓ Неизвестно',
            'none': '❌ Нет соединения'
        };
        return types[type] || type || 'Недоступно';
    }

    // Форматирование эффективного типа
    formatEffectiveType(type) {
        const types = {
            'slow-2g': '🐌 Очень медленно (2G)',
            '2g': '🐢 Медленно (2G)',
            '3g': '🚶 Средне (3G)',
            '4g': '🚀 Быстро (4G)',
            'unknown': '❓ Неизвестно'
        };
        return types[type] || type || 'Недоступно';
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WiFiDiagnostics;
}
