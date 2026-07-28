-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: mod3
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `adm`
--

DROP TABLE IF EXISTS `adm`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `adm` (
  `ID_ADM` int NOT NULL AUTO_INCREMENT,
  `NOME_ADM` varchar(100) NOT NULL,
  `EMAIL_ADM` varchar(100) NOT NULL,
  `CPF_ADM` varchar(100) NOT NULL,
  `TELEFONE_ADM` varchar(20) NOT NULL,
  `CARGO_ADM` varchar(100) NOT NULL,
  `SETOR_ADM` varchar(100) NOT NULL,
  `WHATSAPP_ADM` varchar(255) DEFAULT NULL,
  `SENHA_ADM` varchar(255) NOT NULL,
  PRIMARY KEY (`ID_ADM`),
  UNIQUE KEY `CPF` (`CPF_ADM`),
  UNIQUE KEY `TELEFONE` (`TELEFONE_ADM`),
  UNIQUE KEY `EMAIL` (`EMAIL_ADM`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `adm`
--

LOCK TABLES `adm` WRITE;
/*!40000 ALTER TABLE `adm` DISABLE KEYS */;
INSERT INTO `adm` VALUES (4,'Cleidson','cleiamorim@gmail.com','00000000001','31900000000','Scientist Data','TI','3190000000','scrypt:32768:8:1$k7Ay3OhAc1JRfJ9M$3ad23a58bdbf9d124e4a57978e6102d74b289c296ac5901ab90cfc1ad3f5d5dc871a35a5d1e2bb6fb4962fc74a920a006f67205099c9b4f1a5f2d7697431bea9');
/*!40000 ALTER TABLE `adm` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `funcionarios`
--

DROP TABLE IF EXISTS `funcionarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `funcionarios` (
  `ID_FUN` int NOT NULL AUTO_INCREMENT,
  `NOME_FUN` varchar(100) NOT NULL,
  `EMAIL_FUN` varchar(100) NOT NULL,
  `CPF_FUN` varchar(20) NOT NULL,
  `TELEFONE_FUN` varchar(20) NOT NULL,
  `CARGO_FUN` varchar(100) NOT NULL,
  `SETOR_FUN` varchar(100) NOT NULL,
  `WHATSAPP_FUN` varchar(255) DEFAULT NULL,
  `SENHA_FUN` varchar(255) NOT NULL,
  PRIMARY KEY (`ID_FUN`),
  UNIQUE KEY `CPF` (`CPF_FUN`),
  UNIQUE KEY `TELEFONE` (`TELEFONE_FUN`),
  UNIQUE KEY `EMAIL` (`EMAIL_FUN`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `funcionarios`
--

LOCK TABLES `funcionarios` WRITE;
/*!40000 ALTER TABLE `funcionarios` DISABLE KEYS */;
INSERT INTO `funcionarios` VALUES (19,'Arthur','arthur123@gmail.com','000.000.000-02','31900000000','dona','ti','31900000000','scrypt:32768:8:1$hlZCOCCuqGbPiRo3$ff5773b4fcf1049dc02f0a6d1a30510068026812467e4ac3c57bbcf897b22735471e39a30adada601c6d54662cbc51bfeb8ad17c7813ae0786116a3d6484e4d7'),(20,'Davi','davipadua21@gmail.com','146.617.746-20','31971231859','Dono','ti','31971231859','scrypt:32768:8:1$AUy5Qx3W9NedNxfb$30ba1f695174beec10b883dd6280d6311a43223aca021e4c3204a5de65039827aff7f58691d00a6e7e1b564be7f0efeadb76af832215ed6d68642e2a3467b068');
/*!40000 ALTER TABLE `funcionarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `relatorio`
--

DROP TABLE IF EXISTS `relatorio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `relatorio` (
  `ID_REL` int NOT NULL AUTO_INCREMENT,
  `ID_FUN` int DEFAULT NULL,
  `ID_TREIN` int DEFAULT NULL,
  `DATA_REALIZACAO` date DEFAULT NULL,
  `DATA_VENCIMENTO` date DEFAULT NULL,
  PRIMARY KEY (`ID_REL`),
  KEY `ID_FUN` (`ID_FUN`),
  KEY `ID_TREIN` (`ID_TREIN`),
  CONSTRAINT `relatorio_ibfk_1` FOREIGN KEY (`ID_FUN`) REFERENCES `funcionarios` (`ID_FUN`),
  CONSTRAINT `relatorio_ibfk_2` FOREIGN KEY (`ID_TREIN`) REFERENCES `treinamentos` (`ID_TREIN`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `relatorio`
--

LOCK TABLES `relatorio` WRITE;
/*!40000 ALTER TABLE `relatorio` DISABLE KEYS */;
INSERT INTO `relatorio` VALUES (11,19,8,'2026-07-04','2027-07-04'),(12,19,8,'2026-07-04','2027-07-04'),(13,20,8,'2026-07-04','2027-07-04');
/*!40000 ALTER TABLE `relatorio` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `treinamentos`
--

DROP TABLE IF EXISTS `treinamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `treinamentos` (
  `ID_TREIN` int NOT NULL AUTO_INCREMENT,
  `NOME_NR` varchar(20) NOT NULL,
  `VALIDADE_DIAS` int NOT NULL,
  `DESCRICAO_NR` text,
  PRIMARY KEY (`ID_TREIN`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `treinamentos`
--

LOCK TABLES `treinamentos` WRITE;
/*!40000 ALTER TABLE `treinamentos` DISABLE KEYS */;
INSERT INTO `treinamentos` VALUES (8,'NR-60',365,NULL);
/*!40000 ALTER TABLE `treinamentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lixeira`
--
-- Guarda uma cópia (em JSON) de qualquer registro excluído das tabelas
-- `funcionarios`, `adm`, `treinamentos` e `relatorio`, permitindo restaurar
-- os dados depois pela tela "Lixeira". O app também cria esta tabela
-- automaticamente na inicialização (ver garantir_tabela_lixeira em app.py),
-- então esta definição aqui é só para quem estiver montando o banco do zero
-- a partir deste dump.
--

DROP TABLE IF EXISTS `lixeira`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lixeira` (
  `ID_LIXEIRA` int NOT NULL AUTO_INCREMENT,
  `TABELA_ORIGEM` varchar(50) NOT NULL,
  `ID_ORIGINAL` int NOT NULL,
  `DADOS` json NOT NULL,
  `EXCLUIDO_POR` varchar(150) DEFAULT NULL,
  `DATA_EXCLUSAO` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_LIXEIRA`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-07 18:39:01
