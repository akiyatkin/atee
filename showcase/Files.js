import fs from "fs/promises"

export const Files = {
	exts: {
		image:['png','webp','jpg','jpeg','svg'],
		text: ['html','tpl','docx'],
		file: ['zip','pdf','rar'],
		video: ['avi','ogv','mp4','swf']
	},
	getFileName: async(visitor, dir, name, exts) => {
		let files = await Files.readdir(visitor, dir)
		files = files.filter(({ext}) => ~exts.indexOf(ext))
		const { file } = files.find(of => of.name == name) || {}
		return file
	},
	readdirDeep: async (visitor, dir) => {
		const dirents = await visitor.once('readdirDeep', [dir], () => {
			return fs.readdir(dir, {withFileTypes: true}).catch(() => [])	
		})

		const root = {
			dir,
			'files':[],
			'dirs':[]
		}
		for (const dirent of dirents) {
			const info = Files.nameInfo(dirent.name)
			if (info.secure) continue
			delete info.secure
			if (dirent.isFile()) {
				root.files.push(info)
				continue
			}
			const subroot = await Files.readdirDeep(visitor, dir + dirent.name + '/')
			root['dirs'].push({
				...info, ...subroot
			})
		}
		return root
	},
	filterDeep: async (root, callback, level = 0) => {
		const results = await Promise.all(root.files.map((info, i) => callback(root, info, level, i)))
		root.files = root.files.filter((info, i) => results[i])
		await Promise.all(root.dirs.map(root => Files.filterDeep(root, callback, ++level)))
	},
	nameInfo: (file) => {
		let i, name, ext, num, secure, match
		i = file.lastIndexOf('.')
		name = ~i ? file.slice(0, i) : file
		ext = (~i ? file.slice(i + 1) : '').toLowerCase()
		secure = file[0] == '.' || file[0] == '~'

		//Цифры в конце в скобках
		match = name.match(/^(.*)\((\d+)\)$/)
		if (match) {
			num = match[2]
			name = match[1]
		}
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

		// i = name.indexOf(' ')
		// num = ~i ? name.slice(0, i) : ''
		// name = ~i ? name.slice(i + 1) : name

		return { secure, num, name, ext, file }
	},
	readdir: async (visitor, dir) => {
		return visitor.once('readdir', [dir], async (dir) => {
			let files = await fs.readdir(dir).catch(() => [])
			files = files.map((file) => Files.nameInfo(file))
			files = files.filter(({secure}) => !secure)
			files.forEach(of => {
				delete of.secure
			})
			return files
		})
	},
	readdirext: async (visitor, dir, exts) => {
		let files = await Files.readdir(visitor, dir)

		files = files.filter(({ext}) => ~exts.indexOf(ext))
		files.sort((a, b) => {
			if (a.num && b.num) return a.num - b.num
			if (!a.num && b.num) return 1
			if (a.num && !b.num) return -1
			const nameA = a.name.toLowerCase()
			const nameB = b.name.toLowerCase()
			if (nameA < nameB) return -1
			if (nameA > nameB) return 1
			return 0
		})
		files.forEach(of => {
			delete of.num
		})
		return files
	}
	//,
	// forEachAsync: async (ar, call) {
	// 	await Promise.all(ar.map(call())
	// }
}