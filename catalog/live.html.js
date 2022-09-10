import links from '/-catalog/links.html.js'
import common from '/-catalog/common.html.js'
import { words } from '/-words/words.js'
export const MENU = () => `
	<div class="livemenu">
		<div class="livetitle"></div>
		<div class="livebody"></div>
	</div>
`
export const TITLE = data => `
	<i>${data.query}...</i>
`
export const TITLEBODY = data => data.ans.result ? `
	${data.query?pquery(data):''}
	<a href="/catalog${links.addm(data)}search=${data.query}">${countmodels(data.ans.count)}</a> 
	в ${countgroups(data.ans.gcount)}
` : 'Ошибка на сервере'
const countmodels = (count) => `${count} ${words(count,'позиция','позиции','позиций')}`
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
	<a draggable="false" href="/catalog/${mod.brand_nick}/${mod.model_nick}?m=search=${data.query}" 
		style="white-space: normal; padding-top: 4px; display: grid; grid-template-columns: 1fr max-content; grid-gap: 5px 5px;">
		<span>
			${mod.Наименование} ${mod.brand_title} ${mod.model_title}
		</span>
		<span style="text-align:right">${mod.Цена?cost(mod.Цена):''}</span>
	</a>
`
 const cost = Цена => `
 	${Цена}${common.unit()}
`
const suggestionGroup = (group, data) => `
	<a draggable="false" href="/catalog/${group.group_nick}?m=search=${data.query}" 
		style="display: block; padding-top: 4px; font-weight:bold">
		${group.group_title}
	</a>
`