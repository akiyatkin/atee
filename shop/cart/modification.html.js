import err from "/-controller/err.html.js"
const tpl = {}
export default tpl
tpl.ROOT = (data, env) => err(data, env) || `
	<h1>Модификация</h1>
	<form>
		<div style="margin:1em 0">
			<input type="text" name="modification" value="${data.pos.item.modification || ''}">
		</div>
		<button type="submit">Сохранить</button>
	</form>
	<script type="module">
		const reachGoal = goal => {
			//if (!btn.closest('body')) return
			console.log('Goal.reach ' + goal)
			const metrikaid = window.Ya ? window.Ya._metrika.getCounters()[0].id : false
			if (metrikaid) ym(metrikaid, 'reachGoal', goal)
		}
		reachGoal('modification')
	</script>
`