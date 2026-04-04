-- Fix: handle_new_user trigger needs explicit search_path
-- Without it, the function can't find 'profiles' table or 'user_type' enum
-- when called from the auth schema context
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'public')::user_type
  );
  RETURN NEW;
END;
$$;
