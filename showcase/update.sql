
CREATE TABLE IF NOT EXISTS `showcase_prices` (
	`price_id` SMALLINT unsigned NOT NULL AUTO_INCREMENT COMMENT 'id источника',
	`price_title` varchar(255) NOT NULL COMMENT 'Идентификационное имя источника - имя файла',
	`price_nick` varchar(255) COLLATE latin1_bin NOT NULL COMMENT '',
	`loadtime` DATETIME NULL DEFAULT NULL COMMENT 'Дата последнего внесения',
	`quantity` SMALLINT unsigned COMMENT 'Количество записей',
	`duration` SMALLINT unsigned COMMENT 'Записывается время разбора данных',
	`ans` mediumtext NULL COMMENT '',
	`loaded` int(1) unsigned NULL COMMENT 'Метка загружена ли таблица',
	UNIQUE INDEX (`price_nick`),
	PRIMARY KEY (`price_id`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci AUTO_INCREMENT=1;


CREATE TABLE IF NOT EXISTS `showcase_tables` (
	`table_id` SMALLINT unsigned NOT NULL AUTO_INCREMENT COMMENT 'id источника',
	`table_title` varchar(255) NOT NULL COMMENT 'Идентификационное имя источника - имя файла, связь с файлом',
	`table_nick` varchar(255) NOT NULL COLLATE latin1_bin COMMENT '',
	`loadtime` DATETIME NULL DEFAULT NULL COMMENT 'Дата последнего внесения',
	`quantity` SMALLINT unsigned COMMENT 'Количество позиций в обработке',
	`duration` SMALLINT unsigned COMMENT 'Записывается время разбора данных',
	`ans` mediumtext NULL COMMENT 'Записывается результат обработки',
	`loaded` int(1) unsigned NULL COMMENT 'Метка загружена ли таблица',
	UNIQUE INDEX (`table_nick`),
	PRIMARY KEY (`table_id`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci AUTO_INCREMENT=1 ;

CREATE TABLE IF NOT EXISTS `showcase_groups` (
	`group_id` SMALLINT unsigned NOT NULL AUTO_INCREMENT COMMENT '',
	`group_title` varchar(255) NOT NULL COMMENT '',
	`parent_id` SMALLINT unsigned NULL COMMENT '',
	`group_nick` varchar(255) NOT NULL COLLATE latin1_bin COMMENT '',
	`icon` varchar(255) NULL COMMENT '',
	`ordain` SMALLINT unsigned COMMENT 'Порядок этой группы',
	PRIMARY KEY (`group_id`),
	UNIQUE INDEX (`group_nick`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci AUTO_INCREMENT=1 ;

CREATE TABLE IF NOT EXISTS `showcase_props` (
	`prop_id` SMALLINT unsigned NOT NULL AUTO_INCREMENT COMMENT '',
	`prop_title` varchar(255) NOT NULL COMMENT '',
	`prop_nick` varchar(255) NOT NULL COLLATE latin1_bin COMMENT '',
	`ordain` SMALLINT unsigned NOT NULL COMMENT '',
	`type` SET("value","number","text") NOT NULL COMMENT 'В какой колонке и как хранятся значения',
	PRIMARY KEY (`prop_id`),
	UNIQUE INDEX (prop_nick)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci AUTO_INCREMENT=1 ;

CREATE TABLE IF NOT EXISTS `showcase_values` (
	`value_id` MEDIUMINT unsigned NOT NULL AUTO_INCREMENT COMMENT '',
	`value_title` varchar(255) NOT NULL COMMENT '',
	`value_nick` varchar(255) NOT NULL COLLATE latin1_bin COMMENT '',
	PRIMARY KEY (`value_id`),
	UNIQUE INDEX (`value_nick`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci AUTO_INCREMENT=1;

CREATE TABLE IF NOT EXISTS `showcase_brands` (
	`brand_id` SMALLINT unsigned NOT NULL AUTO_INCREMENT COMMENT '',
	`brand_title` varchar(255) NOT NULL COMMENT '',
	`brand_nick` varchar(255) NOT NULL COLLATE latin1_bin COMMENT '',
	`logo` varchar(255) NULL COMMENT '',
	`ordain` SMALLINT unsigned COMMENT 'Порядок в списке производителей',
	PRIMARY KEY (`brand_id`),
	UNIQUE (`brand_nick`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci AUTO_INCREMENT=1 ;

CREATE TABLE IF NOT EXISTS `showcase_models` (
	`model_id` MEDIUMINT unsigned NOT NULL AUTO_INCREMENT COMMENT '',
	`brand_id` SMALLINT unsigned COMMENT '',
	`model_nick` varchar(255) NOT NULL COLLATE latin1_bin COMMENT '',
	`model_title` varchar(255) NOT NULL COMMENT '',
	`group_id` SMALLINT unsigned NOT NULL COMMENT '',
	`search` TEXT NOT NULL COLLATE latin1_bin COMMENT 'латиница после Path::encode слова разделены пробелом',
	FULLTEXT INDEX (`search`),
	PRIMARY KEY (`model_id`),
	UNIQUE INDEX (`brand_id`,`model_nick`),
	INDEX (group_id, brand_id)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci AUTO_INCREMENT=1;

CREATE TABLE IF NOT EXISTS `showcase_items` (
	`model_id` MEDIUMINT unsigned NOT NULL COMMENT '',
	`item_num` SMALLINT unsigned NOT NULL COMMENT '',
	`ordain` SMALLINT unsigned COMMENT 'Порядковый номер строки в таблице',
	`table_id` SMALLINT unsigned COMMENT '',
	PRIMARY KEY (`model_id`, `item_num`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE IF NOT EXISTS `showcase_iprops` (
	`model_id` MEDIUMINT unsigned NOT NULL COMMENT '',
	`item_num` SMALLINT unsigned NOT NULL COMMENT '',
	`prop_id` SMALLINT unsigned NOT NULL COMMENT '65 тыс',
	`value_id` MEDIUMINT unsigned NULL COMMENT '16 млн',
	`file_id` MEDIUMINT unsigned NULL COMMENT '16 млн',
	`number` DECIMAL(19,2) NULL COMMENT '',
	`ordain` SMALLINT unsigned COMMENT 'Порядковый номер для порядка значений в одном свойстве',
	`text` mediumtext NULL COMMENT '',
	`price_id` SMALLINT unsigned NULL COMMENT '65 тыс',
	UNIQUE (`model_id`, `item_num`, `prop_id`, `value_id`),
	INDEX (prop_id),
	INDEX (value_id),
	INDEX (`number`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;



CREATE TABLE IF NOT EXISTS `showcase_files` (
	`file_id` MEDIUMINT unsigned NOT NULL AUTO_INCREMENT COMMENT '',
	
	`file_brand_title` varchar(255) NULL COMMENT 'Имя, часто в структуре src или при контексте разбора, которое указывает на бренд',
	`file_brand_nick` varchar(255) COLLATE latin1_bin NOT NULL COMMENT '',

	`file_group_title` varchar(255) NULL COMMENT 'Имя, часто в структуре src или при контексте разбора, которое указывает на группу',
	`file_group_nick` varchar(255) COLLATE latin1_bin NOT NULL COMMENT '',
	
	`file_model_title` varchar(255) NULL COMMENT 'Имя, часто в структуре src или при контексте разбора, которое указывает на модель',
	`file_model_nick` varchar(255) COLLATE latin1_bin NOT NULL COMMENT '',

	`file_width` SMALLINT NULL COMMENT 'Ширина картинки',
	`file_height` SMALLINT NULL COMMENT 'Высота картинки',
	`file_size` MEDIUMINT NULL COMMENT 'В килобайтах',
	`file_place` ENUM('local','global') NOT NULL COMMENT 'или локальный или из интернета',
	`file_mtime` DATETIME NULL DEFAULT NULL COMMENT 'Дата изменений. Только у local',

	`file_from` ENUM('images','texts','files','videos','slides','models','icons','logos') NULL DEFAULT NULL COMMENT 'Папка в структуре которая указывает на тип или автоматически определённое значение',
	`file_type` ENUM('images','texts','files','videos') NOT NULL COMMENT 'Расширение файла по которому можно определить тип, может не совпадать с тем что в src',
	`file_ext` varchar(4) NOT NULL DEFAULT '' COMMENT 'Расширение может понадобиться для иконки',
	`file_source` ENUM('price','table','local','hand') NOT NULL COMMENT 'Источник. tables записываются в момент внесения данных, local записываются и связываются отдельной обработкой.',
	`file_table_id` SMALLINT unsigned NULL COMMENT 'id источника при внесении, когда source = table',
	`file_price_id` SMALLINT unsigned NULL COMMENT 'id источника при внесении, когда source = price',
	`file_ordain` SMALLINT unsigned COMMENT 'Порядок номер в источнике или в локальной папке. Порядок сбрасывается на уровне модели, или null если модели нет.',

	`file_src_title` TEXT NOT NULL COMMENT 'Путь от корня без ведущего слэша или путь начиная с http',
	`file_src_nick` TEXT NOT NULL COLLATE latin1_bin COMMENT 'могут быть дубли с одним nick, сообщаем о них при индексации',
	`file_status` ENUM('404','200') COMMENT 'При работе с файлами id не удаляются, а делаются неактивными и связи все удаляются. Если файл неактивный',

	PRIMARY KEY (file_id),
	UNIQUE INDEX (file_src_nick),
	INDEX (file_group_nick),
	INDEX (file_brand_nick),
	INDEX (file_model_nick)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci AUTO_INCREMENT=1 COMMENT 'Индекс файлов каталога. Файлы с удалённого сервера http, также могут быть сохранены при внесении данных с полным адресом в src';