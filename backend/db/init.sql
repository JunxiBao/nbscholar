-- 甬学阁 NBScholar — 数据库初始化脚本
-- 运行前请先创建数据库：CREATE DATABASE nbscholar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============ users ============
CREATE TABLE IF NOT EXISTS `users` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `account`     VARCHAR(120) NOT NULL COMMENT '手机号或邮箱',
  `password`    VARCHAR(255) NOT NULL,
  `name`        VARCHAR(60)  NOT NULL DEFAULT '',
  `institution` VARCHAR(120) NOT NULL DEFAULT '',
  `age`         INT          NULL,
  `gender`      VARCHAR(10)  NOT NULL DEFAULT '',
  `avatar_url`  VARCHAR(500) NOT NULL DEFAULT '',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_account` (`account`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============ papers ============
CREATE TABLE IF NOT EXISTS `papers` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `title`         VARCHAR(500) NOT NULL,
  `authors`       TEXT         NOT NULL DEFAULT '',
  `abstract`      TEXT         NOT NULL DEFAULT '',
  `journal`       VARCHAR(300) NOT NULL DEFAULT '',
  `year`          INT          NULL,
  `doi`           VARCHAR(200) NOT NULL DEFAULT '',
  `pmid`          VARCHAR(50)  NOT NULL DEFAULT '',
  `source`        VARCHAR(50)  NOT NULL DEFAULT '' COMMENT 'arxiv/知网/pubmed等',
  `doc_type`      VARCHAR(50)  NOT NULL DEFAULT '' COMMENT '研究论文/综述/学位论文',
  `impact_factor` FLOAT        NULL,
  `citations`     INT          NOT NULL DEFAULT 0,
  `url`           VARCHAR(500) NOT NULL DEFAULT '',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FULLTEXT KEY `ft_title_abstract` (`title`, `abstract`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============ search_history ============
CREATE TABLE IF NOT EXISTS `search_history` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `user_id`    INT          NOT NULL,
  `keyword`    VARCHAR(300) NOT NULL,
  `source`     VARCHAR(100) NOT NULL DEFAULT '',
  `result_cnt` INT          NOT NULL DEFAULT 0,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `fk_history_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============ favorites ============
CREATE TABLE IF NOT EXISTS `favorites` (
  `id`         INT      NOT NULL AUTO_INCREMENT,
  `user_id`    INT      NOT NULL,
  `paper_id`   INT      NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_paper` (`user_id`, `paper_id`),
  KEY `idx_fav_user` (`user_id`),
  CONSTRAINT `fk_fav_user`  FOREIGN KEY (`user_id`)  REFERENCES `users`  (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fav_paper` FOREIGN KEY (`paper_id`) REFERENCES `papers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============ journals ============
CREATE TABLE IF NOT EXISTS `journals` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(300) NOT NULL,
  `publisher`     VARCHAR(200) NOT NULL DEFAULT '',
  `impact_factor` FLOAT        NULL,
  `quartile`      VARCHAR(10)  NOT NULL DEFAULT '',
  `field`         VARCHAR(100) NOT NULL DEFAULT '',
  `review_weeks`  VARCHAR(50)  NOT NULL DEFAULT '',
  `page_charge`   VARCHAR(100) NOT NULL DEFAULT '',
  `open_access`   TINYINT(1)   NOT NULL DEFAULT 0,
  `url`           VARCHAR(500) NOT NULL DEFAULT '',
  `logo_char`     VARCHAR(10)  NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  FULLTEXT KEY `ft_journal_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============ training_events ============
CREATE TABLE IF NOT EXISTS `training_events` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `title`        VARCHAR(300) NOT NULL,
  `speaker`      VARCHAR(100) NOT NULL DEFAULT '',
  `affiliation`  VARCHAR(200) NOT NULL DEFAULT '',
  `event_date`   DATETIME     NOT NULL,
  `end_time`     DATETIME     NULL,
  `location`     VARCHAR(200) NOT NULL DEFAULT '',
  `event_type`   VARCHAR(50)  NOT NULL DEFAULT '',
  `platform`     VARCHAR(100) NOT NULL DEFAULT '',
  `capacity`     INT          NOT NULL DEFAULT 100,
  `enrolled_cnt` INT          NOT NULL DEFAULT 0,
  `description`  TEXT         NOT NULL DEFAULT '',
  `color`        VARCHAR(20)  NOT NULL DEFAULT '#2563EB',
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============ enrollments ============
CREATE TABLE IF NOT EXISTS `enrollments` (
  `id`         INT         NOT NULL AUTO_INCREMENT,
  `user_id`    INT         NOT NULL,
  `event_id`   INT         NOT NULL,
  `status`     VARCHAR(20) NOT NULL DEFAULT 'enrolled',
  `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_event` (`user_id`, `event_id`),
  KEY `idx_enroll_user` (`user_id`),
  CONSTRAINT `fk_enroll_user`  FOREIGN KEY (`user_id`)  REFERENCES `users`           (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_enroll_event` FOREIGN KEY (`event_id`) REFERENCES `training_events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ============ 示例种子数据 ============

-- 示例文献
INSERT IGNORE INTO `papers` (`title`,`authors`,`abstract`,`journal`,`year`,`doi`,`source`,`doc_type`,`impact_factor`,`citations`,`url`) VALUES
('Attention Is All You Need','Vaswani A.; Shazeer N.; Parmar N.','We propose a new simple network architecture, the Transformer, based solely on attention mechanisms. The Transformer achieves superior results on machine translation tasks.','Advances in Neural Information Processing Systems',2017,'10.48550/arXiv.1706.03762','arXiv','综述',15.2,89234,'https://arxiv.org/abs/1706.03762'),
('基于多头自注意力机制的中文医学文本信息抽取研究','张明远; 李华; 王晓东','针对中文医学文本信息抽取的特殊挑战，本文提出了一种融合领域知识的多头自注意力模型，在三个标准医学文本数据集上F1值分别达到92.3%、89.7%和91.1%。','计算机学报',2024,'','知网','研究论文',2.8,156,''),
('Transformer-based models for biomedical named entity recognition: A systematic review','Chen L.; Kim J.; Patel R.','This systematic review evaluates Transformer-based approaches for biomedical NER across 78 published studies from 2018–2023.','Journal of Biomedical Informatics',2023,'10.1016/j.jbi.2023.104274','PubMed','综述',8.9,892,'https://pubmed.ncbi.nlm.nih.gov/38142034/'),
('基于预训练语言模型的科技文献知识图谱构建方法研究','刘志远','本文针对科技文献中知识图谱自动构建问题，提出了一种基于BERT预训练语言模型的端到端信息抽取框架。','清华大学博士学位论文',2023,'','万方','学位论文',NULL,45,''),
('BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding','Devlin J.; Chang M.','We introduce BERT, Bidirectional Encoder Representations from Transformers, a new method of pre-training language representations.','NAACL',2019,'10.18653/v1/N19-1423','arXiv','研究论文',12.5,55000,'https://arxiv.org/abs/1810.04805'),
('碳捕获与封存技术进展 2024','王磊; 陈建国','本文综述了近年来碳捕获与封存技术的主要进展，涵盖化学吸收、物理吸附、膜分离等核心技术路线。','Energy & Environmental Science',2024,'10.1039/D4EE00123','知网','综述',13.9,210,''),
('CRISPR 基因编辑安全性评估研究进展','李明; 赵燕','本文系统综述了CRISPR-Cas9基因编辑技术的脱靶效应检测方法及安全性评估体系。','Nature Methods',2024,'10.1038/s41592-024-02201','PubMed','综述',19.5,345,'');

-- 示例期刊
INSERT IGNORE INTO `journals` (`name`,`publisher`,`impact_factor`,`quartile`,`field`,`review_weeks`,`page_charge`,`open_access`,`url`,`logo_char`) VALUES
('Nature','Springer Nature',50.5,'Q1','综合科学','~16 周','无版面费（subscription）',0,'https://www.nature.com','N'),
('Science','AAAS',44.7,'Q1','综合科学','~12 周','无版面费（subscription）',0,'https://www.science.org','S'),
('Cell','Elsevier',41.6,'Q1','生命科学','~6 周','无版面费（subscription）',0,'https://www.cell.com','C'),
('Journal of Biomedical Informatics','Elsevier',8.9,'Q1','医学生命','6–8 周','$3,200',0,'https://www.sciencedirect.com/journal/journal-of-biomedical-informatics','J'),
('Artificial Intelligence in Medicine','Elsevier',7.5,'Q1','医学生命','4–6 周','免版面费',0,'https://www.sciencedirect.com/journal/artificial-intelligence-in-medicine','A'),
('计算机学报','中国计算机学会',2.8,'CSCD','计算机','3–5 月','免版面费',0,'https://cjc.ict.ac.cn','学'),
('Nature Machine Intelligence','Springer Nature',17.0,'Q1','计算机','~12 周','€9,500 (OA)',1,'https://www.nature.com/natmachintell','N'),
('Energy & Environmental Science','RSC',13.9,'Q1','物理化学','6–8 周','£3,250 (OA)',1,'https://www.rsc.org/journals/ees','E');

-- 示例培训活动
INSERT IGNORE INTO `training_events` (`title`,`speaker`,`affiliation`,`event_date`,`end_time`,`location`,`event_type`,`platform`,`capacity`,`enrolled_cnt`,`description`,`color`) VALUES
('科学数据分析基础：R 语言与统计可视化','李明远 教授','北京大学','2026-09-15 14:00:00','2026-09-15 16:00:00','线上','线上直播','Zoom',200,128,'本课程将介绍 R 语言基础语法、ggplot2 数据可视化以及常见统计分析方法，适合零基础研究人员。','#2563EB'),
('高水平英文论文写作技巧与投稿策略','张晓华 研究员','中国科学院','2026-09-25 09:30:00','2026-09-25 12:00:00','北京中关村科学城','线下讲座','现场',60,45,'深入讲解 SCI 论文结构、语言规范和期刊选择策略，帮助研究人员提升论文发表成功率。','#7C3AED'),
('文献综述写作方法论：系统综述与 Meta 分析入门','王芳 副教授','浙江大学','2026-10-08 10:00:00','2026-10-08 11:30:00','线上','线上直播','腾讯会议',150,89,'系统介绍文献综述与 Meta 分析的方法论框架，包括 PRISMA 流程和 RevMan 软件使用。','#059669'),
('Python 科学计算入门','陈伟 博士','复旦大学','2026-10-20 14:00:00','2026-10-20 16:00:00','线上','录播课程','B站直播',500,231,'涵盖 NumPy、Pandas、Matplotlib 基础，通过实战案例演示科学数据处理全流程。','#D97706'),
('科研伦理与学术规范讲座','刘海洋 教授','南京大学','2026-11-05 09:00:00','2026-11-05 10:30:00','南京鼓楼校区','线下讲座','现场',100,0,'系统讲解科研诚信要求、数据管理规范以及学术不端行为认定标准。','#DC2626');
