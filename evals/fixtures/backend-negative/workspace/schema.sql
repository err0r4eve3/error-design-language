-- Offline example schema; no connection or database execution is required.
CREATE TABLE customers (id bigint PRIMARY KEY, email text NOT NULL);
CREATE INDEX customers_email_idx ON customers (email);
