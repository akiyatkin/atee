function scheduleDailyTask(taskTime, taskCallback) {
    // Проверка аргументов
    if (typeof taskTime !== 'string' || !taskTime.includes(':')) {
        throw new Error('Время должно быть в формате "HH:MM"');
    }
    
    if (typeof taskCallback !== 'function') {
        throw new Error('taskCallback должен быть функцией');
    }

    // Парсинг времени
    const [hours, minutes] = taskTime.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error('Неверный формат времени. Используйте "HH:MM"');
    }

    let isTaskRunning = false;
    let intervalId = null;

    // Функция для выполнения задачи с обработкой ошибок
    async function executeTask() {
        if (isTaskRunning) {
            console.log('Задача уже выполняется, пропускаем...');
            return;
        }

        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();

        // Проверяем, настало ли время выполнения задачи
        if (currentHours === hours && currentMinutes === minutes) {
            isTaskRunning = true;
            
            try {
                console.log(`🟢 Запуск задачи в ${taskTime}...`);
                
                // Выполняем асинхронную задачу
                const result = await taskCallback();
                console.log('✅ Задача успешно выполнена', result ? '- результат:' : '', result);
                
            } catch (error) {
                console.error('❌ Ошибка при выполнении задачи:', error.message);
                
                // Можно добавить дополнительную логику обработки ошибок:
                // - Отправка уведомления
                // - Логирование в файл
                // - Повторная попытка и т.д.
                
            } finally {
                isTaskRunning = false;
            }
        }
    }

    // Запускаем проверку каждую минуту
    intervalId = setInterval(executeTask, 60000); // 60 секунд

    // Выполняем первую проверку сразу при запуске
    executeTask().catch(error => {
        console.error('Ошибка при первоначальном запуске:', error);
    });

    // Функция для остановки планировщика
    function stopScheduler() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
            console.log('🛑 Планировщик остановлен');
        }
    }

    // Возвращаем функцию для остановки
    return {
        stop: stopScheduler,
        getStatus: () => ({
            isRunning: intervalId !== null,
            isTaskRunning,
            nextExecution: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        })
    };
}

export default scheduleDailyTask