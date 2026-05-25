-- Défense en profondeur sur un endpoint d'insert public (anon) : format + longueur de l'email.
alter table public.organizer_waitlist
  add constraint organizer_waitlist_email_format
  check (
    char_length(email) <= 320
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  );
