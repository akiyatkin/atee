import links from "/-catalog/links.html.js"
export const ROOT = (data, env) => `
	${data.filters.map(filter => showFilter(data, filter, env)).join('')}
`
const filters = {}
const showFilter = (data, filter, env) => `
	${(filters.props[filter.tplfilter] || filters.props.default)(data, filter, env)}
`


filters.item = (data, filter, v) => data.md.more?.[filter.prop_nick]?.[v.value_nick] ? `
	<b>${v.value_title}</b>
` : `
	<a data-scroll="none" rel="nofollow" href="/catalog/${links.addm(data)}more.${filter.prop_nick}::.${v.value_nick}=1">${v.value_title}</a>
`
filters.props = {
	default: (data, filter, env) => `
		<div style="margin: 0.25rem 0; display: grid">
			<div style="padding-right: 0.5rem"><b>${filter.prop_title}</b></div>
			<div>${filter.values.map(v => filters.item(data, filter, v)).join(', ')}</div>
		</div>
	`,
	select: (data, filter, env) => `
		<div style="margin: 0.25rem 0; display: grid">
			<div style="padding-right: 0.5rem"><b>${filter.prop_title}</b></div>
			<div>${filter.values.map(v => filters.item(data, filter, v)).join(', ')}</div>
		</div>
	`,
	row: (data, filter, env) => `
		<div style="margin: 0.25rem 0; display: grid">
			<div style="padding-right: 0.5rem"><b>${filter.prop_title}</b></div>
			<div>${filter.values.map(v => filters.item(data, filter, v)).join(', ')}</div>
		</div>
	`
}
