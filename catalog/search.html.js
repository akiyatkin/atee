import cards from "/-catalog/cards.html.js"

export const ROOT = (data, env, parent = data.path.at(-1)) => `
	<div style="float:right; margin-top:1rem">${data.type}</div>
	${data.path.length ? `
		<div style="float:left; margin-top:1rem">
			<a href="${env.crumb.parent}${parent.parent_id ? `/${parent.group_nick}` : ''}">${parent.group_title}</a>
		</div>
	` : ''}
	<h1 style="clear:both">
		${data.group.group_title || data.value}
	</h1>
	${data.childs.length ? `
		<div id="catgroups">
			${data.childs.map(group => `
				<div>
					<a href="${env.crumb.parent}/${group.group_nick}">${group.group_title}</a>
				</div>
			`).join('')}
		</div>
	` : ''}
	<div id="catlist">
		${data.list.length ? `
			<div style="margin-top:1rem">
				${cards.LIST(data, env)}
			</div>
		` : ''}
	</div>
`
