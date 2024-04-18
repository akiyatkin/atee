const sitemap = {}
export default sitemap
const csslink = src => `<link rel="stylesheet" href="${src}">`
sitemap.HEAD = (head, env) => `
	<title>${head?.title??''}</title>
	<meta name="description" content="${head?.description??''}">
	<meta property="og:image" content="${head?.image_src ?? ''}">
	<link rel="image_src" href="${head?.image_src ?? ''}">
	<link rel="canonical" href="https://${env.host}${head.canonical??''}">
	<link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml">
	${head?.css?.map(csslink).join('') || ''}
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
			css: srcs => {
				for (const href of srcs) {
					if (document.head.querySelector('link[href="'+href+'"]')) continue
					const link = document.createElement('link')
					link.rel = 'stylesheet'
					link.href = href
					document.head.prepend(link)
				}
			},
			image_src: src => {
				qs('meta[property="og:image"]').content = src
				qs('link[rel=image_src]').href = src
			},
			canonical: src => {
				qs('link[rel="canonical"]').href = src
			}
		}
		window.addEventListener('crossing', async ({detail: env}) => {
			const { timings, bread, theme } = env
			const data = await fetch('/-sitemap/get-head?search=' + encodeURI(bread.search) + '&path=' + bread.path + '&root='+bread.root + '&m='+(bread.get.m ?? '')).then(res => res.json())
			if (!data.canonical) data.canonical = location.href
			for (const rule in data) rules[rule]?.(data[rule])
			const event = new CustomEvent('crossing-sitemap-headready', {detail: env})
			window.dispatchEvent(event)
		})
	</script>
`

sitemap.ROBOTS_TXT = (data, env) => `Host: ${env.host}
Sitemap: https://${env.host}/sitemap.xml`


sitemap.SITEMAP_XML = (data, env) => `<?xml version="1.0" encoding="UTF-8"?>
	<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
		${data.map(obj => showUrl(data, env, obj)).join('')}
	</urlset>`
const showUrl = (data, env, obj) => `<url>
	<loc>https://${env.host}${obj.href ? '/' + obj.href : ''}</loc>
	<lastmod>${obj.modified}</lastmod>
	<changefreq>monthly</changefreq>
	<priority>0.5</priority>
</url>`