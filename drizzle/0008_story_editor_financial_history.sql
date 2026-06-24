ALTER TABLE story_posts ADD COLUMN editorState text;

CREATE TABLE reservation_financial_events (
  id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  reservationId int NOT NULL,
  storeId int NOT NULL,
  actorRole enum('store','therapist','customer','admin') NOT NULL DEFAULT 'store',
  actorId int NOT NULL,
  eventType enum('financial_adjustment','status_change','payroll_recalculation') NOT NULL DEFAULT 'financial_adjustment',
  beforeTotal int NOT NULL DEFAULT 0,
  afterTotal int NOT NULL DEFAULT 0,
  optionAmount int NOT NULL DEFAULT 0,
  discountAmount int NOT NULL DEFAULT 0,
  detail text,
  note text,
  createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reservation_financial_events_reservation (reservationId),
  INDEX idx_reservation_financial_events_store (storeId)
);
