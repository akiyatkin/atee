import mammoth from 'mammoth';
import fs from 'fs/promises'
import nicked from '/-nicked/nicked.js'
import cproc from '/-cproc'


const dir = 'cache/docx/'
await fs.mkdir(dir, { recursive: true }).catch(e => null)

export const docx = {
	cache: (cache, src) => cache.relate(docx).once(src, () => cproc(docx, src, async () => {
		const cachename = nicked(src)
		const cachesrc = dir + cachename + '.html'
		const { mtime: mtimesrc } = await fs.stat(src).catch(e => false)
		if (!mtimesrc) return false
		const { mtime: mtimecache } = await fs.stat(cachesrc).catch(e => false)
		if (mtimesrc <= mtimecache) return cachesrc
		let firstimage = false
		const res = await mammoth.convertToHtml({path: src},{
			convertImage: mammoth.images.imgElement(image => {
				if (!firstimage) firstimage = image
				return image.read("base64").then(imageBuffer => {
					return {
						alt:"",
						style: "max-width:100%; height:auto; display:block",
						src: "data:" + image.contentType + ";base64," + imageBuffer
					}
				})
			})
		})
		const text = res.value
		if (res.messages.length) console.log('parse', src, res.messages)
		await fs.writeFile(cachesrc, text)

		if (firstimage) {
			const srcimg = dir + cachename + '.img'
			await fs.writeFile(srcimg, await firstimage.read())	
		}
		// const im = text.match(/<img[^>]*src="([^"]*)"[^>]*>/iu)
		// if (!im) return cachesrc
		// const img = im[1]
		// const base = img.match(/data:([^;].*);base64,(.*)$/iu)
		// if (!base) return cachesrc
		// const type = base[1]
		// const content = base[2]
		// //const srcimg = dir + cachename + '-' + nicked(finfo.file) + '.' + type.split('/')[1]
		// const srcimg = dir + cachename + '.img'
		// await fs.writeFile(srcimg, Buffer.alloc(content.length, content, "base64"))
		
		return cachesrc
	})),
	read: async (cache, src) => {
		const cachesrc = await docx.cache(cache, src)
		if (!cachesrc) return false
		const text = await fs.readFile(cachesrc, 'utf8')
		return text
	}
}
export default docx