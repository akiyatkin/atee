import nicked from "/-nicked"
import config from "/-config"
import fs from "fs/promises"
const Sources = {}
// INSERT IGNORE INTO `sources_entities` (`entity_id`, `prop_id`, `entity_title`, `entity_nick`) VALUES (1, 1, 'Сущность не выбрана', 'sushnost-ne-vybrana');
// INSERT IGNORE INTO `sources_props` (`prop_id`, `entity_id`, `prop_title`, `prop_nick`, `type`) VALUES (1, 1, 'Идентификатор строки', 'identifikator-stroki', 'value');


const getRestFunc = async (file, fnname, visitor, res, req = {}) => {
	const stat = await fs.stat(file).catch(r => false)
	if (!stat) return 'Нет файла'
	res.modified = new Date(stat.mtime).getTime()
	const rest = await import('/' + file).then(r => r.default).catch(r => false)
	if (!rest || !rest.get) return `Ошибка в коде ` + file
	const reans = await rest.get(fnname, req, visitor).catch(r => false)
	if (!reans || !reans.ans) return `Исключение в ${fnname}`
	const ans = reans.ans
	if (!ans.result) return `Ошибка в ${fnname}: ${ans.msg || ''}`
	res.ans = ans
	return ''
}
Sources.check = async (db, source, visitor) => {
	const res = {}
	source.error = await getRestFunc(source.file, 'get-mtime', visitor, res)
	source.date_mtime = Math.round(Math.max(Number(res.ans?.mtime || 0) || 0, res.modified || 0) / 1000)

	await db.exec(`
		UPDATE sources_sources
		SET date_mtime = FROM_UNIXTIME(:date_mtime), error = :error, date_check = now()
		WHERE source_id = :source_id
	`, source)
}
Sources.getAll = async (db) => {
	const list = await db.all(`
		SELECT source_id, source_title,
		UNIX_TIMESTAMP(date_check) as date_check, 
		UNIX_TIMESTAMP(date_content) as date_content, 
		UNIX_TIMESTAMP(date_load) as date_load, 
		UNIX_TIMESTAMP(date_exam) as date_exam,
		duration_load,
		duration_insert,
		dependent,
		comment,
		disabled
		FROM sources_sources
	`)
	
	const conf = await config('sources')
	for (const source of list) {
		source.file = conf.dir + source.source_title + '.js'
		
	}

	return list
}
export default Sources