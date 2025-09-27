import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import words from "/-words/words.js"
import date from "/-words/date.html.js"

export const ROOT = (data, env) => err(data, env) || `
	<h1>Настройки</h1>
	<div style="display: grid; gap: 1em; margin: 2em 0">
		<div>
			<p>
				${field.button({
					confirm: 'Пересчитать?',
					label:'Пересчитать связи',
					action:'/-shop/admin/set-recalc',
					global: 'check'
				})}
				${field.button({
					confirm: 'Опубликовать?',
					label:'Пересчитать и опубликовать',
					action:'/-shop/admin/set-recalc-publicate',
					global: 'check'
				})}
			</p>
			<p>
				Настройки типов, разделение по запятым, связи свойств с колонками, видимость &mdash; точечно пересчитываются при разных действиях. 
				Можно пересчитать сразу всё, на случай если после какого-то действия остался непересчитанный артефакт.
			</p>
		</div>
		<div>
			<p>
				Кэш сохраняется с <b>${date.dmyhi(data.date_access)}</b>
			</p>
			<p>
				${field.button({
					confirm: 'Сбросить кэш?',
					label:'Сбросить кэш',
					action:'/-controller/set-access',
					reloaddiv: env.layer.div
				})}
			</p>
			<p>
				Обычно требуется сбросить кэш, когда изменились данные в папке data по FTP или SSH.
				
				Для скриптов есть механизм сброса кэша <code>Access.relate, Access.poke, Access.wait</code>. Если данные меняются, через интерфейс, то сброс проихоит автоматически. 
				Вручную надо сбрасывать, если данные изменились вручную или произошёл сбой.
			</p>
		</div>
		<div>
			<p>
				Сервер запущен <b>${date.dmyhi(data.date_update)}</b>
			</p>
			<p>
				${field.button({
					confirm: 'Сайт несколько секунд не будет работать. Перезапустить?',
					label:'Перезапустить сервер',
					action:'/-controller/set-update',
					reloaddiv: env.layer.div
				})}
			</p>
			<p>
				Обычно требуется перезапустить сервер если поменялся исходный код или конфиги скриптов.
				Перезапуск это самый грубый способ сбросить кэш. Новый код <a href="/@atee/sources">источников</a> требует перезапуск сервера. Разработчик перезапускает сервер с помщью <code>touch ~/reload</code> после <code>git pull</code>.
			</p>
		</div>
		<div>
			<p>
				Экспорт / Импорт
			</p>
			<p>
				${field.button({
					label:'Экспорт',
					action:'/-shop/admin/get-export'
				})}
				${field.prompt({
					type:'area',
					descr: '<mark>Внимание</mark>: перед импортом сделайте резервный экспорт текущих данных! Новые данные не добавятся, а заменят старые данные.',
					label: 'Вставьте сделанный ранее экспорт',
					name: 'json',
					value:'Импорт',
					global: 'check',
					action:'/-shop/admin/set-import'
				})}
			</p>
			<p>
				Требуется для переноса сайта с одного сервера на другой без полного дампа базы данных. Например, когда разработка велась локально и надо обновить настройки на рабочем сервере.
				Экспортируются данные из таблиц:
			</p>

			<ul>
				${data.exporttables.map(table => '<li>' + table + '</li>').join('')}
			</ul>
		</div>
	</div>
	
`