import Access from "/-controller/Access.js"
const Recalc = {}
//funchange могут различаться, выполняются сразу. Нужны чтобы интерфейс иллюстрировал изменения, но вот публикация и индексация уже необязательна и откладывается
//funindex должен быть один, так как откладывается каждый раз и остаётся тот что был передан последним, и значит каждый должен быть равнозначным
Recalc.checkShutdown = async (db, funchange, funindex) => {
	console.log('Recalc.checkShutdown')
	//После создания структуры бд и перезапуска, должна быть первая запись в sources_settings
	await db.exec(`INSERT IGNORE INTO sources_settings (singleton, comment) VALUES ('X','Общий комментарий')`)
	const dates = await Recalc.getDates(db)
	//Если были действия с источниками, надо чтобы даже если сервер падал, запустилась публикация
	if (!dates.date_recalc_finish && !dates.date_recalc_index) {
		await Recalc.recalc(db, funchange, true)
	} else if (!dates.date_recalc_finish) {
		await Recalc.recalc(db, funchange)
	} else if (!dates.date_recalc_index) {
		Recalc.deferredIndex(db)
	}
}


Recalc.getDates = async (db) => {
	const dates = await db.fetch(`
		SELECT 
			UNIX_TIMESTAMP(date_recalc_start) as date_recalc_start, 
			UNIX_TIMESTAMP(date_recalc_finish) as date_recalc_finish,
			UNIX_TIMESTAMP(date_recalc_index) as date_recalc_index 
		FROM sources_settings
	`)
	return dates
}


Recalc.deferredIndex = (db) => {
	console.log('deferredIndex')
	clearTimeout(Recalc.deferredIndex.timer)
	Recalc.deferredIndex.timer = setTimeout(() => Recalc.index(db), 1000 * 60 * 30)
}

Recalc.funcindexes = []
Recalc.addIndex = (funcindex) => {
	Recalc.funcindexes.push(funcindex)
}
Recalc.reset = async (db) => {
	clearTimeout(Recalc.deferredIndex.timer)
	await db.exec(`UPDATE sources_settings SET date_recalc_start = now(),  date_recalc_finish = now(),  date_recalc_index = now()`)	
}
Recalc.index = async (db) => {
	clearTimeout(Recalc.deferredIndex.timer)
	await db.exec(`UPDATE sources_settings SET date_recalc_index = now()`) //Если после этого будет date_recalc_index = null то индексировать надо заного
	for (const funcindex of Recalc.funcindexes) {
		await funcindex(db)
	}
	
	Access.setAccessTime()
}

Recalc.recalc = async (db, funchange, andindex) => {
	const dates = await Recalc.getDates(db)
	Recalc.recalc.counter++
	if (dates.date_recalc_finish)	{
		if (andindex) {
			await db.exec(`UPDATE sources_settings SET date_recalc_start = now(), date_recalc_finish = null, date_recalc_index = null`)
		} else {
			await db.exec(`UPDATE sources_settings SET date_recalc_start = now(), date_recalc_finish = null`)
		}
	} else {
		console.log('Наложение Recalc.recalc')
	}
	
	const d = new Date()
	const promise = funchange ? funchange(db) : new Promise(resolve => resolve())
	const timeout = new Promise(resolve => setTimeout(resolve, 1000))
	await Promise.all([promise, timeout])
	console.log('Recalc.end', (new Date().getTime() - d))
	
	Recalc.recalc.counter--

	if (!Recalc.recalc.counter)	await db.exec(`UPDATE sources_settings SET date_recalc_finish = now()`)
	
	if (andindex) {
		Recalc.deferredIndex(db)
	}
}
Recalc.recalc.counter = 0
export default Recalc