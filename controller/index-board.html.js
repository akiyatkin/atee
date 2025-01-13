import controller from "/-controller/layout.html.js"
import sitemap from "/-sitemap/layout.html.js"
export const ROOT = (data, env) => `<!DOCTYPE html>
<html>
	<head>
		${sitemap.HEAD(data, env)}
		${controller.HEAD(data, env)}
		<link rel="icon" type="image/x-icon" href="/favicon.ico">
		<link rel="stylesheet" href="/-notreset/style.css">
		<link rel="stylesheet" href="/-notreset/table.css">
		<link rel="stylesheet" href="/-float-label/style.css">
		<link rel="stylesheet" href="/style.css">
		<base href="/${env.bread.root}/">
		<style>
			:root {
				--padding: 2rem;
				interpolate-size: allow-keywords;
			}
			@media (max-width: 575px) {
				:root {
					--padding: 1rem;
				}
			}
			@media (max-width: 475px) {
				:root {
					--page-padding: 0rem;
				}
				
			}
			html {
				background: linear-gradient(-30deg, #00aaff55, #4466ff22);
				background-size: 100% 100%;
				
			}
		</style>
	</head>
	<body style="margin:0;">
		<style>
			.maingrid {
				display: grid; gap: var(--padding); grid-template-columns: auto 1fr;
			}
			.maingrid .column {
				padding:1em; 
				
			}
			.maingrid .column a {
				-webkit-user-drag: none;
				user-drag: none;
			}
			.column {
/*				border-radius: 5px;*/
				min-width: 20ch;
				background: #00aaff11;
				background-size: 100% 100%;
				border: solid 1px #00000044;
				display: grid;
				grid-template-rows: max-content 1fr;
			}
			.column .bars {
				display: none;
			}
			.maincontainer {
				grid-template-columns: 100%; padding-top: var(--padding); min-height:100vh; display:grid; 
				grid-template-rows: 1fr max-content;
			}
			footer {
				padding-left:1em;
				padding-right:1em;
			}
			@media (max-width: 768px) {
				
				.maingrid {
					user-select: none;
					display: block;
				}
				.maingrid .column {
					margin-bottom:var(--padding);
					overflow: hidden;
					box-sizing: content-box;
					transition: height 0.2s;
					display: block;
				}
				.maingrid .column.hide {
					cursor: pointer;
					height: 1.4em;
				}
				.maingrid .column {
					height: calc-size(auto);
				}
				.column .bars {
					display: block;
				}
				.column .bars svg path {
					transition: d 0.1s;
				}
				.column .bars svg path.one {
					d: path("M0 0L24 24")
					
				}
				.column .bars svg path.two {
					d: path("M0 24L24 0")
					
				}
				.column.hide .bars svg path.one {
					d: path("M0 8L24 8")
				}
				.column.hide .bars svg path.two {
					d: path("M0 16L24 16")
				}
				footer {
					padding-left:var(--padding);
					padding-right:var(--padding);
				}
			}
			@media (max-width: 475px) {
				.maincontainer {
					padding-top:0;
				}
				.maingrid .column {
					border:none;
					margin-bottom:0;
				}
				
			}
			
		</style>
		<div class="maincontainer">
			<div class="maingrid">
				<div class="column hide">
					<div style="margin-bottom:1em; display: flex; gap:2em; align-items: center;">
						<a style="font-weight: bold; text-transform: uppercase;" href="${env.crumb}">${env.bread.root.split('/')[1]}</a> 
						<button class="bars transparent" style="font-size:0">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<rect width="24" height="24"/>
							<path class="one" stroke="#000000" stroke-linecap="round" stroke-linejoin="round"/>
							<path class="two" stroke="#000000" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
						</button>
					</div>
					<aside id="ASIDE"></aside>
				</div>
				<script>
					(column => {
						const bars = column.querySelector('.bars')
						const hide = () => column.classList.add('hide')
						const show = () => column.classList.remove('hide')
						bars.addEventListener('click', () => {
							const ishide = column.classList.contains('hide')
							if (ishide) show()
							else hide()
						})
						column.addEventListener('click', e => {
							if (e.target.closest('.bars')) return
							if (e.target.closest('a')) hide()
							//else show()
						})
					})(document.currentScript.previousElementSibling)
				</script>
				<main id="MAIN" style="
					container-type: inline-size;
  					container-name: main;
					overflow: auto;
					background-color: white; 
					padding:var(--padding); 
				
				"></main>

			</div>
			<footer style="
				padding-top:1em;
				padding-bottom:1em;
				margin-top: 2em;
				border-top: solid 1px #00000044;
				
				display: flex; flex-wrap: wrap; gap:0.5rem">

				<div style="flex-grow:1; display: flex; width:100%; gap:2em; align-items: center;">
					
					<a href="//${env.host}">${env.host}</a>
					<a href="/@atee/controller">Вход</a>
				</div>
			</footer>
		</div>
	</body>	
</html>
`

