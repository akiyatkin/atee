import fs from 'node:fs/promises'
import url from 'node:url'
//import path from 'node:path'
import module from 'node:module';
const project_root = url.pathToFileURL(process.cwd()).href + '/' //url.fileURLToPath
const projectRequire = module.createRequire(project_root)

const modules = (await fs.readdir('node_modules', { withFileTypes: true })).filter(d => d.isDirectory()).filter(d => d.name.startsWith('@')).map(d => `node_modules/${d.name}/`) //const modules = ["node_modules/@atee/", "node_modules/@ange/"]
export const resolve = async (specifier, context, defaultResolve) => {
	if (!specifier.startsWith('/')) return defaultResolve(specifier, context)
	if (specifier.startsWith('/-')) {
		for (const pre of ['./', ...modules, "node_modules/"]) {
			const checkspec = pre + specifier.slice(2)
			const r = await fs.stat(checkspec.split('?')[0]).then(r => r.isFile()).catch(r => false)
			if (!r) continue
			return defaultResolve(project_root + checkspec, context)
		}
		return defaultResolve(project_root + specifier.slice(1), context)
	} else {
		//Подмена корня сработает и без дефиса
		const directsrc = specifier.slice(1)
		const r = await fs.stat(directsrc.split('?')[0]).then(r => r.isFile()).catch(r => false)
		if (r) return defaultResolve(project_root + directsrc, context)
		
		//Разрешение путей из прилинкованной библиотеки в дереве проекта @atee/nicked, file-icon-vectors и т.п
		let src = projectRequire.resolve(specifier.slice(1))
		src = url.pathToFileURL(src).href

		return defaultResolve(src, context)
	}
}