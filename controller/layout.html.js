export const HEAD = (data, { head }) => 
`	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>${ head.title ?? '' }</title>
	<meta name="description" content="${ head.description ?? '' }">
	<meta property="og:image" content="${ head.image_src ?? '' }">
	<link rel="image_src" href="${ head.image_src ?? '' }">

	<link rel="preload" as="style" href="/-controller/animate.css" onload="this.onload=null;this.rel='stylesheet'">
	
	<script type="module">
		import { Client } from "/-controller/Client.js"
		Client.follow()
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
	${data.map(obj => mapitem(obj, { host })).join('')}
	
</urlset>`
const mapitem = (obj, { host }) => `
	<url>
        <loc>https://${host}${obj.href ? '/' + obj.href : ''}</loc>
        <lastmod>${obj.modified}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.5</priority>
    </url>
`