-- ============================================================
-- THE SINGULAR CHOICE — Luxury Concierge CRM
-- Supabase Migration 001: Initial Schema
-- Proyecto: jrwduzbpudwezpaictiv
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────
-- CONTACTS (Clientes / Leads)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  status        TEXT NOT NULL DEFAULT 'Lead Frío'
                  CHECK (status IN ('Lead Frío','Llamada Agendada','Cliente Potencial','Cliente Activo')),
  last_interaction TEXT NOT NULL DEFAULT NOW()::TEXT,
  notes_text    TEXT,
  summary_ai    TEXT,
  -- Luxury fields
  telegram_chat_id  TEXT,               -- para notificaciones directas al cliente
  lifestyle_prefs   JSONB DEFAULT '{}', -- talla zapato, almohada, alergias, etc.
  passport_expiry   DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_email ON contacts(email);

-- ────────────────────────────────────────────────────────────
-- CONTACT NOTES (Notas de IA por contacto)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_notes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id        UUID REFERENCES contacts(id) ON DELETE CASCADE,
  key_points        TEXT[] DEFAULT '{}',
  next_steps        TEXT[] DEFAULT '{}',
  suggested_status  TEXT,
  reasoning         TEXT,
  sentiment_score   NUMERIC(3,2),
  ai_health_score   NUMERIC(3,2),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_contact_id ON contact_notes(contact_id);

-- ────────────────────────────────────────────────────────────
-- EMAIL LOGS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id  UUID REFERENCES contacts(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,
  sent_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_logs_contact_id ON email_logs(contact_id);

-- ────────────────────────────────────────────────────────────
-- CALENDAR EVENTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id    UUID REFERENCES contacts(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  start_time    TIMESTAMPTZ NOT NULL,
  end_time      TIMESTAMPTZ NOT NULL,
  meeting_link  TEXT,
  status        TEXT NOT NULL DEFAULT 'Pendiente'
                  CHECK (status IN ('Pendiente','Confirmada','Completada','Cancelada')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_contact_id ON calendar_events(contact_id);

-- ────────────────────────────────────────────────────────────
-- QUOTES (Cotizaciones de viaje)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id      UUID REFERENCES contacts(id) ON DELETE CASCADE,
  quote_number    TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  issue_date      TEXT NOT NULL,
  valid_until     TEXT NOT NULL,
  company_name    TEXT,
  company_nif     TEXT,
  items           JSONB NOT NULL DEFAULT '[]',
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_total       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_terms   TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'Borrador'
                    CHECK (status IN ('Borrador','Enviado','Abierto','Aceptado','Rechazado')),
  next_contact_date TEXT,
  -- Stripe integration
  stripe_payment_intent_id TEXT,
  deposit_paid    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quotes_contact_id ON quotes(contact_id);

-- ────────────────────────────────────────────────────────────
-- CLIENT PORTALS (Portal VIP del cliente)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_portals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id    UUID REFERENCES contacts(id) ON DELETE CASCADE UNIQUE,
  share_token   TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  active        BOOLEAN DEFAULT TRUE,
  -- Luxury itinerary
  destination   TEXT,
  travel_start  DATE,
  travel_end    DATE,
  mood_narrative TEXT,         -- Groq AI: narrativa emocional del viaje
  countdown_label TEXT,        -- "Su refugio en Botsuana le espera en"
  -- Progress bar artesanal
  preparation_steps JSONB DEFAULT '[]', -- [{"label": "Reservando villa...", "done": false}]
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_portals_contact_id ON client_portals(contact_id);
CREATE INDEX idx_portals_share_token ON client_portals(share_token);

-- ────────────────────────────────────────────────────────────
-- PORTAL TASKS (Checklist del itinerario)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_tasks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id     UUID REFERENCES client_portals(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  -- Luxury storytelling levels
  level1_title      TEXT,    -- "Cena bajo las estrellas en el desierto"
  level2_logistics  TEXT,    -- Matrícula, nombre guía, menú
  level3_narrative  TEXT,    -- "El porqué": nota del experto
  task_order    INT DEFAULT 0,
  due_date      DATE,
  is_completed  BOOLEAN DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  image_url     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_portal_tasks_portal_id ON portal_tasks(portal_id);

-- ────────────────────────────────────────────────────────────
-- PORTAL RESOURCES (Documentos descargables en el portal)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_resources (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id   UUID REFERENCES client_portals(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  url         TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- DOCUMENTS (Subida de archivos por el asesor)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id  UUID REFERENCES contacts(id) ON DELETE CASCADE,
  portal_id   UUID REFERENCES client_portals(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  file_path   TEXT NOT NULL,   -- path en Supabase Storage
  file_size   BIGINT,
  mime_type   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_contact_id ON documents(contact_id);
CREATE INDEX idx_documents_portal_id ON documents(portal_id);

-- ────────────────────────────────────────────────────────────
-- STRIPE PAYMENTS (Pagos de clientes)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stripe_payments (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id            UUID REFERENCES contacts(id) ON DELETE SET NULL,
  quote_id              UUID REFERENCES quotes(id) ON DELETE SET NULL,
  stripe_payment_intent TEXT NOT NULL UNIQUE,
  amount                NUMERIC(12,2) NOT NULL,
  currency              TEXT DEFAULT 'eur',
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','succeeded','failed','refunded')),
  description           TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stripe_payments_contact_id ON stripe_payments(contact_id);

-- ────────────────────────────────────────────────────────────
-- LUXURY EXPERIENCES (Experiencias generadas por Groq AI)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS luxury_experiences (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id    UUID REFERENCES contacts(id) ON DELETE CASCADE,
  destination   TEXT,
  mood_tags     TEXT[],              -- ['minimalismo','silencio','naturaleza']
  narrative     TEXT NOT NULL,       -- Narrativa inmersiva generada por Groq
  feeling_title TEXT,                -- "Pursuit of Feeling: La Antártida Interior"
  sent_to_portal BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_experiences_contact_id ON luxury_experiences(contact_id);

-- ────────────────────────────────────────────────────────────
-- BOT MESSAGES (Historial de mensajes Telegram)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bot_messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id    UUID REFERENCES contacts(id) ON DELETE SET NULL,
  direction     TEXT CHECK (direction IN ('outbound','inbound')),
  channel       TEXT DEFAULT 'telegram' CHECK (channel IN ('telegram','whatsapp')),
  message_text  TEXT,
  telegram_msg_id TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bot_messages_contact_id ON bot_messages(contact_id);

-- ────────────────────────────────────────────────────────────
-- PORTAL ACTIVITY (Log de actividad en el portal)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_activity (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id     UUID REFERENCES client_portals(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL
                  CHECK (activity_type IN (
                    'portal_accessed','task_completed','comment',
                    'resource_viewed','quote_accepted','document_downloaded'
                  )),
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_portal_activity_portal_id ON portal_activity(portal_id);

-- ────────────────────────────────────────────────────────────
-- SAAS SUBSCRIPTIONS (Suscripción mensual The Singular Choice)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saas_subscriptions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id  TEXT UNIQUE,
  stripe_customer_id      TEXT,
  plan                    TEXT DEFAULT 'monthly' CHECK (plan IN ('monthly','annual')),
  status                  TEXT DEFAULT 'active'
                            CHECK (status IN ('active','past_due','canceled','trialing')),
  current_period_end      TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- RPC: get_seller_metrics
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_seller_metrics(v_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_contacts    INT;
  v_leads_frios       INT;
  v_clientes_activos  INT;
  v_portals_active    INT;
  v_revenue_month     NUMERIC;
  v_conversion_rate   NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_total_contacts
    FROM contacts WHERE user_id = v_user_id;

  SELECT COUNT(*) INTO v_leads_frios
    FROM contacts WHERE user_id = v_user_id AND status = 'Lead Frío';

  SELECT COUNT(*) INTO v_clientes_activos
    FROM contacts WHERE user_id = v_user_id AND status = 'Cliente Activo';

  SELECT COUNT(*) INTO v_portals_active
    FROM client_portals cp
    JOIN contacts c ON c.id = cp.contact_id
    WHERE c.user_id = v_user_id AND cp.active = TRUE;

  SELECT COALESCE(SUM(sp.amount), 0) INTO v_revenue_month
    FROM stripe_payments sp
    JOIN contacts c ON c.id = sp.contact_id
    WHERE c.user_id = v_user_id
      AND sp.status = 'succeeded'
      AND sp.created_at >= date_trunc('month', NOW());

  v_conversion_rate := CASE
    WHEN v_total_contacts > 0
    THEN ROUND((v_clientes_activos::NUMERIC / v_total_contacts) * 100, 1)
    ELSE 0
  END;

  RETURN jsonb_build_object(
    'total_contacts',   v_total_contacts,
    'leads_frios',      v_leads_frios,
    'clientes_activos', v_clientes_activos,
    'portals_active',   v_portals_active,
    'revenue_month',    v_revenue_month,
    'conversion_rate',  v_conversion_rate
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ────────────────────────────────────────────────────────────
ALTER TABLE contacts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_notes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_resources      ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents             ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE luxury_experiences    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_activity       ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_subscriptions    ENABLE ROW LEVEL SECURITY;

-- Contacts: solo el dueño (asesor)
CREATE POLICY "contacts_owner" ON contacts
  USING (user_id = auth.uid());
CREATE POLICY "contacts_owner_insert" ON contacts
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "contacts_owner_update" ON contacts
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "contacts_owner_delete" ON contacts
  FOR DELETE USING (user_id = auth.uid());

-- Contact notes: accesible a través del owner de contacts
CREATE POLICY "notes_via_contact" ON contact_notes
  USING (EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = contact_notes.contact_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "notes_via_contact_insert" ON contact_notes
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = contact_notes.contact_id AND c.user_id = auth.uid()
  ));

-- Email logs
CREATE POLICY "emails_via_contact" ON email_logs
  USING (EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = email_logs.contact_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "emails_via_contact_insert" ON email_logs
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = email_logs.contact_id AND c.user_id = auth.uid()
  ));

-- Calendar events
CREATE POLICY "calendar_owner" ON calendar_events
  USING (user_id = auth.uid());
CREATE POLICY "calendar_owner_insert" ON calendar_events
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "calendar_owner_update" ON calendar_events
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "calendar_owner_delete" ON calendar_events
  FOR DELETE USING (user_id = auth.uid());

-- Quotes
CREATE POLICY "quotes_via_contact" ON quotes
  USING (EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = quotes.contact_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "quotes_via_contact_write" ON quotes
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = quotes.contact_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "quotes_via_contact_update" ON quotes
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = quotes.contact_id AND c.user_id = auth.uid()
  ));

-- Client portals: asesor lee/escribe, cliente puede leer por token (sin auth)
CREATE POLICY "portals_owner" ON client_portals
  USING (EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = client_portals.contact_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "portals_owner_write" ON client_portals
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = client_portals.contact_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "portals_owner_update" ON client_portals
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = client_portals.contact_id AND c.user_id = auth.uid()
  ));
-- Portal público (acceso por share_token sin auth — manejado en server-side)
CREATE POLICY "portals_public_read" ON client_portals
  FOR SELECT USING (active = TRUE);

-- Portal tasks
CREATE POLICY "portal_tasks_via_portal" ON portal_tasks
  USING (EXISTS (
    SELECT 1 FROM client_portals cp
    JOIN contacts c ON c.id = cp.contact_id
    WHERE cp.id = portal_tasks.portal_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "portal_tasks_public_read" ON portal_tasks
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM client_portals cp WHERE cp.id = portal_tasks.portal_id AND cp.active = TRUE
  ));
CREATE POLICY "portal_tasks_write" ON portal_tasks
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM client_portals cp
    JOIN contacts c ON c.id = cp.contact_id
    WHERE cp.id = portal_tasks.portal_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "portal_tasks_update" ON portal_tasks
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM client_portals cp
    JOIN contacts c ON c.id = cp.contact_id
    WHERE cp.id = portal_tasks.portal_id AND c.user_id = auth.uid()
  ));

-- Portal resources
CREATE POLICY "portal_resources_owner" ON portal_resources
  USING (EXISTS (
    SELECT 1 FROM client_portals cp
    JOIN contacts c ON c.id = cp.contact_id
    WHERE cp.id = portal_resources.portal_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "portal_resources_public" ON portal_resources
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM client_portals cp WHERE cp.id = portal_resources.portal_id AND cp.active = TRUE
  ));

-- Documents
CREATE POLICY "documents_owner" ON documents
  USING (user_id = auth.uid());
CREATE POLICY "documents_owner_insert" ON documents
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "documents_owner_update" ON documents
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "documents_owner_delete" ON documents
  FOR DELETE USING (user_id = auth.uid());
-- Documentos en portal: el cliente los puede ver si tiene token activo
CREATE POLICY "documents_portal_read" ON documents
  FOR SELECT USING (
    portal_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM client_portals cp
      WHERE cp.id = documents.portal_id AND cp.active = TRUE
    )
  );

-- Stripe payments
CREATE POLICY "stripe_payments_owner" ON stripe_payments
  USING (EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = stripe_payments.contact_id AND c.user_id = auth.uid()
  ));

-- Luxury experiences
CREATE POLICY "experiences_owner" ON luxury_experiences
  USING (EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = luxury_experiences.contact_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "experiences_write" ON luxury_experiences
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = luxury_experiences.contact_id AND c.user_id = auth.uid()
  ));

-- Bot messages
CREATE POLICY "bot_messages_owner" ON bot_messages
  USING (EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = bot_messages.contact_id AND c.user_id = auth.uid()
  ));

-- Portal activity
CREATE POLICY "portal_activity_owner" ON portal_activity
  USING (EXISTS (
    SELECT 1 FROM client_portals cp
    JOIN contacts c ON c.id = cp.contact_id
    WHERE cp.id = portal_activity.portal_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "portal_activity_public_write" ON portal_activity
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM client_portals cp
    WHERE cp.id = portal_activity.portal_id AND cp.active = TRUE
  ));

-- SaaS subscriptions
CREATE POLICY "saas_owner" ON saas_subscriptions
  USING (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- STORAGE BUCKET: documents
-- (Ejecutar en Supabase Dashboard > Storage > New bucket "documents", private)
-- ────────────────────────────────────────────────────────────
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- ────────────────────────────────────────────────────────────
-- UPDATED_AT trigger for contacts
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER portals_updated_at
  BEFORE UPDATE ON client_portals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
