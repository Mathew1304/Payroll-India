-- Function to generate a random invitation code
CREATE OR REPLACE FUNCTION public.generate_invitation_code()
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    chars text[] := '{0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z}';
    result text := '';
    i integer;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || chars[1+floor(random()*array_length(chars, 1))::integer];
    END LOOP;
    RETURN result;
END;
$function$;

-- Function to generate an onboarding token (UUID)
CREATE OR REPLACE FUNCTION public.generate_onboarding_token()
RETURNS uuid
LANGUAGE sql
AS $$
  SELECT gen_random_uuid();
$$;
