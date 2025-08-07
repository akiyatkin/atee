import links from '/-catalog/links.html.js'
import common from '/-catalog/common.html.js'
import { words } from '/-words/words.js'
import ti from '/-words/ti.js'
import cards from "/-shop/cards.html.js"
export const MENU = () => `
	<div class="livemenu">
		<div class="livetitle"></div>
		<div class="livebody"></div>
	</div>
`
export const TITLE = data => `
	<i>${data.query}...</i>
`
export const TITLEBODY = data => data.ans?.result ? `
	${data.query?pquery(data):''}
	<a href="${data.ans.conf.root_path}/group/${data.ans.conf.root_nick}?query=${data.query}">${countmodels(data.ans.count)}</a> 
	в ${countgroups(data.ans.gcount)}
` : 'Ошибка на сервере'
const countmodels = (count) => `${count} ${words(count,'модель','модели','моделей')}`
const countgroups = (count) => `${count} ${words(count,'группе','группах','группах')}`
const pquery = (data) => `<i>${data.query}</i>, найдено`
export const BODY = data => `
	${data.ans.result ? BODYshow(data) : ''}
`
const BODYshow = data => `
	
	${data.ans.groups.map(group => suggestionGroup(group, data)).join('')}
	${data.ans.list.map(mod => suggestion(mod, data)).join('')}
`
export const suggestion = (mod, data) => `
	<a draggable="false" href="${data.ans.conf.root_path}/item/${mod.brendmodel_nick}/${mod.art_nick}" 
		style="white-space: normal; padding-top: 4px; display: grid; grid-template-columns: 1fr max-content; grid-gap: 5px 5px;">
		<span>
			${mod.naimenovanie_title || ''} ${mod.brend_title} ${mod.model_title}
		</span>
		<span style="text-align:right">${mod.cena_title ? cost(mod.cena_title) : ''}</span>
	</a>
`
 const cost = cena => `
 	${cena}${cards.unit()}
`
const suggestionGroup = (group, data) => `
	<a draggable="false" href="${data.ans.conf.root_path}/group/${group.group_nick}?query=${data.query}" 
		style="display: block; padding-top: 4px; font-weight:bold">
		${group.group_title}
	</a>
`