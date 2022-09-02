export const HEAD = (data, { crumb, bread, search, access_time, update_time, head }) => 
`<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>${head.title??''}</title>
		<base href="${crumb == '/' ? '/' : crumb + '/'}">
		<link rel="stylesheet" href="/-notreset/style.css">
		<meta name="description" content="${head.description??''}">
		<meta property="og:image" content="${head.image_src??''}">
		<link rel="image_src" href="${head.image_src??''}">
		<script type="module">
			const isSuitable = a => {
				const search = a.getAttribute('href')
				if (search == null) return
				if (/^\w+:/.test(search)) return
				if (~search.lastIndexOf('.')) return
				if (search[1] == '-') return
				return true
			}
			const click = event => {
				const a = event.target.closest('a')
				if (!a || !isSuitable(a)) return
				event.preventDefault()
				getClient().then(Client => {
					Client.click(a)
				})
			}
			const popstate = event => {
				getClient().then(Client => {
					Client.popstate(event)
				})
			}
			window.getClient = () => {
				const promise = new Promise((resolve, reject) => {
					window.removeEventListener('popstate', popstate)
					window.removeEventListener('click', click)
					const time = ${access_time}
					const search = '${bread.search}'
					import("/-controller/Client.js").then(({ Client }) => {
						Client.search = search
						Client.isSuitable = isSuitable
						Client.timings = {
							view_time: time,
							update_time: time,
							access_time: time
						}
						Client.follow()
						resolve(Client)
					}).catch(reject)
				})
				window.getClient = () => promise
				return promise
			}

			window.addEventListener('click', click)
			window.addEventListener('popstate', popstate)
		</script>
		
		<script type="module">	
			const check = async () => {
				let search = location.search
				if (/[&\?]t[=&\?]/.test(search)) return
				if (/[&\?]t$/.test(search)) return
				const timings = await fetch('/-controller/get-access').then(data => data.json()).catch(() => false)
				const new_access_time = timings.access_time
				if (new_access_time == ${access_time}) return
				search += (search ? '&' : '?') + 't'
				if (new_access_time) search += '=' + new_access_time
				if (navigator.serviceWorker) {
					const sw = navigator.serviceWorker
					const swr = await sw.ready
					if (swr.pushManager && swr.pushManager.getSubscription) {
						const subscription = await swr.pushManager.getSubscription()
					}
					if (sw.controller) sw.controller.postMessage(timings)
				}
				location.href = location.pathname + search + location.hash
			}
			check()
		</script>`

export const ROBOTS_TXT = (data, env) => `Host: ${env.host}
Sitemap: https://${env.host}/sitemap.xml`

export const ER500 = (data, env) => `	
	<p>${env.host}<b>${env.bread.search}</b> &mdash; ошибка на сервере, код 500</p>
`
export const ER404 = (data, env) => `
	<p>${env.host}<b>${env.bread.search}</b> &mdash; страница не найдена, код 404</p>
`
export const ER403 = (data, env) => `
	<p>${env.host}<b>${env.bread.search}</b> &mdash; доступ закрыт, код 403</p>
`

export const SITEMAP_XML = (data, env) => `<?xml version="1.0" encoding="UTF-8"?>
	<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
		${data.map(obj => `<url>
			<loc>https://${env.host}${obj.href ? '/' + obj.href : ''}</loc>
			<lastmod>${obj.modified}</lastmod>
			<changefreq>monthly</changefreq>
			<priority>0.5</priority>
		</url>`).join('')}
	</urlset>`