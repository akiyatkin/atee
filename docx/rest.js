import Rest from "@atee/rest"
import docx from '@atee/docx'
import Access from '/-controller/Access.js'
import rest_funcs from '/-rest/rest.funcs.js'
import fs from 'node:fs/promises'
import nicked from "@atee/nicked"


const rest = new Rest(rest_funcs)
export default rest



const nameInfo = (file, isFile = true) => {
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

	
	// //Цифры в конце после нижнего подчёркивания
	// match = name.match(/^(.*)_(\d+)$/)
	// if (match) {
	// 	num = match[2]
	// 	name = match[1]
	// }
	
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


rest.addArgument('src', async (view, src) => {
	if (/\/\./.test(src)) return view.err('forbidden', 403)
	if (!/data\//.test(src)) return view.err('forbidden', 403)
	return src
})
rest.addArgument('title', ['escape'])
rest.addResponse('get-head', async view => {
	const { src } = await view.gets(['src'])
	const index = src.lastIndexOf('/')
	if (!index) index = 0
	const name = src.slice(index + 1)
	const dir = src.slice(0, index + 1)
	
	const list = await getList(dir)
	const finfo = list.find(finfo => finfo.name == name)
	const head = { title:name }
	if (!finfo) {
		view.status = 404
		return head
	}
	head.title = finfo.heading
	if (finfo.preview) head.description = finfo.preview
	if (finfo.img) head.image_src = finfo.img
	return head
})

rest.addResponse('get-sitemap', async view => {
	const src = await view.get('src')
	const title = await view.get('title') || 'Страницы'
	const index = src.lastIndexOf('/')
	if (!index) index = 0
	const name = src.slice(index + 1)
	const dir = src.slice(0, index + 1)
	if (name) return view.err('Путь должен быть со слэшём в конце')
	
	const list = await getList(dir)
	let files = {}
	for (const finfo of list) {
		const head = { title: finfo.name }
		if (finfo.heading) head.title = finfo.heading
		if (finfo.preview) head.description = finfo.preview
		if (finfo.img) head.image_src = finfo.img
		files[finfo.name] = head
	}
	const nick = nicked(title)
	view.ans.headings = {
		[nick]: {
			title: title,
			items: files
		}
	}
	return view.ret()
})
rest.addResponse('get-html', async view => {
	const src = await view.get('src')

	

	const index = src.lastIndexOf('/')
	if (!index) index = 0
	const name = src.slice(index + 1)
	const dir = src.slice(0, index + 1)	

	const list = await getList(dir)

	

	const finfo = list.find(finfo => finfo.name == name)

	if (!finfo) {
		view.status = 404
		view.ext = 'html'
		return ''
	}



	const html = await fs.readFile(finfo.htmlsrc, 'utf8')

	view.ext = 'html'
	return html
})
const getList = (src) => {
	const cachename = nicked(src)
	return Access.relate(rest).konce('get-list', cachename, async () => {
		let files = await fs.readdir(src).catch(() => [])
		files = files.map(file => {
			return nameInfo(file)
		}).filter(finfo => {
			if (finfo.secure) return false
			if (!~['html','docx'].indexOf(finfo.ext)) return false
			if (finfo.ext == 'docx') {
				finfo.html = docx.read(Access, src + finfo.file)
			} else {
				finfo.html = fs.readFile(src + finfo.file, 'utf8')
				
			}
			return true
		}).sort((a, b) => b.num - a.num)
		for (const finfo of files) {
			

			const html = await finfo.html
			finfo.html = html
			if (finfo.ext == 'docx') {
				finfo.htmlsrc = await docx.cache(Access, src + finfo.file)
				const srcimg = dir + cachename + '-' + nicked(finfo.file) + '.img'
				const isimg = await fs.lstat(srcimg).catch(e => null)
				if (isimg) finfo.img = '/' + srcimg
			} else {
				finfo.htmlsrc = src + finfo.file
				const im = html.match(/<img[^>]*src="([^"]*)"[^>]*>/iu)

				if (im) finfo.img = im[1]
			}
			
			const t = html.match(/<h1[^>]*>.*?<\/h1>/iu)
			finfo.heading = t ? t[0].replace(/<\/?[^>]+(>|$)/g, " ").replace(/\s+/," ").trim() : finfo.name
			let text = html.replace(/<style([\S\s]*?)>([\S\s]*?)<\/style>/ig, '').replace(/<h1[^>]*>.*<\/h1>/iu, "").replace(/<\/?[^>]+(>|$)/g, " ").replace(/\s+/," ").trim()
			

			
			text = text.replace(/\s\./,'.').replace(/\s\!/,'!').replace(/\s\?/,'?').replace(/\s\:/,':').replace(/\s\;/,';')


			const r = text.match(/.{200}[^\.!]*[\.!]/u)
			//const r = text.match(/.{25}[^\.!]*[\.!]/u)

			finfo.preview = r ? r[0] : text
			finfo.preview = finfo.preview.replaceAll(' ,', ',')

			const num = String(finfo.num)
			if (num.length == 6) {//Принимает 6 цифр годмесяцдень
				//F - Родительский падеж месяца
				//f - Именительный падеж месяца
				//Y - 4х значный год
				//m - 2х значный месяц
				//d - 2х значный день
				//j - без нуля день
				//i:H:s
				
				const y = '20' + num.charAt(0) + num.charAt(1);
				const m = num.charAt(2) + num.charAt(3);
				let d = num.charAt(5);
				if (num.charAt(4) != '0') {
					d = num.charAt(4) + d
				}
				const date = new Date()
				date.setFullYear(y)
				date.setMonth(m - 1, d)
				date.setDate(d)
				date.setHours(0, 0, 0, 0)
				finfo.date = date.getTime()
			}
			
		}
		files = files.map(({ htmlsrc, img, heading, num, date, name, preview }) => {
			return { htmlsrc, img, heading, num, date, name, preview }
		})
		return files
	})
}
rest.addArgument('lim', ['array'], async (view, lim) => {
	lim = lim.filter(v => v !== '')
	if (lim.length == 1) lim.unshift(0)
	if (lim.length == 0) {
		lim = [0, 12] //Дефолт
	} else {
		lim[0] = Number(lim[0])
		lim[1] = Number(lim[1])
	}
	if (lim[0] > lim[1]) return view.err('Неверный lim')
	if (lim[1] - lim[0] > 200) return view.err('Некорректный lim')
	return lim
})
const dir = 'cache/docx/'
rest.addResponse('get-list', async view => {
	const { lim, src } = await view.gets(['src', 'lim'])
	if (!/\/$/.test(src)) return view.err()
	
	let files = await getList(src)
	files = files.map(({ img, heading, date, name, preview }) => {
		return { img, heading, date, name, preview }
	})
	
	view.ans.list = files.slice(lim[0], lim[0] + lim[1])
	return view.ret()
})
