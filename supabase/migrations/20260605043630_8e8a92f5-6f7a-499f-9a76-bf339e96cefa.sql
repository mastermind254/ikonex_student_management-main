
-- Enums
CREATE TYPE public.assessment_type AS ENUM ('CAT1', 'CAT2', 'EXAM');
CREATE TYPE public.gender_type AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- Streams
CREATE TABLE public.streams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subjects
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stream <-> Subject mapping
CREATE TABLE public.stream_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(stream_id, subject_id)
);

-- Students
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  admission_number TEXT NOT NULL UNIQUE,
  gender public.gender_type NOT NULL DEFAULT 'OTHER',
  date_of_birth DATE,
  stream_id UUID REFERENCES public.streams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Terms
CREATE TABLE public.terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  year INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, year)
);

-- Grading scales
CREATE TABLE public.grading_scales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_score NUMERIC(5,2) NOT NULL,
  max_score NUMERIC(5,2) NOT NULL,
  grade TEXT NOT NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scores
CREATE TABLE public.scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  assessment_type public.assessment_type NOT NULL,
  marks NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_id, assessment_type, term_id),
  CHECK (marks >= 0 AND marks <= 100)
);

CREATE INDEX idx_students_stream ON public.students(stream_id);
CREATE INDEX idx_scores_student ON public.scores(student_id);
CREATE INDEX idx_scores_subject_term ON public.scores(subject_id, term_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_streams_updated BEFORE UPDATE ON public.streams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_subjects_updated BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_students_updated BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_scores_updated BEFORE UPDATE ON public.scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.streams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stream_subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.terms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grading_scales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scores TO authenticated;
GRANT ALL ON public.streams, public.subjects, public.stream_subjects, public.students, public.terms, public.grading_scales, public.scores TO service_role;

-- Enable RLS
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- Permissive policies for any authenticated user (single-tenant admin app)
CREATE POLICY "auth_all_streams" ON public.streams FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_subjects" ON public.subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_stream_subjects" ON public.stream_subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_students" ON public.students FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_terms" ON public.terms FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_grading_scales" ON public.grading_scales FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_scores" ON public.scores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed default grading scale (Kenyan-style)
INSERT INTO public.grading_scales (min_score, max_score, grade, remarks) VALUES
  (80, 100, 'A',  'Excellent'),
  (75, 79.99, 'A-', 'Very Good'),
  (70, 74.99, 'B+', 'Good'),
  (65, 69.99, 'B',  'Good'),
  (60, 64.99, 'B-', 'Above Average'),
  (55, 59.99, 'C+', 'Average'),
  (50, 54.99, 'C',  'Average'),
  (45, 49.99, 'C-', 'Below Average'),
  (40, 44.99, 'D+', 'Weak'),
  (35, 39.99, 'D',  'Weak'),
  (30, 34.99, 'D-', 'Poor'),
  (0,  29.99, 'E',  'Fail');

-- Seed default term
INSERT INTO public.terms (name, year, is_active) VALUES ('Term 1', 2026, true);

-- Schema Expansion (Added 2026-06-05)

-- Enums for RBAC and Attendance
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('ADMIN', 'TEACHER', 'BURSAR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.attendance_status AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Profiles table to store user roles and metadata
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'TEACHER',
  full_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Teachers table
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  employee_id TEXT UNIQUE,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Teacher assignments (linking to subjects and streams)
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(teacher_id, stream_id, subject_id)
);

-- Fee Structures
CREATE TABLE IF NOT EXISTS public.fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID REFERENCES public.streams(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(stream_id, term_id)
);

-- Fee Payments
CREATE TABLE IF NOT EXISTS public.fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  method TEXT,
  reference TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Attendance
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.attendance_status NOT NULL DEFAULT 'PRESENT',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, date)
);

-- RLS for new tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Updated at triggers for new tables
DO $$ BEGIN
    CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_teachers_updated BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Permissive policies for any authenticated user (admin app)
DO $$ BEGIN
    CREATE POLICY "auth_all_profiles" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "auth_all_teachers" ON public.teachers FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "auth_all_teacher_assignments" ON public.teacher_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "auth_all_fee_structures" ON public.fee_structures FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "auth_all_fee_payments" ON public.fee_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "auth_all_attendance" ON public.attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_structures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Seeding Data (Added 2026-06-05)
DO $$
DECLARE
    term_id UUID;
    stream_north UUID;
    stream_south UUID;
    stream_east UUID;
    stream_west UUID;
    sub_math UUID;
    sub_eng UUID;
    sub_kis UUID;
    sub_sci UUID;
    teacher_id UUID;
    student_id UUID;
    i INTEGER;
BEGIN
    -- Get active term
    SELECT id INTO term_id FROM public.terms WHERE is_active = true LIMIT 1;

    -- 1. Streams
    INSERT INTO public.streams (name) VALUES ('Form 1 North') ON CONFLICT (name) DO NOTHING RETURNING id INTO stream_north;
    INSERT INTO public.streams (name) VALUES ('Form 1 South') ON CONFLICT (name) DO NOTHING RETURNING id INTO stream_south;
    INSERT INTO public.streams (name) VALUES ('Form 2 North') ON CONFLICT (name) DO NOTHING RETURNING id INTO stream_east;
    INSERT INTO public.streams (name) VALUES ('Form 2 South') ON CONFLICT (name) DO NOTHING RETURNING id INTO stream_west;

    IF stream_north IS NULL THEN SELECT id INTO stream_north FROM public.streams WHERE name = 'Form 1 North'; END IF;
    IF stream_south IS NULL THEN SELECT id INTO stream_south FROM public.streams WHERE name = 'Form 1 South'; END IF;

    -- 2. Subjects
    INSERT INTO public.subjects (name, code) VALUES ('Mathematics', 'MAT') ON CONFLICT (code) DO NOTHING RETURNING id INTO sub_math;
    INSERT INTO public.subjects (name, code) VALUES ('English', 'ENG') ON CONFLICT (code) DO NOTHING RETURNING id INTO sub_eng;
    INSERT INTO public.subjects (name, code) VALUES ('Kiswahili', 'KIS') ON CONFLICT (code) DO NOTHING RETURNING id INTO sub_kis;
    INSERT INTO public.subjects (name, code) VALUES ('Science', 'SCI') ON CONFLICT (code) DO NOTHING RETURNING id INTO sub_sci;

    IF sub_math IS NULL THEN SELECT id INTO sub_math FROM public.subjects WHERE code = 'MAT'; END IF;

    -- 3. Map Subjects to Streams
    INSERT INTO public.stream_subjects (stream_id, subject_id)
    SELECT s.id, sb.id FROM public.streams s, public.subjects sb
    ON CONFLICT DO NOTHING;

    -- 4. Teachers
    INSERT INTO public.teachers (full_name, employee_id) VALUES ('John Doe', 'EMP001') ON CONFLICT (employee_id) DO NOTHING RETURNING id INTO teacher_id;
    INSERT INTO public.teachers (full_name, employee_id) VALUES ('Jane Smith', 'EMP002') ON CONFLICT (employee_id) DO NOTHING;
    INSERT INTO public.teachers (full_name, employee_id) VALUES ('Robert Brown', 'EMP003') ON CONFLICT (employee_id) DO NOTHING;

    -- 5. Teacher Assignments
    IF teacher_id IS NOT NULL THEN
        INSERT INTO public.teacher_assignments (teacher_id, stream_id, subject_id)
        VALUES (teacher_id, stream_north, sub_math) ON CONFLICT DO NOTHING;
    END IF;

    -- 6. Students (Seed 150)
    FOR i IN 1..150 LOOP
        INSERT INTO public.students (full_name, admission_number, gender, stream_id)
        VALUES (
            'Student ' || i, 
            'ADM' || (2026000 + i), 
            CASE WHEN i % 2 = 0 THEN 'MALE'::public.gender_type ELSE 'FEMALE'::public.gender_type END,
            CASE 
                WHEN i <= 40 THEN stream_north 
                WHEN i <= 80 THEN stream_south 
                WHEN i <= 115 THEN stream_east
                ELSE stream_west
            END
        ) ON CONFLICT (admission_number) DO NOTHING RETURNING id INTO student_id;

        -- 7. Scores (Some random scores for the first 50 students)
        IF i <= 50 AND student_id IS NOT NULL THEN
            INSERT INTO public.scores (student_id, subject_id, term_id, assessment_type, marks)
            VALUES (student_id, sub_math, term_id, 'EXAM', 40 + (i * 7 % 55))
            ON CONFLICT DO NOTHING;
        END IF;

        -- 8. Fee Payments
        IF i <= 100 AND student_id IS NOT NULL THEN
            INSERT INTO public.fee_payments (student_id, amount, method)
            VALUES (student_id, 5000 + (i * 100 % 15000), 'MPESA')
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;

    -- 9. Fee Structures
    INSERT INTO public.fee_structures (stream_id, term_id, amount)
    SELECT id, term_id, 35000 FROM public.streams
    ON CONFLICT DO NOTHING;
END $$;
