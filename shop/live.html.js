import words from '/-words/words.js'
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
	<a data-scroll="none" href="${cards.getGroupPath(data.ans, data.ans.conf.root_nick)}?query=${data.query}">${countmodels(data.ans.count)}</a> 
	в ${countgroups(data.ans.gcount)}
` : 'Ошибка на сервере'
const countmodels = (count) => `${count} ${words(count,'модель','модели','моделей')}`
const countgroups = (count) => `${count} ${words(count,'группе','группах','группах')}`
const pquery = (data) => `<i>${data.query}</i>, найдено`
export const BODY = data => `
	${data.ans.result ? BODYshow(data) : ''}
`
const BODYshow = data => `
	${data.ans.childs.map(group_nick => suggestionGroup(data, data.ans.groups[group_nick])).join('')}
	${data.ans.list.map(model => suggestion(data, model)).join('')}
`
export const suggestion = (data, model) => {
	const gain = name => cards.getSomeTitle(data.ans, model.recap, name)
	return `
		<a data-scroll="none" class="item" data-brendart="${model.items[0].brendart[0]}" draggable="false" href="${cards.getItemPath(data.ans, model.items[0])}" 
			style="white-space: normal; padding-top: 4px; display: grid; grid-template-columns: 1fr min-content; grid-gap: 5px 5px;">
			<span>
				${cards.getItemName(data.ans, model.recap)}
			</span>
			<span style="text-align:right">${cards.cost(model.items[0])}</span>
		</a>
	`
}

const suggestionGroup = (data, group) => `
	<a data-scroll="none" draggable="false" href="${cards.getGroupPath(data.ans, group.group_nick)}?query=${data.query}" 
		style="display: block; padding-top: 4px; font-weight:bold">
		${group.group_title}
	</a>
`