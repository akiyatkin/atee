import date from "/-words/date.html.js"
import field from "/-dialog/field.html.js"
let started = false //onlyclient
export const ROOT = (data, env) => {
	if (data?.msg) return data.msg

	const recalc = started && data.dates.date_recalc_finish
	started = !data.dates.date_recalc_finish

	const duration = (started ? new Date().getTime() / 1000 - data.dates.date_recalc_start : data.dates.date_recalc_finish - data.dates.date_recalc_start) * 1000
	


	return `
		<style>
			${env.scope} {
				transition: background-color 0.3s;
				padding:4px 8px;
				margin:-4px -8px;
			}
			${env.scope}.alert {
				background-color: #ffffd5;
			}
		</style>
		<div class="counter">${date.pass(duration)}</div>
		
		
		
		${!data.dates.date_recalc_publicate ? showIndexTimer(data, env) : ''}

		<script type="module">
			const div = document.getElementById("${env.layer.div}")
			const counter = div.getElementsByClassName('counter')[0]
			
			if (${!data.dates.date_recalc_finish}) {
				div.classList.add('alert')
				setTimeout(async () => {
					if (!counter.closest('body')) return
					const Client = await window.getClient()
					Client.global('check')
				}, 1000)
			} else {
				div.classList.remove('alert')
			}

			if (${recalc}) setTimeout(async () => {
				if (!counter.closest('body')) return
				const Client = await window.getClient()
				Client.global('recalc')

		 		const represent = await import('/-sources/represent.js').then(r => r.default)
			 	represent.reload()
		 
			}, 1)
		</script>
	`
}


// `<script>
// 	(async div => {
// 		const Recalc = await import("/-sources/Recalc.js").then(r => r.default)
// 		const start = ${data.start}
// 		if (start) div.classList.add('alert')
// 		else div.classList.remove('alert')

// 		if (Recalc.was && !start) {
// 			Recalc.was = false
// 			const Client = await window.getClient()
// 			const represent = await import('/-sources/represent.js').then(r => r.default)
// 			represent.reload()
// 			return Client.global("recalc")
// 		}
// 		if (!Recalc.was && start) Recalc.counter = 0
// 		Recalc.was ||= start


// 		const divcounter = document.querySelector('.counter')
// 		//if (start) Recalc.counter++
// 		if (start) Recalc.counter = Math.round((Date.now() - start) / 1000)
// 		divcounter.innerHTML = Recalc.counter ? Recalc.counter + ' сек' : '&nbsp;'
// 		if (start) setTimeout(async () => {
// 			if (!divcounter.closest('body')) return
// 			const Client = await window.getClient()
// 			Client.reloaddiv("${env.layer.div}")
// 		}, 1000)
		
// 	})(document.currentScript.parentElement)
// </script>`

// const showStat = (data, env) => `
// 	<div>
// 		${!data.dates.date_recalc_publicate ? showIndexTimer(data, env) : ''}
// 	</div>
// `
const showIndexTimer = (data, env) => `
	
	<div class="mute">
		Активность
		<br>${date.dmyhi(data.dates.date_recalc_start)}
		<br>Публикация в ${date.hi(data.dates.date_recalc_start + 60 * 30)}
		<!-- <div title="Рассчёт перезаписей, появлений, индекс позиций для поиска на сайте">Winner, Appear, ItemSearch</div> -->
	</div>
	<div>
		${field.button({
			cls: 'a',
			label:'Опубликовать',
			action:'/-sources/set-recalc-publicate',
			global:'check'
		})}
	</div>
	<script>
		setTimeout(async () => {
			const Client = await window.getClient()
			Client.global('check')
		}, 1000 * 60 * 30)
	</script>
`