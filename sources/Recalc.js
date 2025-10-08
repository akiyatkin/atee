import Access from "/-controller/Access.js"
import Db from "/-db/Db.js"
const Recalc = {}
//funchange могут различаться, выполняются сразу. Нужны чтобы интерфейс иллюстрировал изменения, но вот публикация и индексация уже необязательна и откладывается
//funpub должен быть один, так как откладывается каждый раз и остаётся тот что был передан последним, и значит каждый должен быть равнозначным
Recalc.checkShutdown = async (db, funchange) => {
	console.log('Recalc.checkShutdown')
	//После создания структуры бд и перезапуска, должна быть первая запись в sources_settings
	//await db.exec(`INSERT IGNORE INTO sources_settings (singleton, comment) VALUES ('X','Общий комментарий')`)
	const dates = await Recalc.getDates(db)
	//Если были действия с источниками, надо чтобы даже если сервер падал, запустилась публикация
	if (!dates.date_recalc_finish && !dates.date_recalc_publicate) {
		await Recalc.recalc(funchange, true)
	} else if (!dates.date_recalc_finish) {
		await Recalc.recalc(funchange)
	} else if (!dates.date_recalc_publicate) {
		Recalc.deferredPublicate(db)
	}
}


Recalc.getDates = async (db) => {
	const dates = await db.fetch(`
		SELECT 
			UNIX_TIMESTAMP(date_recalc_start) as date_recalc_start, 
			UNIX_TIMESTAMP(date_recalc_finish) as date_recalc_finish,
			UNIX_TIMESTAMP(date_recalc_publicate) as date_recalc_publicate 
		FROM sources_settings
	`)
	return dates
}


Recalc.deferredPublicate = (db) => {
	console.log('deferredPublicate')
	clearTimeout(Recalc.deferredPublicate.timer)
	Recalc.deferredPublicate.timer = setTimeout(() => Recalc.publicate(db), 1000 * 60 * 30)
}

Recalc.pub_funcs = []
Recalc.addPublicate = (funcindex) => {
	Recalc.pub_funcs.push(funcindex)
}
Recalc.reset = async (db) => {
	clearTimeout(Recalc.deferredPublicate.timer)
	await db.exec(`UPDATE sources_settings SET date_recalc_start = now(),  date_recalc_finish = now(),  date_recalc_publicate = now()`)	
}
Recalc.publicate = async (db) => {
	clearTimeout(Recalc.deferredPublicate.timer)
	await db.exec(`UPDATE sources_settings SET date_recalc_publicate = now()`) //Если после этого будет date_recalc_publicate = null то индексировать надо заного
	for (const func of Recalc.pub_funcs) {
		await func(db)
	}
	
	Access.setAccessTime()
}
// Recalc.recalcAccess = async (db, funchange, publicate_required) => {
// 	await Recalc.recalc(funchange, publicate_required)
// 	Access.setAccessTime()
// }
Recalc.recalc = async (funchange, publicate_required) => {	
	const db = await new Db().connect()
	const dates = await Recalc.getDates(db)
	Recalc.recalc.counter++
	if (dates.date_recalc_finish)	{
		if (publicate_required) {
			await db.exec(`UPDATE sources_settings SET date_recalc_start = now(), date_recalc_finish = null, date_recalc_publicate = null`)
		} else {
			await db.exec(`UPDATE sources_settings SET date_recalc_start = now(), date_recalc_finish = null`)
		}
	} else {
		console.log('Наложение Recalc.recalc')
	}
	
	const d = new Date()
	const promise = funchange ? funchange(db) : new Promise(resolve => resolve())
	const timeout = new Promise(resolve => setTimeout(resolve, 1000))
	try {
		await Promise.all([promise, timeout])
	} catch (e) {
		console.log(e)
	}
	
	console.log('Recalc.end', (new Date().getTime() - d))
	
	Recalc.recalc.counter--

	if (!Recalc.recalc.counter)	await db.exec(`UPDATE sources_settings SET date_recalc_finish = now()`)
	
	if (publicate_required) {
		Recalc.deferredPublicate(db)
	} else {
		Access.setAccessTime() //Когда это не нужно? оставил коммент - но там и пересчёт не требуется
	}
	db.release()
}
Recalc.recalc.counter = 0
export default Recalc