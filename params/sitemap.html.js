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
    ${showBlock(data, env, data.heading)}
    <hr>
    <div style="display: grid; gap: 0.5em; margin-top:2em">
		${data.headings.map(group => group ? showGroup(data, env, group) : '').join('')}
	</div>
`
const showGroup = (data, env, group) => `
	<div><a href="${env.crumb}/${group.nick}">${group.title}</a></div>
`
//${data.headings.map(heading => showBlock(data, env, heading)).join('')}
export const GROUP = (data, env) => !data.result ? `<h1>${data.msg}</h1>` : `
	${css(data, env)}
	${showBlock(data, env, data.heading)}
`
const showLink = (href, item) => `
	<div class="grid">
		<div style="grid-area: title">
			<div>
				<a href="/${href}">${item.name || item.title}</a><br>
				${item.robots ? showRobots(href, item) : ''}
				<span style="font-size: 12px; color:green">/${href || ''}</span>
				<span style="font-size: 12px; color:brown">${item.key || ''}</span>
			</div>
		</div>
		<div style="grid-area: descr">
			${item.description ? showDescription(href, item) : ''}
			${item.keywords ? showKeywords(href, item) : ''}
			
		</div>

		<div style="grid-area: image;">
			${item.image_src ? showImage(href, item) : ''}
		</div>
	</div>
	

`
const showImage = (href, item) => `
	<a href="/${href}"><img alt="${item.name || item.title}" src="${item.image_src}"></a>
`
const showRobots = (href, item) => `
	<span style="color: red; font-size:12px; margin-top:1rem">
		${item.robots}
	</span>
`
const showKeywords = (href, item) => `
	<div style="font-style: italic; font-size:12px; margin-top:1rem">
		${item.keywords}
	</div>
`
const showDescription = (href, item) => `
	<div>${item.description}</div>
`
const showBlock = (data, env, heading) => `
	${heading.title ? showHeading(data, env, heading) : '<h1>Карта сайта</h1>'}
	${Object.entries(heading.items).map(([href, head]) => showLink(href, head)).join('')}
`
const showHeading = (data, env, heading) => `
	<div style="float:right; margin-left:1ch"><a href="${env.crumb.parent}">Карта сайта</a></div>
	<h2>${heading.title}</h2>
`