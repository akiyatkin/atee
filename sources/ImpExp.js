import BulkInserter from "./BulkInserter.js"
const ImpExp = {}
export default ImpExp


ImpExp.export = async (db, tables) => {
	const dump = {}
	for (const table of tables) {
		dump[table] = await db.all(`SELECT * FROM ${table}`)	
	}

	return `
	<textarea style="width: 100%;" rows="10" id="impextcontainer"></textarea>
	<script type="module">
		const dump = ${JSON.stringify(dump)}		
	    document.getElementById('impextcontainer').textContent = JSON.stringify(dump)
	</script>

`
}
// ImpExp.convertISODateToMySQL = (isoDateString) => {
//     const date = new Date(isoDateString);
//     return date.toISOString().slice(0, 19).replace('T', ' ');
//     // Результат: "2025-09-12 16:35:10"
// }
ImpExp.convertISODateToMySQL = (isoDateString, offsetHours = 4, offsetMinutes = 0) => {
	if (!isoDateString) return null;
    const date = new Date(isoDateString);
    
    // Добавляем смещение к UTC времени
    date.setHours(date.getHours() + offsetHours);
    date.setMinutes(date.getMinutes() + offsetMinutes);
    
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

ImpExp.import = async (db, json, tables) => {
	
	let dump
	try {
		dump = JSON.parse(json)
	} catch(e) {
		console.log(e)
		 return 'Данные не распознаны'
	}
	for (const table of tables) {
		if (!dump[table]) return 'Ошибка: не найдены данные для ' + table
	}
	
	await db.exec(`SET FOREIGN_KEY_CHECKS = 0`) //truncate быстрей, но с FK не работает
	for (const table in dump) {
		const rows = dump[table]
		if (!rows.length) continue

		for (const row of rows) {
			for (const key in row) {
				if (key.indexOf('.') === 0) delete row[key]
			}
		}

		const keys = Object.keys(rows[0])
		if (keys.some(key => ~key.indexOf('date_'))) {
			for (const row of rows) {
				for (const key in row) {
					if (~key.indexOf('date_')) row[key] = ImpExp.convertISODateToMySQL(row[key])
				}
			}
		}
		await db.exec(`TRUNCATE TABLE ${table}`)
		await db.exec(`SET SESSION time_zone = @@session.time_zone;`)

		const bulk = new BulkInserter(db, table, keys);
		for (const row of rows) await bulk.insert(Object.values(row).map((value, i) => {
			if (value === null) return null
			if (value?.type == "Buffer") return value.data[0]
			if (~keys[i].indexOf('date_')) return value			
			return value
		}))
		await bulk.flush()

		// await db.exec(`
		// 	INSERT INTO ${table} (${keys.join(', ')})
		// 	VALUES 
		// 		${'(' + rows.map(row => {
		// 			return Object.values(row).map((value, i) => {
		// 				if (value === null) return "null"
		// 				if (value?.type == "Buffer") return value.data[0]
		// 				//if (keys[i] == 'date_create') return 'CONVERT_TZ(STR_TO_DATE("'+value+'", "%Y-%m-%dT%H:%i:%s.%fZ"), @@session.time_zone, "+00:00")'
		// 				//if (keys[i] == 'date_create') return 'STR_TO_DATE("'+value+'", "%Y-%m-%dT%H:%i:%s.%fZ")'

		// 				if (~keys[i].indexOf('date_')) return 'CONVERT_TZ(SUBSTRING("'+value+'", 1, 19), "+00:00", @@session.time_zone)'
		// 				//if (keys[i] == 'date_create') return 'CAST("'+value+'" AS DATETIME)'
						
		// 				return '"' + value + '"'
		// 			}).join(',')
		// 		}).join('),(') + ')'}
		// `)
	}
	await db.exec(`SET FOREIGN_KEY_CHECKS = 1`)
} 