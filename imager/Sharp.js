import fs from "fs/promises"
import nicked from '/-nicked'
import unique from '/-nicked/unique.js'
import sharp from "sharp"
const Sharp = {}
export default Sharp


Sharp.resizeFolderToWebp = async (dirfrom, dirto, opt) => {
	const root_fr = await Sharp.readdirDeep(dirfrom)
	const root_to = await Sharp.readdirDeep(dirto)
	
	await Sharp.runBothDirs(root_fr, root_to, (root_fr, info_fr, root_to, info_to) => {
		if (info_fr && info_to) return
		const file = info_fr.file || info_to.file
		const dir_fr = root_fr.dir + file
		const dir_to = root_to.dir + file

		if (root_fr.empty) {

		}
		if (root_to.empty) {
			
		}

		
		
	})


	// await Sharp.runBothFiles(root_fr, root_to, (root_fr, info_fr, root_to, info_to) => {
	// 	if (info_fr && info_to) return
	// 	const file = info_fr.file || info_to.file
	// 	if (root_fr.empty) {

	// 	}
	// 	if (root_to.empty) {
			
	// 	}

	// 	const src_fr = root_fr.dir + file
	// 	const src_to = root_to.dir + file
		
	// })
}
Sharp.runBothDirs = async (root_fr, root_to, fn, level = 0) => {
	await fn(root_fr, info_fr, root_to, info_to)
	for (const info_fr of root_fr.dirs) {
		let info_to = root_to.dirs.find(info_to => info_to.file == info_fr.file)
		if (!info_to) {
			const dir = root_to.dir + info_fr.file + '/'
			info_to = {dir, files: [], dirs: [], empty: true}
		}
		await Sharp.runBothFiles(info_fr, info_to, fn, level)
	}
	for (const info_to of root_to.dirs) {
		let info_fr = root_fr.dirs.find(info_fr => info_fr.file == info_to.file)
		if (info_fr) continue
		const dir = root_fr.dir + info_to.file + '/'
		info_fr = {dir, files: [], dirs: [], empty: true}
		await Sharp.runBothFiles(info_fr, info_to, fn, level) //есть info_to для которого нет info_fr
	}
}

Sharp.runBothFiles = async (root_fr, root_to, fn, level = 0) => {
	Sharp.runBothDirs(root_fr, root_to, () => {

	})
	
	for (const info_fr of root_fr.files) {
		const info_to = root_to.files.find(info_to => info_to.file == info_fr.file)
		await fn(root_fr, info_fr, root_to, info_to || false)
	}
	for (const info_to of root_to.files) {
		const info_fr = root_fr.files.find(info_fr => info_fr.file == info_to.file)
		if (info_fr) continue
		await fn(root_to, false, root_fr, info_to) //есть info_to для которого нет info_fr
	}

	for (const info_fr of root_fr.dirs) {
		let info_to = root_to.dirs.find(info_to => info_to.file == info_fr.file)
		if (!info_to) {
			const dir = root_to.dir + info_fr.file + '/'
			info_to = {dir, files: [], dirs: [], empty: true}
		}
		await Sharp.runBothFiles(info_fr, info_to, fn, level)
	}
	for (const info_to of root_to.dirs) {
		let info_fr = root_fr.dirs.find(info_fr => info_fr.file == info_to.file)
		if (info_fr) continue

		const dir = root_fr.dir + info_to.file + '/'
		info_fr = {dir, files: [], dirs: [], empty: true}
		
		await Sharp.runBothFiles(info_fr, info_to, fn, level) //есть info_to для которого нет info_fr
	}
}

Sharp.runRootFiles = (root, callback, level = 0) => {
	const p1 = Promise.all(root.files.map((info, i) => callback(root, info, level, i)))
	const p2 = Promise.all(root.dirs.map(root => Sharp.runRootFiles(root, callback, level + 1)))
	return Promise.all([p1, p2])
}
Sharp.runRootDirs = (root, callback, level = 0) => {
	const p1 = callback(root, level)
	const p2 = Promise.all(root.dirs.map(root => Sharp.runRootDirs(root, callback, level + 1)))
	return Promise.all([p1, p2])
}
Sharp.readdirDeep = async (dir) => {
	const dirents = await fs.readdir(dir, {withFileTypes: true}).catch(() => [])

	const root = {
		dir,
		'files':[],
		'dirs':[]
	}
	for (const dirent of dirents) {
		const isFile = dirent.isFile()
		const info = Sharp.nameInfo(dirent.name, isFile)
		if (info.secure) continue
		delete info.secure
		if (isFile) {
			root['files'].push(info)
			continue
		}
		const subroot = await Sharp.readdirDeep(dir + dirent.name + '/')
		root['dirs'].push({
			...info, ...subroot
		})
	}
	root['files'].sort(Sharp.sort)
	root['dirs'].sort(Sharp.sort)
	
	return root
}
Sharp.sort = (a, b) => {
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
}
Sharp.nameInfo = (file, isFile = true) => {
	let i, name, ext, num = null, secure, match, anchor

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
	if (num) num = Number(num.slice(0, 6))
	return { secure, num, name, ext, file }
}
