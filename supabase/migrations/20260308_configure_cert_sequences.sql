-- ==============================================================================
-- Migration: Add course sequence config functions and missing delete RPC
-- ==============================================================================

-- 1. Function to get current sequence number for a course
CREATE OR REPLACE FUNCTION get_course_certificate_sequence(p_course_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_last_number integer;
BEGIN
    SELECT last_number INTO v_last_number 
    FROM course_certificate_sequences 
    WHERE course_id = p_course_id;

    -- If no sequence exists yet, default is 100 according to earlier migrations
    IF NOT FOUND THEN
        v_last_number := 100;
    END IF;

    RETURN json_build_object('last_number', v_last_number);
END;
$$;

-- 2. Function to update sequence number for a course
CREATE OR REPLACE FUNCTION update_course_certificate_sequence(p_course_id uuid, p_start_number integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_max integer;
BEGIN
    -- Check what the highest generated certificate number actually is
    SELECT max(registration_number) INTO v_current_max
    FROM certificates c
    JOIN enrollments e ON c.enrollment_id = e.id
    WHERE e.course_id = p_course_id;

    -- Validation: prevent setting the sequence below what has already been issued
    -- unless no certificates have been issued yet
    IF v_current_max IS NOT NULL AND p_start_number < v_current_max THEN
        RAISE EXCEPTION 'No se puede establecer la base en %, ya que existen certificados emitidos con número superior (%) para este curso.', p_start_number, v_current_max;
    END IF;

    -- Insert or update the sequence
    INSERT INTO course_certificate_sequences (course_id, last_number)
    VALUES (p_course_id, p_start_number)
    ON CONFLICT (course_id) DO UPDATE 
    SET last_number = EXCLUDED.last_number;

    RETURN json_build_object('success', true, 'new_last_number', p_start_number);
END;
$$;

-- 3. Fix: create missing delete_certificate_reclaim_number function
CREATE OR REPLACE FUNCTION delete_certificate_reclaim_number(p_certificate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cert_record record;
    v_course_id uuid;
    v_current_seq integer;
BEGIN
    -- Get the certificate to be deleted
    SELECT c.registration_number, e.course_id INTO v_cert_record
    FROM certificates c
    JOIN enrollments e ON c.enrollment_id = e.id
    WHERE c.id = p_certificate_id;

    -- If certificate doesn't exist, we just exit silently
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    v_course_id := v_cert_record.course_id;

    -- Delete the certificate
    DELETE FROM certificates WHERE id = p_certificate_id;

    -- Check if we should decrement the sequence
    -- We only decrement it logically IF the deleted certificate was the absolute LAST one generated
    -- (matching exactly the current last_number in the sequence table)
    SELECT last_number INTO v_current_seq 
    FROM course_certificate_sequences 
    WHERE course_id = v_course_id;

    IF v_current_seq IS NOT NULL AND v_current_seq = v_cert_record.registration_number THEN
        -- Only go backwards if we exceed 100, which is the default start
        IF v_current_seq > 100 THEN
            UPDATE course_certificate_sequences 
            SET last_number = last_number - 1 
            WHERE course_id = v_course_id;
        END IF;
    END IF;
END;
$$;
