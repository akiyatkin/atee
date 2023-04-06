export const ROOT = (layer, env) => `
	<script type="module">
		import inViewport from "/-inactive/inViewport.js"
		//const div = document.getElementById('${env.layer.div}')
		inViewport(document.body, async () => {			
			const Bread = await import('/-controller/Bread.js').then(r => r.default)
			const Client = await window.getClient()
			const bread = new Bread('${env.bread.path}', ${JSON.stringify(env.bread.get)}, '${env.bread.href}', '${env.bread.root}')
			Client.show({theme: ${JSON.stringify(env.theme)}, layers:[${JSON.stringify(layer)}]}, bread)
		})
	</script>
`