const controller = {}
export default controller
controller.HEAD = (data, env) => 
`<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">

		<base href="${env.crumb == '/' ? '/' : env.crumb + '/'}">
		<link rel="stylesheet" href="/-notreset/style.css">

		<script type="module">//Делаем SPA переходы
			const isSuitable = a => {
				const search = a.getAttribute('href')
				if (search == null) return
				if (search[1] == '-') return
				if (/^\\w+:/.test(search)) return
				if (/^\\/data\\//.test(search)) return
				return true
			}
			const click = event => {
				const a = event.target.closest('a')
				if (!a || !isSuitable(a)) return
				event.preventDefault()
				getClient().then(Client => Client.click(a))
			}
			const popstate = event => {
				getClient().then(Client => Client.popstate(event))
			}
			window.getClient = () => {
				const promise = new Promise((resolve, reject) => {
					window.removeEventListener('popstate', popstate)
					window.removeEventListener('click', click)
					const time = ${env.timings.access_time}
					import("/-controller/Client.js").then(({ Client }) => {
						Client.search = '${env.bread.href}'
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
		
		<script type="module">// Проверка что кэш не устарел с последнего входа админа
			const check = async () => {
				let search = location.search
				if (/[&\?]t[=&\?]/.test(location.search)) return
				if (/[&\?]t$/.test(location.search)) return
				const timings = await fetch('/-controller/get-access').then(data => data.json()).catch(() => false)
				const new_access_time = timings.access_time
				if (!new_access_time) return
				if (new_access_time == ${env.timings.access_time}) return
				if (navigator.serviceWorker) {
					const sw = navigator.serviceWorker
					const swr = await sw.ready
					if (swr.pushManager && swr.pushManager.getSubscription) {
						const subscription = await swr.pushManager.getSubscription()
					}
					if (sw.controller) sw.controller.postMessage(timings)
				}
				search = location.search
				search += (search ? '&' : '?') + 't'
				if (new_access_time) search += '=' + new_access_time
				location.href = location.pathname + search + location.hash
			}
			check()
		</script>
		<script type="module">// Проверка что получен кэш с нужной темой
			const fromCookie = () => {
				let name = document.cookie.match('(^|;)?theme=([^;]*)(;|$)')
				if (!name) return ''
				if (name) name = decodeURIComponent(name[2])
				if (name == 'deleted') name = ''
				return name
			}
			const fromGET = () => {
				let name = location.search.match('[\?|&]theme=([^&]*)')
				if (name) return decodeURIComponent(name[1])
			}
			const check = async (tplname) => { //template name
				const getname = fromGET()
				if (getname != null) return
				const cookiename = fromCookie()
				if (tplname == cookiename) return
				if (getname) {
					document.cookie = "theme=" + encodeURIComponent(getname) + "; path=/; SameSite=Strict ";
				} else {
					document.cookie = "theme=; path=/; SameSite=Strict ";
				}
				const Client = await window.getClient()
				if (cookiename) {
					await Client.replaceState(location.href + (location.search ? '&' : '?') + 'theme=' + cookiename)	
				} else {
					await Client.replaceState(location.href + (location.search ? '&' : '?') + 'theme=')	
				}
				
			}
			check('${Object.entries(env.theme).map(a => a.join("=")).join(":")}')
		</script>
`

controller.ER500 = (data, env) => `	
	<p>${env.host}<b>${env.bread.end}</b> &mdash; ошибка на сервере, код 500</p>
`
controller.ER404 = (data, env) => `
	<p>${env.host}<b>${env.bread.end}</b> &mdash; страница не найдена, код 404</p>
`
controller.ER403 = (data, env) => `
	<p>${env.host}<b>${env.bread.end}</b> &mdash; доступ закрыт, код 403</p>
`