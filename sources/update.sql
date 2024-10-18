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

-- Dumping structure for table kvant63.ru.node.sources_cells
CREATE TABLE IF NOT EXISTS `sources_cells` (
  `source_id` smallint(5) unsigned NOT NULL,
  `sheet_num` smallint(5) unsigned NOT NULL,
  `row_index` mediumint(8) unsigned NOT NULL,
  `col_index` smallint(5) unsigned NOT NULL,
  `value_id` mediumint(8) unsigned DEFAULT NULL,
  `number` decimal(10,2) unsigned DEFAULT NULL,
  `text` mediumtext CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `date` datetime DEFAULT NULL,
  `replacer_source_id` smallint(5) unsigned DEFAULT NULL,
  `replacer_sheet_num` smallint(5) unsigned DEFAULT NULL,
  `replacer_row_index` mediumint(8) unsigned DEFAULT NULL,
  `replacer_col_index` smallint(5) unsigned DEFAULT NULL,
  `replacer_count` mediumint(8) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`source_id`,`sheet_num`,`row_index`,`col_index`) USING BTREE,
  UNIQUE KEY `value_id` (`source_id`,`sheet_num`,`row_index`,`value_id`,`replacer_count`),
  UNIQUE KEY `number` (`source_id`,`sheet_num`,`row_index`,`number`,`replacer_count`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table kvant63.ru.node.sources_columns
CREATE TABLE IF NOT EXISTS `sources_columns` (
  `source_id` smallint(5) unsigned NOT NULL,
  `sheet_num` smallint(5) unsigned NOT NULL,
  `col_index` smallint(5) unsigned NOT NULL,
  `col_nick` varchar(63) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `col_title` varchar(63) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `prop_id` smallint(5) unsigned NOT NULL,
  PRIMARY KEY (`source_id`,`sheet_num`,`col_index`) USING BTREE,
  UNIQUE KEY `col_nick` (`source_id`,`sheet_num`,`col_nick`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for view kvant63.ru.node.sources_data
-- Creating temporary table to overcome VIEW dependency errors
CREATE TABLE `sources_data` (
	`entity_id` TINYINT(3) UNSIGNED NULL,
	`key_id` SMALLINT(5) UNSIGNED NULL,
	`prop_id` SMALLINT(5) UNSIGNED NULL,
	`value_id` MEDIUMINT(8) UNSIGNED NULL,
	`text` MEDIUMTEXT NULL COLLATE 'utf8mb3_general_ci',
	`number` DECIMAL(10,2) UNSIGNED NULL,
	`date` DATETIME NULL,
	`source_id` SMALLINT(5) UNSIGNED NOT NULL,
	`sheet_num` SMALLINT(5) UNSIGNED NOT NULL,
	`row_index` MEDIUMINT(8) UNSIGNED NOT NULL,
	`col_index` SMALLINT(5) UNSIGNED NOT NULL
) ENGINE=MyISAM;

-- Dumping structure for table kvant63.ru.node.sources_entities
CREATE TABLE IF NOT EXISTS `sources_entities` (
  `entity_id` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `prop_id` smallint(5) unsigned NOT NULL,
  `entity_title` varchar(63) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT 'Ограничение по длине, иначе дизайн неуправляемый.',
  `entity_nick` varchar(63) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `duration_calc` mediumint(9) DEFAULT NULL,
  PRIMARY KEY (`entity_id`),
  UNIQUE KEY `entity_nick` (`entity_nick`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table kvant63.ru.node.sources_intersections
CREATE TABLE IF NOT EXISTS `sources_intersections` (
  `entity_master_id` tinyint(3) unsigned NOT NULL,
  `prop_master_id` smallint(5) unsigned NOT NULL,
  `entity_slave_id` tinyint(3) unsigned NOT NULL,
  `prop_slave_id` smallint(5) unsigned NOT NULL,
  PRIMARY KEY (`entity_master_id`,`prop_master_id`,`entity_slave_id`,`prop_slave_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table kvant63.ru.node.sources_items
CREATE TABLE IF NOT EXISTS `sources_items` (
  `entity_id` tinyint(3) unsigned NOT NULL AUTO_INCREMENT,
  `key_id` smallint(5) unsigned NOT NULL,
  `search` text CHARACTER SET latin1 COLLATE latin1_bin NOT NULL COMMENT 'латиница после Path::encode слова разделены пробелом',
  `comment` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`entity_id`,`key_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table kvant63.ru.node.sources_props
CREATE TABLE IF NOT EXISTS `sources_props` (
  `prop_id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `entity_id` tinyint(3) unsigned NOT NULL,
  `prop_title` varchar(63) NOT NULL COMMENT 'Ограничение по длине, иначе дизайн неуправляемый.',
  `prop_nick` varchar(63) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `type` enum('text','value','date','number') NOT NULL DEFAULT 'text',
  `multi` enum('N','Y') NOT NULL DEFAULT 'N',
  `unit` varchar(15) NOT NULL DEFAULT '',
  `ordain` mediumint(8) unsigned NOT NULL DEFAULT 0,
  `comment` text NOT NULL DEFAULT '',
  `known` enum('N','Y') NOT NULL DEFAULT 'N',
  PRIMARY KEY (`prop_id`) USING BTREE,
  UNIQUE KEY `prop_nick` (`entity_id`,`prop_nick`) USING HASH
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table kvant63.ru.node.sources_rows
CREATE TABLE IF NOT EXISTS `sources_rows` (
  `source_id` smallint(5) unsigned NOT NULL,
  `sheet_num` smallint(5) unsigned NOT NULL,
  `row_index` mediumint(8) unsigned NOT NULL,
  `key_id` smallint(5) unsigned NOT NULL,
  PRIMARY KEY (`source_id`,`sheet_num`,`row_index`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table kvant63.ru.node.sources_sheets
CREATE TABLE IF NOT EXISTS `sources_sheets` (
  `source_id` smallint(5) unsigned NOT NULL,
  `sheet_num` smallint(5) unsigned NOT NULL,
  `sheet_nick` varchar(63) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `sheet_title` varchar(63) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `entity_id` tinyint(3) unsigned NOT NULL,
  `nokeys` mediumint(8) unsigned NOT NULL,
  PRIMARY KEY (`source_id`,`sheet_num`) USING BTREE,
  UNIQUE KEY `sheet_nick` (`source_id`,`sheet_nick`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table kvant63.ru.node.sources_sources
CREATE TABLE IF NOT EXISTS `sources_sources` (
  `source_id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `source_title` varchar(63) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `source_nick` varchar(63) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `ordain` mediumint(8) unsigned NOT NULL DEFAULT 0,
  `date_check` datetime DEFAULT NULL,
  `date_content` datetime DEFAULT NULL,
  `date_load` datetime DEFAULT NULL,
  `date_exam` datetime DEFAULT NULL,
  `duration_load` mediumint(9) DEFAULT NULL,
  `duration_insert` mediumint(9) DEFAULT NULL,
  `default_entity_id` tinyint(3) unsigned NOT NULL,
  `comment` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`source_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- Data exporting was unselected.

-- Dumping structure for table kvant63.ru.node.sources_synonyms
CREATE TABLE IF NOT EXISTS `sources_synonyms` (
  `source_id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `prop_id` smallint(5) unsigned NOT NULL,
  `col_nick` varchar(63) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  `col_title` varchar(63) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT 'Ограничение по длине, иначе дизайн неуправляемый.',
  PRIMARY KEY (`source_id`,`prop_id`,`col_nick`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table kvant63.ru.node.sources_values
CREATE TABLE IF NOT EXISTS `sources_values` (
  `value_id` mediumint(8) unsigned NOT NULL AUTO_INCREMENT,
  `value_title` varchar(63) NOT NULL,
  `value_nick` varchar(63) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
  PRIMARY KEY (`value_id`) USING HASH,
  UNIQUE KEY `value_nick` (`value_nick`) USING HASH
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci ROW_FORMAT=DYNAMIC COMMENT='Значения хранятся в переменных в оперативной памяти';

-- Data exporting was unselected.

-- Dumping structure for view kvant63.ru.node.sources_data
-- Removing temporary table and create final VIEW structure
DROP TABLE IF EXISTS `sources_data`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `sources_data` AS select `s`.`entity_id` AS `entity_id`,`r`.`key_id` AS `key_id`,`col`.`prop_id` AS `prop_id`,`c`.`value_id` AS `value_id`,`c`.`text` AS `text`,`c`.`number` AS `number`,`c`.`date` AS `date`,`c`.`source_id` AS `source_id`,`c`.`sheet_num` AS `sheet_num`,`c`.`row_index` AS `row_index`,`c`.`col_index` AS `col_index` from (((`sources_cells` `c` left join `sources_sheets` `s` on(`s`.`source_id` = `c`.`source_id` and `s`.`sheet_num` = `c`.`sheet_num`)) left join `sources_rows` `r` on(`r`.`source_id` = `c`.`source_id` and `r`.`sheet_num` = `c`.`sheet_num` and `r`.`row_index` = `c`.`row_index`)) left join `sources_columns` `col` on(`col`.`source_id` = `c`.`source_id` and `col`.`sheet_num` = `c`.`sheet_num` and `col`.`col_index` = `c`.`col_index`)) where `c`.`replacer_count` = 0;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
