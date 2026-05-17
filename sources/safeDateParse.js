
const safeDateParse = (dateString) => {
	if (!dateString || typeof dateString !== 'string') return null;
	try {
		// Удаляем лишние пробелы
		const cleanString = dateString.trim()
		if (!cleanString) return null
		
		// Пытаемся распарсить как ISO строку
		let timestamp = Date.parse(cleanString)
		
		// Если не удалось, пробуем дополнительные форматы
		if (isNaN(timestamp)) {
			// Заменяем пробел на 'T' для ISO-подобных форматов
			const isoLikeString = cleanString.replace(' ', 'T')
			timestamp = Date.parse(isoLikeString)
		}
		
		// Если все еще не удалось, пробуем ручной парсинг для распространенных форматов
		if (isNaN(timestamp)) {
			timestamp = parseCustomFormats(cleanString)
		}

		if (isNaN(timestamp)) return null


		const date = new Date(timestamp);
		// Проверяем, что дата валидна
		if (!(date instanceof Date && !isNaN(date.getTime()))) return null
		return date
	} catch (error) {
		console.warn('Ошибка парсинга даты:', error.message)
		return null;
	}
}
const parseCustomFormats = (dateString) => {
	// Регулярные выражения для распространенных форматов
	const patterns = [
		// YYYY-MM-DD HH:MM:SS
		/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/,
		// YYYY-MM-DD HH:MM
		/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/,
		// YYYY/MM/DD HH:MM:SS
		/^(\d{4})\/(\d{2})\/(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/,
		// DD.MM.YYYY HH:MM:SS
		/^(\d{2})\.(\d{2})\.(\d{4})[ T](\d{2}):(\d{2}):(\d{2})$/
	];

	for (const pattern of patterns) {
		const match = dateString.match(pattern);
		if (match) {
			let year, month, day, hours = 0, minutes = 0, seconds = 0
			
			if (pattern.source.includes('YYYY-MM-DD') || pattern.source.includes('YYYY/MM/DD')) {
				[, year, month, day, hours, minutes, seconds] = match.map(Number)
			} else if (pattern.source.includes('DD.MM.YYYY')) {
				[, day, month, year, hours, minutes, seconds] = match.map(Number)
			}
			
			// Корректируем месяц (в JavaScript месяцы с 0)
			const adjustedMonth = month - 1
			
			// Создаем дату в локальной временной зоне
			const date = new Date(year, adjustedMonth, day, hours, minutes, seconds)
			return date.getTime()
		}
	}
	
	return NaN
}
export default safeDateParse