/**
 * Глубоко замораживает объект, используя Proxy и WeakMap для кеширования
 * Поддерживает: объекты, массивы, Promise (замораживает их результаты)
 * Запрещает: модификацию, удаление и добавление свойств
 */
const proxyCache = new WeakMap() // Хранит Proxy/обертки для каждого объекта

const deepFreeze = (obj, visited = new WeakSet()) => {
    // Базовые случаи - примитивы и null/undefined
    if (obj === null || typeof obj !== 'object') return obj

    // Защита от циклических ссылок - возвращаем оригинальный объект
    if (visited.has(obj)) return obj

    // Возвращаем закешированную версию если существует
    if (proxyCache.has(obj)) return proxyCache.get(obj)

    visited.add(obj) // Помечаем объект как посещенный

    // Определяем тип объекта
    const isPromise = !!obj && typeof obj.then === 'function'
    const isArray = Array.isArray(obj)

    // Базовый обработчик Proxy для обычных объектов
    const baseHandler = {
        /**
         * Перехватчик для чтения свойств
         * Рекурсивно замораживает возвращаемые значения
         */
        get(target, prop) {
            const value = Reflect.get(target, prop)
            return deepFreeze(value, visited) // Рекурсивный вызов
        },

        // Запрещаем любые изменения
        set() { throw new Error('Cannot modify frozen object') },
        deleteProperty() { throw new Error('Cannot delete from frozen object') },
        defineProperty() { throw new Error('Cannot define properties on frozen object') }
    }

    // Специальный обработчик для массивов

    const arrayHandler = {
        ...baseHandler,
        /**
         * Дополнительная логика для массивов:
         * - Блокирует методы изменяющие массив
         * - Разрешает доступ к элементам
         */
        get(target, prop) {
            // Список опасных методов массива
            const mutatingMethods = [
                'push', 'pop', 'shift', 'unshift',
                'splice', 'sort', 'reverse'
            ]
            if (mutatingMethods.includes(prop)) {
                return () => {
                    throw new Error(`Array mutation method '${prop}' is prohibited`)
                }
            }
            return baseHandler.get(target, prop)
        }
    }

    // Обработчик для Promise
    const promiseHandler = {
        ...baseHandler,
        /**
         * Особое поведение для Promise:
         * - Разрешает then/catch/finally
         * - Блокирует доступ к другим свойствам
         */
        get(target, prop) {
            if (['then', 'catch', 'finally'].includes(prop)) {
                const value = Reflect.get(target, prop)
                return value.bind(target) // Сохраняем контекст
            }
            return baseHandler.get(target, prop)
        }
    }

    // Особый случай для Promise
    if (isPromise) {
        /**
         * Создаем обертку для Promise которая:
         * 1. Замораживает результат при успехе
         * 2. Замораживает ошибку при reject
         * 3. Сохраняет в кеш ОБЕРТКУ (не Proxy)
         */
        const wrappedPromise = obj.then(
            result => deepFreeze(result, visited),
            error => Promise.reject(deepFreeze(error, visited))
        )
        proxyCache.set(obj, wrappedPromise)
        return wrappedPromise
    }

    // Стандартная обработка объектов/массивов
    const handler = isArray ? arrayHandler : baseHandler
    const proxy = new Proxy(obj, handler)
    proxyCache.set(obj, proxy)
    return proxy
}

export default deepFreeze