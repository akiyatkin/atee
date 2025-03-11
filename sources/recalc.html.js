import date from "/-words/date.html.js"
import field from "/-dialog/field.html.js"
export const RTABLE = (data, env) => `
	${!data?.result ? data?.msg || 'Ошибка на сервере' : showStat(data, env)}
	<div class="counter">0</div>
	
	<script>
		(async div => {
			const Recalc = await import("/-sources/Recalc.js").then(r => r.default)
			const last = ${data.last ? true : false}
			
			if (last) div.classList.add('alert')
			else div.classList.remove('alert')

			if (Recalc.waslast && !last) {
				Recalc.waslast = false
				const Client = await window.getClient()
				return Client.global("recalc")
			}
			Recalc.waslast ||= last


			const divcounter = document.querySelector('.counter')
			divcounter.innerHTML = ++Recalc.counter
			setTimeout(async () => {
				if (!divcounter.closest('body')) return
				const Client = await window.getClient()
				Client.reloaddiv("${env.layer.div}")	
			}, 1000)
		})(document.currentScript.parentElement)
	</script>
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
	${field.button({
		label:'Пересчитать',
		cls: 'a',
		action:'/-sources/set-recalc',
		global:'recalc'
	})}	
	<div id="RTABLE"></div>
	
`
const showStat = (data, env) => `
	${data.last ? showRecalc(data, env) : ''}
`
const showRecalc = (data, env) => `
	Пересчёт ${date.pass(Date.now() - data.last) || 1}
`