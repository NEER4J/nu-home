-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Feb 20, 2026 at 02:10 AM
-- Server version: 10.11.15-MariaDB-cll-lve
-- PHP Version: 8.4.17

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `quotebuilderpro_boilerbuilder_NUhomes`
--

-- --------------------------------------------------------

--
-- Table structure for table `tbl_ev_brand`
--

CREATE TABLE `tbl_ev_brand` (
  `id` int(11) NOT NULL,
  `ev_brand_name` varchar(200) NOT NULL,
  `ev_brand_logo` varchar(265) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;

--
-- Dumping data for table `tbl_ev_brand`
--

INSERT INTO `tbl_ev_brand` (`id`, `ev_brand_name`, `ev_brand_logo`, `created_at`, `updated_at`) VALUES
(2, 'BMW', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/bmw-logo.png', '2025-06-26 07:55:04', '2025-09-02 07:54:27'),
(3, 'Audi', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/audi.png', '2025-06-26 08:17:21', '2025-09-02 07:54:11'),
(4, 'BYD Auto', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/byd.png', '2025-09-02 07:54:44', '2025-09-02 07:54:44'),
(5, 'Chevrolet', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/chevrolet.png', '2025-09-02 07:55:29', '2025-09-02 07:55:29'),
(6, 'Citroen', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/citreon.png', '2025-09-02 07:56:04', '2025-09-02 07:56:04'),
(7, 'CUPRA', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/cupra-logo.png', '2025-09-02 07:56:39', '2025-09-02 07:56:39'),
(8, 'DS Automobiles', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/ds.png', '2025-09-02 07:57:24', '2025-09-02 07:57:24'),
(9, 'Energica', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/Energica.png', '2025-09-02 07:58:15', '2025-09-02 07:58:15'),
(10, 'Fiat', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/fiat-logo.png', '2025-09-02 07:58:37', '2025-09-02 07:58:37'),
(11, 'Ford', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/ford.png', '2025-09-02 07:58:53', '2025-09-02 07:58:53'),
(12, 'Fuso', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/Fuso.png', '2025-09-02 07:59:12', '2025-09-02 07:59:12'),
(13, 'Honda', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/honda.png', '2025-09-02 09:40:47', '2025-09-02 09:40:47'),
(14, 'Hyundai', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/hyundai.png', '2025-09-02 09:42:28', '2025-09-02 09:42:28'),
(15, 'Jaguar', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/jaguar.png', '2025-09-02 09:45:11', '2025-09-02 09:45:11'),
(16, 'Jeep', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/jeep.png', '2025-09-02 09:45:29', '2025-09-02 09:45:29'),
(17, 'Kia', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/kia.png', '2025-09-02 09:45:42', '2025-09-02 09:45:42'),
(18, 'Land Rover', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/land-rover.png', '2025-09-02 09:46:06', '2025-09-02 09:46:06'),
(19, 'LDV', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/ldv-car-logo.png', '2025-09-02 09:57:43', '2025-09-02 09:57:43'),
(20, 'LEXUS', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/lexus-logo.png', '2025-09-02 09:58:10', '2025-09-02 09:58:10'),
(21, 'Mahindra', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/mahindra.png', '2025-09-02 09:58:34', '2025-09-02 09:58:34'),
(22, 'Mercedes-Benz', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/mercedes.png', '2025-09-02 10:00:12', '2025-09-02 10:00:12'),
(23, 'MG', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/mg.png', '2025-09-02 10:02:29', '2025-09-02 10:02:29'),
(24, 'Mini', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/mini.png', '2025-09-02 10:02:47', '2025-09-02 10:02:47'),
(25, 'Mitsubishi', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/mitsubishi.png', '2025-09-02 10:03:45', '2025-09-02 10:03:45'),
(26, 'Nissan', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/nissan.png', '2025-09-02 10:04:16', '2025-09-02 10:04:16'),
(27, 'Peugeot', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/peugeot.png', '2025-09-02 10:05:04', '2025-09-02 10:05:04'),
(28, 'Porsche', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/porsche.png', '2025-09-02 10:07:23', '2025-09-02 10:07:23'),
(29, 'Range Rover', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/range-rover.png', '2025-09-02 10:07:53', '2025-09-02 10:07:53'),
(30, 'Renault', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/renault.png', '2025-09-02 10:08:14', '2025-09-02 10:08:14'),
(31, 'Seat', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/seat.png', '2025-09-02 10:08:33', '2025-09-02 10:08:33'),
(32, 'Skoda', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/skoda.png', '2025-09-02 10:08:46', '2025-09-02 10:08:46'),
(33, 'Smart EQ', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/smart.png', '2025-09-02 10:09:13', '2025-09-02 10:09:13'),
(34, 'Toyota', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/toyota.png', '2025-09-02 10:09:29', '2025-09-02 10:09:29'),
(35, 'Vauxhall', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/vauxhall.png', '2025-09-02 10:09:46', '2025-09-02 10:09:46'),
(36, 'Volkswagen', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/Volkswagen.png', '2025-09-02 10:10:02', '2025-09-02 10:10:02'),
(37, 'Volvo', 'https://ev-charger-images.b-cdn.net/Car_Brand_Logo/volvo.png', '2025-09-02 10:11:11', '2025-09-02 10:11:11');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tbl_ev_brand`
--
ALTER TABLE `tbl_ev_brand`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `tbl_ev_brand`
--
ALTER TABLE `tbl_ev_brand`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
