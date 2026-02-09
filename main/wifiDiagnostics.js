// WiFi Diagnostics Web API для диагностики сетевого соединения в браузере
// Использует Network Information API и другие браузерные API

class WiFiDiagnostics {
    constructor() {
        this.connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        this.listeners = [];
        this.lastUpdateTime = Date.now();
        this.init();
    }

    // Инициализация API
    init() {
        if (this.connection) {
            // Слушаем изменения в соединении
            this.connection.addEventListener('change', () => {
                this.lastUpdateTime = Date.now();
                this.notifyListeners();
            });
        }
    }

    // Получить текущую информацию о соединении
    getConnectionInfo() {
        if (!this.connection) {
            return {
                supported: false,
                message: 'Network Information API не поддерживается в этом браузере'
            };
        }

        return {
            supported: true,
            effectiveType: this.connection.effectiveType || 'unknown', // 'slow-2g', '2g', '3g', '4g'
            downlink: this.connection.downlink || 0, // Мбит/с
            downlinkMax: this.connection.downlinkMax || 0, // Максимальная скорость
            rtt: this.connection.rtt || 0, // Round-trip time в мс
            saveData: this.connection.saveData || false, // Режим экономии трафика
            type: this.connection.type || 'unknown', // 'wifi', 'cellular', 'ethernet', etc.
            lastUpdate: new Date(this.lastUpdateTime).toLocaleString('ru-RU')
        };
    }

    // Определить качество соединения
    getConnectionQuality() {
        const info = this.getConnectionInfo();
        
        if (!info.supported) {
            return {
                quality: 'unknown',
                description: 'Невозможно определить качество соединения',
                color: '#808080'
            };
        }

        const effectiveType = info.effectiveType;
        const rtt = info.rtt;
        const downlink = info.downlink;

        // Определяем качество на основе effectiveType и RTT
        if (effectiveType === '4g' && rtt < 100 && downlink > 5) {
            return {
                quality: 'excellent',
                description: 'Отличное соединение',
                color: '#00ff00',
                icon: '✅'
            };
        } else if (effectiveType === '4g' || (effectiveType === '3g' && rtt < 200)) {
            return {
                quality: 'good',
                description: 'Хорошее соединение',
                color: '#90ee90',
                icon: '✔️'
            };
        } else if (effectiveType === '3g' || effectiveType === '2g') {
            return {
                quality: 'fair',
                description: 'Удовлетворительное соединение',
                color: '#ffa500',
                icon: '⚠️'
            };
        } else {
            return {
                quality: 'poor',
                description: 'Слабое соединение',
                color: '#ff0000',
                icon: '❌'
            };
        }
    }

    // Получить рекомендации на основе текущего соединения
    getRecommendations() {
        const info = this.getConnectionInfo();
        const quality = this.getConnectionQuality();
        const recommendations = [];

        if (!info.supported) {
            recommendations.push('Браузер не поддерживает Network Information API');
            recommendations.push('Попробуйте использовать Chrome, Edge или Opera');
            return recommendations;
        }

        if (quality.quality === 'poor' || quality.quality === 'fair') {
            recommendations.push('⚠️ Рекомендуется переключиться на WiFi для лучшего качества');
            recommendations.push('📱 Если используете мобильный интернет, проверьте уровень сигнала');
        }

        if (info.saveData) {
            recommendations.push('💾 Режим экономии трафика включен');
            recommendations.push('Некоторые функции могут быть ограничены');
        }

        if (info.rtt > 300) {
            recommendations.push('🐌 Высокая задержка (RTT > 300ms)');
            recommendations.push('Видео и интерактивный контент могут загружаться медленно');
        }

        if (info.downlink < 1) {
            recommendations.push('📉 Низкая скорость загрузки');
            recommendations.push('Рекомендуется отключить автовоспроизведение видео');
        }

        if (recommendations.length === 0) {
            recommendations.push('✅ Соединение работает отлично!');
            recommendations.push('Все функции сайта доступны');
        }

        return recommendations;
    }

    // Запустить тест скорости (простой тест)
    async runSpeedTest(testUrl = 'https://www.google.com/favicon.ico') {
        try {
            const startTime = performance.now();
            const response = await fetch(testUrl, { cache: 'no-store' });
            const endTime = performance.now();
            
            const loadTime = endTime - startTime;
            const blob = await response.blob();
            const sizeInBytes = blob.size;
            const sizeInKB = (sizeInBytes / 1024).toFixed(2);
            
            // Рассчитываем скорость (очень приблизительно)
            const speedKBps = ((sizeInBytes / 1024) / (loadTime / 1000)).toFixed(2);
            
            return {
                success: true,
                loadTime: loadTime.toFixed(2),
                sizeKB: sizeInKB,
                speedKBps: speedKBps,
                url: testUrl
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Подписаться на изменения соединения
    onChange(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    // Уведомить всех подписчиков об изменениях
    notifyListeners() {
        const info = this.getConnectionInfo();
        const quality = this.getConnectionQuality();
        this.listeners.forEach(callback => {
            callback({ info, quality });
        });
    }

    // Получить полную диагностику
    getFullDiagnostics() {
        const info = this.getConnectionInfo();
        const quality = this.getConnectionQuality();
        const recommendations = this.getRecommendations();

        return {
            connectionInfo: info,
            quality: quality,
            recommendations: recommendations,
            timestamp: new Date().toLocaleString('ru-RU'),
            browserInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                onLine: navigator.onLine
            }
        };
    }

    // Проверить, находимся ли мы онлайн
    isOnline() {
        return navigator.onLine;
    }

    // Форматировать информацию для отображения
    formatForDisplay() {
        const diagnostics = this.getFullDiagnostics();
        
        let html = '<div class="wifi-diagnostics-panel">';
        
        // Статус онлайн/офлайн
        html += '<div class="status-section">';
        html += `<h3>📡 Статус соединения</h3>`;
        html += `<p class="status-indicator" style="color: ${diagnostics.quality.color}">`;
        html += `${diagnostics.quality.icon} ${diagnostics.quality.description}`;
        html += '</p>';
        html += `<p><strong>Онлайн:</strong> ${diagnostics.browserInfo.onLine ? '✅ Да' : '❌ Нет'}</p>`;
        html += '</div>';
        
        // Информация о соединении
        if (diagnostics.connectionInfo.supported) {
            html += '<div class="connection-info-section">';
            html += '<h3>🌐 Информация о соединении</h3>';
            html += '<table class="diagnostics-table">';
            html += `<tr><td><strong>Тип соединения:</strong></td><td>${diagnostics.connectionInfo.type}</td></tr>`;
            html += `<tr><td><strong>Эффективный тип:</strong></td><td>${diagnostics.connectionInfo.effectiveType}</td></tr>`;
            html += `<tr><td><strong>Скорость загрузки:</strong></td><td>${diagnostics.connectionInfo.downlink} Мбит/с</td></tr>`;
            html += `<tr><td><strong>RTT (задержка):</strong></td><td>${diagnostics.connectionInfo.rtt} мс</td></tr>`;
            html += `<tr><td><strong>Экономия трафика:</strong></td><td>${diagnostics.connectionInfo.saveData ? 'Включена' : 'Выключена'}</td></tr>`;
            html += `<tr><td><strong>Последнее обновление:</strong></td><td>${diagnostics.connectionInfo.lastUpdate}</td></tr>`;
            html += '</table>';
            html += '</div>';
        }
        
        // Рекомендации
        html += '<div class="recommendations-section">';
        html += '<h3>💡 Рекомендации</h3>';
        html += '<ul class="recommendations-list">';
        diagnostics.recommendations.forEach(rec => {
            html += `<li>${rec}</li>`;
        });
        html += '</ul>';
        html += '</div>';
        
        html += `<p class="timestamp"><em>Время диагностики: ${diagnostics.timestamp}</em></p>`;
        html += '</div>';
        
        return html;
    }
}

// Создаем глобальный экземпляр API
window.wifiDiagnostics = new WiFiDiagnostics();

// Экспортируем для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WiFiDiagnostics;
}
