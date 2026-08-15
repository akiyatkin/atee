function scheduleWeekTask(taskTime, taskCallback, weekDays = [1, 2, 3, 4, 5]) {
    // Проверка аргументов
    if (typeof taskTime !== 'string' || !taskTime.includes(':')) {
        throw new Error('Время должно быть в формате "HH:MM"');
    }
    
    if (typeof taskCallback !== 'function') {
        throw new Error('taskCallback должен быть функцией');
    }
    
    if (!Array.isArray(weekDays) || weekDays.length === 0) {
        throw new Error('weekDays должен быть непустым массивом');
    }
    
    // Проверка дней недели (1-7, где 1 - понедельник, 7 - воскресенье)
    const validDays = weekDays.every(day => 
        Number.isInteger(day) && day >= 1 && day <= 7
    );
    
    if (!validDays) {
        throw new Error('Дни недели должны быть числами от 1 (понедельник) до 7 (воскресенье)');
    }

    // Парсинг времени
    const [hours, minutes] = taskTime.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error('Неверный формат времени. Используйте "HH:MM"');
    }

    let isTaskRunning = false;
    let intervalId = null;
    let lastExecutionDate = null;

    // Функция для проверки, должен ли выполняться сегодня
    function shouldExecuteToday() {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 - воскресенье, 1 - понедельник, ...
        
        // Преобразуем в формат 1-7 (1 - понедельник, 7 - воскресенье)
        let currentDay = dayOfWeek === 0 ? 7 : dayOfWeek;
        
        return weekDays.includes(currentDay);
    }

    // Функция для выполнения задачи с обработкой ошибок
    async function executeTask() {
        if (isTaskRunning) {
            console.log('Задача уже выполняется, пропускаем...');
            return;
        }

        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentDate = now.toDateString();

        // Проверяем, настало ли время выполнения задачи
        if (currentHours === hours && currentMinutes === minutes) {
            // Проверяем, не выполнялась ли задача уже сегодня
            if (lastExecutionDate === currentDate) {
                console.log('Задача уже выполнялась сегодня, пропускаем...');
                return;
            }
            
            // Проверяем, должен ли выполняться сегодня
            if (!shouldExecuteToday()) {
                console.log(`Сегодня не день выполнения задачи (разрешенные дни: ${weekDays.join(', ')})`);
                return;
            }
            
            isTaskRunning = true;
            
            try {
                console.log(`🟢 Запуск задачи в ${taskTime} (день: ${now.toLocaleDateString('ru-RU', { weekday: 'long' })})...`);
                
                // Выполняем асинхронную задачу
                const result = await taskCallback();
                console.log('✅ Задача успешно выполнена:', result);
                
                // Запоминаем дату выполнения
                lastExecutionDate = currentDate;
                
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
            nextExecution: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
            weekDays: weekDays,
            currentDay: new Date().toLocaleDateString('ru-RU', { weekday: 'long' })
        })
    };
}

export default scheduleWeekTask;