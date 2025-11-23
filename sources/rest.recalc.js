import Rest from "@atee/rest"
import Recalc from "/-sources/Recalc.js"

const rest = new Rest()

import rest_db from '/-db/rest.db.js'
rest.extra(rest_db)


rest.addFunction('checkrecalc', async (view) => { //setaccess нужен, только после индексации
	const db = await view.get('db')
	const dates = await Recalc.getDates(db)
	const source_title = await db.col(`select source_title FROM sources_sources where date_start is not null`)
	if (source_title) return view.err('Дождитесь загрузки '+ source_title)
	if (!dates.date_recalc_finish) return view.err('Подождите идёт обработка')
})




export default rest
