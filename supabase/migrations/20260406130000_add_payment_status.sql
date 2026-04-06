-- Simple payment status for exposants (private, self-managed)
ALTER TABLE participations ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'a_payer'
  CHECK (payment_status IN ('a_payer', 'en_cours_paiement', 'paye'));
