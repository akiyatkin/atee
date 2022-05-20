export const HEAD = (data, { head }) => 
`	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>${ head.title ?? '' }</title>
	<meta name="description" content="${ head.description ?? '' }">
	<meta property="og:image" content="${ head.image_src ?? '' }">
	<link rel="image_src" href="${ head.image_src ?? '' }">
	<script type="module">
		import { Client } from "/-controller/Client.js"
		Client.follow()
	</script>`

export const ROBOTS_TXT = (data, { host }) => `Host: ${host}
Sitemap: /sitemap.xml`

export const ER500 = (data, { host, path }) => `
	<div class="container" style="padding-bottom:50px">
		<p>${host}/<b>${path}</b> &mdash; ошибка на сервере, код 500</p>
	</div>
`
export const ER404 = (data, { host, path }) => `
	<div class="container" style="padding-bottom:50px">
		<p>${host}/<b>${path}</b> &mdash; страница не найдена, код 404</p>
	</div>
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