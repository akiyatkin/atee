import nicked from "/-nicked"
import config from "/-config"
import fs from "fs/promises"
const Sources = {}
// INSERT IGNORE INTO `sources_entities` (`entity_id`, `prop_id`, `entity_title`, `entity_nick`) VALUES (1, 1, 'Сущность не выбрана', 'sushnost-ne-vybrana');
// INSERT IGNORE INTO `sources_props` (`prop_id`, `entity_id`, `prop_title`, `prop_nick`, `type`) VALUES (1, 1, 'Идентификатор строки', 'identifikator-stroki', 'value');

Sources.check = async (db, source) => {

	const stat = await fs.stat(source.file).catch(r => false)
	source.file_modified = stat ? Math.round(new Date(stat.mtime).getTime() / 1000) : false
	

	
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