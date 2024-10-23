export const ROOT = (data, env) => `
	<div style="height:100%; display: grid; grid-template-rows: max-content 1fr max-content; gap: 1em;">
		<div style="display: grid; gap: 0.25em">
			<a href="settings">Настройки</a>
		</div>
		<div></div>
		<div>
			<button title="Загрузить всё, где есть изменения">Актуализировать всё</button>
		</div>
	</div>
`