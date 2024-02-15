const conf = (env, name, def) => env.layer.conf?.[name] ?? def
const placeholder = env => conf(env, 'placeholder', 'Укажите что-нибудь')
const type = env => conf(env, 'type', 'text')
const name = env => conf(env, 'name', 'text')
const min = env => conf(env, 'min', '20vw')
const max = env => conf(env, 'max', '370px')
const ok = env => conf(env, 'ok', 'ОК')
const heading = env => descr(env) && placeholder(env) ? ('<h1>' + placeholder(env) + '</h1>') : ''
const value = env => conf(env, 'value', '')
const descr = env => conf(env, 'descr') ? ('<p>' + conf(env, 'descr', '') + '</p>') : ''
export const POPUP = (data, env) => `
	<div style="min-width:${min(env)}; max-width:${max(env)}">
		${heading(env)}
		${descr(env)}
		<form>
			<div class="float-label">
				<input value="${value(env)}" name="${name(env)}" placeholder="${placeholder(env)}" id="${env.sid}s" type="${type(env)}">
				<label for="${env.sid}s">${placeholder(env)}</label>
			</div>
			<div align="right" style="margin-top:1rem">
				<button type="submit">${ok(env)}</button>
			</div>
		</form>
		<div id="PROMPTTEXT"></div>
	</div>
	
`