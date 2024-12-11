import Access from "/-controller/Access.js"
import nicked from '/-nicked'
import filter from '/-nicked/filter.js'

import xlsx from "/-xlsx"
import Rest from "/-rest"
import config from "/-config"
import Sources from "/-sources/Sources.js"
import eye from "/-sources/represent.js"
const rest = new Rest()

import rest_sources from '/-sources/rest.sources.js'
rest.extra(rest_sources)

import rest_admin from '/-controller/rest.admin.js'
rest.extra(rest_admin)

import rest_search from "/-dialog/search/rest.search.js" //аргументы hash, search 
rest.extra(rest_search)

rest.addResponse('get-source-entity-search', ['admin'], async view => {
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
			action:`/-sources/set-source-entity-create`,
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
rest.addResponse('get-sheet-entity-search', ['admin'], async view => {
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
			action:`/-sources/set-sheet-entity-create`,
			search_value: true, 
			left: '<span class="a">Новая сущность</span>',
			right: ''
		})
	}
	view.ans.list.push({
		action:`/-sources/set-sheet-entity-reset`,
		left: '<span class="a">Сбросить выбор</span>',
		right: ''
	})

	view.ans.count = list.length
	return view.ret()
})
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

	view.ans.count = list.length
	return view.ret()
})

rest.addResponse('get-entity-prop-search', ['admin'], async view => {
	const db = await view.get('db')
	const hash = await view.get('hash')
	const entity_id = await view.get('entity_id#required')
	const list = await db.all(`
		SELECT prop_id, prop_title, type
		FROM sources_props
		WHERE prop_nick like "%${hash.join('%" and prop_nick like "%')}%"
		and entity_id = :entity_id
	`, {entity_id})

	view.ans.list = list.map(row => {
		row['left'] = row.prop_title
		row['right'] = row.type
		return row
	})
	if (hash.length) {
		view.ans.list.push({
			confirm:'Cоздать новое свойство?',
			action:`/-sources/set-entity-prop-create`,
			search_value: true, 
			left: '<span class="a">Создать свойство</span>',
			right: ''
		})
	}
	view.ans.list.push({
		action:`/-sources/set-entity-prop-reset`,
		left: '<span class="a">Сбросить выбор</span>',
		right: ''
	})

	view.ans.count = list.length
	return view.ret()
})
rest.addResponse('get-col-prop-search', ['admin'], async view => {
	const db = await view.get('db')
	const hash = await view.get('hash')
	const entity_id = await view.get('entity_id#required')
	const list = await db.all(`
		SELECT prop_id, prop_title, type
		FROM sources_props
		WHERE prop_nick like "%${hash.join('%" and prop_nick like "%')}%"
		and entity_id = :entity_id
	`, {entity_id})

	view.ans.list = list.map(row => {
		row['left'] = row.prop_title
		row['right'] = row.type
		return row
	})
	if (hash.length) {
		view.ans.list.push({
			confirm:'Cоздать новое свойство?',
			action:`/-sources/set-col-prop-create`,
			search_value: true, 
			left: '<span class="a">Создать свойство</span>',
			right: ''
		})
	}
	view.ans.list.push({
		action:`/-sources/set-col-prop-reset`,
		left: '<span class="a">Сбросить выбор</span>',
		right: ''
	})

	view.ans.count = list.length
	return view.ret()
})
rest.addResponse('get-prop-type-search', ['admin'], async view => {
	view.ans.list = [
		{
			'left':'number',
			'type':'number',
			'right':''
		},
		{
			'left':'date',
			'type':'date',
			'right':''
		},
		{
			'left':'value',
			'type':'value',
			'right':''
		},
		{
			'left':'text',
			'type':'text',
			'right':''
		}
	]
	view.ans.count = 4
	return view.ret()
})
rest.addResponse('get-inter-prop-search', ['admin'], async view => {
	const db = await view.get('db')
	const hash = await view.get('hash')
	const entity_id = await view.get('entity_id#required')
	const list = await db.all(`
		SELECT prop_id, prop_title, type
		FROM sources_props
		WHERE prop_nick like "%${hash.join('%" and prop_nick like "%')}%"
		and entity_id = :entity_id
	`, {entity_id})

	view.ans.list = list.map(row => {
		row['left'] = row.prop_title
		row['right'] = row.type
		return row
	})
	if (hash.length) {
		view.ans.list.push({
			confirm:'Cоздать новое свойство?',
			action:`/-sources/set-entity-prop-create`,
			search_value: true, 
			left: '<span class="a">Создать свойство</span>',
			right: ''
		})
	}
	
	view.ans.count = list.length
	return view.ret()
})
export default rest

