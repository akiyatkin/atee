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
		<a class="clearlink" title="Отменить выбор" style="display: inline-block; border-color: transparent; color:inherit;" class="a" data-scroll="none" rel="nofollow" href="/catalog/${links.addm(data)}more.${filter.prop_nick}">
			<span class="value">${v.value_title}</span><sup style="position: absolute; font-size:12px" class="krest">&nbsp;✕</sup>
		</a>` : `
		<a title="Выбрать" style="opacity: ${v.mute ?'0.3':'1'}" class="a" data-scroll="none" rel="nofollow" href="/catalog/${links.addm(data)}more.${filter.prop_nick}::.${v.value_nick}=1">${v.value_title}</a>`
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
filters.props = {
	slider: (data, filter, env) => `
		<style>

			

		</style>
		<div style="margin-bottom: 1rem;">
			<div style="display: flex; gap:5px">
				<div><b>Цена, руб.</b></div>
				<div>
					<a class="clearlink" title="Отменить выбор" style="display: inline-block; border-color: transparent; color:inherit;" class="a" 
						data-scroll="none" rel="nofollow" href="/">
						<span class="value">до 1200</span><sup style="position: absolute; font-size:12px" class="krest">&nbsp;✕</sup>
					</a>
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
					#${env.layer.div} .slider input {
						width: 100%;
						appearance: none;
						border: none;
						margin: 0;
						/*background-color: var(--orange);*/
						background-color: currentColor;
						height: 1px;
						padding: 0;
						margin-bottom: calc(1em - 1px);
					}

					#${env.layer.div} .slider input:active {
						color: red;
						z-index: 2;
					}
					#${env.layer.div} input[type=range]::-webkit-slider-thumb {
						-webkit-appearance: none;
						border: none;
						cursor: pointer;
						height: 1em;
						width: 1em;
						border-radius: 50%;
						/*background: var(--orange);*/
						background-color: currentColor;
						background-color: var(--blue);
					}

					#${env.layer.div} input[type=range]::-moz-range-thumb {
						border: none;
						cursor: pointer;
						height: 1em;
						width: 1em;
						border-radius: 50%;
						/*background: var(--orange);*/
						background-color: currentColor;
						background-color: var(--blue);
					}
					#${env.layer.div} input[type=range]::-ms-thumb {
						border: none;
						cursor: pointer;
						height: 1em;
						width: 1em;
						border-radius: 50%;
						/*background: var(--orange);*/
						background-color: currentColor;
						background-color: var(--blue);
					}
				</style>
				<div style="grid-column: 1 / 2; grid-row: 1 / 1">100</div>
				<div style="grid-column: 3 / 4; grid-row: 1 / 1; text-align: right">250 000</div>
				<div style="grid-column: 2 / 3; grid-row: 1 / 1">
					<input type="range">
					<script>
						(input => {
							input.addEventListener('click', async (e) => {
								const value_nick = input.value
								const Client = await window.getClient()
								const set = value_nick ? '::.cena=upto'+value_nick : ''
		    					Client.pushState('/catalog/${links.addm(data)}more.${filter.prop_nick}' + set)
							})
							input.addEventListener('change', input.click)
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
    					Client.pushState('/catalog/${links.addm(data)}more.${filter.prop_nick}' + set)
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
