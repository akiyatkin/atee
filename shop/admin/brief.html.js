import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import words from "/-words/words.js"
import ddd from "/-words/date.html.js"
import addget_orig from "/-sources/addget.js"
export const css = ['/-sources/revscroll.css']


const addget = (get, params) =>  addget_orig(get, params, ['detail', 'source_id', 'brand_nick','preset'])
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


export const ROOT = (data, env) => `
	
	<h1>Статистика по содержанию<br><span id="subtitle"></span></h1>
	
	<div id="PLOP"></div>
	
	<div style="max-width:820px; aspect-ratio: 3 / 1;">
		<canvas id="myChart"></canvas>
	</div>
	
	<script type="module">
		import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4.5.0/auto/+esm';
		Chart.defaults.animation = false;
		const ctx = document.getElementById('myChart').getContext('2d')
		window.chart = new Chart(ctx, {
			type: 'line',
			plugins:[
				{
					afterInit: (chart) => {
						window.chart = chart
						window.dispatchEvent(new Event("chart"))
					}
				}
			],
			options: {
				onResize: function(chart, size) {
			        const isMobile = window.innerWidth < 575;
			        if (isMobile) {
			            chart.options.aspectRatio = 1.5; // Более вытянутый график на мобильных
			            //chart.canvas.parentNode.style.height = '300px'; // Фиксированная высота
			        } else {
			            chart.options.aspectRatio = 3; // Стандартное соотношение на десктопе
			            //chart.canvas.parentNode.style.height = '400px';
			        }
			    },
				aspectRatio: 3,
				showLine: true,
				elements: {
					line: {
						borderWidth: 1,
						borderColor: 'blue',
						tension: 0.2
					},
					point: {						
						radius: 2,
						pointBorderColor: 'transparent',
						hoverRadius: 5
					}
				},
				responsive: true,
				plugins: {
					legend: {
		                position: 'top',
		                reverse: true
		                
		            },
					title: {
						display: false,
						text: (ctx) => 'Chart.js Line Chart - stacked=' + ctx.chart.options.scales.y.stacked
					},
					tooltip: {
						mode: 'nearest',
						intersect: false,
						itemSort: (a, b) => a.datasetIndex - b.datasetIndex
					}
				},
				interaction: {
					mode: 'nearest',
					axis: 'x',
					intersect: false
				},
				scales: {
					x: {
						title: {
							display: false,
							text: 'Month'
						}
					},
					y: {
						stacked: false,
						title: {
							display: false,
							text: 'Value'
						}
					}
				}
			}
		})
		
	</script>
	
	<div id="TABLE"></div>
`
const preset = (data, env, title, name) => {
	const is = name ? env.bread.get.preset == name : !env.bread.get.preset
	if (is) {
		return `${title}
		`
	} else {
		const gid = data.group?.group_id ? '/' + data.group?.group_id : ''
		return `
			<a href="brief${gid}${addget(env.bread.get, {preset: name || null})}">${title}</a> 
		`
	}
}
export const PLOP = (data, env) => `
	<div class="revscrollfont" style="display: flex; flex-wrap: wrap; gap: 1em; margin-bottom: 2em">
		${preset(data, env, 'Позиций')}
		${preset(data, env, 'Групп', 'groups')}
		${preset(data, env, 'Брендов', 'brands')}
		${preset(data, env, 'Источников', 'sources')}
		${preset(data, env, 'Заказов', 'orders')}
		${preset(data, env, 'Фильтров', 'filters')}
		${preset(data, env, 'Без&nbsp;фильтров', 'nofilters')}
		${preset(data, env, 'Без&nbsp;всего', 'noall')}
	</div>
	<script type="module">
		const plot = ${JSON.stringify(data.plot)}
		const preset = "${env.bread.get.preset}"
		const labels = plot.label
		const pastelColors = [
		  '#FFB3BA',  // Пастельный розовый
		  '#BAFFC9',  // Пастельный зеленый
		  '#BAE1FF',  // Пастельный голубой
		  '#FFFFBA',  // Пастельный желтый
		  '#E0BBE4'   // Пастельный фиолетовый
		];
		const data = { labels: labels }
		if (preset == 'brands') {
			data.datasets = [
				{
					label: 'Брендов',
					data: plot.data.brandcount,
					backgroundColor: pastelColors[1]+'aa'
				
				}
			]
		} else if (preset == 'sources') {
			data.datasets = [
				{
					label: 'Источников',
					data: plot.data.sourcecount,
					backgroundColor: pastelColors[1]+'aa'
				
				}
			]
		} else if (preset == 'groups') {
			data.datasets = [
				{
					label: 'Групп',
					data: plot.data.groupcount,
					backgroundColor: pastelColors[1]+'aa'
				
				}
			]
		} else if (preset == 'filters') {
			data.datasets = [
				{
					label: 'Фильтров',
					data: plot.data.filtercount,
					backgroundColor: pastelColors[1]+'aa'
				
				}
			]
		} else if (preset == 'nofilters') {
			data.datasets = [
				{
					label: 'Без Фильтров',
					data: plot.data.withfilters.map((num, i) => plot.data.poscount[i] - num),
					backgroundColor: pastelColors[1]+'aa'
				
				}
			]
		} else if (preset == 'noall') {
			data.datasets = [
				{
					label: 'Без Фильтров',
					data: plot.data.withall.map((num, i) => plot.data.poscount[i] - num),
					backgroundColor: pastelColors[1]+'aa'
				
				}
			]
		} else if (preset == 'orders') {
			data.datasets = [
				{
					label: 'Корзи',
					data: plot.data.basketcount,
					backgroundColor: pastelColors[0]+'aa'
				
				},
				{
					label: 'Заказов',
					data: plot.data.ordercount,
					backgroundColor: pastelColors[1]+'aa'
				
				}
			]
		} else {
			data.datasets = [
				{
					label: 'Позиций',
					data: plot.data.poscount,
					backgroundColor: pastelColors[0]+'aa'
				
				},{
					label: 'C ценой',
					data: plot.data.withcost,					
					backgroundColor: pastelColors[3]+'55'
				},{
					label: 'C картинками',
					data: plot.data.withimg,					
					backgroundColor: pastelColors[4]+'55'
				},{
					label: 'C фильтрами',
					data: plot.data.withfilters,
					backgroundColor: pastelColors[2]+'99'
				},{
					label: 'Cо всем',
					data: plot.data.withall,					
					backgroundColor: pastelColors[1]+'aa'
				}
			]	
		}
			

		/*
			Позиций
			С описание
			С ценой
			С картинками
			С фильтрами
			Со всем
		*/
		
		data.datasets.forEach((dataset, i) => {
			dataset.borderColor = 'black'
			dataset.borderWidth = 0.1
			dataset.fill = true
			dataset.order = data.datasets.length - i //dataset.data.reduce((ak, i) => ak + i, 0)
		})
		data.datasets.at(-1).fill = true

		const isReady = window.chart && chart.canvas.closest('body');
		if (isReady) {
			window.chart.data = data
			window.chart.update()
		} else {
			window.addEventListener('chart', () => {

				window.chart.data = data
				window.chart.update()
			}, {once: true})
		}
	</script>
`
const getTitle = (data, env) => `${data.group?.group_title||'<i>Корень</i>'} ${env.bread.get.detail == 'source' ? data.source?.source_title || '' : ''} ${env.bread.get.detail == 'brand' ? data.brand?.brand_title || '': ''}`
export const TABLE = (data, env) => err(data, env) || `
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
	<script type="module">
		const subtitle = document.getElementById('subtitle')
		subtitle.innerHTML = "${getTitle(data, env)}"
	</script>	
	<div class="revscroll" style="margin: 2em 0;">
		<table style="width:800px; max-width:none">
			
			
			<thead>
				<tr style="opacity: 0.3;">
					<!-- <th>Год</th>
					<th>Месяц</th> -->
					<th>Группы</th>
					${showStatHead(data,env)}
				</tr>
			</thead>
			<tbody>
				${(data.groups || []).map(row => showRow(data, env, row.group, row)).join('')}
			</tbody>
			<thead style="font-weight: bold;">
				<tr style="opacity: 0.3;">
					<!-- <th>Год</th>
					<th>Месяц</th> -->
					<th>Бренды</th>
					${showStatHead(data,env)}
				</tr>
			</thead>
			<tbody>
				${(data.brands || []).map(row => showRow(data, env, data.group, row)).join('')}
			</tbody>
			<thead>
				<tr style="opacity: 0.3;">
					<!-- <th>Год</th>
					<th>Месяц</th> -->
					<th>Источники</th>
					${showStatHead(data,env)}
				</tr>
			</thead>
			<tbody>
				${(data.sources || []).map(row => showRow(data, env, data.group, row)).join('')}
			</tbody>
		</table>
		<script>
			(async div => {
				const table = div.querySelector('table')
				table.addEventListener('click', (e) => {
					const old = table.querySelector('.clicked')
					if (old) old.classList.remove('clicked')
					const tr = e.target.closest('tr')
					if (!tr) return
					tr.classList.add('clicked')
				})
			})(document.currentScript.parentElement)
		</script>
	</div>
`
const showStatHead = (data, env) => `
	<td title="Актуальность">Актуально</td>
	<td title="Позиций">Поз</td>
	<td title="Моделей">Мод</td>
	<td title="Групп">Грп</td>
	<td title="Брендов">Брн</td>
	<td title="Фильтров">Флт</td>
	<td title="Источников">Ист</td>
	
	<td title="Позиций со всеми важными свойствами и фильтрами">ОК</td>
	<td title="Позиций без фильтров">БФ</td>
	<td title="Позиций без цен">БЦ</td>
	<td title="Позиций без описаний">БО</td>
	<td title="Позиций без наименований">БН</td>
	<td title="Позиций без бренда">ББ</td>
	<td title="Позиций без картинок">БК</td>
	
	<td title="Корзин">Кор</td>
	<td title="Заказов">Зак</td>
	
`
const showRow = (data, env, group, stat) => `
	<tr>
		<!-- <th>${stat.year}</th>
		<th>${MONTH[stat.month]}</th> -->
		<td>${stat.brand_title ? showBrandLink(data, env, stat) : stat.group_title ? showGroupLink(data, env, stat) : showSourceLink(data, env, stat)}</td>
		${showStatTds(data, env, group, stat)}
	</tr>
`

const showStatTds = (data, env, group, stat = {}) => `
	<td>${ddd.dm(stat.date_cost)}</td>
	<td><a href="poss?source_id=${stat?.source_id || ''}&group_id=${group?.group_id || ''}&m=${stat.brand_nick?'brend='+stat.brand_nick:''}">${stat.poscount ?? '&mdash;'}</a></td>
	<td>${stat.modcount ?? '&mdash;'}</td>
	<td>${stat.groupcount ?? '&mdash;'}</td>
	<td>${stat.brandcount ?? '&mdash;'}</th>
	<td>${stat.filtercount ?? '&mdash;'}</td>
	<td>${stat.sourcecount ?? '&mdash;'}</td>
	
	${percentTd(stat)}
	${redTd(data, group, stat, 'withfilters')}
	${redTd(data, group, stat, 'withcost', 'cena')}
	${redTd(data, group, stat, 'withdescr', 'opisanie')}
	${redTd(data, group, stat, 'withname', 'naimenovanie')}
	${redTd(data, group, stat, 'withbrands', 'brend')}
	${redTd(data, group, stat, 'withimg', 'images')}
	<td>${stat.basketcount ?? '&mdash;'}</td>
	<td>${stat.ordercount ?? '&mdash;'}</td>
	
`
const showBrandLink = (data, env, stat) => {
	const is = env.bread.get.brand_nick == stat.brand_nick
	return `
		<a style="font-weight: ${is ? 'bold' : ''}" data-scroll="none" href="brief/${data.group?.group_id || ''}${addget(env.bread.get, {detail:is ? null :'brand', brand_nick:is ? null : stat.brand_nick, source_id: null})}">${stat.brand_title}</a>
	`
}
const showSourceLink = (data, env, stat) => {
	const is = env.bread.get.source_id == stat.source_id
	return `
		<a style="font-weight: ${is ? 'bold' : ''}" data-scroll="none" href="brief/${data.group?.group_id || ''}${addget(env.bread.get, {detail:is ? null : 'source', source_id:is ? null : stat.source_id, brand_nick: null})}">${stat.source_title}</a>
	`
}
const showGroupLink = (data, env, stat) => `
	<a data-scroll="none" href="brief/${stat.group_id || ''}${addget(env.bread.get, {})}">${stat.group_title}</a>
`

const redTd = (data, group, stat, name, filter_prop_nick, sum = stat.poscount - stat[name]) => {
	if (sum) {
		if (filter_prop_nick) {
			return `<td><a style="opacity:0.5" class="red" href="poss?source_id=${stat?.source_id || ''}&group_id=${group?.group_id || ''}&m=:${filter_prop_nick}=empty${stat.brand_nick?':brend='+stat.brand_nick:''}">${sum}</a></td>`
		} else {
			// const search = group?.group_id ? '/' + group?.group_id : ''
			// return `<td><a style="opacity:0.5" class="red" href="groups${search}">${sum}</a></td>`
			return `<td style="opacity:0.5" class="red">${sum}</td>`
		}
	} else {
		return `<td style="opacity:0.5" class="green">✓</td>`
	}
	
}