-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               11.4.0-MariaDB - mariadb.org binary distribution
-- Server OS:                    Win64
-- HeidiSQL Version:             12.3.0.6589
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Dumping structure for table ladasvet.ru.sources_appears
CREATE TABLE IF NOT EXISTS `sources_appears` (
  `source_id` smallint(5) unsigned NOT NULL,
  `entity_id` smallint(5) unsigned NOT NULL DEFAULT 0,
  `key_nick` varchar(127) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `date_appear` datetime NOT NULL DEFAULT current_timestamp(),
  `date_disappear` datetime DEFAULT NULL,
  PRIMARY KEY (`source_id`,`entity_id`,`key_nick`) USING BTREE,
  KEY `FK_sources_appears_sources_props` (`entity_id`) USING BTREE,
  KEY `FK_sources_appears_sources_values` (`key_nick`),
  CONSTRAINT `FK_sources_appears_sources_props` FOREIGN KEY (`entity_id`) REFERENCES `sources_props` (`prop_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_sources_appears_sources_sources` FOREIGN KEY (`source_id`) REFERENCES `sources_sources` (`source_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_sources_appears_sources_values` FOREIGN KEY (`key_nick`) REFERENCES `sources_values` (`value_nick`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.sources_cells
CREATE TABLE IF NOT EXISTS `sources_cells` (
  `source_id` smallint(5) unsigned NOT NULL,
  `sheet_index` smallint(5) unsigned NOT NULL,
  `row_index` mediumint(8) unsigned NOT NULL,
  `col_index` smallint(5) unsigned NOT NULL,
  `multi_index` smallint(5) unsigned NOT NULL DEFAULT 0,
  `value_id` int(10) unsigned DEFAULT NULL,
  `number` int(10) DEFAULT NULL,
  `date` datetime DEFAULT NULL,
  `text` mediumtext CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `pruning` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`source_id`,`sheet_index`,`row_index`,`col_index`,`multi_index`) USING BTREE,
  KEY `FK_sources_cells_sources_values` (`value_id`),
  KEY `Sources and sheets stat` (`pruning`) USING BTREE,
  CONSTRAINT `FK_sources_cells_sources_sources` FOREIGN KEY (`source_id`) REFERENCES `sources_sources` (`source_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_sources_cells_sources_values` FOREIGN KEY (`value_id`) REFERENCES `sources_values` (`value_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.sources_cols
CREATE TABLE IF NOT EXISTS `sources_cols` (
  `source_id` smallint(5) unsigned NOT NULL,
  `sheet_index` smallint(5) unsigned NOT NULL,
  `col_index` smallint(5) unsigned NOT NULL,
  `col_nick` varchar(127) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `col_title` varchar(127) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `prop_id` smallint(5) unsigned DEFAULT NULL,
  `represent_col` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`source_id`,`sheet_index`,`col_index`) USING BTREE,
  UNIQUE KEY `col_nick` (`source_id`,`sheet_index`,`col_title`) USING BTREE,
  KEY `FK_sources_cols_sources_props` (`prop_id`) USING BTREE,
  CONSTRAINT `FK_sources_cols_sources_props` FOREIGN KEY (`prop_id`) REFERENCES `sources_props` (`prop_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `FK_sources_cols_sources_sources` FOREIGN KEY (`source_id`) REFERENCES `sources_sources` (`source_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.sources_custom_cells
CREATE TABLE IF NOT EXISTS `sources_custom_cells` (
  `source_id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `sheet_title` varchar(63) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `key_nick` varchar(63) NOT NULL,
  `repeat_index` smallint(6) NOT NULL,
  `col_title` varchar(63) NOT NULL DEFAULT '',
  `represent_custom_cell` bit(1) DEFAULT NULL,
  PRIMARY KEY (`source_id`,`sheet_title`,`key_nick`,`repeat_index`,`col_title`) USING BTREE,
  KEY `FK_sources_custom_cells_sources_values` (`key_nick`) USING BTREE,
  CONSTRAINT `FK_sources_custom_cells_sources_sources` FOREIGN KEY (`source_id`) REFERENCES `sources_sources` (`source_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.sources_custom_cols
CREATE TABLE IF NOT EXISTS `sources_custom_cols` (
  `source_id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `sheet_title` varchar(127) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `col_title` varchar(127) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT 'Ограничение по длине, иначе дизайн неуправляемый.',
  `represent_custom_col` bit(1) DEFAULT NULL,
  `prop_id` smallint(5) unsigned DEFAULT NULL,
  `noprop` bit(1) DEFAULT NULL COMMENT '1 = нет свойства и NULL = есть свойство',
  PRIMARY KEY (`source_id`,`col_title`,`sheet_title`) USING BTREE,
  KEY `FK_sources_custom_cols_sources_props` (`prop_id`),
  CONSTRAINT `FK_sources_custom_cols_sources_props` FOREIGN KEY (`prop_id`) REFERENCES `sources_props` (`prop_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `FK_sources_custom_cols_sources_sources` FOREIGN KEY (`source_id`) REFERENCES `sources_sources` (`source_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.sources_custom_rows
CREATE TABLE IF NOT EXISTS `sources_custom_rows` (
  `source_id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `sheet_title` varchar(63) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `key_nick` varchar(63) NOT NULL,
  `repeat_index` smallint(6) NOT NULL,
  `represent_custom_row` bit(1) DEFAULT NULL,
  PRIMARY KEY (`source_id`,`sheet_title`,`key_nick`,`repeat_index`) USING BTREE,
  CONSTRAINT `FK_sources_custom_rows_sources_sources` FOREIGN KEY (`source_id`) REFERENCES `sources_sources` (`source_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.sources_custom_sheets
CREATE TABLE IF NOT EXISTS `sources_custom_sheets` (
  `source_id` smallint(5) unsigned NOT NULL,
  `sheet_title` varchar(127) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `represent_custom_sheet` bit(1) DEFAULT NULL,
  `entity_id` smallint(5) unsigned DEFAULT NULL,
  PRIMARY KEY (`source_id`,`sheet_title`) USING BTREE,
  KEY `FK_sources_custom_sheets_sources_props` (`entity_id`) USING BTREE,
  CONSTRAINT `FK_sources_custom_sheets_sources_props` FOREIGN KEY (`entity_id`) REFERENCES `sources_props` (`prop_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `FK_sources_custom_sheets_sources_sources` FOREIGN KEY (`source_id`) REFERENCES `sources_sources` (`source_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.sources_custom_values
CREATE TABLE IF NOT EXISTS `sources_custom_values` (
  `prop_id` smallint(5) unsigned NOT NULL,
  `value_nick` varchar(63) NOT NULL,
  `represent_custom_value` bit(1) DEFAULT NULL,
  PRIMARY KEY (`value_nick`,`prop_id`) USING BTREE,
  KEY `FK_sources_custom_values_sources_props` (`prop_id`),
  CONSTRAINT `FK_sources_custom_values_sources_props` FOREIGN KEY (`prop_id`) REFERENCES `sources_props` (`prop_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.sources_items
CREATE TABLE IF NOT EXISTS `sources_items` (
  `entity_id` smallint(5) unsigned NOT NULL,
  `key_id` int(10) unsigned NOT NULL DEFAULT 0,
  `master` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`entity_id`,`key_id`) USING BTREE,
  KEY `FK_sources_items_sources_values` (`key_id`,`entity_id`) USING BTREE,
  FULLTEXT KEY `search items` (`search`),
  CONSTRAINT `FK_sources_items_sources_props` FOREIGN KEY (`entity_id`) REFERENCES `sources_props` (`prop_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_sources_items_sources_values` FOREIGN KEY (`key_id`) REFERENCES `sources_values` (`value_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.sources_props
CREATE TABLE IF NOT EXISTS `sources_props` (
  `prop_id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `prop_title` varchar(127) NOT NULL COMMENT 'Ограничение по длине, иначе дизайн неуправляемый.',
  `prop_nick` varchar(127) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `type` enum('text','value','date','number') NOT NULL DEFAULT 'text',
  `known` enum('system','more','column') NOT NULL DEFAULT 'more' COMMENT 'system показывается в админке shop, чтобы настроить группы, но не показывается нигде в интерфейсе даже в json',
  `scale` tinyint(4) NOT NULL DEFAULT 0 COMMENT 'Точность сколько знаков после запятой хранится в целом значении. 127 максимум',
  `multi` bit(1) NOT NULL DEFAULT b'0',
  `lettercase` enum('ignore','lower','upper','firstup') NOT NULL,
  `name` varchar(127) DEFAULT NULL,
  `unit` varchar(15) NOT NULL DEFAULT '',
  `ordain` mediumint(8) unsigned NOT NULL DEFAULT 0,
  `comment` text NOT NULL DEFAULT '',
  `represent_prop` bit(1) NOT NULL DEFAULT b'1',
  PRIMARY KEY (`prop_id`) USING BTREE,
  UNIQUE KEY `UNIQUE nick` (`prop_nick`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.sources_recalc
CREATE TABLE IF NOT EXISTS `sources_recalc` (
  `singleton` enum('X') NOT NULL DEFAULT 'X',
  `comment` text NOT NULL DEFAULT '',
  `date_recalc_start` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Дата старта пересчёта',
  `date_recalc_finish` datetime DEFAULT current_timestamp() COMMENT 'Дата финиша. Если финиша нет при перезапуске, то повторный пересчёт.\r\nПересчёт может наложиться если nodejs перезапустится, а mysql продолжит работу.',
  `date_recalc_index` datetime DEFAULT current_timestamp() COMMENT 'Дата выполнения индексации. Если индексации нет, то она запускается при перезапуске.\r\nПри перезапуске может быть запущена повторная индексация если nodejs перезапущен, \r\nа mysql продолжает работать и это нормально. ',
  PRIMARY KEY (`singleton`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.sources_rows
CREATE TABLE IF NOT EXISTS `sources_rows` (
  `source_id` smallint(5) unsigned NOT NULL,
  `sheet_index` smallint(5) unsigned NOT NULL,
  `row_index` mediumint(8) unsigned NOT NULL,
  `key_id` int(10) unsigned DEFAULT NULL,
  `search` text CHARACTER SET latin1 COLLATE latin1_bin NOT NULL DEFAULT '' COMMENT 'латиница после nicked слова разделены пробелом',
  PRIMARY KEY (`source_id`,`sheet_index`,`row_index`) USING BTREE,
  KEY `FK_sources_rows_sources_values` (`key_id`),
  FULLTEXT KEY `search rows` (`search`),
  CONSTRAINT `FK_sources_rows_sources_sources` FOREIGN KEY (`source_id`) REFERENCES `sources_sources` (`source_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_sources_rows_sources_values` FOREIGN KEY (`key_id`) REFERENCES `sources_values` (`value_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.sources_settings
CREATE TABLE IF NOT EXISTS `sources_settings` (
  `singleton` enum('X') NOT NULL DEFAULT 'X',
  `comment` text NOT NULL DEFAULT '',
  `date_recalc_start` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Дата старта пересчёта',
  `date_recalc_finish` datetime DEFAULT current_timestamp() COMMENT 'Дата финиша. Если финиша нет при перезапуске, то повторный пересчёт.\r\nПересчёт может наложиться если nodejs перезапустится, а mysql продолжит работу.',
  `date_recalc_publicate` datetime DEFAULT current_timestamp() COMMENT 'Дата выполнения публикации. Если публикации нет, то она запускается при перезапуске.\r\nПри перезапуске может быть запущена повторная публикации если nodejs перезапущен, \r\nа mysql продолжает работать и это нормально. ',
  PRIMARY KEY (`singleton`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.sources_sheets
CREATE TABLE IF NOT EXISTS `sources_sheets` (
  `source_id` smallint(5) unsigned NOT NULL,
  `sheet_index` smallint(5) unsigned NOT NULL,
  `sheet_title` varchar(127) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `entity_id` smallint(5) unsigned DEFAULT NULL,
  `represent_sheet` bit(1) NOT NULL DEFAULT b'0',
  `key_index` smallint(5) unsigned DEFAULT NULL,
  PRIMARY KEY (`source_id`,`sheet_index`) USING BTREE,
  KEY `FK_sources_sheets_sources_props` (`entity_id`),
  CONSTRAINT `FK_sources_sheets_sources_props` FOREIGN KEY (`entity_id`) REFERENCES `sources_props` (`prop_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `FK_sources_sheets_sources_sources` FOREIGN KEY (`source_id`) REFERENCES `sources_sources` (`source_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.sources_sources
CREATE TABLE IF NOT EXISTS `sources_sources` (
  `source_id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `source_title` varchar(127) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `source_nick` varchar(127) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `date_check` datetime DEFAULT NULL,
  `date_load` datetime DEFAULT NULL,
  `date_content` datetime DEFAULT NULL,
  `date_mtime` datetime DEFAULT NULL,
  `date_mrest` datetime DEFAULT NULL,
  `date_msource` datetime DEFAULT NULL,
  `date_exam` datetime NOT NULL DEFAULT current_timestamp(),
  `duration_rest` mediumint(9) DEFAULT NULL,
  `duration_insert` mediumint(9) DEFAULT NULL,
  `duration_check` mediumint(9) DEFAULT NULL,
  `duration_recalc` mediumint(9) DEFAULT NULL,
  `duration_load` mediumint(9) DEFAULT NULL,
  `entity_id` smallint(5) unsigned DEFAULT NULL,
  `master` bit(1) NOT NULL DEFAULT b'1',
  `comment` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `represent_source` bit(1) NOT NULL DEFAULT b'1',
  `represent_sheets` bit(1) NOT NULL DEFAULT b'1' COMMENT 'Какбудто: 0 прайс, 1 данные',
  `represent_cols` bit(1) NOT NULL DEFAULT b'1',
  `renovate` bit(1) NOT NULL DEFAULT b'1',
  `date_start` datetime DEFAULT NULL,
  `ordain` mediumint(8) unsigned NOT NULL DEFAULT 0,
  `error` text NOT NULL DEFAULT '',
  `msg_check` text NOT NULL DEFAULT '',
  `msg_load` text NOT NULL DEFAULT '',
  `params` text NOT NULL DEFAULT '' COMMENT 'json передаются обработчику',
  PRIMARY KEY (`source_id`) USING BTREE,
  UNIQUE KEY `source_name` (`source_title`) USING BTREE,
  UNIQUE KEY `UNIQUE source_nick` (`source_nick`) USING BTREE,
  KEY `FK_sources_sources_sources_props` (`entity_id`) USING BTREE,
  CONSTRAINT `FK_sources_sources_sources_props` FOREIGN KEY (`entity_id`) REFERENCES `sources_props` (`prop_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.sources_synonyms
CREATE TABLE IF NOT EXISTS `sources_synonyms` (
  `col_nick` varchar(127) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `col_title` varchar(127) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `prop_id` smallint(5) unsigned DEFAULT NULL,
  PRIMARY KEY (`col_nick`),
  KEY `FK_sources_synonyms_sources_props` (`prop_id`),
  CONSTRAINT `FK_sources_synonyms_sources_props` FOREIGN KEY (`prop_id`) REFERENCES `sources_props` (`prop_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.sources_values
CREATE TABLE IF NOT EXISTS `sources_values` (
  `value_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `value_title` varchar(127) NOT NULL,
  `value_nick` varchar(127) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  PRIMARY KEY (`value_id`) USING HASH,
  UNIQUE KEY `nick` (`value_nick`) USING BTREE,
  KEY `Index 3` (`value_title`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci ROW_FORMAT=DYNAMIC COMMENT='Значения хранятся в переменных в оперативной памяти';



CREATE TABLE IF NOT EXISTS `sources_witems` (
  `entity_id` smallint(5) unsigned NOT NULL,
  `key_id` int(10) unsigned NOT NULL DEFAULT 0,
  `search` text CHARACTER SET latin1 COLLATE latin1_bin NOT NULL DEFAULT '' COMMENT 'Поисковый индекс определён только для победителей со свойствами в sources_wcells',
  PRIMARY KEY (`entity_id`,`key_id`) USING BTREE,
  KEY `FK_sources_items_sources_values` (`key_id`,`entity_id`) USING BTREE,
  FULLTEXT KEY `search items` (`search`),
  CONSTRAINT `sources_witems_ibfk_1` FOREIGN KEY (`entity_id`) REFERENCES `sources_props` (`prop_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `sources_witems_ibfk_2` FOREIGN KEY (`key_id`) REFERENCES `sources_values` (`value_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;


-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.sources_wcells
CREATE TABLE IF NOT EXISTS `sources_wcells` (
  `entity_id` smallint(5) unsigned NOT NULL,
  `key_id` int(10) unsigned NOT NULL,
  `prop_id` smallint(5) unsigned NOT NULL,
  `source_id` smallint(5) unsigned NOT NULL,
  `sheet_index` smallint(5) unsigned NOT NULL,
  `row_index` mediumint(8) unsigned NOT NULL,
  `col_index` smallint(5) unsigned NOT NULL,
  PRIMARY KEY (`key_id`,`entity_id`,`prop_id`) USING BTREE,
  KEY `CELLBYINDEX` (`source_id`,`sheet_index`,`row_index`,`col_index`) USING BTREE,
  KEY `FK_entity_id` (`entity_id`) USING BTREE,
  KEY `FK_sources_wcells_sources_props` (`prop_id`),
  KEY `source_entity` (`source_id`,`key_id`,`entity_id`,`prop_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.sources_wdates
CREATE TABLE IF NOT EXISTS `sources_wdates` (
  `entity_id` smallint(5) unsigned NOT NULL,
  `key_id` int(10) unsigned NOT NULL,
  `prop_id` smallint(5) unsigned NOT NULL,
  `date` datetime NOT NULL,
  `multi_index` smallint(5) unsigned NOT NULL,
  PRIMARY KEY (`entity_id`,`key_id`,`prop_id`,`date`) USING BTREE,
  KEY `FK_sources_wdates_sources_props_2` (`prop_id`),
  KEY `FK_sources_wdates_sources_values` (`key_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.sources_wnumbers
CREATE TABLE IF NOT EXISTS `sources_wnumbers` (
  `entity_id` smallint(5) unsigned NOT NULL,
  `key_id` int(10) unsigned NOT NULL,
  `prop_id` smallint(5) unsigned NOT NULL,
  `number` int(10) unsigned NOT NULL,
  `multi_index` smallint(5) unsigned NOT NULL,
  PRIMARY KEY (`entity_id`,`key_id`,`prop_id`,`number`) USING BTREE,
  KEY `FK_sources_wnumbers_sources_props_2` (`prop_id`),
  KEY `FK_sources_wnumbers_sources_values` (`key_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.sources_wprops
CREATE TABLE IF NOT EXISTS `sources_wprops` (
  `prop_id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `prop_title` varchar(127) NOT NULL COMMENT 'Ограничение по длине, иначе дизайн неуправляемый.',
  `prop_nick` varchar(127) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `type` enum('text','value','date','number') NOT NULL DEFAULT 'text',
  `known` enum('system','more','column') NOT NULL DEFAULT 'more' COMMENT 'system показывается в админке shop, чтобы настроить группы, но не показывается нигде в интерфейсе даже в json',
  `scale` tinyint(4) NOT NULL DEFAULT 0 COMMENT 'Точность сколько знаков после запятой хранится в целом значении. 127 максимум',
  `multi` bit(1) NOT NULL DEFAULT b'0',
  `lettercase` enum('ignore','lower','upper','firstup') NOT NULL,
  `name` varchar(127) DEFAULT NULL,
  `unit` varchar(15) NOT NULL DEFAULT '',
  `ordain` mediumint(8) unsigned NOT NULL DEFAULT 0,
  `comment` text NOT NULL DEFAULT '',
  `represent_prop` bit(1) NOT NULL DEFAULT b'1',
  PRIMARY KEY (`prop_id`) USING BTREE,
  UNIQUE KEY `UNIQUE nick` (`prop_nick`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.sources_wtexts
CREATE TABLE IF NOT EXISTS `sources_wtexts` (
  `entity_id` smallint(5) unsigned NOT NULL,
  `key_id` int(10) unsigned NOT NULL,
  `prop_id` smallint(5) unsigned NOT NULL,
  `multi_index` smallint(5) unsigned NOT NULL,
  `text` mediumtext CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  PRIMARY KEY (`entity_id`,`key_id`,`prop_id`,`multi_index`) USING BTREE,
  KEY `FK_sources_wtexts_sources_props_2` (`prop_id`),
  KEY `FK_sources_wtexts_sources_values` (`key_id`),
  CONSTRAINT `FK_sources_wtexts_sources_props` FOREIGN KEY (`entity_id`) REFERENCES `sources_props` (`prop_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_sources_wtexts_sources_props_2` FOREIGN KEY (`prop_id`) REFERENCES `sources_props` (`prop_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_sources_wtexts_sources_values` FOREIGN KEY (`key_id`) REFERENCES `sources_values` (`value_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table ladasvet.ru.sources_wvalues
CREATE TABLE IF NOT EXISTS `sources_wvalues` (
  `entity_id` smallint(5) unsigned NOT NULL,
  `key_id` int(10) unsigned NOT NULL,
  `prop_id` smallint(5) unsigned NOT NULL,
  `value_id` int(10) unsigned NOT NULL,
  `multi_index` smallint(5) unsigned NOT NULL,
  PRIMARY KEY (`entity_id`,`key_id`,`prop_id`,`value_id`) USING BTREE,
  KEY `FK_sources_winners_sources_values` (`value_id`) USING BTREE,
  KEY `FK_sources_wvalues_sources_props_2` (`prop_id`),
  KEY `FK_sources_wvalues_sources_values_2` (`key_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
