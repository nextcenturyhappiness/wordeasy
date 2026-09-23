-- DEC-062: a new account with no stored theme preference is light.
-- Existing user_settings.theme values are left unchanged.

alter table public.user_settings
  alter column theme set default 'light';
