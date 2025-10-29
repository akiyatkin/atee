class BulkInserter {
	constructor(db, tableName, columns, batchSize = 100, onDuplicateUpdate = false) {
		this.tableName = tableName;
		this.columns = columns;
		this.batchSize = batchSize;
		this.buffer = [];
		this.db = db;
		this.onDuplicateUpdate = onDuplicateUpdate;
	}
	
	// Добавление данных в буфер
	insert(data) {
		this.buffer.push(data);
		
		// Если буфер заполнен, выполняем вставку
		if (this.buffer.length >= this.batchSize) {
			return this.flush();
		}
		
		return Promise.resolve();
	}
	
	// Принудительная вставка оставшихся данных
	async flush() {
		if (this.buffer.length === 0) {
			return;
		}
		
		try {
			const columnsStr = '`' + this.columns.join('`, `') + '`';
			const singleRowPlaceholder = this.columns.map(() => '?').join(', ');
			const allPlaceholders = this.buffer.map(() => singleRowPlaceholder).join('),(');
			// Базовый SQL для вставки
			let sql = `INSERT INTO ${this.tableName} (${columnsStr}) VALUES (${allPlaceholders})`;
			
			// Добавляем ON DUPLICATE KEY UPDATE если нужно
			if (this.onDuplicateUpdate) {
				const updateClause = this.columns
					.map(column => `${column} = VALUES(${column})`)
					.join(', ');
				sql += ` ON DUPLICATE KEY UPDATE ${updateClause}`;
			}
			await this.db.exec(sql, this.buffer.flat());
			// Очищаем буфер
			this.buffer = [];
			
		} catch (err) {
			console.error('Ошибка при массовой вставке:', err);
			throw err;
		}
	}
}

export default BulkInserter;