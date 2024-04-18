export const ROOT = (data, env) => `
	<style>
		${env.scope} img {
			max-width: 100%;
			height:auto;
		}
		${env.scope} .grid {
			display: grid; gap: 1em; grid-template-columns: 1fr 200px;
			grid-template-rows: auto 1fr;
			grid-template-areas: "title image" "descr image";
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
    <h1>Карта сайта</h1>   
	${data.headings.map(heading => showBlock(data, env, heading)).join('')}
`
const showLink = (item, next) => `
	<div class="grid">
		<div style="grid-area: title">
			<div><a href="${item.href || '/'}">${item.name || item.title || next}</a></div>
		</div>
		<div style="grid-area: descr">
			<div>${item.description ? showDescription(item, next) : ''}</div>
			<div style="margin-top:1rem; font-style: italic; font-size:12px">${item.keywords ? showKeywords(item, next) : ''}</div>
		</div>
		<div style="grid-area: image;">
			${item.image_src ? showImage(item, next) : ''}
		</div>
	</div>
	

`
const showImage = (item, next) => `
	<a href="${item.href || '/'}"><img alt="${item.name || item.title || next}" src="${item.image_src}"></a>
`
const showKeywords = (item, next) => `
	${item.keywords}
`
const showDescription = (item, next) => `
	${item.description}
`
const showBlock = (data, env, heading) => `
	${heading.title ? showHeading(data, env, heading) : ''}
	${Object.keys(heading.childs).map(next => 
		showLink({
			...heading.childs[next], 
			href:heading.href ? (heading.href  + '/' + next) : next
		}, next)
	).join('')}	
`
const showHeading = (data, env, heading) => `
	<h2>${heading.title}</h2>
`