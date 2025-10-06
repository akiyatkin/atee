import { createRequire } from "module"
import config from "@atee/config"
const require = createRequire(import.meta.url)
const mysql = require('mysql2/promise')


let conf = false

const CONF = await config('db')

const createPool = async () => {
    if (!CONF?.config) {
        console.error('Configuration is missing');
        return false;
    }

    // Разделяем конфигурацию полностью
    const connectionConfig = {
        namedPlaceholders: true,
        host: 'localhost',
        user: 'xxxxx',
        password: 'yyyyy',
        database: 'zzzzz',
        debug: false,
        charset: 'utf8mb4',
        timezone: 'local',
        enableKeepAlive: true,
        keepAliveInitialDelay: 30000
    };

    const poolConfig = {
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 100,
        // acquireTimeout и timeout убраны полностью
    };

    try {
        // Создаем пул с безопасной конфигурацией
        const finalConfig = {
            ...connectionConfig,
            ...poolConfig,
            ...CONF.config
        };

        const pool = mysql.createPool(finalConfig);

        // Проверяем работоспособность через получение соединения
        const connection = await pool.getConnection();
        try {
            await connection.execute('SELECT 1');
            console.log('Database pool ready');
        } finally {
            connection.release();
        }
        
        return pool;

    } catch (error) {
        console.error('Failed to create database pool:', error);
        return false;
    }
};
let pool = await createPool()
export class Db {
    constructor() {
        this.transdeep = 0;
        this.conf = conf;
        this.db = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
    }

    toString() {
        return 'Db';
    }

    release() {
        if (this.db) {
            this.db.release();
            this.db = null;
        }
    }

    async connect() {
        if (!pool) {
            console.log('Pool not initialized, creating new pool...');
            pool = await createPool();
            if (!pool) {
                console.error('Failed to create database pool');
                return false;
            }
        }

        try {
            this.db = await pool.getConnection();
            
            // Проверяем соединение
            await this.db.ping();
            
            this.reconnectAttempts = 0;
            //console.log('Database connection established successfully');
            return this;

        } catch (error) {
            console.error('Failed to get database connection:', error.message);
            return await this.handleReconnection();
        }
    }

    async handleReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(`Max reconnection attempts (${this.maxReconnectAttempts}) exceeded`);
            return false;
        }

        this.reconnectAttempts++;
        console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

        // Задержка между попытками
        const delay = 1000 * this.reconnectAttempts;
        await new Promise(resolve => setTimeout(resolve, delay));

        try {
            // Пересоздаем пул при необходимости
            if (this.shouldRecreatePool()) {
                console.log('Recreating database pool...');
                pool = await createPool();
            }

            if (!pool) {
                console.error('Pool recreation failed');
                return false;
            }

            this.db = await pool.getConnection();
            await this.db.ping();
            
            console.log('Reconnection successful');
            this.reconnectAttempts = 0;
            return this;

        } catch (reconnectError) {
            console.error(`Reconnection attempt ${this.reconnectAttempts} failed:`, reconnectError.message);
            return await this.handleReconnection();
        }
    }

    shouldRecreatePool() {
        // Пересоздаем пул при первой попытке или после серьезных ошибок
        return this.reconnectAttempts === 1;
    }

    // Транзакции
    async start() {
        this.transdeep++;
        if (this.transdeep === 1) {
            await this.ensureConnection();
            
            // Проверяем, не находимся ли мы уже в транзакции
            const inTransaction = await this.col('SELECT @@autocommit');
            if (inTransaction === 1) { // autocommit = 1 значит не в транзакции
                await this.db.query('START TRANSACTION');
            } else {
                console.warn('Already in transaction, nesting level:', this.transdeep);
            }
        }
        return this.transdeep;
    }

    async commit() {
        if (this.transdeep <= 0) {
            console.warn('Commit called without active transaction');
            return;
        }

        this.transdeep--;
        if (this.transdeep === 0) {
            await this.db.query('COMMIT');
        }
    }

    async back() {
        if (this.transdeep <= 0) {
            console.warn('Rollback called without active transaction');
            return true;
        }

        const deep = this.transdeep;
        this.transdeep = 0;
        await this.db.query('ROLLBACK');
        console.log(`Rollback completed, was at nesting level: ${deep}`);
        return true;
    }

    // Вспомогательный метод для проверки соединения
    async ensureConnection() {
        if (!this.db) {
            const connected = await this.connect();
            if (!connected) {
                throw new Error('No database connection available');
            }
        }

        try {
            await this.db.ping();
        } catch (error) {
            console.log('Connection lost, reconnecting...');
            const reconnected = await this.connect();
            if (!reconnected) {
                throw new Error('Failed to reconnect to database');
            }
        }
    }

    // Универсальный метод выполнения запросов
    async executeQuery(sql, values = null) {
        
        await this.ensureConnection();
        
        try {
            if (values && Object.keys(values).length) {
                return await this.db.execute({ sql, values });
            } else {
                return await this.db.query(sql);
            }
        } catch (error) {
            console.error('Нет соединения:', {
                sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
                values: values,
                error: error.message
            });
            
            // Повторяем запрос при ошибках соединения
            if (this.isConnectionError(error)) {
                console.log('Connection error, retrying query...');
                await this.connect();
                return await this.executeQuery(sql, values);
            }
            
            throw error;
        }
    }

    isConnectionError(error) {
        const connectionErrors = [
            'PROTOCOL_CONNECTION_LOST',
            'ER_CON_COUNT_ERROR',
            'ECONNRESET',
            'EPIPE'
        ];
        return connectionErrors.includes(error?.code);
    }

    // SELECT методы
    async fetch(sql, values = null) {
        const [rows] = await this.executeQuery(sql, values);
        return rows[0] || null;
    }

    async col(sql, values = null) {
        const [rows, fields] = await this.executeQuery(sql, values);
        if (!rows.length || !fields.length) return null;
        return rows[0][fields[0].name];
    }

    async colAll(sql, values = null) {
        const [rows, fields] = await this.executeQuery(sql, values);
        if (!fields.length) return [];
        
        const fieldName = fields[0].name;
        return rows.map(row => row[fieldName]);
    }

    async all(sql, values = null) {
        const [rows] = await this.executeQuery(sql, values);
        return rows;
    }

    async allto(name, sql, values = null) {
        const rows = await this.all(sql, values);
        return rows.reduce((acc, row) => {
            acc[row[name]] = row;
            return acc;
        }, {});
    }

    async alltoint(name, sql, values = null, ints = []) {
        const rows = await this.all(sql, values);
        const result = {};
        
        for (const row of rows) {
            // Конвертируем указанные поля в числа
            ints.forEach(field => {
                if (row[field] !== undefined && row[field] !== null) {
                    row[field] = Number(row[field]);
                    if (isNaN(row[field])) row[field] = 0;
                }
            });
            result[row[name]] = row;
        }
        
        return result;
    }

    // INSERT/UPDATE/DELETE методы
    async insertId(sql, values = null) {
        const [result] = await this.executeQuery(sql, values);
        return result.insertId;
    }

    async affectedRows(sql, values = null) {
        const [result] = await this.executeQuery(sql, values);
        return result.affectedRows;
    }

    async changedRows(sql, values = null) {
        const [result] = await this.executeQuery(sql, values);
        return result.changedRows;
    }

    async exec(sql, values = null) {
        const [result] = await this.executeQuery(sql, values);
        return result.changedRows || result.affectedRows;
    }

    async query(sql, values = null) {
        const [result] = await this.executeQuery(sql, values);
        return result.changedRows || result.affectedRows;
    }

    // Метод для безопасного завершения
    async destroy() {
        if (this.transdeep > 0) {
            console.warn(`Destroying Db instance with active transaction (level: ${this.transdeep})`);
            await this.back();
        }
        this.release();
    }
}

export default Db