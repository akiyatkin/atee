
CREATE TABLE IF NOT EXISTS `showcase_prices` (
	`price_id` SMALLINT unsigned NOT NULL AUTO_INCREMENT COMMENT 'id источника',
	`price_name` varchar(255) NOT NULL COMMENT 'Идентификационное имя источника - имя файла',
	`loadtime` DATETIME NULL DEFAULT NULL COMMENT 'Дата последнего внесения',
	`ordain` SMALLINT unsigned COMMENT 'Порядок применнеия данных',
	`quantity` SMALLINT unsigned COMMENT 'Количество записей',
	`duration` SMALLINT unsigned COMMENT 'Записывается время разбора данных',
	`ans` mediumtext NULL COMMENT '',
	`loaded` int(1) unsigned NULL COMMENT 'Метка загружена ли таблица',
	PRIMARY KEY (`price_id`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci AUTO_INCREMENT=1;


CREATE TABLE IF NOT EXISTS `showcase_tables` (
	`table_id` SMALLINT unsigned NOT NULL AUTO_INCREMENT COMMENT 'id источника',
	`table_name` varchar(255) NOT NULL COMMENT 'Идентификационное имя источника - имя файла, связь с файлом',
	`table_nick` varchar(255) NOT NULL COMMENT '',
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
	`group_nick` varchar(255) NOT NULL COMMENT '',
	`icon` varchar(255) NULL COMMENT '',
	`ordain` SMALLINT unsigned COMMENT 'Порядок этой группы',
	PRIMARY KEY (`group_id`),
	UNIQUE INDEX (`group_nick`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci AUTO_INCREMENT=1 ;

CREATE TABLE IF NOT EXISTS `showcase_props` (
	`prop_id` SMALLINT unsigned NOT NULL AUTO_INCREMENT COMMENT '',
	`prop_title` varchar(255) NOT NULL COMMENT '',
	`prop_nick` varchar(255) NOT NULL COMMENT '',
	`ordain` SMALLINT unsigned NOT NULL COMMENT '',
	`type` SET("value","number","text") NOT NULL COMMENT 'В какой колонке и как хранятся значения',
	PRIMARY KEY (`prop_id`),
	UNIQUE INDEX (prop_nick)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci AUTO_INCREMENT=1 ;

CREATE TABLE IF NOT EXISTS `showcase_values` (
	`value_id` MEDIUMINT unsigned NOT NULL AUTO_INCREMENT COMMENT '',
	`value_title` varchar(255) NOT NULL COMMENT '',
	`value_nick` varchar(255) NOT NULL COMMENT '',
	PRIMARY KEY (`value_id`),
	UNIQUE INDEX (`value_nick`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci AUTO_INCREMENT=1 ;

CREATE TABLE IF NOT EXISTS `showcase_brands` (
	`brand_id` SMALLINT unsigned NOT NULL AUTO_INCREMENT COMMENT '',
	`brand_title` varchar(255) NOT NULL COMMENT '',
	`brand_nick` varchar(255) NOT NULL COMMENT '',
	`logo` varchar(255) NULL COMMENT '',
	`ordain` SMALLINT unsigned COMMENT 'Порядок в списке производителей',
	PRIMARY KEY (`brand_id`),
	UNIQUE (`brand_nick`)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci AUTO_INCREMENT=1 ;

CREATE TABLE IF NOT EXISTS `showcase_models` (
	`model_id` MEDIUMINT unsigned NOT NULL AUTO_INCREMENT COMMENT '',
	`brand_id` SMALLINT unsigned COMMENT '',
	`model_nick` varchar(255) NOT NULL COMMENT '',
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
	`number` DECIMAL(19,2) NULL COMMENT '',
	`text` mediumtext NULL COMMENT '',
	`price_id` SMALLINT unsigned NULL COMMENT '65 тыс',
	UNIQUE (`model_id`, `item_num`, `prop_id`, `value_id`),
	INDEX (prop_id, value_id),
	INDEX (model_id, prop_id)
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;