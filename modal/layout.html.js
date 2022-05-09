export const start = () => `
<div>
	<style>
		/*Надо чтобы не моргал вставленный html в начале. Окно видимым на мгновение показывается в ff*/
		.popupmodal {
			opacity: 0;
			/*visibility: hidden;*/
			position: fixed;
		}
	</style>
	<section class="popupmodal" role="dialog" tabindex="-1">
		<div class="body">
			<div role="button" tabindex="0" aria-label="Закрыть" class="closemodal close">&times;</div>
`
export const end = () => `
		</div>
		<div style="user-select: none; font-size:0">&nbsp;<!-- 2/3 экрана --></div>
	</section>
	<script type="module">
		import { Modal } from "/-modal/Modal.js"
		Modal.init()
	</script>
</div>
`
