const controller = {}
export default controller

controller.HEAD = (data, env) => 
// env.bread.status != 200 ? `
// 	<script>
// 		window.getClient = () => new Promise(() => {})
// 		window.addEventListener('popstate', () => {
// 			location.reload()
// 		})
// 	</script>
// ` :
`<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<script>//Делаем SPA переходы http:
			const reg = new RegExp("^\\\\w{0,6}:")
			const isSuitable = a => {
				const search = a.getAttribute('href')
				if (!search && search != '') return
				const it = search.indexOf('.')
				const is = search.indexOf('/')
				const iq = search.indexOf('?')
				if (a.getAttribute('target')) return
				if (search[1] == '-') return 
				if (it > is && !~iq) return
				if (reg.test(search)) return
				
				//if (/^(\\w+:){0,1}\\/\\//.test(search)) return
				return true
			}
			const click = event => { 
				const a = event.target.closest('a')
				if (!a || !isSuitable(a)) return
				if (event.defaultPrevented) return
				event.preventDefault()
				getClient().then(Client => Client.click(a))
			}

			
			const popstate = async event => {
				const Client = await getClient()
				Client.popstate(event)
			}
			window.waitClient = promise => waitClient.stack.push(promise)
			window.waitClient.stack = []
			const search = location.pathname + location.search
			window.getClient = () => {
				const promise = new Promise((resolve, reject) => {
					window.removeEventListener('popstate', popstate)
					window.removeEventListener('click', click)
					
					// window.removeEventListener('mousedown', mousedown)
					// window.removeEventListener('focus', focus)
					
					const time = ${env.timings.access_time}
					import("/-controller/Client.js").then(({ Client }) => {
						Client.isSuitable = isSuitable
						Client.timings = {
							view_time: time,
							update_time: time,
							access_time: time
						}
						//Client.follow('${env.bread.root}', '${env.bread.href}')
						Client.follow('${env.bread.root}', search)
						resolve(Client)
					}).catch(reject)
				})
				window.getClient = () => promise
				return promise
			}
			// window.addEventListener('focus', focus, true)
			// window.addEventListener('mousedown', mousedown)
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
			//check()
			setTimeout(check, 5000)
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
				const Client = await window.getClient()
				if (cookiename) {
					await Client.replaceState(location.pathname + location.search + (location.search ? '&' : '?') + 'theme=' + cookiename)	
				} else {
					await Client.replaceState(location.pathname + location.search + (location.search ? '&' : '?') + 'theme=')	
				}
				
			}
			check('${Object.entries(env.theme).map(a => a.join("=")).join(":")}')
		</script>
`

const ERRORS = {
	"400":"Некорректный запрос",
	"404":"Страница не найдена",
	"403":"Доступ закрыт",
	"500":"Ошибка на сервере"
}
controller.ERROR = (data, env) => `
	<h1>${env.bread.status || 'Здесь будет код ошибки'}</h1>
	<p>${ERRORS[env.bread.status] || 'Что-то пошло не так...'}</p>
	<p>${env.host}<b>${env.bread.end}</b>
`
