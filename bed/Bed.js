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
			pa.parent_id,
			pa.ordain
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
			pa.parent_id,
			pa.ordain
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
			pa.page_title
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
Bed.getmdwhere = async (db, mpage, mget, search, partner = '') => {
	const where = []
	
	if (search) {
		const hashs = unique(nicked(md.search).split('-').filter(val => !!val)).sort()
		if (hashs.length) {
			where.push(`m.search like "% ${hashs.join('%" and m.search like "% ')}%"`)
		}
	}
	const from = ['showcase_models m','showcase_items i']
	let sort = ['min(i.ordain)']
	where.push('i.model_id = m.model_id')
	let iprops_dive = false
	if (md.more) {
		let i = 0
		for (const prop_nick in md.more) {
			i++
			iprops_dive = true


			
			let prop
			if (partner?.cost && prop_nick == 'cena') {
				prop = await base.getPropByTitle(partner.cost)
			} else {
				prop = await base.getPropByNick(prop_nick)
			}
			
			

			const values = md.more[prop_nick]
			if (values == 'empty') {
				from[1] = `showcase_items i left join showcase_iprops ip${i} on (ip${i}.model_id = i.model_id and ip${i}.item_num = i.item_num and ip${i}.prop_id = ${prop.prop_id})`
				where.push(`ip${i}.prop_id is null`)
			} else {
				from.push(`showcase_iprops ip${i}`)
				where.push(`ip${i}.model_id = i.model_id`)
				where.push(`ip${i}.item_num = i.item_num`)
				where.push(`ip${i}.prop_id = ${prop.prop_id}`)
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
								where.push(`ip${i}.number <= ${value_nick}`)
								sort.push(`ip${i}.number DESC`)
							}
							if (name == 'from') {
								where.push(`ip${i}.number >= ${value_nick}`)
								sort.push(`ip${i}.number ASC`)
							}
						} else {
							if (value_nick == value) ids.push(value_nick)
							else  ids.push(prop.prop_id + ', false')	
						}
						
					}
					if (ids.length) where.push(`ip${i}.number in (${ids.join(',')})`)
				} else if (prop.type == 'value') {
					for (const value in values) {
						const value_nick = nicked(value)
						let value_id = await base.getValueIdByNick(value_nick)
						if (!value_id) value_id = 0
						ids.push(value_id)
					}
					where.push(`ip${i}.value_id in (${ids.join(',')})`)
				} else {
					//значения других типов пропускаем
				}
			}
		}
	}
	return {where, from, sort}
}