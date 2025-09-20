import field from "/-dialog/field.html.js"
export const ROOT = (data, env) => `
	<div style="height:100%; display: grid; grid-template-rows: max-content 1fr max-content; gap: 1em;">
		<div></div>
		<div>
			<div style="position: sticky; top:1em">
				<div style="display: grid; gap: 0.25em; margin-bottom: 1em">
					<div><a href="/@atee/sources">Источники</a></div>
					<div><a href="props">Свойства</a></div>
					<div><a href="disappear">Исчезли</a></div>
				</div>
				<div id="RECALC"></div>
			</div>
		</div>
		<div style="display: grid; gap: 0.25em">
			<div>${field.button({
				label:'Пересчитать',
				cls: 'mute a',
				action:'/-sources/set-recalc',
				global:'check'
			})}</div>
			<div>
				${field.button({
					cls: 'mute a',
					label:'Опубликовать',
					action:'/-sources/set-recalc-index',
					global: 'check'
				})}
			</div>
			<div><a href="memory">Память</a></div>
			<div><a href="settings">Настройки</a></div>
		</div>
	</div>
`