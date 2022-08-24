import { nicked } from "/-nicked/nicked.js"

/*
	const rows_source = await readXlsxFile(src)
	const data = Dabudi.parse(rows_source)
*/


export const Dabudi = {
	getOne: row => {
		let group_title = false
		if (row.every(col => {
			if (!col) return true
			if (group_title) return false //Нашли вторую заполненную ячейку
			group_title = col
			return true
		})) return group_title	
	},
	splitDescr: (rows_source) => {
		const index = rows_source.findIndex(row => {
			let count = 0
			if (!row.some(col => {
				if (!col) return
				count++
				return count > 2
			})) return
			return true
		})
		const rows_descr = rows_source.slice(0, index)
		const descr = {}
		rows_descr.forEach(row => {
			if (!row[0]) return
			descr[row[0]] = row[1]
		})
		const rows_table = rows_source.slice(index)
		return {descr, rows_table}
	},
	getColIndexOrRename: ({head_titles, head_nicks}, name, oldname) => {
		let index = head_titles.indexOf(name)
		if (!index) return index
		index = head_titles.indexOf(oldname)
		if (~index) {
			head_titles[index] = name
			head_nicks[index] = nicked(name)
			return index
		}
		if (!~index) {
			index = head_titles.length
			head_titles[index] = name
			head_nicks[index] = nicked(name)
		}
		return index
	},
	getColIndex: ({head_titles, head_nicks}, name) => {
		let index = head_titles.indexOf(name)
		if (!~index) {
			index = head_titles.length
			head_titles[index] = name
			head_nicks[index] = nicked(name)
		}
		return index
	},
	splitHead: (rows_table) => {
		if (!rows_table.length) return {heads: {head_nicks:[], head_titles:[]}, rows_body:[]}
		const rows_body = rows_table.slice(1)
		const head_titles = rows_table[0]
		
		for (let i = head_titles.length - 1; i >= 0; i--) {
			const col = head_titles[i]
			if (!col || col.at(0) != '.') continue
			
			head_titles.splice(i, 1)
			rows_body.forEach(row => {
				return row.splice(i, 1)
			})
			
		}
		
		const head_nicks = head_titles.map(h => nicked(h))
		return {heads: {head_nicks, head_titles}, rows_body}
	},
	splitGroups: (rows_body, heads, root_title, index_group, groups) => {
		const root_nick = nicked(root_title) 
		let group_title = root_title.split('#')[0]
		let group_nick = root_nick
		let group_orig = root_title
		if (!groups) {
			groups = {}
			groups[group_nick] = {
				group_nick, 
				group_title,
				group_orig,
				parent_nick: false
			}
		}
		let wasitems = false
		const rows_items = rows_body.filter((row, i) => {
			const group_title = Dabudi.getOne(rows_body[i])
			const group_orig = group_title
			if (!group_title) {
				wasitems = true
				row[index_group] = group_nick
				return true
			}
			if (group_title.length == 1) {
				if (!groups[group_nick].parent_nick) return //Выше root подняться не можем
				group_nick = groups[group_nick].parent_nick
				return
			}
			const parent_nick = (wasitems && groups[group_nick].parent_nick) ? groups[group_nick].parent_nick : group_nick


			wasitems = false
			if (parent_nick && parent_nick != root_nick) {
				group_nick = nicked(groups[parent_nick].group_orig) + '-' + nicked(group_title)	
			} else {
				group_nick = nicked(group_title)	
			}

			
			if (groups[group_nick]) return
			groups[group_nick] = {
				group_nick,
				group_orig,
				group_title:group_title.split('#')[0], 
				parent_nick
			}
		})
		return {rows_items, groups}
	}	
}