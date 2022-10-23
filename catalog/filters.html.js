import links from "/-catalog/links.html.js"

const filters = {}
export default filters
filters.ROOT = (data, env) => `
	${data.filters.map(filter => showFilter(data, filter, env)).join('')}
`
const showFilter = (data, filter, env) => `
	${(filters.props[filter.tpl] || filters.props.select)(data, filter, env)}
`


filters.item = (data, filter, v) => data.md.more?.[filter.prop_nick]?.[v.value_nick] ? `
		<a class="clearlink" title="Отменить выбор" style="display: inline-block; border-color: transparent; color:inherit;" class="a" data-scroll="none" rel="nofollow" href="/catalog${links.addm(data)}more.${filter.prop_nick}">
			<span class="value">${v.value_title}</span><sup style="position: absolute; font-size:12px" class="krest">&nbsp;✕</sup>
		</a>` : `
		<a title="Выбрать" style="opacity: ${v.mute ?'0.3':'1'}" class="a" data-scroll="none" rel="nofollow" href="/catalog${links.addm(data)}more.${filter.prop_nick}::.${v.value_nick}=1">${v.value_title}</a>`
filters.option = (data, filter, v) => data.md.more?.[filter.prop_nick]?.[v.value_nick] ? `
		<option value="${v.value_nick}" selected>${v.value_title}</option>
	` : `
		<option style="opacity: ${v.mute ?'0.3':'1'}" value="${v.value_nick}">${v.value_title}</option>
`
filters.block = (title, body) => `
	<div style="margin-bottom: 1rem;">
		<div style="font-weight: bold; padding-right: 0.5rem">${title}</div>
		<div>${body}</div>
	</div>
`
const getp = (data, filter) => {
	return data.md.more?.[filter.prop_nick] || {}
}
const sliderval = (data, filter) => {
	const p = getp(data, filter)
	return p.upto || p.from || ''
}
const changelink = (data, filter) => {
	const p = getp(data, filter)
	let val = sliderval(data, filter) || filter.max
	let direction = p.upto ? 'from' : 'upto'
	if (val) {
		if (val <= filter.min) {
			val = filter.max
			direction = 'upto'
		} else if (val >= filter.max) {
			direction = 'from'
			val = filter.min
		}
	}
	return `${links.addm(data)}more.${filter.prop_nick}::.${direction}=${val}`
}
const showkrest = (data, filter) => `
	<a class="clearlink" title="Отменить выбор" style="position: absolute; display: inline-block; border-color: transparent; color:inherit;" class="a" data-scroll="none" rel="nofollow" href="/catalog${links.addm(data)}more.${filter.prop_nick}">
		<sup style="font-size:12px" class="krest">&nbsp;✕</sup>
	</a>
`
filters.props = {
	slider: (data, filter, env) => `
		<div class="bodyslider" style="margin-bottom: 1rem;">
			<div style="display: flex; gap:5px; align-items: center">
				<div><b>${filter.prop_title}${filter.prop_nick == 'cena' ? ', ' + filter.opt.unit : ''}</b></div>
				<div>
					<a data-scroll="none" rel="nofollow"
						href="/catalog${changelink(data,filter)}" 
						style="width: 2ch; text-align:center" 
						class="a adirect">
						${data.md.more?.[filter.prop_nick]?.from ? 'от' : 'до'}
					</a>
					<input style="
							border-radius: 0; border:none; 
							border-bottom: 1px solid rgba(0,0,0,0.1); 
							width:${String(filter.max).length + 2}ch;
							padding:0 1ch;
					" class="valueplace" type="text" value="${sliderval(data, filter)}">
					<script>
						(input => {
							import('/-catalog/range.js').then(o => o.default).then(range => {
								const div = input.closest('.bodyslider')
								const inputrange = div.querySelector('input[type=range]')
								
								input.addEventListener('change', async () => {
									const { value_nick, direction, click } = range.getValue(input, ${filter.min}, ${filter.max}, ${data.md.more?.[filter.prop_nick]?.from ? '"from"' : '"upto"'}, ${sliderval(data, filter)})
									const set = value_nick ? '::.'+direction+'=' + value_nick : ''

									const Client = await window.getClient()
									Client.pushState('/catalog${links.addm(data)}more.${filter.prop_nick}' + set, false)
								})
								input.addEventListener('input', () => {
									inputrange.value = Number(input.value) || 0
								})	
							})
						})(document.currentScript.previousElementSibling)
					</script>
					${sliderval(data, filter)? showkrest(data, filter) : ''}
				</div>
			</div>
			<div class="slider">
				<style>
					#${env.layer.div} .slider {
						max-widtH: 300px;
						display: grid;
						grid-template-columns: max-content 1fr max-content;
						align-items: center;
						gap: 1ch;

					}
					#${env.layer.div} .slider input[type=range] {
						width: 100%;
						appearance: none;
						border: none;
						margin: 0;
						background-color: currentColor;
						height: 1px;
						padding: 0;
						margin-bottom: calc(1em - 1px);
					}

					#${env.layer.div} .slider input[type=range]::-webkit-slider-thumb {
						appearance: none;
						border: none;
						cursor: ew-resize;
						cursor: pointer;
						height: 1em;
						width: 0.5em;
						background-color: currentColor;
						background-color: var(--blue);
					}
					
					#${env.layer.div} .slider input[type=range]::-moz-range-thumb {
						border: none;
						cursor: ew-resize;
						height: 1em;
						width: 0.5em;
						background-color: currentColor;
						background-color: var(--blue);
					}
					#${env.layer.div} .slider input[type=range]::-ms-thumb {
						border: none;
						cursor: ew-resize;
						cursor: pointer;
						height: 1em;
						width: 0.5em;
						background-color: currentColor;
						background-color: var(--blue);
					}
				</style>
				<div style="grid-column: 1 / 2; grid-row: 1 / 1; opacity: 0.5; font-size:14px">${filter.min}</div>
				<div style="grid-column: 3 / 4; grid-row: 1 / 1; text-align: right; opacity: 0.5; font-size:14px">${filter.max}</div>
				<div style="grid-column: 2 / 3; grid-row: 1 / 1">
					<input type="range" step="${filter.step}" 
						value="${sliderval(data, filter)||filter.min}" max="${filter.max}" min="${filter.min}">
					<script>
						(input => {
							import('/-catalog/range.js').then(o => o.default).then(range => {
								input.addEventListener('click', async () => {									
									let { value_nick, direction, click } = range.getValue(input, ${filter.min}, ${filter.max}, ${data.md.more?.[filter.prop_nick]?.from ? '"from"' : '"upto"'}, ${sliderval(data, filter)})
									if (click) direction = direction == 'upto' ? 'from' : 'upto'
									//const set = value_nick ? '::.'+direction+'=' + value_nick : ''
									const set = '::.'+direction+'=' + value_nick
									const Client = await window.getClient()
			    					Client.pushState('/catalog${links.addm(data)}more.${filter.prop_nick}' + set, false)
								})
								input.addEventListener('change', input.click)
								const div = input.closest('.bodyslider')
								const value = div.getElementsByClassName('valueplace')[0]
								const direct = div.getElementsByClassName('adirect')[0]
								input.addEventListener('input', () => {
									const { value_nick, direction, click } = range.getValue(input, ${filter.min}, ${filter.max}, ${data.md.more?.[filter.prop_nick]?.from ? '"from"' : '"upto"'}, ${sliderval(data, filter)})
									direct.innerHTML = direction == 'upto' ? 'до' : 'от'
									value.value = value_nick
								})
							})
						})(document.currentScript.previousElementSibling)
					</script>
				</div>
			</div>
		</div>
	`,
	select: (data, filter, env) => `
		<div style="margin-bottom: 0.5rem">
			<select style="width: 100%">
				<option value="">${filter.prop_title}</option>
				${filter.values.map(v => filters.option(data, filter, v)).join('')}
			</select>
			<script>
				(select => {
					select.addEventListener('change', async () => {
						let n = select.options.selectedIndex
						let value_nick = select.options[n].value
						const Client = await window.getClient()
						const set = value_nick ? '::.'+value_nick+'=1' : ''
    					Client.pushState('/catalog${links.addm(data)}more.${filter.prop_nick}' + set)
					})
				})(document.currentScript.previousElementSibling)
			</script>
		</div>
	`,
	row: (data, filter, env) => filters.block(
		filter.prop_title, 
		`
			<span style="white-space:nowrap; margin-right:0.7em;">
				${filter.values.map(v => filters.item(data, filter, v)).join(',</span> <span style="white-space:nowrap; margin-right:0.7em">')}
			</span>
		`
	)
}
