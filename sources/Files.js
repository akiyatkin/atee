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
	ways: ['images','texts','videos','files'],
	getWayByExt: ext => {
		if (~Files.destinies.images.indexOf(ext)) return 'images'
		if (~Files.destinies.texts.indexOf(ext)) return 'texts'
		if (~Files.destinies.videos.indexOf(ext)) return 'videos'
		return 'files'
	},
	getFileInfo: async(visitor, dir, name, exts) => {
		let files = await Files.readdir(dir)
		files = files.filter(({ext}) => ~exts.indexOf(ext))
		const info = files.find(of => of.name == name) || {}
		return info
	},
	getModified: async (path) => {
		try {
			const stats = await fs.stat(path)
			return stats.mtime //ctime надо смотреть mtime папки, Math.max(stats.ctime, stats.mtime)
		} catch (error) {
			throw new Error(`Не удалось получить информацию о ${path}: ${error.message}`);
		}
	},
	readdirDeep: async (dir) => {
		const dirents = await fs.readdir(dir, {withFileTypes: true}).catch(() => [])	

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
			const subroot = await Files.readdirDeep(dir + dirent.name + '/')
			root['dirs'].push({
				...info, ...subroot
			})
		}
		root['files'].sort(Files.sort)
		root['dirs'].sort(Files.sort)
		
		return root
	},
	runRootFiles: (root, callback, level = 0) => {
		const p1 = Promise.all(root.files.map((info, i) => callback(root, info, level, i)))
		const p2 = Promise.all(root.dirs.map(root => Files.runRootFiles(root, callback, level + 1)))
		return Promise.all([p1,p2])
	},
	runRootDirs: (root, callback, level = 0) => {
		const p1 = callback(root, level)
		const p2 = Promise.all(root.dirs.map(root => Files.runRootDirs(root, callback, level + 1)))
		return Promise.all([p1,p2])
	},
	// filterDeep: async (root, callback, level = 0) => {
	// 	const results = await Promise.all(root.files.map((info, i) => callback(root, info, level, i)))
	// 	root.files = root.files.filter((info, i) => results[i])
	// 	await Promise.all(root.dirs.map(root => Files.filterDeep(root, callback, ++level)))
	// },
	// filterDeepSplit: (root, callback, collect, level = 0) => {
	// 	return Files.filterDeep(root, async (root, info, level, i) => {
			
	// 		const names = info.name.split(',')
	// 		const promises = []
	// 		const keys = []
	// 		for (let name of names) {
	// 			name = name.trim()
	// 			keys.push(nicked(name))
	// 			promises.push(callback(root, name, info, level, i))
	// 		}
	// 		collect(root, info, keys.join(','))
	// 		const results = await Promise.all(promises)
	// 		return results.some(r => r === true)
	// 	})
	// },
	srcInfo: (path) => {
		const a = path.indexOf('#')
		let anchor = ''
		if (~a) {
			anchor = path.slice(a + 1)
			path = path.slice(0, a)
		}
		const r = path.indexOf('?')
		if (~r && (!~a || a > r )) {
			
			path = path.slice(0, r) + anchor
		}
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
		info.anchor = anchor
		if (anchor) {
			const i = anchor.lastIndexOf('.')
			info.anchorext = nicked((~i ? anchor.slice(i + 1) : '')).slice(0,4)
		}
		
		return info
	},
	nameInfo: (file, isFile = true) => {
		let i, name, ext, num = null, secure, match, anchor
		
		// i = file.lastIndexOf('#')
		// anchor = ~i ? file.slice(i + 1) : ''
		// file = ~i ? file.slice(0, i) : file
		

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
	readdir: async (dir, exts) => {
		let files = await fs.readdir(dir).catch(() => [])
		files = files.map((file) => Files.nameInfo(file))
		files = files.filter(({secure}) => !secure)
		files.sort(Files.sort)
		//let order = 1
		files.forEach(of => {
			//of.order = order++
			delete of.secure
		})
		if (exts) {
			files = files.filter(({ext}) => ~exts.indexOf(ext))
			files.sort(Files.sort)
		}
		return files
	}
}
export default Files