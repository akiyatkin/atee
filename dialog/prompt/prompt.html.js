import nicked from "/@atee/nicked"
const conf = (env, name, def) => env.layer.conf?.[name] ?? def
const placeholder = env => conf(env, 'placeholder', 'Укажите что-нибудь')
const type = env => conf(env, 'type', 'text')
const onlyfuture = env => conf(env, 'onlyfuture', false)
const name = env => conf(env, 'name', 'text')
const min = env => conf(env, 'min', '20vw')
const max = env => conf(env, 'max', '370px')
const ok = env => conf(env, 'ok', 'ОК')
const heading = env => descr(env) && placeholder(env) ? ('<h1>' + placeholder(env) + '</h1>') : ''
const value = env => conf(env, 'value', '')
const input = env => {

	if (type(env) != 'date') {
		return conf(env, 'input', value(env))
	} else {
		let value = conf(env, 'input')
		if (value) {
			value = new Date(value * 1000)
			
			value.setMinutes(value.getMinutes() - value.getTimezoneOffset())
			value = value.toISOString().slice(0,10)//.slice(0,16)
		} else {
			value = ''
		}

		return value
	}
}
const descr = env => conf(env, 'descr') ? ('<p>' + conf(env, 'descr', '') + '</p>') : ''
export const POPUP = (data, env) => `
	<div style2="min-width:${min(env)}; max-width:${max(env)}">
		${heading(env)}
		${descr(env)}
		<form>
			${type(env) == 'area' ? showArea(data, env) : showInput(data, env)}
			
			<div align="right" style="margin-top:1rem">
				<button type="submit">${ok(env)}</button>
			</div>
		</form>
		<div id="PROMPTTEXT"></div>
	</div>
`
const showInput = (data, env) => `
	<div class="float-label">
		<input value="${input(env)}" 
			${type(env) == 'date' ? showDateAttr(env) : ''}
			
			name="${name(env)}" placeholder="${placeholder(env)}" id="${env.sid}s" type="${type(env)}">
		<label for="${env.sid}s">${placeholder(env)}</label>
	</div>
`
const showArea = (data, env) => {
	const label = placeholder(env)
	const id = 'prompt-field-' + nicked(label)
	return `
		<div class="float-label success">
			<style>
				.dialogbody {
					min-width: auto;
				}
			</style>
			<textarea id="${id}" wrap="off" style="field-sizing: content;" rows="10" ${type(env) == 'date' ? showDateAttr(env) : ''} name="${name(env)}" placeholder="${placeholder(env)}">${input(env)}</textarea>
			<label for="${id}">${label}</label>
			<script type="module">
				import Area from '/-note/Area.js'
				const field = document.getElementById('${id}')
				console.log(field)
				const TAB = 9
				const ENTER = 13
				const HOME = 36
				const END = 35
				field.addEventListener('keydown', e => {
					if (~[HOME, END].indexOf(e.keyCode)) { //input ради preventDefault стандартного действия, нет input
						e.preventDefault() 
						Area.keydown(field, e)
					}
					if (~[ENTER, TAB].indexOf(e.keyCode)) { //input ради preventDefault стандартного ввода, есть input
						e.preventDefault()
						Area.keydown(field, e)
					}
				})
			</script>		
		</div>
	`
}
const showDateAttr = (env) => `
	min="${onlyfuture(env) ? new Date().toISOString().split('T')[0] : '2000-01-01'}" 
	max="2099-01-01"
`