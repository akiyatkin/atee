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
		console.log('db ready - connectionLimit: ' + connectionLimit)
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
	async connect () {
		if (!pool) return false
		this.db = await pool.getConnection()
		return this
	}
	async fetch(sql, values) {
		const [rows, fields] = await this.db.query({ sql, values })
		return rows[0]
	}
	async start() {
		await this.db.query('START TRANSACTION')
	}
	async commit() {
		await this.db.query('COMMIT')
	}
	async col(sql, values) {
		const [rows, fields] = await this.db.query({ sql, values })
		if (!rows.length) return null
		return rows[0][fields[0].name]
	}
	async insertId(sql, values) {
		const [rows, fields] = await this.db.query({ sql, values })
		return rows.insertId
	}
	async changedRows(sql, values) {
		const [rows, fields] = await this.db.query({ sql, values })
		return rows.changedRows
	}
	async exec(sql, values) {
		const [rows, fields] = await this.db.execute({ sql, values })
		return rows.changedRows
	}
	async query(sql, values) {
		const [rows, fields] = await this.db.query({ sql, values })
		return rows.changedRows
	}
	async colAll(sql, values) {
		const [rows, fields] = await this.db.query({ sql, values })
		return rows.reduce((ak, row) => {
			ak.push(row[fields[0].name])
			return ak
		}, [])
	}
	async all(sql, values) {
		return this.db.query({ sql, values }).then(([rows]) => rows)
	}
	async allto(name, sql, values) {
		return this.all(sql, values).then(rows => {
			return rows.reduce((ak, r) => {
				ak[r[name]] = r
				return ak
			}, {})
		})
	}
}
// export const Db = {
// 	getConnection: () => {
// 		if (!pool) return false
// 		return pool.getConnection()
// 	}
// }