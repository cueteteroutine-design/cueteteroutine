UPDATE public.admin_users
SET password_hash = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
    updated_at = now()
WHERE password_hash = '$2a$10$rICvqXBpxBJn8sZ5q5k5XOQIEPqHNF5HkCLvhAoKLqZH5T.Ov0qZC';

CREATE UNIQUE INDEX IF NOT EXISTS admin_sessions_token_unique ON public.admin_sessions(token);