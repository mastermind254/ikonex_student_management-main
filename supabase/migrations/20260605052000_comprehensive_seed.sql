
-- Comprehensive Seed Data for Ikonex Academy
-- Targets: 150 Students, 20 Teachers, 11 Subjects, 8 Streams

DO $$
DECLARE
    t_id UUID;
    s_id UUID;
    sub_id UUID;
    st_id UUID;
    active_term_id UUID;
    i INTEGER;
    j INTEGER;
    k INTEGER;
    marks_val NUMERIC;
    fee_amt NUMERIC;
    
    -- Arrays for randomization
    first_names TEXT[] := ARRAY['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra'];
    last_names TEXT[] := ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'];
    
    stream_names TEXT[] := ARRAY['Form 1 North', 'Form 1 South', 'Form 2 North', 'Form 2 South', 'Form 3 North', 'Form 3 South', 'Form 4 North', 'Form 4 South'];
    
    subject_data JSONB := '[
        {"n": "Mathematics", "c": "MAT"}, {"n": "English", "c": "ENG"}, {"n": "Kiswahili", "c": "KIS"},
        {"n": "Biology", "c": "BIO"}, {"n": "Chemistry", "c": "CHE"}, {"n": "Physics", "c": "PHY"},
        {"n": "History", "c": "HIS"}, {"n": "Geography", "c": "GEO"}, {"n": "C.R.E", "c": "CRE"},
        {"n": "Agriculture", "c": "AGR"}, {"n": "Computer Studies", "c": "COMP"}
    ]';
    sub_record RECORD;
BEGIN
    -- 0. Ensure an active term exists
    INSERT INTO public.terms (name, year, is_active) 
    VALUES ('Term 2', 2026, true) 
    ON CONFLICT (name, year) DO UPDATE SET is_active = true
    RETURNING id INTO active_term_id;

    -- 1. Create Streams
    FOR i IN 1..array_length(stream_names, 1) LOOP
        INSERT INTO public.streams (name) VALUES (stream_names[i]) ON CONFLICT (name) DO NOTHING;
    END LOOP;

    -- 2. Create Subjects
    FOR sub_record IN SELECT * FROM jsonb_to_recordset(subject_data) AS x(n TEXT, c TEXT) LOOP
        INSERT INTO public.subjects (name, code) VALUES (sub_record.n, sub_record.c) ON CONFLICT (code) DO NOTHING;
    END LOOP;

    -- 3. Create Teachers (20)
    FOR i IN 1..20 LOOP
        INSERT INTO public.teachers (full_name, employee_id, email, phone)
        VALUES (
            first_names[(random() * (array_length(first_names, 1)-1))::int + 1] || ' ' || last_names[(random() * (array_length(last_names, 1)-1))::int + 1],
            'TS' || (1000 + i),
            'teacher' || i || '@ikonex.edu',
            '+2547' || (10000000 + (random() * 89999999))::bigint
        ) ON CONFLICT (employee_id) DO NOTHING;
    END LOOP;

    -- 4. Map All Subjects to All Streams
    INSERT INTO public.stream_subjects (stream_id, subject_id)
    SELECT s.id, sub.id FROM public.streams s, public.subjects sub
    ON CONFLICT DO NOTHING;

    -- 5. Assign Teachers to Subjects/Streams (Randomly)
    FOR s_id IN SELECT id FROM public.streams LOOP
        FOR sub_id IN SELECT id FROM public.subjects LOOP
            SELECT id INTO t_id FROM public.teachers ORDER BY random() LIMIT 1;
            INSERT INTO public.teacher_assignments (teacher_id, stream_id, subject_id)
            VALUES (t_id, s_id, sub_id) ON CONFLICT DO NOTHING;
        END LOOP;
        
        -- 9. Fee Structures (35,000 for Form 1-2, 40,000 for Form 3-4)
        fee_amt := CASE WHEN s_id IN (SELECT id FROM public.streams WHERE name ILIKE 'Form 1%' OR name ILIKE 'Form 2%') THEN 35000 ELSE 42000 END;
        INSERT INTO public.fee_structures (stream_id, term_id, amount)
        VALUES (s_id, active_term_id, fee_amt) ON CONFLICT (stream_id, term_id) DO UPDATE SET amount = EXCLUDED.amount;
    END LOOP;

    -- 6. Register 150 Students
    FOR i IN 1..150 LOOP
        SELECT id INTO s_id FROM public.streams ORDER BY random() LIMIT 1;
        INSERT INTO public.students (full_name, admission_number, gender, stream_id, date_of_birth)
        VALUES (
            first_names[(random() * (array_length(first_names, 1)-1))::int + 1] || ' ' || last_names[(random() * (array_length(last_names, 1)-1))::int + 1],
            'ADM/' || (2600 + i),
            (ARRAY['MALE', 'FEMALE', 'OTHER'])[floor(random() * 3) + 1]::public.gender_type,
            s_id,
            '2010-01-01'::date + (random() * 1500)::int
        ) ON CONFLICT (admission_number) DO NOTHING 
        RETURNING id INTO st_id;

        IF st_id IS NOT NULL THEN
            -- 7. Scores for 6 random subjects per student
            FOR sub_id IN SELECT id FROM public.subjects ORDER BY random() LIMIT 6 LOOP
                -- CAT 1 (0-100)
                INSERT INTO public.scores (student_id, subject_id, term_id, assessment_type, marks)
                VALUES (st_id, sub_id, active_term_id, 'CAT1', 40 + (random() * 55)) ON CONFLICT DO NOTHING;
                -- CAT 2
                INSERT INTO public.scores (student_id, subject_id, term_id, assessment_type, marks)
                VALUES (st_id, sub_id, active_term_id, 'CAT2', 40 + (random() * 55)) ON CONFLICT DO NOTHING;
                -- EXAM
                INSERT INTO public.scores (student_id, subject_id, term_id, assessment_type, marks)
                VALUES (st_id, sub_id, active_term_id, 'EXAM', 35 + (random() * 60)) ON CONFLICT DO NOTHING;
            END LOOP;

            -- 8. Random Fee Payments
            IF random() > 0.1 THEN -- 90% have paid something
                INSERT INTO public.fee_payments (student_id, amount, payment_date, method, reference)
                VALUES (st_id, 10000 + (random() * 25000)::int, CURRENT_DATE - (random() * 30)::int, 'MPESA', 'REF' || (random()*100000)::int);
            END IF;
            
            -- 10. Attendance for last 3 days
            FOR j IN 0..2 LOOP
                INSERT INTO public.attendance (student_id, date, status)
                VALUES (st_id, CURRENT_DATE - j, CASE WHEN random() > 0.05 THEN 'PRESENT'::public.attendance_status ELSE 'ABSENT'::public.attendance_status END)
                ON CONFLICT DO NOTHING;
            END LOOP;
        END IF;
    END LOOP;

END $$;
