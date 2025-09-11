import date from "/-words/date.html.js"
import field from "/-dialog/field.html.js"
export const RTABLE = (data, env) => `
	
	
	
	<div style="${data.start ? 'display:none' : ''}">${field.button({
		label:'Индексировать',
		cls: 'a',
		action:'/-sources/set-recalc-index',
		global:'recalc'
	})}</div>
	<div class="counter">&nbsp;</div>
	<script>
		(async div => {
			const Recalc = await import("/-sources/Recalc.js").then(r => r.default)
			const start = ${data.start}
			if (start) div.classList.add('alert')
			else div.classList.remove('alert')

			if (Recalc.was && !start) {
				Recalc.was = false
				const Client = await window.getClient()
				const represent = await import('/-sources/represent.js').then(r => r.default)
				represent.reload()
				return Client.global("recalc")
			}
			if (!Recalc.was && start) Recalc.counter = 0
			Recalc.was ||= start


			const divcounter = document.querySelector('.counter')
			//if (start) Recalc.counter++
			if (start) Recalc.counter = Math.round((Date.now() - start) / 1000)
			divcounter.innerHTML = Recalc.counter ? Recalc.counter + ' сек' : '&nbsp;'
			if (start) setTimeout(async () => {
				if (!divcounter.closest('body')) return
				const Client = await window.getClient()
				Client.reloaddiv("${env.layer.div}")
			}, 1000)
			
		})(document.currentScript.parentElement)
	</script>
	${!data?.result ? data?.msg || 'Ошибка на сервере' : showStat(data, env)}
`
export const ROOT = (data, env) => `
	<style>
		#RTABLE {
			transition: background-color 0.3s;
		}
		#RTABLE.alert {
			background-color: #ffffd5;
			padding:2px 8px;
			margin:-2px -8px;
		}
	</style>
	
	<div id="RTABLE"></div>
	
`
const showStat = (data, env) => `
	<div>
		${data.indexneed ? showIndexTimer(data, env) : ''}
	</div>
	<div>
		${data.last ? showRecalc(data, env) : ''}
	</div>

`
const showIndexTimer = (data, env) => `
	<span class="mute">
		Активность ${date.dmyhi(data.dates.date_recalc)}
		<br>Автоматическая индексация
		<br>${date.dmyhi(data.dates.date_recalc + 60 * 60)}
	</span>
`
const showRecalc = (data, env) => `
	Пересчёт ${date.pass(Date.now() - data.last) || 1}
`