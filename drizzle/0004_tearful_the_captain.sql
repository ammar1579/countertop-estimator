CREATE TABLE `orderLineItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`sourceQuoteLineItemId` int,
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
	CONSTRAINT `orderLineItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
INSERT INTO `orderLineItems` (
	`orderId`,
	`sourceQuoteLineItemId`,
	`areaLabel`,
	`priceListItemId`,
	`category`,
	`description`,
	`quantity`,
	`unit`,
	`pricePerUnit`,
	`lineTotal`,
	`sortOrder`,
	`createdAt`
)
SELECT
	`orders`.`id`,
	`quoteLineItems`.`id`,
	`quoteLineItems`.`areaLabel`,
	`quoteLineItems`.`priceListItemId`,
	`quoteLineItems`.`category`,
	`quoteLineItems`.`description`,
	`quoteLineItems`.`quantity`,
	`quoteLineItems`.`unit`,
	`quoteLineItems`.`pricePerUnit`,
	`quoteLineItems`.`lineTotal`,
	`quoteLineItems`.`sortOrder`,
	now()
FROM `orders`
INNER JOIN `quoteLineItems` ON `quoteLineItems`.`quoteId` = `orders`.`quoteId`;
