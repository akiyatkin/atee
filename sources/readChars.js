import { readFile } from 'fs/promises';
import { createReadStream } from 'fs';

const readChars = async (url, count = 100, headers = {}) => {
	try {
		let content = '';
		if (url.startsWith('http://') || url.startsWith('https://')) {
			// Для HTTP/HTTPS URL используем fetch
			const response = await fetch(url, {headers})
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}
			
			// Получаем reader для чтения потока
			const reader = response.body.getReader()
			let receivedLength = 0;
			
			while (true) {
				const { done, value } = await reader.read()
				
				if (done) break;
				
				// Добавляем новые данные к содержимому
				const chunk = new TextDecoder().decode(value)
				content += chunk;
				receivedLength += chunk.length;
				
				// Останавливаемся когда набрали count символов
				if (receivedLength >= count) {
					content = content.substring(0, count);
					reader.cancel(); // Отменяем дальнейшее чтение
					break;
				}
			}
			
		} else {
			// Для локальных файлов используем fs
			const stream = createReadStream(url, { 
				encoding: 'utf8', 
				highWaterMark: count // Читаем блоками по 100 символов
			});
			
			await new Promise((resolve, reject) => {
				stream.on('data', (chunk) => {
					content += chunk;
					if (content.length >= count) {
						content = content.substring(0, count);
						stream.destroy(); // Останавливаем поток
						resolve();
					}
				})
				stream.on('end', resolve);
				stream.on('error', reject);
			})
		}
		return content
	} catch (error) {
		return ''
		//throw new Error(`Failed to read from ${url}: ${error.message}`);
	}
}

export default readChars