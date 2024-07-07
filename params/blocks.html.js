const tpl = {}


tpl.ROOT = (data, env) => data.blocks.length ? `
	<style>
		${env.scope} .row {
			margin-bottom:2em;
			display: grid; 
			gap: 1em; 
			grid-template-columns: 1fr auto; 
			grid-template-areas: 'head img' 'body img'
		}
		${env.scope} img {
			margin-top:1.5em;
		}
		@media (max-width:768px) {
			${env.scope} img {
				margin-top:0;
			}
			${env.scope} .row {
				grid-template-columns: 1fr; 
				grid-template-areas: 'head' 'img' 'body'
			}
		}
	</style>
	<div style="margin-bottom:4em; margin-top:4em">
		<!-- <h2>${data.descr.Заголовок || 'Смотрите также'}</h2> -->
		${data.blocks.map(block => tpl.showBlock(data, env, block)).join('')}
	</div>
`: ''

tpl.showBlock = (data, env, block) => `
	<div class="row">	
		<div style="grid-area: head">
			<h3 style="margin:0"><a href="/${block.path}">${block.title}</a></h3>
		</div>
		<div style="grid-area: body">
			${block.description} <a href="/${block.path}">Подробнее...</a>
		</div>
		<div style="grid-area: img">
			<a href="/${block.path}"><img alt="" style="max-width: 100%; height: auto;" loading="lazy" width="300" height="200" src="/-imager/webp?w=300&h=200&fit=cover&src=${block.image_src}"></a>
		</div>
	</div>
`


export default tpl
