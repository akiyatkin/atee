import fs from "fs/promises"

export const Files = {
	getFileName: async(visitor, dir, name, exts) => {
		let files = await Files.readdir(visitor, dir)
		files = files.filter(({ext}) => ~exts.indexOf(ext))
		const { file } = files.find(of => of.name == name)
		return file
	},
	readdir: async (visitor, dir) => {
		return visitor.once('readdir', [dir], async (dir) => {
			let files = await fs.readdir(dir).catch(() => [])
			files = files.map((file) => {
				let i, name, ext, num, secure
				i = file.lastIndexOf('.')
				name = ~i ? file.slice(0, i) : file
				ext = ~i ? file.slice(i + 1) : ''
				secure = file[0] == '.' || file[0] == '~'
				i = name.indexOf(' ')
				num = ~i ? name.slice(0, i) : ''
				name = ~i ? name.slice(i + 1) : name
				return { secure, num, name, ext, file }
			})
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