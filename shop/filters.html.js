import cards from "/-shop/cards.html.js"

const frame = (prefix, val, postfix = '') => val ? prefix + val + postfix : ''




const filters = {}
export default filters
filters.ROOT = (data, env) => !data.result ? '': `
	<style>
		${env.scope} a.clearlink {
			white-space: normal; 
			gap:5px; 
			display: inline-flex; 
			align-items: flex-start; color: inherit; 
			border: none; 
			text-decoration: none
		}
		${env.scope} .clearlink .title {
			opacity: 1;
			transition: color 0.2s, opacity 0.2s;
		}
		${env.scope} .clearlink .krest {
			transition: color 0.2s, opacity 0.2s;
			opacity: 0.6;
		}
		${env.scope} .clearlink:hover .title {
			opacity: 0.5;
		}
		${env.scope} .clearlink:hover .krest {
			opacity: 1;
			/*color: red;*/
		}
	</style>
	${data.filters.map(filter => showFilter(data, filter, env)).join('')}
`
const showFilter = (data, filter, env) => `
	${(filters.prop[filter.tpl] || filters.prop.default)(data, filter, env)}
`





filters.just = (body, descr) => `
	<div style="margin-bottom: 1em; clear:both">
		${frame('<div>', descr, '</div>')}
		${body}
	</div>
`
filters.line = (title, body, descr) => `
	<div style="margin-bottom: 1em; clear:both">
		<span style="font-weight: bold; padding-right: 0.7em">${title}:</span>
		${frame('<div>', descr, '</div>')}
		${body}
	</div>
`
filters.block = (title, body, descr) => `
	<div style="margin-bottom: 1em; clear:both">
		<div style="font-weight: bold; padding-right: 0.7em">${title}</div>
		${frame('<div>', descr, '</div>')}
		<div>${body}</div>
	</div>
`



const fromORupto = (data, filter) => {
	const p = data.md.mget[filter.prop_nick] || {}
	return p['upto'] || p['from'] || ''
}
const changelink = (data, env, filter) => {
	const p = data.md.mget[filter.prop_nick] || {}

	let val = fromORupto(data, filter) || filter.max
	let direction = (!p['upto'] && !p['from']) ? 'upto' : (p['upto'] ? 'from' : 'upto')

	if (val && filter.min != filter.max) {
		if (val <= filter.min) {
			val = filter.max
			direction = 'upto'
		} else if (val >= filter.max) {
			direction = 'from'
			val = filter.min
		}
	}
	return `${cards.getGroupPath(data, data.group.group_nick)}${cards.addget(env.bread.get, {m:data.md.m + ':' + filter.prop_nick + '::.' + direction + '=' + val})}`
}
const showkrest = (data, env, filter) => `
	<a class="clearlink" title="Отменить выбор" style="
		position: absolute; margin-top: 1px;
		display: inline-block; border-color: 
		transparent; color:inherit;" class="a" data-scroll="none" rel="nofollow" href="${cards.getGroupPath(data, data.group.group_nick)}${cards.addget(env.bread.get, {m:data.md.m + ':' + filter.prop_nick})}">
		<span class="krest">&nbsp;✕</span>
	</a>
`
const showDescr = (filter) => `
	<div>${filter.descr}</div>
`

//${showHaveMore(data, env, filter, '…')}
filters.prop = {
	slider: (data, filter, env) => `
		<div class="bodyslider" style="margin-bottom: 1rem;">
			<style>
				${env.scope} .slider {
					--thumb-active-color: var(--primary, black);
					--thumb-static-color: var(--link-color, gray);
				}
			</style>
			<div style="display: flex; gap:5px; align-items: end; margin-right:1rem">
				<div>
					<b>${cards.propTitle(data.props[filter.prop_nick])}</b>
				</div>
				<div style="flex-grow:1; white-space: nowrap">
					<a data-scroll="none" rel="nofollow"
						href="${changelink(data, env, filter)}" 
						style="width: 2ch; text-align:center" 
						class="a adirect">${data.md.mget[filter.prop_nick]?.from ? 'от' : 'до'}</a>
					<input style="
						border-radius: 0; border:none; 
						border: 1px solid rgba(0,0,0,0.1);
						margin-left: 4px;
						border-radius: var(--radius);
						min-width: 6ch;
						width: ${String(filter.max).length + 4}ch;
						padding:0 1ch;
					" class="valueplace" step="${filter.step}" type="number" value="${fromORupto(data, filter) ? fromORupto(data, filter) / 10 ** filter.scale: ''}">
					<script>
						(input => {
							import('/-shop/range.js').then(o => o.default).then(range => {
								const getValue = () => range.getValue(input, ${filter.min}, ${filter.max}, ${data.md.mget?.[filter.prop_nick]?.from ? '"from"' : '"upto"'}, ${fromORupto(data, filter) || false}, ${filter.scale})
								const div = input.closest('.bodyslider')
								const inputrange = div.querySelector('input[type=range]')
								input.addEventListener('change', async () => {
									const { value_nick, direction, click } = getValue()
									const set = value_nick ? '::.'+direction+'=' + value_nick : ''
									const Client = await window.getClient()
									//const addget = await import('/-sources/addget.js').then(r => r.default)
									const cards = await import('/-shop/cards.html.js').then(r => r.default)
									Client.go('${cards.getGroupPath(data, data.group.group_nick)}' + cards.addget(Client.bread.get, {m:"${data.md.m}" + ':${filter.prop_nick}' + set }), false)
								})
								input.addEventListener('input', () => {
									console.log('input')
									inputrange.value = Number(input.value) || 0
								})	
							})
						})(document.currentScript.previousElementSibling)
					</script>
					${fromORupto(data, filter)? showkrest(data, env, filter) : ''}
				</div>
			</div>
			${frame('<div>', filter.descr, '</div>')}
			<div class="slider">
				<style>
					${env.scope} .slider {
						max-widtH: 300px;
						display: grid;
						grid-template-columns: max-content 1fr max-content;
						align-items: center;
						gap: 1ch;

					}
					${env.scope} .slider input[type=range] {
						width: 100%;
						appearance: none;
						border: none;
						margin: 0;
						background-color: rgba(0,0,0,0.1);
						height: 1px;
						margin-top: 1em;
						padding: 0;
						margin-bottom: calc(1em - 1px);
					}

					${env.scope} .slider input[type=range]::-webkit-slider-thumb {
						appearance: none;
						border: none;
						cursor: ew-resize;
						cursor: pointer;
						height: 1.3em;
						width: 0.6em;
						border-radius: var(--radius);
						background-color: currentColor;
						background-color: var(--thumb-static-color, gray);
						transition: background-color 0.3s;
					}
					
					
					${env.scope} .slider input[type=range]::-moz-range-thumb {
						border: none;
						border: none;
						cursor: ew-resize;
						cursor: pointer;
						height: 1.3em;
						width: 0.6em;
						border-radius: var(--radius);
						background-color: currentColor;
						background-color: var(--thumb-static-color, gray);
						transition: background-color 0.3s;
					}

					${env.scope} .slider input[type=range]::-webkit-slider-thumb:hover,
					${env.scope} .slider input[type=range]::-webkit-slider-thumb:active {
						background-color: var(--thumb-active-color);
					}
					/*${env.scope} .slider input[type=range]::-ms-thumb {
						border: none;
						cursor: ew-resize;
						cursor: pointer;
						height: 1em;
						width: 0.5em;
						background-color: currentColor;
						background-color: var(--thumb-static-color);
					}*/
				</style>
				<div style="grid-column: 1 / 2; grid-row: 1 / 1; opacity: 0.5;">${filter.min / 10 ** filter.scale}</div>
				<div style="grid-column: 3 / 4; grid-row: 1 / 1; text-align: right; opacity: 0.5;">${filter.max / 10 ** filter.scale}</div>
				<div style="grid-column: 2 / 3; grid-row: 1 / 1">
					<input type="range" step="${filter.step / 10 ** filter.scale}" 
						value="${(fromORupto(data, filter)||filter.min) / 10 ** filter.scale}" max="${filter.max / 10 ** filter.scale}" min="${filter.min / 10 ** filter.scale}">
					<script>
						(input => {
							import('/-shop/range.js').then(o => o.default).then(range => {
								const getValue = () => range.getValue(input, ${filter.min}, ${filter.max}, ${data.md.mget?.[filter.prop_nick]?.from ? '"from"' : '"upto"'}, ${fromORupto(data, filter) || false}, ${filter.scale})
								input.addEventListener('click', async () => {									
									let { value_nick, direction, click } = getValue()
									if (click) direction = direction == 'upto' ? 'from' : 'upto'
									//const set = value_nick ? '::.'+direction+'=' + value_nick : ''
									const set = '::.'+direction+'=' + value_nick
									const Client = await window.getClient()
									//const addget = await import('/-sources/addget.js').then(r => r.default)
									const cards = await import('/-shop/cards.html.js').then(r => r.default)
									Client.pushState('${cards.getGroupPath(data, data.group.group_nick)}' + cards.addget(Client.bread.get, {m:"${data.md.m}" + ':${filter.prop_nick}' + set }), false)
								})
								input.addEventListener('change', input.click)
								const div = input.closest('.bodyslider')
								const value = div.getElementsByClassName('valueplace')[0]
								const direct = div.getElementsByClassName('adirect')[0]
								input.addEventListener('input', () => {
									const { value_nick, direction, click } = getValue()
									direct.innerHTML = direction == 'upto' ? 'до' : 'от'
									value.value = value_nick / 10 ** ${filter.scale}
								})
							})
						})(document.currentScript.previousElementSibling)
					</script>
				</div>
			</div>
		</div>
	`,
	default: (data, filter, env) => filters.prop.line(data, filter, env),
	select: (data, filter, env) => filters.just(`
		<select style="width: 100%">
			<option value="">${data.props[filter.prop_nick].prop_title}</option>
			${filter.values.map(value_nick => filters.option(data, filter, value_nick)).join('')}
		</select>
		<script>
			(select => {
				select.addEventListener('change', async () => {
					let n = select.options.selectedIndex
					let value_nick = select.options[n].value
					const Client = await window.getClient()
					const set = value_nick ? '::.'+value_nick+'=1' : ''
					//const addget = await import('/-sources/addget.js').then(r => r.default)
					const cards = await import('/-shop/cards.html.js').then(r => r.default)
					const get = new URLSearchParams(window.location.search)
					Client.pushState('${cards.getGroupPath(data, data.group.group_nick)}' + cards.addget(Client.bread.get, {m:get.get('m') + ':${filter.prop_nick}' + set }), false)
				})
			})(document.currentScript.previousElementSibling)
		</script>
	`, filter.descr),
	block: (data, filter, env) => filters.block(
		cards.propTitle(data.props[filter.prop_nick]), 
		`
			<span style="white-space:nowrap; margin-right:0.7em">${
				filter.values.map(value_nick => filters.item(data, env, filter, value_nick)).join(',</span> <span style="white-space:nowrap; margin-right:0.7em">')
			}</span>
		`, filter.descr
	),
	line: (data, filter, env) => filters.line(
		cards.propTitle(data.props[filter.prop_nick]), 
		`
			<span style="white-space:nowrap; margin-right:0.7em">${
				filter.values.map(value_nick => filters.item(data, env, filter, value_nick)).join(',</span> <span style="white-space:nowrap; margin-right:0.7em">')
			}</span>${filter.havemore ? showHaveMore(data, env, filter) : ''}
		`, filter.descr
	),
	just: (data, filter, env) => filters.just(`
		<span style="white-space:nowrap; margin-right:0.7em">${
			filter.values.map(value_nick => filters.item(data, env, filter, value_nick)).join(',</span> <span style="white-space:nowrap; margin-right:0.7em">')
		}</span>
	`, filter.descr)
}
const showHaveMore = (data, env, filter, title = 'выбрать…') => `<span style="white-space:nowrap; margin-left:0.7em; float:right">
	<span><button class="a mute">${title}</button><script>
		(btn => {
			btn.addEventListener('click', async () => {
				const Search = await import('/-dialog/search/Search.js').then(r => r.default)
				Search.open({
					heading: "${data.props[filter.prop_nick].name}${data.props[filter.prop_nick].unit?',&nbsp' + data.props[filter.prop_nick].unit:''}", 
					action:'/-shop/get-filter-prop-more-search?prop_nick=${filter.prop_nick}&group_nick=${data.group.group_nick}',
					placeholder:'Найти...',
					click: async (row, need) => {
						const cards = await import('/-shop/cards.html.js').then(r => r.default)
						const Client = await window.getClient()
						let src = '${cards.getGroupPath(data, data.group.group_nick)}'
						if (row.spec) {
							src += cards.addget(Client.bread.get, {m:"${data.md.m}" + ':${filter.prop_nick}=' + row.spec })
						} else {
							src += cards.addget(Client.bread.get, {m:"${data.md.m}" + ':${filter.prop_nick}${filter.singlechoice ? "::." : "."}' + row.nick+'=1' })
						}
						Client.go(src, false)
						return true
					}
				})
			})
		})(document.currentScript.previousElementSibling)
	</script></span>
</span>`
filters.option = (data, filter, value_nick) => `
		<option 
			style="opacity: ${~filter.remains.indexOf(value_nick) ? '1':'0.3'}" 
			${data.md.mget[filter.prop_nick]?.[value_nick] ? 'selected' : ''} 
			value="${value_nick}">
				${data.props[filter.prop_nick].type == 'value' ? cards.getValueTitleByNick(data, value_nick) : value_nick}
		</option>
`
filters.item = (data, env, filter, value_nick) => {
	if (data.md.mget[filter.prop_nick]?.[value_nick]) {
		return filters.itemChoiced(data, env, filter, value_nick)
	} else {
		return filters.itemChoice(data, env, filter, value_nick)
	}
}

filters.itemChoiced = (data, env, filter, value_nick) => `<a class="clearlink"
	style="display: inline-block; margin-top:0; border-color: transparent; color:inherit;" 
	class="a" data-scroll="none" rel="nofollow" 
	href="${cards.getGroupPath(data, data.group.group_nick)}${cards.addget(env.bread.get, {m:data.md.m + ':' + filter.prop_nick + '.' + value_nick})}">
	<span class="value">${data.props[filter.prop_nick].type == 'value' ? cards.getValueTitleByNick(data, value_nick) : value_nick  / 10 ** filter.scale}</span><sup style="position: absolute; margin-left:-2px; margin-top:-2px" class="krest">&nbsp;✕</sup></a>`

filters.itemChoice = (data, env, filter, value_nick) => `<a
	style="display: inline-block; " 
	class="a" data-scroll="none" rel="nofollow" 
	href="${cards.getGroupPath(data, data.group.group_nick)}${cards.addget(env.bread.get, {m:data.md.m + ':' + filter.prop_nick + (filter.singlechoice ? '::.' : '.') + value_nick + '=1'})}"
	>${data.props[filter.prop_nick].type == 'value' ? cards.getValueTitleByNick(data, value_nick) : value_nick  / 10 ** filter.scale}</a>`
//opacity: ${~filter.remains.indexOf(value_nick) ? '1' : '0.3'}


