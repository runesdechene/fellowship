-- POURQUOI : les festivals de metal sont un circuit à part pour les exposants (merch, cuir,
-- artisanat sombre) : les ranger dans « Musique » les noie (Uriel, 02/11/2026). Rangé juste à
-- côté de Musique ; couleurs modifiables ensuite depuis l'administration.
insert into public.tags (name, slug, bg_color, text_color, sort_order)
values ('Metal', 'festival-metal', 'hsl(0 65% 40% / 0.1)', 'hsl(0 60% 35%)', 4);
