import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import words from "/-words/words.js"
import date from "/-words/date.html.js"
import cards from "/-shop/cards.html.js"
import addget from "/-sources/addget.js"
export const css = ['/-sources/revscroll.css']

const tpl = {}
export const ROOT = (data, env) => err(data, env) || `	
	${tpl.TITLE(data, env)}
	${showFree(data, env, data.table)}
	
`

const showFree = (data, env, table) => `
	
	
	<form style="display: flex; margin: 1em 0; gap: 1em">
		<div class="float-label">
			<input id="freeinp" name="search" type="search" placeholder="Поиск" value="${env.bread.get.query ?? ''}">
			<label for="freeinp">Поиск</label>
		</div>
		<button type="submit">Найти</button>
		<script>
			(form => {
				const btn = form.querySelector('button')
				const input = form.querySelector('input')
				form.addEventListener('submit', async (e) => {
					e.preventDefault()
					const Client = await window.getClient()
					const addget = await import('/-sources/addget.js').then(r => r.default)

					Client.go('poss' + addget(Client.bread.get, {query : input.value}, ['source_id', 'group_id', 'query', 'm']), false)
					Client.reloaddiv("${env.layer.div}")
				})
			})(document.currentScript.parentElement)
		</script>
	</form>
	<p>
		Найдено: ${data.count}
	</p>
	<div class="revscroll">
		<table>
			<thead>
				${showHeadTr(data, env, table.head)}
			</thead>
			<tbody>
				${table.rows.map((row, i) => showRowTr(data, env, row, table.key_ids[i], table.groups[i])).join('')}
			</tbody>
		</table>
		<!-- <script>
			(async div => {
				const name = 'sources_poss_'
				div.scrollLeft = window.sessionStorage.getItem(name) || 0
				div.addEventListener('scroll', e => {
					window.sessionStorage.setItem(name, div.scrollLeft)
				}, {passive: true})

			})(document.currentScript.parentElement)
		</script> -->
	</div>
`
const showRowTr = (data, env, row, key_id, groups) => `
	<tr>
		<td>${groups.map(g => showGroup(data, env, g)).join(', ')}</td>
		${row.map(title => showTd(data, env, title)).join('')}
		<td>${key_id}</td>
	</tr>
`
const showHeadTr = (data, env, row, groups) => `
	<tr>
		<td><code>groups</code></td>
		${row.map(title => showTd(data, env, title)).join('')}
		<td><code>key_id</code></td>
	</tr>
`
const showTd = (data, env, title) => `
	<td>${title}</td>
`
const showGroup = (data, env, group) => `
	<a href="groups/${group.group_id}?query=${env.bread.get.query || ''}">${group.group_title}</a>`



tpl.TITLE = (data, env) => err(data, env) || `
	<style>
		${env.scope} a.clearlink {
			white-space: normal; 
			gap:5px; 
			display: inline-flex; 
			align-items: flex-start; color: inherit; 
			border: none; 
			text-decoration: none
		}
		${env.scope} .clearlink .value {
			opacity: 1;
			transition: color 0.2s, opacity 0.2s;
		}
		${env.scope} .clearlink .krest {
			transition: color 0.2s, opacity 0.2s;
			opacity: 0.6;
		}
		${env.scope} .clearlink:hover .value {
			opacity: 0.5;
		}
		${env.scope} .clearlink:hover .krest {
			opacity: 1;
			/*color: red;*/
		}
	</style>
	<h1 style="margin-top:0">${tpl.getTitleH1(data, env.bread)}</h1>
`
tpl.getTitleH1 = (data, bread) => `
	${data.group?.group_title || '<i>Корень</i>'}
	
	${tpl.showPart(data, bread, data.source?.source_title, {source_id: null})}
	${tpl.showPart(data, bread, data.md.query, {query: null})}
	${tpl.showSelected(data, bread)}
`
tpl.showSelected = (data, bread) => {
	return Object.keys(data.md.mget || {}).map(prop_nick => {
		const values = data.md.mget[prop_nick]
		const prop = data.props[prop_nick]

		if (values == 'empty') {
			const title = {'cena':'Без цен', 'images':'Без картинок'}[prop_nick] || prop.name + ' отсутствует' 
			return tpl.showPart(data, bread, title, {m: data.md.m + ':' + prop_nick})
		} else if (values == 'any') {
			const title = {'cena':'С ценой', 'images':'С картинками'}[prop_nick] || prop.name + ' указано' 
			return tpl.showPart(data, bread, title, {m: data.md.m + ':' + prop_nick})
		} else if (typeof(values) == 'object') {
			if (prop.type == 'value') {
				return Object.keys(values).map(value_nick => {
					const title = cards.getValueTitleByNick(data, value_nick)
					const m = data.md.m + ':' + prop_nick + '.' + value_nick
					return tpl.showPart(data, bread, title, {m})
				}).join(' ')
			} else if (prop.type == 'number'){
				return Object.keys(values).map(value_nick => {
					const get = {m:data.md.m + ':' + prop_nick + '.' + value_nick}
					
					if (value_nick == 'from' || value_nick == 'upto') {
						const title = (values[value_nick] / 10 ** prop.scale) + cards.unit(prop)
						return tpl.showPart(data, bread, (value_nick == 'from' ? 'от ' : 'до ') + title, get)
					} else {
						const title = (value_nick / 10 ** prop.scale) + cards.unit(prop)
						return tpl.showPart(data, bread, title, get)
					}
				}).join(' ')
			}
		}
	}).join('')
}

tpl.showPart = (data, bread, title, params) => !title ? '' : `
	<a data-scroll="none" class="clearlink"
		href="poss${addget(bread.get, params, ['source_id', 'group_id', 'query', 'm'])}">
		<span class="value">${title}</span>
		<span class="krest" style="font-size:1rem; line-height: 2rem;">✕</span>
	</a>
`

