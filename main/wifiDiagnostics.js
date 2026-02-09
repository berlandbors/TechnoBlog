// WiFi Diagnostics Web API
// Uses Network Information API для диагностики сетевого подключения в браузере

class WiFiDiagnostics {
    constructor() {
        this.connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        this.listeners = [];
        this.diagnosticsData = {
            effectiveType: 'unknown',
            downlink: 0,
            rtt: 0,
            saveData: false,
            type: 'unknown',
            timestamp: Date.now()
        };
        
        this.init();
    }

    // Инициализация диагностики
    init() {
        if (this.connection) {
            this.updateDiagnostics();
            this.setupEventListeners();
        } else {
            console.warn('Network Information API не поддерживается в этом браузере');
        }
    }

    // Обновление данных диагностики
    updateDiagnostics() {
        if (!this.connection) return null;

        this.diagnosticsData = {
            // Эффективный тип соединения (slow-2g, 2g, 3g, 4g)
            effectiveType: this.connection.effectiveType || 'unknown',
            
            // Скорость загрузки в Мбит/с
            downlink: this.connection.downlink || 0,
            
            // Round Trip Time (задержка) в мс
            rtt: this.connection.rtt || 0,
            
            // Режим экономии трафика
            saveData: this.connection.saveData || false,
            
            // Тип соединения (wifi, cellular, ethernet, etc.)
            type: this.connection.type || 'unknown',
            
            // Временная метка
            timestamp: Date.now()
        };

        return this.diagnosticsData;
    }

    // Получение текущих данных диагностики
    getDiagnostics() {
        return this.updateDiagnostics();
    }

    // Оценка качества соединения
    getConnectionQuality() {
        const data = this.getDiagnostics();
        if (!data || data.effectiveType === 'unknown') {
            return {
                quality: 'unknown',
                score: 0,
                message: 'Невозможно определить качество соединения'
            };
        }

        let score = 0;
        let quality = 'poor';
        let message = '';

        // Оценка на основе effectiveType
        const typeScores = {
            'slow-2g': 1,
            '2g': 2,
            '3g': 3,
            '4g': 4
        };
        score = typeScores[data.effectiveType] || 0;

        // Оценка на основе RTT (задержки)
        if (data.rtt < 50) {
            score += 1;
        } else if (data.rtt > 300) {
            score -= 1;
        }

        // Оценка на основе скорости загрузки
        if (data.downlink > 10) {
            score += 1;
        } else if (data.downlink < 1) {
            score -= 1;
        }

        // Определение качества
        if (score >= 5) {
            quality = 'excellent';
            message = 'Отличное соединение';
        } else if (score >= 4) {
            quality = 'good';
            message = 'Хорошее соединение';
        } else if (score >= 3) {
            quality = 'fair';
            message = 'Удовлетворительное соединение';
        } else {
            quality = 'poor';
            message = 'Плохое соединение';
        }

        return {
            quality,
            score,
            message,
            details: data
        };
    }

    // Проверка, подходит ли соединение для загрузки медиа
    isGoodForMedia(mediaType = 'video') {
        const data = this.getDiagnostics();
        if (!data) return null;

        const requirements = {
            video: {
                minDownlink: 2.5,
                maxRtt: 300,
                effectiveTypes: ['3g', '4g']
            },
            audio: {
                minDownlink: 0.5,
                maxRtt: 500,
                effectiveTypes: ['2g', '3g', '4g']
            },
            image: {
                minDownlink: 0.25,
                maxRtt: 1000,
                effectiveTypes: ['slow-2g', '2g', '3g', '4g']
            }
        };

        const req = requirements[mediaType] || requirements.image;

        const isGood = 
            data.downlink >= req.minDownlink &&
            data.rtt <= req.maxRtt &&
            req.effectiveTypes.includes(data.effectiveType);

        return {
            suitable: isGood,
            mediaType,
            currentSpeed: data.downlink,
            requiredSpeed: req.minDownlink,
            currentLatency: data.rtt,
            maxLatency: req.maxRtt
        };
    }

    // Установка слушателей изменений соединения
    setupEventListeners() {
        if (!this.connection) return;

        const changeHandler = () => {
            this.updateDiagnostics();
            this.notifyListeners();
        };

        this.connection.addEventListener('change', changeHandler);
    }

    // Добавление callback для уведомлений об изменениях
    onChange(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
        }
    }

    // Уведомление всех слушателей
    notifyListeners() {
        const data = this.getDiagnostics();
        this.listeners.forEach(listener => {
            try {
                listener(data);
            } catch (error) {
                console.error('Ошибка в слушателе диагностики:', error);
            }
        });
    }

    // Получение отчета о диагностике в виде строки
    getReport() {
        const data = this.getDiagnostics();
        if (!data) {
            return 'Network Information API недоступен';
        }

        const quality = this.getConnectionQuality();
        
        const typeLabels = {
            'slow-2g': 'Медленное 2G',
            '2g': '2G',
            '3g': '3G',
            '4g': '4G',
            'wifi': 'WiFi',
            'cellular': 'Мобильная сеть',
            'ethernet': 'Ethernet',
            'unknown': 'Неизвестно'
        };

        return `
🌐 Диагностика Сетевого Подключения
═══════════════════════════════════
📊 Качество: ${quality.message} (${quality.score}/6)
📱 Эффективный тип: ${typeLabels[data.effectiveType] || data.effectiveType}
🔌 Тип подключения: ${typeLabels[data.type] || data.type}
⬇️ Скорость загрузки: ${data.downlink} Мбит/с
⏱️ Задержка (RTT): ${data.rtt} мс
💾 Режим экономии: ${data.saveData ? 'Включен' : 'Выключен'}
🕐 Время измерения: ${new Date(data.timestamp).toLocaleTimeString()}
        `.trim();
    }

    // Экспорт данных в JSON
    exportJSON() {
        const data = this.getDiagnostics();
        const quality = this.getConnectionQuality();
        
        return JSON.stringify({
            diagnostics: data,
            quality: quality,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        }, null, 2);
    }

    // Проверка поддержки API
    static isSupported() {
        return !!(navigator.connection || navigator.mozConnection || navigator.webkitConnection);
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WiFiDiagnostics;
}
