import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import words from "/-words/words.js"
import ddd from "/-words/date.html.js"
export const css = ['/-sources/revscroll.css']
const MONTH = {
	"1":"Январь",
	"2":"Февраль",
	"3":"Март",
	"4":"Апрель",
	"5":"Май",
	"6":"Июнь",
	"7":"Июль",
	"8":"Август",
	"9":"Сентябрь",
	"10":"Октябрь",
	"11":"Ноябрь",
	"12":"Декабрь"
}
const percentTd = (stat, sum = stat.poscount ? Math.round(stat.withall / stat.poscount * 100) : 0) => `
	<td class="${sum == 100 ? 'green' : 'red'}" title="${stat.withall}">${sum}%</td>
`
export const ROOT = (data, env) => err(data, env) || `
	<style>
		${env.scope} .red {
			color: FireBrick;
			
		}
		${env.scope} table thead td {
			font-weight: normal;
		}
		${env.scope} .green {
			color: green;
			
		}
	</style>
	<h1>Сводка</h1>
	<div class="revscroll">
		<table>
			<thead>
				<tr>
					<th>Год</th>
					<th>Месяц</th>
					<th>Бренд</th>
					${showStatHead(data,env)}
				</tr>
			</thead>
			<tbody>
				${(data.brands || []).map(row => showRow(data, env, data.group, row)).join('')}
			</tbody>
		</table>
	</div>
`
const showStatHead = (data, env) => `
	<td>Позиций</td>
	<td>Моделей</td>
	<td>Группы</td>
	<td>Бренды</td>
	<td>Фильтры</td>
	<td>Источники</td>
	<td>Актуальность</td>
	<td title="Позиций со всеми важными свойствами и фильтрами">ОК</td>
	<td title="Позиций без фильтров">БФ</td>
	<td title="Позиций без цен">БЦ</td>
	<td title="Позиций без описаний">БО</td>
	<td title="Позиций без наименований">БН</td>
	<td title="Позиций без бренда">ББ</td>
	<td title="Позиций без картинок">БК</td>
`
const showRow = (data, env, group, stat) => `
	<tr>
		<th>${stat.year}</th>
		<th>${MONTH[stat.month]}</th>
		<th>${stat.brand_title}</th>
		${showStatTds(data, env, group, stat)}
	</tr>
`

const showStatTds = (data, env, group, stat = {}) => `
	<td>${stat.poscount ?? '&mdash;'}</td>
	<td>${stat.modcount ?? '&mdash;'}</td>
	<td>${stat.groupcount ?? '&mdash;'}</td>
	<td>${stat.brandcount ?? '&mdash;'}</th>
	<td>${stat.filtercount ?? '&mdash;'}</td>
	<td>${stat.sourcecount ?? '&mdash;'}</td>
	<td>${ddd.ai(stat.date_cost)}</td>
	${percentTd(stat)}
	${redTd(data, group, stat, 'withfilters')}
	${redTd(data, group, stat, 'withcost', 'cena')}
	${redTd(data, group, stat, 'withdescr', 'opisanie')}
	${redTd(data, group, stat, 'withname', 'naimenovanie')}
	${redTd(data, group, stat, 'withbrands', 'brend')}
	${redTd(data, group, stat, 'withimg', 'images')}
`
const redTd = (data, group, stat, name, filter_prop_nick, sum = stat.poscount - stat[name]) => filter_prop_nick ? (
	group ? `
	<td><a target="about:blank" style="opacity:0.5" class="${sum ? 'red' : 'green'}" href="${data.conf.root_path}/group/${group.group_nick}?m=:${filter_prop_nick}=empty">${sum || '✓'}</a></td>
	` : `
		<td><span style="opacity:0.5" class="${sum ? 'red' : 'green'}">${sum || '✓'}</span></td>
	`) : `
	<td style="opacity:0.5" class="${sum ? 'red' : 'green'}">${sum || '✓'}</td>
`