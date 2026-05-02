export type ContactStatus = 'Lead Frío' | 'Llamada Agendada' | 'Cliente Potencial' | 'Cliente Activo';

export interface EmailRecord {
  id?: string;
  contact_id?: string;
  subject: string;
  body: string;
  sent_at?: string;
}

export interface ContactNote {
  id?: string;
  contact_id?: string;
  key_points: string[];
  next_steps: string[];
  suggested_status: ContactStatus;
  reasoning: string;
  sentiment_score?: number;
  ai_health_score?: number;
  created_at?: string;
  timestamp?: string;
}

export interface CalendarEvent {
  id: string;
  user_id?: string;
  contact_id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  meeting_link?: string;
  status: 'Pendiente' | 'Confirmada' | 'Completada' | 'Cancelada';
  created_at?: string;
}

export interface Contact {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  phone?: string;
  status: ContactStatus;
  last_interaction: string;
  notes_text?: string;
  summary_ai?: string;
  created_at?: string;
  // Luxury concierge fields
  telegram_chat_id?: string;
  lifestyle_prefs?: {
    shoe_size?: string;
    pillow_type?: string;
    allergies?: string[];
    water_brand?: string;
    room_temp?: string;
    dietary?: string;
    [key: string]: unknown;
  };
  passport_expiry?: string;
  // Enriched (local-only)
  notes?: ContactNote[];
  quotes?: Quote[];
  emailHistory?: EmailRecord[];
  events?: CalendarEvent[];
  portal?: ClientPortal;
}

export interface ClientPortal {
  id: string;
  contact_id: string;
  share_token: string;
  active: boolean;
  // Luxury itinerary fields
  destination?: string;
  travel_start?: string;
  travel_end?: string;
  mood_narrative?: string;
  countdown_label?: string;
  preparation_steps?: { label: string; done: boolean }[];
  updated_at?: string;
  // Relations
  tasks: PortalTask[];
  resources: PortalResource[];
}

export interface QuoteItem {
  id?: string;
  name: string;
  description: string;
  delivery_time: string;
  qty: number;
  unit_price: number;
  tax_rate: number;
  total: number;
}

export interface Quote {
  id: string;
  contact_id: string;
  quote_number: string;
  title: string;
  issue_date: string;
  valid_until: string;
  company_name?: string;
  company_nif?: string;
  items: QuoteItem[];
  subtotal: number;
  tax_total: number;
  total: number;
  payment_terms?: string;
  notes?: string;
  status: 'Borrador' | 'Enviado' | 'Abierto' | 'Aceptado' | 'Rechazado';
  next_contact_date?: string;
  // Stripe
  stripe_payment_intent_id?: string;
  deposit_paid?: boolean;
  created_at?: string;
}

export interface PortalTask {
  id: string;
  portal_id: string;
  title: string;
  description?: string;
  image_url?: string;
  // Luxury story levels
  level1_title?: string;
  level2_logistics?: string;
  level3_narrative?: string;
  task_order: number;
  due_date?: string;
  is_completed: boolean;
  completed_at?: string;
  created_at?: string;
}

export interface PortalResource {
  id: string;
  portal_id: string;
  title: string;
  url: string;
  created_at?: string;
}

export interface PortalActivity {
  id: string;
  portal_id: string;
  activity_type:
    | 'task_completed'
    | 'comment'
    | 'resource_viewed'
    | 'portal_accessed'
    | 'quote_accepted'
    | 'document_downloaded';
  description?: string;
  created_at?: string;
}

// ── New: Documents ────────────────────────────────────────────────────────────
export interface Document {
  id: string;
  user_id?: string;
  contact_id?: string;
  portal_id?: string;
  name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  created_at?: string;
}

// ── New: Luxury Experiences (Groq AI) ────────────────────────────────────────
export interface LuxuryExperience {
  id: string;
  contact_id: string;
  destination?: string;
  mood_tags?: string[];
  narrative: string;
  feeling_title?: string;
  sent_to_portal: boolean;
  created_at?: string;
}

// ── New: Stripe Payment ───────────────────────────────────────────────────────
export interface StripePayment {
  id: string;
  contact_id?: string;
  quote_id?: string;
  stripe_payment_intent: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  description?: string;
  created_at?: string;
}

// ── New: Bot Message ──────────────────────────────────────────────────────────
export interface BotMessage {
  id: string;
  contact_id?: string;
  direction: 'outbound' | 'inbound';
  channel: 'telegram' | 'whatsapp';
  message_text?: string;
  telegram_msg_id?: string;
  created_at?: string;
}
