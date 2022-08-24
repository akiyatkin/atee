import { createRequire } from "module"
const require = createRequire(import.meta.url)
const mysql = require('mysql2/promise')

let pool = false
let conf = false
const { default:OPTIONS } = await import('/data/.db.json', {assert: {type: "json"}}).catch(e => console.log(e))
if (OPTIONS.config) {
	// multipleStatements: true,
	const DEF = {
		namedPlaceholders: true,

		host: 'localhost',
		user: 'xxxxx',
		password: 'yyyyy',
		database: 'zzzzz',
		debug: false
	}
	const db = await mysql.createConnection({
		...DEF,
		...OPTIONS.config
	}).catch(e => console.log(e))
	if (db) {

		const [rows, fields] = await db.query("show variables like 'max_connections'")
		const connectionLimit = rows[0].Value - 1
		console.log('db ready - connectionLimit: ' + Math.round(connectionLimit / 2))
		conf = {
			...DEF, 
			connectionLimit,
			...OPTIONS.config
		}
		pool = mysql.createPool(conf)
	}
}
export class Db {
	constructor () {
		this.conf = conf
	}
	release () {
		return this.db.release()
	}
	async connect () {
		if (!pool) return false
		this.db = await pool.getConnection().catch(e => false)
		//await this.db.query("set session transaction isolation level SERIALIZABLE")
		if (!this.db) return false
		return this
	}
	
	async start() {
		await this.db.query('START TRANSACTION')
	}
	async commit() {
		await this.db.query('COMMIT')
	}

	//select
	async fetch(sql, values) {
		const [rows, fields] = await this.db.execute({ sql, values })
		return rows[0]
	}
	async col(sql, values) {
		const [rows, fields] = await this.db.execute({ sql, values })
		if (!rows.length) return null
		return rows[0][fields[0].name]
	}
	async colAll(sql, values) {
		const [rows, fields] = await this.db.execute({ sql, values })
		return rows.reduce((ak, row) => {
			ak.push(row[fields[0].name])
			return ak
		}, [])
	}
	async all(sql, values) {
		return this.db.execute({ sql, values }).then(([rows]) => rows)
	}
	async allto(name, sql, values) {
		return this.all(sql, values).then(rows => {
			return rows.reduce((ak, r) => {
				ak[r[name]] = r
				return ak
			}, {})
		})
	}

	
	async insertId(sql, values) { //insert
		const [rows, fields] = await this.db.query({ sql, values })
		return rows.insertId
	}
	async affectedRows(sql, values) { //insert, delete
		const [rows, fields] = await this.db.execute({ sql, values })
		return rows.affectedRows
	}

	
	async changedRows(sql, values) { //update
		const [rows, fields] = await this.db.execute({ sql, values })
		return rows.changedRows
	}

	async exec(sql, values) { //for mysql
		const [rows, fields] = await this.db.execute({ sql, values })
		return rows.changedRows
	}
	async query(sql, values) { //for client
		const [rows, fields] = await this.db.query({ sql, values })
		return rows.changedRows
	}
	
}
// export const Db = {
// 	getConnection: () => {
// 		if (!pool) return false
// 		return pool.getConnection()
// 	}
// }