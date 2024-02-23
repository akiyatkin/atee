import words from '/-words/words.js'

const conf = (env, name, def) => env.layer.conf?.[name] ?? def
const descr = env => conf(env, 'descr') ? '<p>' + conf(env, 'descr', '') + '</p>' : ''
const placeholder = env => conf(env, 'placeholder', 'Укажите что-нибудь')
const action = env => conf(env, 'action')
const value = env => conf(env, 'value', '')
const min = env => conf(env, 'min', '20vw')
const max = env => conf(env, 'max', '370px')

export const POPUP = (data, env) => `
	<div style="min-width:${min(env)}; max-width:${max(env)}">
		${descr(env)}
		<form action="${action(env)}">
			<div class="float-label">
				<input name="search" value="${value(env)}" placeholder="${placeholder(env)}" id="${env.sid}s" type="search">
				<label for="${env.sid}s">${placeholder(env)}</label>
			</div>
		</form>
	</div>
`


export const MENU = () => `
	<div class="searchmenu">
		<div class="searchtitle"></div>
		<div class="searchbody"></div>
	</div>
`
export const TITLE = data => `
	<i>${data.query}...</i>
`
export const TITLEBODY = data => data.ans.result ? `
	${data.query ? pquery(data) : ''} ${data.ans.count || 0} ${words(data.ans.count || 0, 'запись','записи','записей')}
` : 'Ошибка на сервере'
const countmodels = (count) => ``

const pquery = (data) => `<i>${data.query}</i>, найдено`
export const BODY = data => `
	${data.ans.result ? BODYshow(data) : ''}
`
const BODYshow = data => `
	${data.ans.list.map(mod => suggestion(mod, data)).join('')}
`
export const suggestion = (pos, data) => `
	<button class="transparent" style="width:100%; white-space: normal; padding-top: 4px; display: grid; grid-template-columns: 1fr max-content; gap: 5px;">
		<span style="text-align:left">${pos.left}</span>
		<span style="text-align:right">${pos.right}</span>
	</button>
`
