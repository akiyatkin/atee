class BulkDeleter {
    constructor(db, tableName, keyColumns, batchSize = 1000) {
        this.tableName = tableName;
        this.keyColumns = keyColumns;
        this.batchSize = batchSize;
        this.buffer = [];
        this.db = db;
    }
    
    delete (keyData) {
        if (keyData.length !== this.keyColumns.length) {
            throw new Error(`Ожидается ${this.keyColumns.length} значений для составного ключа`);
        }
        
        this.buffer.push(keyData);
        
        if (this.buffer.length >= this.batchSize) {
            return this.flush();
        }
        
        return Promise.resolve();
    }
    
    // Правильная реализация с OR условиями
    async flush() {
        if (this.buffer.length === 0) return;
        
        try {
            // Создаем условия для каждой пары ключей
            const conditions = this.buffer.map(keyValues => 
                `(${this.keyColumns.map((col, index) => 
                    `${col} = ${this.db.escape(keyValues[index])}`
                ).join(' AND ')})`
            ).join(' OR ');
            
            const sql = `DELETE FROM ${this.tableName} WHERE ${conditions}`;
            await this.db.query(sql);
            
            this.buffer = [];
            
        } catch (err) {
            console.error('Ошибка при удалении:', err);
            throw err;
        }
    }
    
    // Альтернатива с использованием JOIN (для больших объемов данных)
    async flushWithJoin() {
        if (this.buffer.length === 0) return;
        
        try {
            // Создаем временные значения для JOIN
            const values = this.buffer.map(keyValues => 
                `(${keyValues.map(val => this.db.escape(val)).join(', ')})`
            ).join(', ');
            
            const columnsStr = this.keyColumns.join(', ');
            const joinConditions = this.keyColumns.map(col => 
                `t.${col} = keys.${col}`
            ).join(' AND ');
            
            const sql = `
                DELETE t FROM ${this.tableName} t
                JOIN (VALUES ${values}) AS keys(${columnsStr})
                ON ${joinConditions}
            `;
            
            await this.db.query(sql);
            this.buffer = [];
            
        } catch (err) {
            console.error('Ошибка при удалении:', err);
            throw err;
        }
    }
}

export default BulkDeleter;