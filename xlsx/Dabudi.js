import nicked from "/-nicked"

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
		let index = rows_source.findIndex(row => {
			let count = 0
			if (!row.some(col => {
				if (!col) return
				count++
				return count > 2
			})) return
			return true
		})		
		if (index == -1) index = rows_source.length
		
		const rows_descr = rows_source.slice(0, index)

		const descr = {}
		rows_descr.forEach(row => {
			if (!row[0]) return
			descr[row[0]] = row[1]
		})

		const rows_table = rows_source.slice(index)
		return {descr, rows_table}
	},
	recColIndexOrRename: ({head_titles, head_nicks}, name, oldname) => {
		let index = head_titles.indexOf(name)
		if (~index) return index
		index = head_titles.indexOf(oldname)
		if (~index) {
			head_titles[index] = name.trim()
			head_nicks[index] = nicked(name)
			return index
		}
		if (!~index) {
			index = head_titles.length
			head_titles[index] = name.trim()
			head_nicks[index] = nicked(name)
		}
		return index
	},
	recColIndex: ({head_titles, head_nicks}, name) => {
		let index = head_titles.indexOf(name)
		if (!~index) {
			index = head_titles.length
			head_titles[index] = name.trim()
			head_nicks[index] = nicked(name)
		}
		return index
	},
	splitHead: (rows_table) => {
		if (!rows_table.length) return {head: [], rows_body:[]}
		let rows_body = rows_table.slice(1)
		const head_titles = rows_table[0]
		
		for (let i = head_titles.length - 1; i >= 0; i--) {
			const col = String(head_titles[i] || '')
			if (col) head_titles[i] = col

			if (col && col.at(0) != '.') continue
			head_titles.splice(i, 1)
			rows_body.forEach(row => row.splice(i, 1))
		}
		
		rows_body = rows_body.map(row => {
			if (row.length > head_titles.length) {
				return row.splice(0, head_titles.length)
			}
			return row
		})

		return {head: head_titles, rows_body}
	},
	splitGroups: (rows_body, heads, root_title, index_group, index_category, groups) => {
		const root_nick = nicked(root_title)
		let group_title = root_title.split('#')[0].trim()
		let group_nick = root_nick
		let group_orig = root_title
		if (!groups) {
			groups = {}
			groups[group_nick] = {
				group_nick, 
				group_title,
				indepth:0,
				group_orig,
				parent_nick: false
			}
		}
		let wasitems = false
		const rows_items = rows_body.filter((row, i) => {
			const group_title = String(Dabudi.getOne(rows_body[i]) || '')
			const group_orig = group_title
			if (!group_title) {
				wasitems = true
				row[index_group] = groups[group_nick].group_title
				row[index_category] = groups[groups[group_nick].parent_nick]?.group_title || null
				let group = groups[group_nick]
				do {
					group.indepth++
				} while (group = groups[group.parent_nick])

				return true
			}
			if (group_title.length == 1) {
				if (!groups[group_nick].parent_nick) return //Выше root подняться не можем
				group_nick = groups[group_nick].parent_nick
				return
			}
			const parent_nick = (wasitems && groups[group_nick].parent_nick) ? groups[group_nick].parent_nick : group_nick


			wasitems = false
			group_nick = nicked(group_title)

			
			if (groups[group_nick]) return
			groups[group_nick] = {
				group_nick,
				group_orig,
				indepth:0,
				group_title:group_title.split('#')[0].trim(), 
				parent_nick
			}
		})
		
		return {rows_items, groups}
	}	
}

export default Dabudi