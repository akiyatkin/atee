import Access from "/-controller/Access.js"
import nicked from '/-nicked'
import filter from '/-nicked/filter.js'

import xlsx from "/-xlsx"
import Rest from "/-rest"
import config from "/-config"
import Sources from "/-sources/Sources.js"
const rest = new Rest()

import rest_sources from '/-sources/rest.sources.js'
rest.extra(rest_sources)

import rest_search from "/-dialog/search/rest.search.js" //аргументы hash, search 
rest.extra(rest_search)

rest.addResponse('get-entity-search', ['admin'], async view => {
	const db = await view.get('db')
	const hash = await view.get('hash')
	
	const list = await db.all(`
		SELECT entity_id, entity_title
		FROM sources_entities
		WHERE entity_nick like "%${hash.join('%" and entity_nick like "%')}%"
	`)

	view.ans.list = list.map(row => {
		row['left'] = row.entity_title
		row['right'] = ''
		return row
	})
	if (hash.length) {
		view.ans.list.push({
			confirm:'Cоздать новую сущность?',
			action:`/-sources/set-entity-create`,
			search_value: true, 
			left: '<span class="a">Новая сущность</span>',
			right: ''
		})
	}
	view.ans.list.push({
		action:`/-sources/set-source-entity-reset`,
		left: '<span class="a">Сбросить выбор</span>',
		right: ''
	})

	view.ans.count = list.length
	return view.ret()
})
export default rest

