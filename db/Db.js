import { createRequire } from "module"
import config from "@atee/config"
const require = createRequire(import.meta.url)
const mysql = require('mysql2/promise')

let pool = false
let conf = false

const CONF = await config('db')
	
if (CONF.config) {
	// multipleStatements: true,
	const DEF = {
		namedPlaceholders: true,
		//waitForConnections: true,
		host: 'localhost',
		user: 'xxxxx',
		password: 'yyyyy',
		database: 'zzzzz',
		debug: false
	}
	const db = await mysql.createConnection({
		...DEF,
		...CONF.config
	}).catch(e => console.log('db connect - ', e))
	if (db) {

		const [rows, fields] = await db.query("show variables like 'max_connections'")
		let connectionLimit = rows[0].Value - 1
		// connectionLimit = Math.round(connectionLimit / 2)
		const limit = 20
		connectionLimit = connectionLimit < limit ? connectionLimit : limit
		console.log('db ready - connectionLimit: ' + connectionLimit)
		conf = {
			...DEF, 
			connectionLimit,
			...CONF.config
		}
		pool = mysql.createPool(conf)
	}
}
export class Db {
	constructor () {
		this.transdeep = 0
		this.conf = conf
	}
	release () {
		return this.db.release()
	}
	async connect () {
		if (!pool) return false
		this.db = await pool.getConnection().catch(e => false)
		if (this.db) {
			const r = await this.db.ping().catch(r => false)
			// const r = await this.db.ping().then(r => this.db).catch(async e => {
			// 	console.log('new direct connection')
			// 	const db = await new Db().connect()
			// 	if (!db) {
			// 		console.log('Нет соединения с базой данных при повторном соединении')
			// 		return false
			// 	}
			// 	this.db = db
			// 	return true
			// })
			if (!r) this.db = false
		} else {
			console.log('pool вернул false')
		}
		if (!this.db) return false
		return this
	}
	
	async start() {
		this.transdeep++
		if (this.transdeep === 1) {
			const is = await this.col('SELECT @@in_transaction')
			if (!is) await this.db.query('START TRANSACTION')
			//При перезапуске процесса старая транзакция может быть в работе? 
			//Или пул соединений вернуло соединение с транзакцией, может ли быть такое?
			//Исключаем ошибку что скрипт не владеет информацией о транзакциях
		}
	}
	async commit() {
		this.transdeep--
		if (this.transdeep === 0) await this.db.query('COMMIT')
	}
	async back() {
		this.transdeep = 0
		await this.db.query('ROLLBACK')
		return true
	}

	//select
	async fetch(sql, values) {
		if (values && Object.keys(values).length) {
			const [rows, fields] = await this.db.execute({ sql, values })
			return rows[0]
		} else {
			const [rows, fields] = await this.db.query(sql)
			return rows[0]
		}
	}
	async col(sql, values) {
		if (values && Object.keys(values).length) {
			const [rows, fields] = await this.db.execute({ sql, values })
			if (!rows.length) return null
			return rows[0][fields[0].name]
		} else {
			const [rows, fields] = await this.db.query(sql)
			if (!rows.length) return null
			return rows[0][fields[0].name]
		}
	}
	async colAll(sql, values) {
		let r, f
		if (values && Object.keys(values).length) {
			const [rows, fields] = await this.db.execute({ sql, values })
			r = rows
			f = fields
		} else {
			const [rows, fields] = await this.db.query(sql)
			r = rows
			f = fields

		}
		return r.reduce((ak, row) => {
			ak.push(row[f[0].name])
			return ak
		}, [])
	}
	async all(sql, values) {
		if (values && Object.keys(values).length) {
			return this.db.execute({ sql, values }).then(([rows]) => rows)	
		} else {
			return this.db.query(sql).then(([rows]) => rows)	
		}
	}
	async allto(name, sql, values) {
		return this.all(sql, values).then(rows => {
			return rows.reduce((ak, r) => {
				ak[r[name]] = r
				return ak
			}, {})
		})
	}
	async alltoint(name, sql, values, ints) {
		return this.all(sql, values).then(rows => {
			const ak = {}
			for (const row of rows) {
				ints.forEach(n => {
					row[n] = Number(row[n]) || 0
				})
				ak[row[name]] = row
			}
			return ak
		})
	}

	
	async insertId(sql, values) { //insert
		if (values && Object.keys(values).length) {
			const [rows, fields] = await this.db.execute({ sql, values })
			return rows.insertId
		} else {
			const [rows, fields] = await this.db.query(sql)
			return rows.insertId	
		}
		
	}
	async affectedRows(sql, values) { //insert, delete
		if (values && Object.keys(values).length) {
			const [rows, fields] = await this.db.execute({ sql, values })
			return rows.affectedRows
		} else {
			const [rows, fields] = await this.db.query(sql)
			return rows.affectedRows
		}
	}

	
	async changedRows(sql, values) { //update
		if (values && Object.keys(values).length) {
			const [rows, fields] = await this.db.execute({ sql, values })
			return rows.changedRows
		} else {
			const [rows, fields] = await this.db.execute(sql)
			return rows.changedRows
		}
	}

	async exec(sql, values) { //for mysql
		if (values && Object.keys(values).length) {
			const [rows, fields] = await this.db.execute({ sql, values })
			return rows.changedRows
		} else {
			const [rows, fields] = await this.db.query(sql)
			return rows.changedRows
		}
	}
	async query(sql, values) { //for client
		const [rows, fields] = await this.db.query({ sql, values })
		return rows.changedRows
	}	
}

export default Db