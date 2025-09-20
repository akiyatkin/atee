import field from "/-dialog/field.html.js"
export const ROOT = (data, env) => `
	<div style="height:100%; display: grid; grid-template-rows: max-content 1fr max-content; gap: 1em;">
		<div></div>
		<div>
			<div style="position: sticky; top:1em">
				<div style="display: grid; gap: 0.25em; margin-bottom: 1em">
					<div><a href="groups">Группы</a></div>
					<div><a href="props">Свойства</a></div>
				</div>
				<div id="RECALC"></div>
			</div>
		</div>
		<div style="display: grid; gap: 0.25em">
			<div>${field.button({
				label:'Пересчитать статистику',
				cls: 'mute a',
				action:'/-shop/admin/set-recalc',
				global:'check'
			})}</div>
			<div>${field.button({
				label:'Опубликовать группы',
				cls: 'mute a',
				action:'/-shop/admin/set-recalc-index',
				global:'check'
			})}</div>
			<div><a href="/@atee/sources">Источники</a></div>
			<div><a href="settings">Настройки</a></div>
		</div>
	</div>
`