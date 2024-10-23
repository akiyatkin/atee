import nicked from '/-nicked'
import fs from "fs/promises"
import Rest from "/-rest"
import config from '/-config'


const rest = new Rest()

import rest_db from '/-db/rest.db.js'
rest.extra(rest_db)

import rest_funcs from '/-rest/rest.funcs.js'
rest.extra(rest_funcs)

rest.addArgument('date', (view, date) => {
	if (!date) return null
	try {
		return Math.round(new Date(date).getTime() / 1000)
	} catch (e) {
		return null
	}
})
rest.addArgument('title', ['escape'])
rest.addArgument('source_id', ['sint'], async (view, source_id) => {
	if (!source_id) return null
	const db = await view.get('db')
	source_id = await db.col('select source_id from sources_sources where source_id=:source_id', {source_id})
	if (!source_id) return view.err('Источник не найден')
	return source_id
})
rest.addVariable('source_id#required', ['source_id', 'required'])

export default rest