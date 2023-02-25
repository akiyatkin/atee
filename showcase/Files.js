import fs from "fs/promises"
import nicked from '/-nicked'
import unique from '/-nicked/unique.js'


export const Files = {
	destinies: {
		images:['png','webp','jpg','jpeg','svg','gif'],
		slides:['png','webp','jpg','jpeg','svg'],
		texts: ['html','tpl','docx'],
		files: ['zip','pdf','rar','json','js','doc'],
		videos: ['avi','ogv','mp4','swf']
	},
	exts: { //depricated
		images:['png','webp','jpg','jpeg','svg','gif'],
		slides:['png','webp','jpg','jpeg','svg'],
		texts: ['html','tpl','docx'],
		files: ['zip','pdf','rar','json','js','doc'],
		videos: ['avi','ogv','mp4','swf']
	},
	getWayByExt: ext => {
		if (~Files.destinies.images.indexOf(ext)) return 'images'
		if (~Files.destinies.texts.indexOf(ext)) return 'texts'
		if (~Files.destinies.videos.indexOf(ext)) return 'videos'
		return 'files'
	},
	getFileInfo: async(visitor, dir, name, exts) => {
		let files = await Files.readdir(visitor, dir)
		files = files.filter(({ext}) => ~exts.indexOf(ext))
		const info = files.find(of => of.name == name) || {}
		return info
	},
	readdirDeep: async (visitor, dir) => {
		const dirents = await visitor.relate(Files).once('readdirDeep' + dir, () => {
			return fs.readdir(dir, {withFileTypes: true}).catch(() => [])	
		})

		const root = {
			dir,
			'files':[],
			'dirs':[]
		}
		for (const dirent of dirents) {
			const isFile = dirent.isFile()
			const info = Files.nameInfo(dirent.name, isFile)
			if (info.secure) continue
			delete info.secure
			if (isFile) {
				root['files'].push(info)
				continue
			}
			const subroot = await Files.readdirDeep(visitor, dir + dirent.name + '/')
			root['dirs'].push({
				...info, ...subroot
			})
		}
		root['files'].sort(Files.sort)
		root['dirs'].sort(Files.sort)
		return root
	},
	runDeep: (root, callback, level = 0) => {
		const p1 = Promise.all(root.files.map((info, i) => callback(root, info, level, i)))
		const p2 = Promise.all(root.dirs.map(root => Files.runDeep(root, callback, level + 1)))
		return Promise.all([p1,p2])
	},
	filterDeep: async (root, callback, level = 0) => {
		const results = await Promise.all(root.files.map((info, i) => callback(root, info, level, i)))
		root.files = root.files.filter((info, i) => results[i])
		await Promise.all(root.dirs.map(root => Files.filterDeep(root, callback, ++level)))
	},
	filterDeepSplit: (root, callback, collect, level = 0) => {
		return Files.filterDeep(root, async (root, info, level, i) => {
			
			const names = info.name.split(',')
			const promises = []
			const keys = []
			for (let name of names) {
				name = name.trim()
				keys.push(nicked(name))
				promises.push(callback(root, name, info, level, i))
			}
			collect(root, info, keys.join(','))
			const results = await Promise.all(promises)
			return results.some(r => r === true)
		})
	},
	srcInfo: (path) => {
		const i = path.lastIndexOf('/')
		let file, dir
		if (~i) {
			dir = path.slice(0, i + 1)
			file = path.slice(i + 1)
		} else {
			dir = ''
			file = path
		}
		const info = Files.nameInfo(file)
		info.dir = dir
		return info
	},
	nameInfo: (file, isFile = true) => {
		let i, name, ext, num = null, secure, match
		if (isFile) {
			i = file.lastIndexOf('.')
			name = ~i ? file.slice(0, i) : file
			ext = nicked((~i ? file.slice(i + 1) : '')).slice(0,4)
		} else {
			name = file
			ext = ''
		}
		secure = file[0] == '.' || file[0] == '~'
		if (file == 'Thumbs.db') secure = true

		
		//Цифры в конце после нижнего подчёркивания
		match = name.match(/^(.*)_(\d+)$/)
		if (match) {
			num = match[2]
			name = match[1]
		}
		
		//Цифры в начале
		match = name.match(/^(\d+)[\s](.*)$/)
		if (match) {
			num = match[1]
			name = match[2]
		}

		//Цифры в конце в скобках
		match = name.match(/^(.*)\((\d+)\)$/)
		if (match) {
			num = match[2]
			name = match[1]
		}

		// i = name.indexOf(' ')
		// num = ~i ? name.slice(0, i) : ''
		// name = ~i ? name.slice(i + 1) : name
		if (num) num = Number(num.slice(0, 6))
		return { secure, num, name, ext, file }
	},
	readdir: (visitor, dir) => {
		return visitor.relate(Files).once('readdir'+dir, async () => {
			let files = await fs.readdir(dir).catch(() => [])
			files = files.map((file) => Files.nameInfo(file))
			files = files.filter(({secure}) => !secure)
			files.forEach(of => {
				delete of.secure
			})
			return files
		})
	},
	sort:(a, b) => {
		if (a.num != b.num) {
			if (a.num && b.num) return a.num - b.num
			if (a.num && !b.num) return -1
			if (!a.num && b.num) return 1
		}
		const nameA = a.name.toLowerCase()
		const nameB = b.name.toLowerCase()
		if (nameA < nameB) return -1
		if (nameA > nameB) return 1
		return 0
	},
	readdirext: async (visitor, dir, exts) => {
		let files = await Files.readdir(visitor, dir)
		files = files.filter(({ext}) => ~exts.indexOf(ext))
		files.sort(Files.sort)
		return files
	},
	getRelations: async (db, name, brand_id, props_id) => {
		if (!brand_id) return []
		const nick = nicked(name)
		let model_id = await db.col('SELECT model_id FROM showcase_models WHERE brand_id = :brand_id and model_nick = :nick', {nick, brand_id})
		let item_num = null
		let res = []
		if (!model_id) {
			let value_id
			for (const prop_id of props_id) {
				value_id = await db.col('SELECT value_id FROM showcase_values WHERE value_nick = :nick', {nick})
				if (!value_id) continue
				res = await db.all(`
					SELECT m.model_id, ip.item_num 
					FROM showcase_iprops ip, showcase_models m
					WHERE 
					ip.model_id = m.model_id and m.brand_id = :brand_id
					and ip.value_id = :value_id and ip.prop_id = :prop_id
				`, {value_id, prop_id, brand_id})
				if (res.length) break
			}
		} else {
			res = await db.all('SELECT model_id, item_num FROM showcase_items WHERE model_id = :model_id', {model_id})
		}
		return res
	}
}
export default Files