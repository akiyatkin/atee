import model from '/-catalog/model.html.js'
//import cat from '-catalog/cat.html.js'
import mark from '/-catalog/mark.html.js'
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
	<a href="/catalog${mark.add(data)}search=${data.query}">${countmodels(data.ans.count)}</a> 
	в ${countgroups(data.ans.gcount)}
` : 'Ошибка на сервере'
const countmodels = (count) => `${count} ${words(count,'позиция','позиции','позиций')}`
const countgroups = (count) => `${count} ${words(count,'группе','группах','группах')}`
const pquery = (data) => `<i>${data.query}</i>, найдено`
export const BODY = data => `
	${data.ans.result ? BODYshow(data) : ''}
`
const BODYshow = data => `
	<div style="padding-top: 4px; display: grid; grid-template-columns: 1fr max-content; grid-gap: 5px 5px; align-items:flex-end">
		${data.ans.groups.map(group => suggestionGroup(group, data)).join('')}
		${data.ans.list.map(model => suggestion(model, data)).join('')}
	</div>
`
export const suggestion = (model, data) => `
	<div>
		<a draggable="false" href="{:model.link-pos}">
			${model.Наименование}
		</a> <small>${model.brand_title} ${model.model_title}</small>
	</div>
	<div style="text-align:right">${model.Цена?cost(model.Цена):''}</div>
`
 const cost = Цена => `
 	${Цена}${model.unit()}
`
const suggestionGroup = (group, data) => `
	<a draggable="false" href="/catalog/${group.group_nick}${mark.add(data)}search=${data.query}"><b>${group.group_title}</b></a>
	<div></div>
`