-- POURQUOI : 20261016160000 a posé des index d'expression sur phone_key(phone) (users et
-- prospects). Postgres évalue l'expression d'un index avec les droits de celui qui écrit la ligne :
-- comme 20261016140000 avait retiré EXECUTE sur phone_key à authenticated, toute écriture qui
-- recalcule l'index échouait (« permission denied for function phone_key ») — l'import des
-- prospects, et potentiellement la mise à jour d'une ligne users. phone_key est une fonction pure,
-- immuable, sans lecture de données : elle s'ouvre à tous les rôles.
grant execute on function public.phone_key(text) to anon, authenticated;
