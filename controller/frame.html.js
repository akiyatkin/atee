export const ROOT = (data, env) => `
	<div class="container" id="${env.layer.frameid}"></div>
`
export const MAX = (data, env) => `
	<div style="max-width: none" class="container" id="${env.layer.frameid}"></div>
`