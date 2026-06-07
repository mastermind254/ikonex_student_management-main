
-- Phase 5 Schema Expansion: Advanced Modules

-- 1. Lesson Plans for Teachers
CREATE TABLE IF NOT EXISTS public.lesson_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  objectives TEXT,
  resources TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Scholarships & Discounts for students
CREATE TABLE IF NOT EXISTS public.scholarships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  awarded_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. School Expenses (Bursar)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- e.g., 'SALARY', 'SUPPLIES', 'MAINTENANCE', 'UTILITIES'
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  expense_date DATE DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Lesson Plans Policies
DO $$ BEGIN
    CREATE POLICY "Teachers can manage own lesson plans" ON public.lesson_plans FOR ALL TO authenticated USING (
      EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = lesson_plans.teacher_id AND t.profile_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Expenses & Scholarships Policies (Admin & Bursar only)
DO $$ BEGIN
    CREATE POLICY "Admin and Bursar manage finance" ON public.expenses FOR ALL TO authenticated USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'BURSAR'))
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Admin and Bursar manage scholarships" ON public.scholarships FOR ALL TO authenticated USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'BURSAR'))
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Triggers for updated_at
DO $$ BEGIN
    CREATE TRIGGER trg_lesson_plans_updated BEFORE UPDATE ON public.lesson_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Grants
GRANT ALL ON public.lesson_plans TO authenticated;
GRANT ALL ON public.scholarships TO authenticated;
GRANT ALL ON public.expenses TO authenticated;
