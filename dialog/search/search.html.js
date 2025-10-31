import words from '/-words/words.js'

const conf = (env, name, def) => env.layer.conf?.[name] ?? def
const descr = env => conf(env, 'descr') ? '<p>' + conf(env, 'descr') + '</p>' : ''
const heading = env => conf(env, 'heading') ? '<h1>' + conf(env, 'heading') + '</h1>' : ''
const placeholder = env => conf(env, 'placeholder', 'Укажите что-нибудь')
const action = env => conf(env, 'action')
const value = env => conf(env, 'value', '')
const min = env => conf(env, 'min', '20vw')
const max = env => conf(env, 'max', '450px')

export const POPUP = (data, env) => `
	<div style="min-width:${min(env)}; max-width:${max(env)}">
		${heading(env)}
		${descr(env)}
		<form action="${action(env)}">
			<div class="float-label">
				<input name="query" value="${value(env)}" placeholder="${placeholder(env)}" id="${env.sid}s" type="search">
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
export const TITLEBODY = data => {
	if (data.ans.result && data.ans.list.length && (data.ans.list.length == data.ans.count || data.ans.count == null)) return ''
	return data.ans.result ? `
		${data.query ? pquery(data) : 'найдено: '} ${data.ans.count || 0}
	` : data.ans.msg || 'Ошибка на сервере'
}
const countmodels = (count) => ``

const pquery = (data) => `<i>${data.query}</i>, найдено:`
export const BODY = data => `
	${data.ans.result ? BODYshow(data) : ''}
`
const BODYshow = data => `
	${data.ans.list.map(mod => suggestion(mod, data)).join('')}
`
export const suggestion = (pos, data) => `
	<button class="transparent" style="width:100%; white-space: normal; padding-top: 4px; display: grid; grid-template-columns: 1fr max-content; gap: 5px;">
		<span style="text-align:left">${pos.left}</span>
		<span style="text-align:right; display: flex; align-items: center;">${pos.right}${pos.icon ? showIcon(pos) : ''}</span>
	</button>
`
const showIcon = (pos) => `&nbsp;<img style="opacity:0.3" width="16" height="16" src="${pos.icon}">`
