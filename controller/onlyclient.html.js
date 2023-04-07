export const ROOT = (layer, env) => `
	<script type="module">
		import inViewport from "/-inactive/inViewport.js"
		inViewport(document.body, async () => {			
			const Client = await window.getClient()
			Client.show(${JSON.stringify(layer)})
		})
	</script>
`