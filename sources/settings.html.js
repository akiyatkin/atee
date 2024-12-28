import err from "/-controller/err.html.js"
import field from "/-dialog/field.html.js"
import words from "/-words/words.js"
import date from "/-words/date.html.js"

export const ROOT = (data, env) => err(data, env) || `
	<h1>Настройки</h1>
	<p>
		Папка с источниками <b>${data.dir}</b>
	</p>
	<div style="display: grid; gap: 0.25em; margin: 2em 0">
		<a href="/@atee/controller">Авторизация</a>
	</div>
	<div style="display: grid; gap: 1em; margin: 2em 0">
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
				Для скриптов есть механизм кэша Access.relate, который используется для чтения данных сайта.
				Если данные меняются, через админку сайта, то такой сброс проихоит автоматически. В ручную надо сбрасывать, если данные изменились вручную.
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
				Перезапуск это самый грубый способ сбросить кэш. Новый кода источников требует перезапуск сервера. Разработчик перезапускает сервер с помщью touch ~/reload после git pull.
			</p>
		</div>
		<div>
			<p>
				Сейчас загружается <b>${data.loads} ${words(data.loads,'источник','источника','источников')}</b>.
			</p>
			<p>
				${field.button({
					label:'Сбросить старты',
					action:'/-sources/set-reset-start',
					reloaddiv: env.layer.div
				})} 
			</p>
			<p>
				Может потребоваться сбросить старты о начале загрузки источников если база данных была перезапущена во время работы или когда какая-то загрузка завершилась непредусмотренной ошибкой. Cбрасывается date_start у источников. Базу данных обычно тоже надо перезапустить.
			</p>
		</div>
	</div>
	
`