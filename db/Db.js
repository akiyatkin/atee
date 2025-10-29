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
        // multipleStatements: true,
        password: 'yyyyy',
        database: 'zzzzz',
        debug: false,
        //charset: 'utf8mb4',
        charset: 'utf8',
        timezone: 'local',
        enableKeepAlive: true,
        keepAliveInitialDelay: 30000
    };

    const poolConfig = {
        waitForConnections: true,
        connectionLimit: 50,
        queueLimit: 50,
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
        const db = await pool.getConnection();
        try {
            await db.execute('SELECT 1');
            console.log('Database pool ready');
        } finally {
            db.release();
        }
        return pool;

    } catch (error) {
        console.error('Failed to create database pool:', error);
        return false;
    }
   
}
const pool = await createPool()
process.on('SIGINT', async () => {
    console.log('pool.end')
    await pool.end()
    process.exit(0)
})
export class Db {
    constructor() {
        this.pool = pool;
        this.transdeep = 0;
        this.conf = conf;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
    }

    toString() {
        return 'Db';
    }

    async connect() {
        return this;
    }
    // Транзакции
    async start() {
        this.transdeep++;
        if (this.transdeep === 1) {
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
            //console.warn('Commit called without active transaction');
            return;
        }

        this.transdeep--;
        if (this.transdeep === 0) {
            await this.db.query('COMMIT');
        }
    }

    async back() {
        if (this.transdeep <= 0) {
            //console.warn('Rollback called without active transaction');
            return true;
        }

        const deep = this.transdeep;
        this.transdeep = 0;
        await this.db.query('ROLLBACK');
        console.log(`Rollback completed, was at nesting level: ${deep}`);
        return true;
    }

    // Универсальный метод выполнения запросов
    async executeQuery(sql, values = null) {
        try {
            if (values && (values?.length || Object.keys(values).length)) {
                return await pool.execute(sql, values);
            } else {
                return await pool.query(sql);
            }
        } catch (error) {
            // console.error('Error executeQuery', {
            //     sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
            //     values: values,
            //     error: error.message
            // })
            throw error
        }
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



    async estimate(tables) {
        // const tables = [
        //     'user_users',   
        //     'user_uemails'
        // ]
        const objs = [...tables]
        const db = this
        for (const i in objs) {
            const table = objs[i]
            const obj = {}
            obj.count = await db.col('select count(*) from ' + table).catch(e => '-')
            obj.name = table
            objs[i] = obj
        }
        return objs
    }
}

export default Db