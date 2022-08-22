export const ROOT = () => `
	<link rel="stylesheet" href="/-dialog/style.css">
	<style>
		.popupmodal {
			opacity: 0;
			position: fixed;
		}
	</style>
	<section class="popupmodal" role="dialog" tabindex="-1">
		<div class="body">
			<div role="button" tabindex="0" aria-label="Закрыть" class="closemodal close">&times;</div>
			<div class="popupcontent"></div>
		</div>
		<div style="user-select: none; font-size:0">&nbsp;<!-- 2/3 экрана --></div>
	</section>
`
