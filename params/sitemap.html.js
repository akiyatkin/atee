import print from "/-words/print.html.js"
const css = (data, env) => `
	<style>
		${env.scope} {
			margin-bottom: 4em;
		}
		${env.scope} img {
			max-width: 100%;
			height:auto;
		}
		${env.scope} .grid {
			display: grid; gap: 1em; grid-template-columns: 1fr 200px;
			grid-template-rows: auto 1fr;
			grid-template-areas: "title image" "descr image";
			margin-top:1rem; margin-bottom:1rem; 
		}
		@media (max-width: 600px) {
			${env.scope} .grid {
				grid-template-columns: 1fr 100px;
				grid-template-areas: "title title" "descr image";
			}
		}
		@media (max-width: 400px) {
			${env.scope} .grid {
				grid-template-columns: 1fr 100px;
				grid-template-areas: "title title" "descr image";
			}
		}
	</style>
`
export const ROOT = (data, env) => `
	${css(data, env)}
    ${showBlock(data, env, data)}
	${data.headings.map(group => showGroup(data, env, group)).join('')}
`
const showGroup = (data, env, group) => `
	<div><a href="${env.crumb}/${group.nick}">${group.title}</a></div>
`
//${data.headings.map(heading => showBlock(data, env, heading)).join('')}
export const GROUP = (data, env) => `
	${css(data, env)}
	${showBlock(data, env, data)}
`
const showLink = (item, next) => `
	<div class="grid">
		<div style="grid-area: title">
			<div>
				<a href="/${item.href || ''}">${item.name || item.title || next}</a><br>
				<span style="font-size: 12px; color:green">/${item.href || ''}</span>
				<span style="font-size: 12px; color:brown">${item.key || ''}</span>
				
			</div>
		</div>
		<div style="grid-area: descr">
			${item.description ? showDescription(item, next) : ''}
			${item.keywords ? showKeywords(item, next) : ''}
		</div>

		<div style="grid-area: image;">
			${item.image_src ? showImage(item, next) : ''}
		</div>
	</div>
	

`
const showImage = (item, next) => `
	<a href="/${item.href || ''}"><img alt="${item.name || item.title || next}" src="${item.image_src}"></a>
`
const showKeywords = (item, next) => `
	<div style="font-style: italic; font-size:12px; margin-top:1rem">
		${item.keywords}
	</div>
`
const showDescription = (item, next) => `
	<div>${item.description}</div>
`
const showBlock = (data, env, heading) => `
	${heading.title ? showHeading(data, env, heading) : '<h1>Карта сайта</h1>'}
	${Object.keys(heading.childs).map(next => 
		showLink({
			...heading.childs[next], 
			href: heading.childs[next].href ? (heading.childs[next].href  + '/' + next) : (heading.href ? heading.href  + '/' + next : next)
		}, next)
	).join('')}
`
//href: heading.href ? heading.href  + '/' + next : next
//href: 
const showHeading = (data, env, heading) => `
	<div style="float:right; margin-left:1ch"><a href="${env.crumb.parent}">Карта сайта</a></div>
	<h2>${heading.title}</h2>

`