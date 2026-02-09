// WiFi Diagnostics Web API
// Модуль для диагностики сетевого соединения в браузере

class WiFiDiagnostics {
    constructor() {
        this.connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        this.onlineStatus = navigator.onLine;
        this.diagnosticResults = {};
    }

    // Получить информацию о типе соединения
    getConnectionType() {
        if (!this.connection) {
            return {
                supported: false,
                message: 'Network Information API не поддерживается этим браузером'
            };
        }

        return {
            supported: true,
            type: this.connection.type || 'unknown',
            effectiveType: this.connection.effectiveType || 'unknown',
            downlink: this.connection.downlink || 0,
            downlinkMax: this.connection.downlinkMax || 0,
            rtt: this.connection.rtt || 0,
            saveData: this.connection.saveData || false
        };
    }

    // Проверить статус онлайн/офлайн
    getOnlineStatus() {
        return {
            online: navigator.onLine,
            timestamp: new Date().toISOString()
        };
    }

    // Измерить скорость загрузки
    async measureDownloadSpeed(testFileUrl = null) {
        try {
            // Используем небольшой тестовый файл или создаём случайные данные
            const testUrl = testFileUrl || this.generateTestUrl();
            const startTime = performance.now();
            
            const response = await fetch(testUrl, {
                cache: 'no-cache',
                method: 'GET'
            });
            
            const blob = await response.blob();
            const endTime = performance.now();
            
            const durationMs = endTime - startTime;
            const durationSeconds = durationMs / 1000;
            const fileSizeBytes = blob.size;
            const fileSizeMB = fileSizeBytes / (1024 * 1024);
            const speedMbps = (fileSizeMB * 8) / durationSeconds;
            
            return {
                success: true,
                fileSize: fileSizeBytes,
                duration: durationMs,
                speedMbps: speedMbps.toFixed(2),
                speedKbps: (speedMbps * 1024).toFixed(2)
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Генерировать URL для теста (используем текущий сайт)
    generateTestUrl() {
        // Используем иконку сайта для теста скорости (с абсолютным путем от корня)
        const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
        return baseUrl + '/icons/PBAB.jpg?' + new Date().getTime();
    }

    // Измерить задержку (ping)
    async measureLatency(testUrl = null) {
        try {
            const url = testUrl || window.location.href;
            const measurements = [];
            
            for (let i = 0; i < 5; i++) {
                const startTime = performance.now();
                await fetch(url, {
                    method: 'HEAD',
                    cache: 'no-cache'
                });
                const endTime = performance.now();
                measurements.push(endTime - startTime);
            }
            
            const avgLatency = measurements.reduce((a, b) => a + b, 0) / measurements.length;
            const minLatency = Math.min(...measurements);
            const maxLatency = Math.max(...measurements);
            
            return {
                success: true,
                average: avgLatency.toFixed(2),
                min: minLatency.toFixed(2),
                max: maxLatency.toFixed(2),
                measurements: measurements.map(m => m.toFixed(2))
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Получить информацию о браузере и системе
    getSystemInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            languages: navigator.languages,
            cookieEnabled: navigator.cookieEnabled,
            deviceMemory: navigator.deviceMemory || 'unknown',
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
            maxTouchPoints: navigator.maxTouchPoints || 0
        };
    }

    // Получить информацию о батарее (если доступно)
    async getBatteryInfo() {
        try {
            if ('getBattery' in navigator) {
                const battery = await navigator.getBattery();
                return {
                    supported: true,
                    charging: battery.charging,
                    level: (battery.level * 100).toFixed(0) + '%',
                    chargingTime: battery.chargingTime,
                    dischargingTime: battery.dischargingTime
                };
            } else {
                return {
                    supported: false,
                    message: 'Battery API не поддерживается'
                };
            }
        } catch (error) {
            return {
                supported: false,
                error: error.message
            };
        }
    }

    // Запустить полную диагностику
    async runFullDiagnostics() {
        const results = {
            timestamp: new Date().toISOString(),
            onlineStatus: this.getOnlineStatus(),
            connectionType: this.getConnectionType(),
            systemInfo: this.getSystemInfo(),
            batteryInfo: await this.getBatteryInfo(),
            latency: await this.measureLatency(),
            downloadSpeed: await this.measureDownloadSpeed()
        };

        this.diagnosticResults = results;
        return results;
    }

    // Мониторинг изменений соединения
    startMonitoring(callback) {
        // Сохраняем ссылки на обработчики для корректной очистки
        this._connectionHandler = () => {
            const info = this.getConnectionType();
            callback('connection', info);
        };
        
        this._onlineHandler = () => {
            callback('online', { online: true, timestamp: new Date().toISOString() });
        };
        
        this._offlineHandler = () => {
            callback('offline', { online: false, timestamp: new Date().toISOString() });
        };

        if (this.connection) {
            this.connection.addEventListener('change', this._connectionHandler);
        }

        window.addEventListener('online', this._onlineHandler);
        window.addEventListener('offline', this._offlineHandler);
    }

    // Остановить мониторинг
    stopMonitoring() {
        if (this.connection && this._connectionHandler) {
            this.connection.removeEventListener('change', this._connectionHandler);
        }
        if (this._onlineHandler) {
            window.removeEventListener('online', this._onlineHandler);
        }
        if (this._offlineHandler) {
            window.removeEventListener('offline', this._offlineHandler);
        }
        
        // Очистка ссылок
        this._connectionHandler = null;
        this._onlineHandler = null;
        this._offlineHandler = null;
    }

    // Экспортировать результаты диагностики
    exportResults(format = 'json') {
        if (format === 'json') {
            return JSON.stringify(this.diagnosticResults, null, 2);
        } else if (format === 'text') {
            return this.formatResultsAsText(this.diagnosticResults);
        }
    }

    // Форматировать результаты как текст
    formatResultsAsText(results) {
        let text = '=== Диагностика WiFi/Сети ===\n\n';
        text += `Дата: ${results.timestamp}\n\n`;
        
        text += '--- Статус соединения ---\n';
        text += `Онлайн: ${results.onlineStatus.online ? 'Да' : 'Нет'}\n\n`;
        
        if (results.connectionType.supported) {
            text += '--- Информация о соединении ---\n';
            text += `Тип: ${results.connectionType.type}\n`;
            text += `Эффективный тип: ${results.connectionType.effectiveType}\n`;
            text += `Скорость загрузки: ${results.connectionType.downlink} Mbps\n`;
            text += `RTT: ${results.connectionType.rtt} ms\n\n`;
        }
        
        if (results.latency.success) {
            text += '--- Задержка (Ping) ---\n';
            text += `Средняя: ${results.latency.average} ms\n`;
            text += `Минимальная: ${results.latency.min} ms\n`;
            text += `Максимальная: ${results.latency.max} ms\n\n`;
        }
        
        if (results.downloadSpeed.success) {
            text += '--- Скорость загрузки ---\n';
            text += `Скорость: ${results.downloadSpeed.speedMbps} Mbps\n`;
            text += `Размер файла: ${(results.downloadSpeed.fileSize / 1024).toFixed(2)} KB\n`;
            text += `Время: ${results.downloadSpeed.duration.toFixed(2)} ms\n\n`;
        }
        
        return text;
    }
}

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WiFiDiagnostics;
}
