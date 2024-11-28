const conf = (env, name, def) => env.layer.conf?.[name] ?? def
const placeholder = env => conf(env, 'placeholder', '')
const type = env => conf(env, 'type', 'text')
const onlyfuture = env => conf(env, 'onlyfuture', false)
const name = env => conf(env, 'name', 'text')
const min = env => conf(env, 'min', '20vw')
const max = env => conf(env, 'max', '370px')
const ok = env => conf(env, 'ok', 'ОК')
const heading = env => placeholder(env) ? ('<h1>' + placeholder(env) + '</h1>') : ''
const value = env => conf(env, 'value', '')
const values = env => conf(env, 'values', {"":"Варианты не указаны"})
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
	<div style="min-width:${min(env)}; max-width:${max(env)}">
		${heading(env)}
		<div style="display: grid; gap:0.25em">
			${Object.entries(values(env)).map(([key, value]) => showValue(data, env, key, value)).join('')}
		</div>
		${descr(env)}
		<div id="${env.layer.conf?.layer?.div ?? ''}"></div>
	</div>
`
const showValue = (data, env, key, value) => `
	<div><button data-key="${key}" class="a value">${value}</button></div>
`