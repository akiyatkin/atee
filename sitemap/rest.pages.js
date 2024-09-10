import Rest from "/-rest"
import Access from "/-controller/Access.js"
import fs from "fs/promises"
import config from "/-config"

const rest = new Rest()
export default rest

rest.addArgument('name')

const getFiles = dir => Access.relate(rest).konce('getFiles', dir, async () => {
	let files = (await fs.readdir(dir).catch(() => []))
	.map((file) => {
		const i = file.indexOf('.', file.length - 5)
		const name = ~i ? file.slice(0, i) : file
		const ext = (~i ? file.slice(i + 1) : '').toLowerCase()
		const secure = file[0] == '.' || file[0] == '~'
		return { secure, name, ext, file }
	})
	.filter(({secure, ext}) => !secure && ~['html'].indexOf(ext))

	files.forEach(of => {
		delete of.ext
		delete of.secure
	})
	files = files.reduce((obj, fo) => {
		obj[fo.name] = fo
		return obj
	}, {})
	for (const name in files) {
		const fo = files[name]
		let text = await fs.readFile(dir + fo.file).then(buffer => buffer.toString()).catch('')
		text = text.replaceAll(/<!--[\s\S]*?-->/g,'')
		const found = text.match(/<h1[^>]*>([^<]*)<\/h1>/i)
		fo.name = found ? found[1] : fo.name
		fo.title = fo.name
	}
	return files
})

rest.addArgument('dir', async (view, dir) => {
	const conf = await config('sitemap')
	if (conf.events == dir) return dir //'data/pages/'
	if (conf.pages == dir) return dir //'data/pages/'
	return view.err('Адрес не зарегистрирован', 403)
})
rest.addResponse('get-page-head', async (view) => {
	const { name, dir } = await view.gets(['name', 'dir'])
	const files = await getFiles(dir)
	Object.assign(view.ans, files[name] ?? {
		title:name
	})
	return view.ret()
})
rest.addResponse('get-page-sitemap', async (view) => {
	const conf = await config('sitemap')
	const ans = {headings:[]}
	if (!conf.pages) return {ans}
	const files = await getFiles(conf.pages)

	if (!files.length) return {ans}
	ans.headings.push({
		title:'Страницы',
		childs: files
	})
	return {ans}
})
