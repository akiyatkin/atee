export const ROOT = (data, env) => `
	<div style="height:100%; display: grid; grid-template-rows: max-content 1fr max-content; gap: 1em;">
		<div>
			
		</div>
		<div>
			<div style="position: sticky; top:1em">
				<div style="display: grid; gap: 0.25em; margin-bottom: 1em">
					<a href="/@atee/sources">Источники</a>
					<a href="props">Свойства</a>
					<a href="disappear">Исчезли</a>
				</div>
				<div id="RECALC"></div>
			</div>
		</div>
		<div style="display: grid; gap: 0.25em">
			<a href="memory">Память</a>
			<a href="settings">Настройки</a>
		</div>
	</div>
`