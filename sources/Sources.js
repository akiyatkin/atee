import nicked from "/-nicked"
import config from "/-config"
import unique from "/-nicked/unique.js"
import fs from "fs/promises"
const Sources = {}


Sources.execRestFunc = async (file, fnname, visitor, res, req = {}) => {
	const stat = await fs.stat(file).catch(r => false)
	if (!stat) return 'Не найден файл'
	res.modified = new Date(stat.mtime).getTime()
	const rest = await import('/' + file).then(r => r.default).catch(r => false)
	if (!rest || !rest.get) return `Исключение в коде ` + file
	const reans = await rest.get(fnname, req, visitor).catch(r => false)
	if (!reans || !reans.ans) return `Исключение в ${fnname}`
	const ans = reans.ans
	if (!ans.result) return `Нет результата ${fnname} ${ans.msg || ''}`
	res.ans = ans
	return ''
}
Sources.setStart = async (db, source_id) => {
	await db.exec(`
		UPDATE sources_sources SET date_start = now() WHERE source_id = :source_id
	`, {source_id})
}
Sources.setEnd = async (db, source_id) => {
	await db.exec(`
		UPDATE sources_sources SET date_start = null WHERE source_id = :source_id
	`, {source_id})
}
Sources.renovate = async (db, source, visitor) => {
	await Sources.check(db, source, visitor)
	if (source.need) await Sources.load(db, source, visitor)
}
Sources.setDuration = async (db, source_id, name, timer) => {
	await db.exec(`
		UPDATE sources_sources
		SET ${name} = :duration
		WHERE source_id = :source_id
	`, {source_id, duration: Date.now() - timer})
}
Sources.load = async (db, source, visitor) => {
	if (source.date_start) return
	const res = {}
	const timer_rest = Date.now()
	await Sources.setStart(db, source.source_id)
	source.error = await Sources.execRestFunc(source.file, 'get-load', visitor, res)
	
	Sources.setDuration(db, source.source_id, 'duration_rest', timer_rest)
	const timer_insert = Date.now()
	source.msg_load = res.ans?.msg || ''
	if (source.error) { //Сообщение об ошибке ans.msg попадает в error
		await db.exec(`
			UPDATE sources_sources
			SET 
				error = :error, 
				msg_load = ''
			WHERE source_id = :source_id
		`, source)
		return false
	} else {
		await db.exec(`
			UPDATE sources_sources
			SET 
				error = :error, 
				msg_load = :msg_load
			WHERE source_id = :source_id
		`, source)
	}
	
	setTimeout(async () => {
		source.date_content = Math.round(Number(res.ans?.date_content || 0) / 1000)
		source.date_mtime = Math.max(source.date_content || 0, source.date_mtime || 0)
		await db.exec(`
			UPDATE sources_sources
			SET date_load = now(), 
				date_content = FROM_UNIXTIME(:date_content), 
				date_mtime = FROM_UNIXTIME(:date_mtime)
			WHERE source_id = :source_id
		`, source)
		
		Sources.calcSource(source)
		Sources.setEnd(db, source.source_id, 0)
		Sources.setDuration(db, source.source_id, 'duration_insert', timer_insert)
	}, 10000)
	return res.ans
}

Sources.check = async (db, source, visitor) => {
	if (source.date_start) return
	const res = {}
	const timer = Date.now()
	source.error = await Sources.execRestFunc(source.file, 'get-check', visitor, res)
	//date_content может быть больше чем date_mtime из обработки
	source.date_mtime = Math.round(Math.max(source.date_content || 0, Number(res.ans?.date_mtime || 0) || 0, res.modified || 0) / 1000)
	source.msg_check = res.ans?.msg || ''
	Sources.calcSource(source)

	await db.exec(`
		UPDATE sources_sources
		SET 
			date_mtime = FROM_UNIXTIME(:date_mtime), 
			msg_check = :msg_check,
			error = :error, 
			date_check = now()
		WHERE source_id = :source_id
	`, source)

	Sources.setDuration(db, source.source_id, 'duration_check', timer)
	return res.ans
}



Sources.reorderEntities = async (db) => {
	const list = await db.colAll(`
		SELECT entity_id
		FROM sources_entities
		ORDER BY ordain
	`)
	let ordain = 0
	const promises = []
	for (const entity_id of list) {
		ordain = ordain + 2
		const r = db.exec(`
			UPDATE sources_entities
			SET ordain = :ordain
			WHERE entity_id = :entity_id
		`, {ordain, entity_id})
		promises.push(r)
	}
	return Promise.all(promises)
}
Sources.reorderSources = async (db) => {
	const list = await db.colAll(`
		SELECT source_id
		FROM sources_sources
		ORDER BY ordain
	`)
	let ordain = 0
	const promises = []
	for (const source_id of list) {
		ordain = ordain + 2
		const r = db.exec(`
			UPDATE sources_sources
			SET ordain = :ordain
			WHERE source_id = :source_id
		`, {ordain, source_id})
		promises.push(r)
	}
	return Promise.all(promises)
}





const SELECT_ENTITY = `
	en.entity_id, 
	en.prop_id, 
	en.entity_title,
	en.entity_nick,
	en.entity_plural,
	en.comment,
	en.represent_entity + 0 as represent_entity,
	pr.prop_title,
	pr.prop_nick
`
const SELECT_SOURCE = `
	so.source_id, 
	so.source_title,
	UNIX_TIMESTAMP(so.date_check) as date_check, 
	UNIX_TIMESTAMP(so.date_content) as date_content, 
	UNIX_TIMESTAMP(so.date_load) as date_load, 
	UNIX_TIMESTAMP(so.date_exam) as date_exam,
	UNIX_TIMESTAMP(so.date_mtime) as date_mtime,
	UNIX_TIMESTAMP(so.date_start) as date_start,
	so.duration_rest,
	so.duration_check,
	so.duration_insert,
	so.dependent + 0 as dependent,
	so.comment,
	so.error,
	so.msg_check,
	so.msg_load,
	so.represent_source + 0 as represent_source,
	so.renovate + 0 as renovate,
	so.entity_id,
	${SELECT_ENTITY}
`
Sources.getSource = async (db, source_id) => {
	const source = await db.fetch(`
		SELECT 
		${SELECT_SOURCE}
		FROM sources_sources so
			LEFT JOIN sources_entities en on en.entity_id = so.entity_id
			LEFT JOIN sources_props pr on pr.prop_id = en.prop_id
		where source_id = :source_id
	`, {source_id})
	
	Sources.calcSource(source)


	return source
}

Sources.getSources = async (db) => {
	const list = await db.all(`
		SELECT 
		${SELECT_SOURCE}
		FROM sources_sources so
			LEFT JOIN sources_entities en on en.entity_id = so.entity_id
			LEFT JOIN sources_props pr on pr.prop_id = en.prop_id
		ORDER BY so.ordain
	`)
	for (const source of list) {
		Sources.calcSource(source)
	}
	return list
}


Sources.getEntityStat = async (db, entity) => {
	const sources_by_sources = await db.all(`
		SELECT source_id, source_title
		FROM sources_sources
		WHERE entity_id = :entity_id
	`, entity)
	const sources_by_sheets = await db.all(`
		SELECT distinct sh.source_id, so.source_title
		FROM sources_sheets sh, sources_sources so
		WHERE sh.entity_id = :entity_id and so.source_id = sh.source_id
	`, entity)
	const sources = unique.bykey([...sources_by_sources, ...sources_by_sheets], 'source_id')
	const count_items = await db.col(`
		SELECT count(*) 
		FROM sources_items
		WHERE entity_id = :entity_id
	`, entity)
	const count_represent = await db.col(`
		SELECT count(*) 
		FROM sources_items
		WHERE entity_id = :entity_id and represent_item = 1
	`, entity)
	return {sources, count_items, count_represent}
}




Sources.getEntity = async (db, entity_id) => {
	const entity = await db.fetch(`
		SELECT 
		${SELECT_ENTITY}
		FROM sources_entities en
			LEFT JOIN sources_props pr on pr.prop_id = en.prop_id
		WHERE en.entity_id = :entity_id
	`, {entity_id})
	return entity
}
Sources.getEntities = async (db) => {
	const list = await db.all(`
		SELECT 
		${SELECT_ENTITY}
		FROM sources_entities en
			LEFT JOIN sources_props pr on pr.prop_id = en.prop_id
		GROUP BY en.entity_id
		ORDER BY en.ordain
	`)
	for (const entity of list) {
		entity.stat = await Sources.getEntityStat(db, entity)
	}
	return list
}





const conf = await config('sources')
Sources.calcSource = source => {
	source.file = conf.dir + source.source_title + '.js'
	source.status = Sources.calcStatus(source)
	source.need = Sources.calcNeed(source)
	source.class = Sources.calcClass(source)
}
Sources.calcNeed = (source) => { 
	if (!source.renovate) return false
	if (source.date_start) return false
	if (source.error) return false
	if (!source.date_mtime) return true
	if (!source.date_load) return true
	if (source.date_load < source.date_mtime) return true
	return false
}
Sources.calcClass = (source) => {
	if (source.error) return 'error'
	if (source.date_start) return 'load'
	if (source.need && source.date_load < source.date_mtime) return 'need'
	return 'ok'
}
Sources.calcStatus = (source) => { //Будет загрузка или нет
	if (source.date_start) return 'Идёт загрузка'
	if (source.error) return 'Есть ошибка'
	if (!source.date_mtime) return 'Нужно выполнить проверку'
	if (!source.date_load) return 'Не загружался'
	if (source.date_load < source.date_mtime && source.renovate) return 'Есть изменения'
	if (source.date_load < source.date_mtime && !source.renovate) return 'Есть изменения, актуализация запрещена'
	return 'Текущие данные из источника актуальны'
}

export default Sources