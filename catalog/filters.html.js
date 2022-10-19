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
	<div style="margin: 0.25rem 0; display: grid">
		<div style="font-weight: bold; padding-right: 0.5rem">${title}</div>
		<div>${body}</div>
	</div>
`
filters.props = {
	slider: (data, filter, env) => `
		<style>

			#${env.layer.div} .slider input {
				/*position: relative;
				color: #9a905d;
				z-index: 1;*/
				/*pointer-events: none;*/
				appearance: none;
				border: none;
				margin: 0;
				margin-top: 0.5em;
				background-color: var(--orange);
				height: 1px;
				padding: 0;
			}

			#${env.layer.div} .slider input:active {
				color: red;
				z-index: 2;
			}
			/*#${env.layer.div} input[type='range'],
			#${env.layer.div} input[type='range']::-webkit-slider-runnable-track,
			#${env.layer.div} input[type='range']::-webkit-slider-thumb {
			  -webkit-appearance: none;
			}*/
			
			/*#${env.layer.div} input::-webkit-slider-thumb {
				height: 20px;
				width: 20px;
				border-radius: 20px;
				background-color: red;
				cursor: pointer;
				border: none;
			}*/
			#${env.layer.div} input::-webkit-slider-runnable-track {
				/*pointer-events: none;*/
			}

		</style>
		<div style="margin-bottom: 0.5rem;">
			<div style="display: flex; gap:5px">
				<div>Цена, руб. <a class="a">от</a></div>
				<div>
					<a class="clearlink" title="Отменить выбор" style="display: inline-block; border-color: transparent; color:inherit;" class="a" data-scroll="none" rel="nofollow" href="/">
						<span class="value">1200</span><sup style="position: absolute; font-size:12px" class="krest">&nbsp;✕</sup>
					</a>
				</div>
			</div>
			<div class="slider"><input type="range"></div>
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
					console.log(select)
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
