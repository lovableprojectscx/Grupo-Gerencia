-- 1. Add registration_number column to certificates if it doesn't exist
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'certificates' and column_name = 'registration_number') then
    alter table certificates add column registration_number integer;
  end if;
end $$;

-- 2. Create or Replace the function to generate certificates with sequential numbers
create or replace function generate_certificate_v2(
  p_enrollment_id uuid,
  p_preferences jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_enrollment record;
  v_course_id uuid;
  v_certificate_id uuid;
  v_registration_code integer;
  v_existing_cert_id uuid;
  v_metadata jsonb;
begin
  -- Get enrollment details
  select * into v_enrollment
  from enrollments
  where id = p_enrollment_id;

  if not found then
    raise exception 'Enrollment not found';
  end if;

  v_course_id := v_enrollment.course_id;

  -- Check if certificate already exists for this enrollment
  select id into v_existing_cert_id
  from certificates
  where enrollment_id = p_enrollment_id;

  if v_existing_cert_id is not null then
    -- Return existing certificate
    return jsonb_build_object('id', v_existing_cert_id, 'is_new', false);
  end if;

  -- Calculate next registration number for THIS COURSE
  -- We count certificates linked to enrollments of this course
  select coalesce(max(c.registration_number), 100) + 1
  into v_registration_code
  from certificates c
  join enrollments e on c.enrollment_id = e.id
  where e.course_id = v_course_id;

  -- Prepare metadata
  v_metadata := p_preferences || jsonb_build_object(
    'generated_at', now(),
    'registration_number', v_registration_code
  );

  -- Insert new certificate
  insert into certificates (
    enrollment_id,
    code, -- We can keep using UUID or a combined string for the unique code string column if it exists
    metadata,
    registration_number
  ) values (
    p_enrollment_id,
    gen_random_uuid(), -- Assuming 'code' column is text/uuid and we just give it a unique value
    v_metadata,
    v_registration_code
  )
  returning id into v_certificate_id;

  return jsonb_build_object(
    'id', v_certificate_id, 
    'registration_number', v_registration_code,
    'is_new', true
  );
end;
$$;
