import { Access } from "/-controller/Access.js"
import { Files } from "/-showcase/Files.js"
import { nicked } from '/-nicked/nicked.js'
import fs from "fs/promises"

export const restget = (meta) => {
	meta.addAction('get-settings', async view => {
		const { db } = await view.gets(['db','admin'])
		const rows = await db.all(`
			SELECT 
			     table_name AS 'name', 
			     round(((data_length + index_length) / 1024 / 1024), 2) 'size',
			     table_rows as length 
			FROM information_schema.TABLES 
			WHERE table_schema = :dbname and table_name like 'showcase_%'
			ORDER BY size DESC, length DESC
		`,{ dbname: db.conf.database })
		view.ans.list = rows
		return view.ret()
	})

	meta.addAction('get-state', async view => {
		const { cookie } = await view.gets(['cookie'])
		view.ans.admin = await Access.isAdmin(cookie)
		return view.ret()
	})
	meta.addAction('get-tables', async view => {
		const { db, config, options } = await view.gets(['db','admin','config','options'])
		const dir = config['tables']
		const files = await Files.readdirext(view, dir, ['xlsx']) //{ name, ext, file }
		await Promise.all(files.map(async (of) => {
			const stat = await fs.stat(dir + of.file)
			of.size = Math.round(stat.size / 1024 / 1024 * 100) / 100
			of.mtime = new Date(stat.mtime).getTime()
		}))

		const rows = await db.all(`
			SELECT 
				table_id,
				table_name,
				table_nick,
				unix_timestamp(loadtime)*1000 as loadtime,
				quantity,
				loaded,
				duration
			FROM showcase_tables			
		`)
		
		files.forEach(of => {
			const index = rows.findIndex(row => row.table_nick == nicked(of.name))
			if (!~index) return
			const row = rows.splice(index, 1)[0]
			of.row = row
			if (row.loaded && row.loadtime > of.mtime) of.ready = true
		})
		rows.forEach(row => {
			files.push({name:row.table_name, row})
		})
		files.forEach(of => {
			if (!options.tables[of.name]) return
			of.options = options.tables[of.name]
		})
		
		view.ans.files = files
		view.ans.rows = rows
		return view.ret()
	})
	meta.addAction('get-models', async view => {
		const { db } = await view.gets(['db','admin'])
		
		const models = await db.all(`
			SELECT 
				m.model_title,
				m.model_nick,
				g.group_title,
				g.group_nick,
				b.brand_title,
				b.brand_nick,
				count(i.model_id) as items
			FROM showcase_groups g, showcase_brands b, showcase_models m
			LEFT JOIN showcase_items i on i.model_id = m.model_id
			WHERE m.brand_id = b.brand_id and g.group_id = m.group_id
			GROUP BY m.model_id
		`)
		view.ans.models = models
		return view.ret()
	})
}