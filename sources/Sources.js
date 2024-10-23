import nicked from "/-nicked"
import config from "/-config"
import fs from "fs/promises"
const Sources = {}
// INSERT IGNORE INTO `sources_entities` (`entity_id`, `prop_id`, `entity_title`, `entity_nick`) VALUES (1, 1, 'Сущность не выбрана', 'sushnost-ne-vybrana');
// INSERT IGNORE INTO `sources_props` (`prop_id`, `entity_id`, `prop_title`, `prop_nick`, `type`) VALUES (1, 1, 'Идентификатор строки', 'identifikator-stroki', 'value');


Sources.execRestFunc = async (file, fnname, visitor, res, req = {}) => {
	const stat = await fs.stat(file).catch(r => false)
	if (!stat) return 'Не найден'
	res.modified = new Date(stat.mtime).getTime()
	const rest = await import('/' + file).then(r => r.default).catch(r => false)
	if (!rest || !rest.get) return `Ошибка в коде ` + file
	const reans = await rest.get(fnname, req, visitor).catch(r => false)
	if (!reans || !reans.ans) return `Исключение в ${fnname}`
	const ans = reans.ans
	if (!ans.result) return `Ошибка в ${fnname} ${ans.msg || ''}`
	res.ans = ans
	return ''
}
Sources.load = async (db, source, visitor) => {
	const res = {}
	source.error = await Sources.execRestFunc(source.file, 'get-data', visitor, res)
	
	if (!source.error) {
		source.date_content = Math.round(Number(res.ans?.date_content || 0) / 1000)
		source.date_mtime = Math.max(source.date_content || 0, source.date_mtime || 0)
		await db.exec(`
			UPDATE sources_sources
			SET date_load = now(), 
				date_content = FROM_UNIXTIME(:date_content), 
				date_mtime = FROM_UNIXTIME(:date_mtime), 
				error = :error
			WHERE source_id = :source_id
		`, source)
	} else { //date_content не сбрасываем, была ошибка
		await db.exec(`
			UPDATE sources_sources
			SET error
			WHERE source_id = :source_id
		`, source)
	}
	const ans = res.ans || {sheets:[]}
	return {
		count_sheets: ans.sheets.length, 
		count_rows: ans.sheets.reduce((ak, rows) => ak + rows.length, 0) || 0
	}
}
Sources.check = async (db, source, visitor) => {
	const res = {}
	source.error = await Sources.execRestFunc(source.file, 'get-mtime', visitor, res)
	//date_content может быть больше чем date_mtime из обработки
	source.date_mtime = Math.round(Math.max(source.date_content || 0, Number(res.ans?.date_mtime || 0) || 0, res.modified || 0) / 1000)
	await db.exec(`
		UPDATE sources_sources
		SET date_mtime = FROM_UNIXTIME(:date_mtime), error = :error, date_check = now()
		WHERE source_id = :source_id
	`, source)
}


const SELECT_SOURCE = `
	source_id, 
	source_title,
	UNIX_TIMESTAMP(date_check) as date_check, 
	UNIX_TIMESTAMP(date_content) as date_content, 
	UNIX_TIMESTAMP(date_load) as date_load, 
	UNIX_TIMESTAMP(date_exam) as date_exam,
	UNIX_TIMESTAMP(date_mtime) as date_mtime,
	duration_load,
	duration_insert,
	dependent + 0 as dependent,
	comment,
	error,
	represent + 0 as represent,
	renovate + 0 as renovate,
	entity_id
`
Sources.getSource = async (db, source_id) => {
	const source = await db.fetch(`
		SELECT 
		${SELECT_SOURCE}
		FROM sources_sources
	`, {source_id})
	const conf = await config('sources')
	source.file = conf.dir + source.source_title + '.js'

	return source
}
Sources.getAll = async (db) => {
	const list = await db.all(`
		SELECT 
		${SELECT_SOURCE}
		FROM sources_sources
	`)
	
	const conf = await config('sources')
	for (const source of list) {
		source.file = conf.dir + source.source_title + '.js'
		
		
	}
	return list
}
export default Sources