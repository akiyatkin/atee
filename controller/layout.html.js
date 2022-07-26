export const HEAD = (data, { head }) => 
`<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>${ head.title ?? '' }</title>
		<meta name="description" content="${ head.description ?? '' }">
		<meta property="og:image" content="${ head.image_src ?? '' }">
		<link rel="image_src" href="${ head.image_src ?? '' }">
		<script type="module">
			const click = event => {
				const a = event.target.closest('a')
				if (!a) return
				const search = a.getAttribute('href')
				if (!search) return
				if (/^\w+:/.test(search)) return
				if (~search.lastIndexOf('.')) return
				if (search[1] == '-') return
				event.preventDefault()
				import("/-controller/Client.js").then(({ Client }) => {
					Client.follow(event)
					window.removeEventListener('click', click)
				})
			}
			window.addEventListener('click', click)
		</script>`

export const ROBOTS_TXT = (data, { host }) => `Host: ${host}
Sitemap: https://${host}/sitemap.xml`

export const ER500 = (data, { root, host, path, search }) => `	
	<p>${host}<b>${search}</b> &mdash; ошибка на сервере, код 500</p>
`
export const ER404 = (data, { root, host, path, search }) => `
	<p>${host}<b>${search}</b> &mdash; страница не найдена, код 404</p>
`
export const ER403 = (data, { root, host, path, search }) => `
	<p>${host}<b>${search}</b> &mdash; доступ закрыт, код 403</p>
`

export const SITEMAP_XML = (data, { host }) => `<?xml version="1.0" encoding="UTF-8"?>
	<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
		${data.map(obj => `<url>
			<loc>https://${host}${obj.href ? '/' + obj.href : ''}</loc>
			<lastmod>${obj.modified}</lastmod>
			<changefreq>monthly</changefreq>
			<priority>0.5</priority>
		</url>`).join('')}
	</urlset>`
