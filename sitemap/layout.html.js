const sitemap = {}
export default sitemap
sitemap.HEAD = (head, env) => `
	<title>${head.title??''}</title>
	<meta name="description" content="${head.description??''}">
	<meta property="og:image" content="${head.image_src??''}">
	<link rel="image_src" href="${head.image_src??''}">
	<link rel="canonical" href="https://${env.host}${head.canonical??''}"/>
	<link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml">
	<script type="module">//Независимая обработка metatags и sitemap
		//При переходах нужно это всё обновлять
		const qs = q => document.head.querySelector(q) || {}
		const temp = document.createElement('div')
		const rules = {
			title: title => {
				temp.innerHTML = title
				document.title = temp.innerText
			},
			description: descr => {
				qs('meta[name=description]').content = descr
			},
			keywords: keys => {
				qs('meta[name=keywords]').content = keys
			},
			image_src: src => {
				qs('meta[property="og:image"]').content = src
				qs('link[rel=image_src]').href = src
			},
			canonical: src => {
				qs('link[rel="canonical"]').href = src
			}
		}
		window.addEventListener('crossing', async ({detail: { timings, bread, theme }}) => {
			const data = await fetch('/-sitemap/head?path=' + bread.path).then(res => res.json())
			for (const rule in data) {
				rules[rule]?.(data[rule])
			}
		})
	</script>
`

sitemap.ROBOTS_TXT = (data, env) => `Host: ${env.host}
Sitemap: https://${env.host}/sitemap.xml`


sitemap.SITEMAP_XML = (data, env) => `<?xml version="1.0" encoding="UTF-8"?>
	<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
		${data.map(obj => `<url>
			<loc>https://${env.host}${obj.href ? '/' + obj.href : ''}</loc>
			<lastmod>${obj.modified}</lastmod>
			<changefreq>monthly</changefreq>
			<priority>0.5</priority>
		</url>`).join('')}
	</urlset>`