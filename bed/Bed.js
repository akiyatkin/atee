import Access from "/-controller/Access.js"
import Db from "/-db/Db.js"
import nicked from "/-nicked"
import unique from "/-nicked/unique.js"
import filter from "/-nicked/filter.js"
import fs from 'fs/promises'
import config from '/-config'

const Bed = {}
export default Bed

Bed.getPageByNick = async (db, page_nick) => {
	const page = await db.fetch(`
		SELECT 
			pa.page_id,
			pa.page_nick,
			pa.page_title,
			pa.group_id,
			pa.parent_id
		FROM bed_pages pa
		WHERE pa.page_nick = :page_nick
	`, {page_nick})
	return page
}
Bed.getPageById = async (db, page_id) => {
	const page = await db.fetch(`
		SELECT 
			pa.page_id,
			pa.page_nick,
			pa.page_title,
			pa.group_id,
			pa.parent_id
		FROM bed_pages pa
		WHERE pa.page_id = :page_id
	`, {page_id})
	return page
}
Bed.getChilds = async (db, group_id) => {
	if (!group_id) return []
	const childs = await db.all(`
		SELECT
			pa.page_nick,
			pa.page_title,
			pa.page_id,
			pa.group_id,
			pa.parent_id
		FROM
			bed_childs ch, bed_pages pa
		WHERE
			pa.page_id = ch.page_id
			and ch.group_id = :group_id
		ORDER BY pa.ordain
	`, {group_id})
	return childs
}
Bed.getMpage = async (db, page_id) => {
	const marks = await db.all(`
		SELECT 
			ma.prop_nick, ma.value_nick
		FROM bed_marks ma
		WHERE page_id = :page_id
	`, {page_id})
	const mpage = {}
	for (const mark of marks) {
		mpage[mark.prop_nick] ??= {}
		mpage[mark.prop_nick][mark.value_nick] ??= 1
	}
	return mpage
}
Bed.makemd = (m) => {
	m = m.replaceAll(/([^:]+)::\./ug, ":$1:$1.")
	const mds = m.split(':').filter(s => s).map((item) => {
        item = item.replace(/\+/g, '%20')
        const r = item.split('=')
        const data = []
        data[0] = decodeURIComponent(r.shift())
        data[1] = data.length ? decodeURIComponent(r.join('=')) : ''
        return data
    })

	
	const newmd = {}

	mds.forEach(data => {
		const name = data[0]
		const val = data[1]
		const r = name.split('.')
		let root = newmd
		const last = r.pop()
		let v
		while (v = r.shift()) {
			if (typeof(root[v]) != 'object') root[v] = {}	
			root = root[v]
		}
		if (!val) delete root[last]
		else root[last] = val
	})
	return newmd
}
Bed.makemark = (md, ar = [], path = []) => {
	if (!path.length) delete md.m
	for (const name in md) {
		const val = md[name]
		if (typeof(val) == 'object') {
			Bed.makemark(val, ar, [...path, name] )	
		} else {
			ar.push([...path, name+'='+val].join('.'))
		}
	}
	return ar
}
Bed.mdfilter = (mpage, props, values) => {
	const newmpage = {}
	for (const prop_nick in mpage) {
		const prop = props[prop_nick]
		if (!prop) continue
		newmpage[prop_nick] = {}
		if (typeof mpage[prop_nick] == 'object' && prop.type == 'value') {
			for (const value_nick in mpage[prop_nick]) {
				if (!values[value_nick]) continue
				newmpage[prop_nick][value_nick] = mpage[prop_nick][value_nick]
			}
			if (!Object.keys(newmpage[prop_nick]).length) delete newmpage[prop_nick]
		} else {
			newmpage[prop_nick] = mpage[prop_nick]
		}
	}
	return newmpage
}
Bed.getmdids = async (db, marks) => {
	const prop_nicks = []
	const value_nicks = []
	for (const mall of marks) {
		for (const prop_nick in mall) {
			prop_nicks.push(prop_nick)
			const val = mall[prop_nick]
			if (typeof val == 'object') {
				for (const value_nick in val) {
					value_nicks.push(value_nick)
				}
			}	
		}
	}
	const props = await db.allto('prop_nick', `
		SELECT prop_id, prop_nick, prop_title, type, name, unit
		FROM sources_props
		WHERE prop_nick in ("${unique(prop_nicks).join('","')}")
	`)
	const values = await db.allto('value_nick', `
		SELECT value_id, value_nick, value_title
		FROM sources_values
		WHERE value_nick in ("${unique(prop_nicks).join('","')}")
	`)
	return {values, props}
}

Bed.getmdwhere = async (db, md, mpage, hashs, partner = '') => {
	const mall = {...md.mget, ...mpage}

	const bind = {
		pos_entity_id: md.pos_entity_id,
		mod_entity_id: md.mod_entity_id
	}
	const where = [
		'pos.entity_id=:pos_entity_id', 
		'pos.prop_id=:mod_entity_id'
	]
	if (hashs.length) {
		const where_search = []
		for (const hash of hashs) {
			const sql = 'pos.search like "% ' + hash.join('%" and pos.search like "% ') + '%"'
			where_search.push(sql)
		}
		where.push(`(${where_search.join(' or ')})`)
	}	
	

	const from = ['sources_data pos']
	const sort = ['pos.source_ordain', 'pos.sheet_index', 'pos.row_index'] //, 'pos.prop_ordain', 'pos.multi_index'

	let i = 0

	for (const prop_nick in mall) {
		const values = mall[prop_nick]
		const prop = md.props[prop_nick]
		if (values == 'empty') {
			i++
 			from[0] += `
				LEFT JOIN sources_data da${i} on (
					da${i}.entity_id = pos.entity_id 
					and da${i}.key_id = pos.key_id
					and da${i}.multi_index = 0
					and da${i}.prop_id = ${prop.prop_id}
				)
 			`
 			where.push(`da${i}.prop_id is null`)
 		} else {
 			i++
 			from.push(`sources_data da${i}`)
			where.push(`da${i}.entity_id = pos.entity_id `)
			where.push(`da${i}.key_id = pos.key_id`)
			where.push(`da${i}.prop_id = ${prop.prop_id}`)
			const ids = []
			if (prop.type == 'number') {
				for (let name in values) {
					let value = name
					if (~['upto','from'].indexOf(name)) {
						value = values[name]
					}
					if (typeof(value) == 'string') value = value.replace('-','.')
					
					let value_nick = Number(value)
					
					if (partner?.discount && prop_nick == 'cena') {
						value_nick = value_nick * (100 + partner.discount) / 100
					}
					if (~['upto','from'].indexOf(name)) {
						sort = []
						if (name == 'upto') {
							where.push(`da${i}.number <= ${value_nick}`)
							sort.push(`da${i}.number DESC`)
						}
						if (name == 'from') {
							where.push(`da${i}.number >= ${value_nick}`)
							sort.push(`da${i}.number ASC`)
						}
					} else {
						if (value_nick == value) ids.push(value_nick)
						//else  ids.push(prop.prop_id + ', false')	
					}
				}
				if (ids.length) where.push(`da${i}.number in (${ids.join(',')})`)
			} else if (prop.type == 'value') {

				for (const value_nick in values) {

					const value = md.values[value_nick]
					ids.push(value.value_id)
				}
				where.push(`da${i}.value_id in (${ids.join(',')})`)
			} else {
				//значения других типов пропускаем
			}
 		}
	}
	
	
	return {where, from, sort, bind}
}