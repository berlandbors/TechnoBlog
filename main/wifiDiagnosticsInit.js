// WiFi Diagnostics Initializer - Инициализация системы диагностики WiFi
// Автоматически создает и инициализирует WiFi диагностику при загрузке страницы

(function() {
    'use strict';
    
    // Ждем полной загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWiFiDiagnostics);
    } else {
        initWiFiDiagnostics();
    }
    
    function initWiFiDiagnostics() {
        try {
            // Создаем экземпляр диагностики
            const diagnostics = new WiFiDiagnostics();
            
            // Создаем экземпляр UI
            const diagnosticsUI = new WiFiDiagnosticsUI(diagnostics);
            
            // Создаем кнопку для открытия диагностики
            diagnosticsUI.createTriggerButton();
            
            // Сохраняем в глобальный объект для доступа из консоли
            window.wifiDiagnostics = {
                diagnostics: diagnostics,
                ui: diagnosticsUI,
                
                // Вспомогательные методы для быстрого доступа
                show: () => diagnosticsUI.show(),
                hide: () => diagnosticsUI.hide(),
                getInfo: () => diagnostics.getConnectionInfo(),
                runTests: () => diagnostics.runFullDiagnostics(),
                getQuality: () => diagnostics.getConnectionQuality()
            };
            
            console.log('✅ WiFi Diagnostics инициализирована');
            console.log('💡 Используйте window.wifiDiagnostics для доступа из консоли');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации WiFi Diagnostics:', error);
        }
    }
})();
