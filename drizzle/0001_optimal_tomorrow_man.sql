CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`email` varchar(320),
	`phone` varchar(30),
	`address` text,
	`city` varchar(100),
	`province` varchar(50) DEFAULT 'Ontario',
	`postalCode` varchar(10),
	`company` varchar(200),
	`leadSource` enum('Website','Phone','Referral','Walk-in','Other') DEFAULT 'Other',
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`colorName` varchar(200) NOT NULL,
	`brand` varchar(100),
	`thickness` varchar(20) DEFAULT '3cm',
	`slabWidth` decimal(8,2),
	`slabHeight` decimal(8,2),
	`quantity` int NOT NULL DEFAULT 0,
	`location` varchar(100),
	`costPerSqft` decimal(10,2),
	`lowStockThreshold` int DEFAULT 2,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(30) NOT NULL,
	`quoteId` int NOT NULL,
	`clientId` int NOT NULL,
	`salespersonId` int,
	`title` varchar(300) NOT NULL,
	`projectStatus` enum('Pending','In Progress','Completed','Invoiced') NOT NULL DEFAULT 'Pending',
	`paymentStatus` enum('Unpaid','Partial','Paid') NOT NULL DEFAULT 'Unpaid',
	`priceListId` int,
	`totalSqft` decimal(10,2) DEFAULT '0.00',
	`subtotal` decimal(10,2) DEFAULT '0.00',
	`taxAmount` decimal(10,2) DEFAULT '0.00',
	`totalAmount` decimal(10,2) DEFAULT '0.00',
	`amountPaid` decimal(10,2) DEFAULT '0.00',
	`notes` text,
	`scheduledDate` timestamp,
	`completedAt` timestamp,
	`invoicedAt` timestamp,
	`saleDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`method` enum('Cash','Cheque','Credit Card','E-Transfer','Other') DEFAULT 'Other',
	`reference` varchar(100),
	`notes` text,
	`paidAt` timestamp NOT NULL DEFAULT (now()),
	`recordedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `priceListItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`priceListId` int NOT NULL,
	`category` enum('material','edge','splash','accessory','fixture') NOT NULL,
	`name` varchar(200) NOT NULL,
	`brand` varchar(100),
	`colorCode` varchar(50),
	`unit` enum('sqft','linft','each') NOT NULL,
	`pricePerUnit` decimal(10,2) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `priceListItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `priceLists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`revision` int NOT NULL DEFAULT 1,
	`isActive` boolean NOT NULL DEFAULT true,
	`wasteFactor` decimal(5,4) DEFAULT '0.0800',
	`taxRate` decimal(5,4) DEFAULT '0.1300',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `priceLists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quoteEmailLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteId` int NOT NULL,
	`sentBy` int,
	`sentTo` varchar(320) NOT NULL,
	`subject` varchar(300),
	`revision` int NOT NULL,
	`viewCount` int DEFAULT 0,
	`lastViewedAt` timestamp,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quoteEmailLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quoteLineItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteId` int NOT NULL,
	`areaLabel` varchar(100) DEFAULT 'Area #1',
	`priceListItemId` int,
	`category` enum('material','edge','splash','accessory','fixture') NOT NULL,
	`description` varchar(300) NOT NULL,
	`quantity` decimal(10,2) NOT NULL,
	`unit` enum('sqft','linft','each') NOT NULL,
	`pricePerUnit` decimal(10,2) NOT NULL,
	`lineTotal` decimal(10,2) NOT NULL,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quoteLineItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quoteRevisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteId` int NOT NULL,
	`revision` int NOT NULL,
	`changedBy` int,
	`changeNote` text,
	`snapshotData` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quoteRevisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteNumber` varchar(30) NOT NULL,
	`clientId` int NOT NULL,
	`priceListId` int NOT NULL,
	`salespersonId` int,
	`status` enum('Draft','Active','Expired') NOT NULL DEFAULT 'Draft',
	`revision` int NOT NULL DEFAULT 1,
	`title` varchar(300) NOT NULL,
	`notes` text,
	`internalNotes` text,
	`paymentTerms` varchar(100) DEFAULT 'No Deposit',
	`expiresAt` timestamp,
	`sentAt` timestamp,
	`lastViewedAt` timestamp,
	`viewCount` int DEFAULT 0,
	`signatureData` text,
	`signedAt` timestamp,
	`canvasData` json,
	`subtotal` decimal(10,2) DEFAULT '0.00',
	`taxAmount` decimal(10,2) DEFAULT '0.00',
	`totalAmount` decimal(10,2) DEFAULT '0.00',
	`totalSqft` decimal(10,2) DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotes_id` PRIMARY KEY(`id`),
	CONSTRAINT `quotes_quoteNumber_unique` UNIQUE(`quoteNumber`)
);
