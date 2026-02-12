-- Add 'control_calidad' to the os_status enum (NOT service_order_status)
-- Verified in 01_initial_schema.sql: create type os_status as enum ('abierta', 'en_proceso', 'finalizada', 'facturada');

ALTER TYPE "public"."os_status" ADD VALUE IF NOT EXISTS 'control_calidad' AFTER 'en_proceso';
