/*
 Deleting a product cascades to its variants, but inventory_log held those
 variants with ON DELETE no action, so every product created through the app
 or the CSV importer was undeletable. Rebuild the table with a cascade.

 order_items keeps ON DELETE no action on variant_id deliberately: a product
 that appears in a real order must still be archived rather than deleted.
*/
CREATE TABLE `inventory_log_new` (
	`id` text PRIMARY KEY NOT NULL,
	`variant_id` text NOT NULL,
	`previous` integer NOT NULL,
	`adjustment` integer NOT NULL,
	`quantity` integer NOT NULL,
	`reason` text NOT NULL,
	`actor` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `inventory_log_new` (`id`,`variant_id`,`previous`,`adjustment`,`quantity`,`reason`,`actor`,`created_at`)
SELECT `id`,`variant_id`,`previous`,`adjustment`,`quantity`,`reason`,`actor`,`created_at` FROM `inventory_log`;
--> statement-breakpoint
DROP TABLE `inventory_log`;
--> statement-breakpoint
ALTER TABLE `inventory_log_new` RENAME TO `inventory_log`;
--> statement-breakpoint
CREATE INDEX `inventory_variant` ON `inventory_log` (`variant_id`);
