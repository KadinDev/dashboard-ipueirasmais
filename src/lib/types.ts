export type ContentStatus = "draft" | "published" | "paused" | "archived";
export type EntityKind =
  | "company"
  | "event"
  | "news"
  | "banner"
  | "promotion"
  | "job"
  | "alert"
  | "city_update"
  | "pharmacy"
  | "lost_found"
  | "classified";
export type PlacementKind =
  | "basic"
  | "featured"
  | "super_featured"
  | "home_banner"
  | "event_featured";
export type PaymentStatus =
  | "pending"
  | "paid"
  | "overdue"
  | "cancelled"
  | "refunded";

export type City = {
  id: string;
  name: string;
  state_code: string;
  slug: string;
};

export type Category = {
  id: string;
  city_id: string;
  kind:
    | "company"
    | "event"
    | "news"
    | "promotion"
    | "job"
    | "alert"
    | "city_update"
    | "pharmacy"
    | "classified";
  name: string;
  slug: string;
};

export type Company = {
  id: string;
  city_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  subtitle: string | null;
  short_description: string | null;
  description: string | null;
  logo_media_id?: string | null;
  cover_media_id?: string | null;
  rating: number | null;
  rating_count: number | null;
  address_line: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  status: ContentStatus;
  manual_priority: number;
  listing_paid_amount_cents?: number;
  listing_payment_status?: PaymentStatus;
  listing_paid_until?: string | null;
  billing_notes?: string | null;
  created_at?: string | null;
};

export type CompanyContact = {
  id: string;
  company_id: string;
  kind: "whatsapp" | "phone" | "instagram" | "website" | "maps" | "email";
  label: string | null;
  value: string;
  is_primary: boolean;
  sort_order: number;
};

export type CompanyHour = {
  id: string;
  company_id: string;
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
  note: string | null;
};

export type EventItem = {
  id: string;
  city_id: string;
  category_id: string | null;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  cover_media_id?: string | null;
  venue_name: string | null;
  address_line: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  starts_at: string;
  ends_at: string | null;
  is_free: boolean;
  price_label: string | null;
  ticket_url: string | null;
  whatsapp: string | null;
  show_add_to_calendar?: boolean;
  status: ContentStatus;
  manual_priority: number;
  paid_amount_cents?: number;
  payment_status?: PaymentStatus;
  billing_notes?: string | null;
  created_at?: string | null;
};

export type Banner = {
  id: string;
  city_id?: string;
  title?: string;
  subtitle?: string | null;
  image_media_id?: string | null;
  action_label: string | null;
  action_url?: string | null;
  status: ContentStatus;
  starts_at: string | null;
  ends_at: string | null;
  manual_priority: number;
  paid_amount_cents?: number;
  payment_status?: PaymentStatus;
  notes?: string | null;
  is_active_background_image: boolean;
  created_at?: string | null;
};

export type NewsItem = {
  id: string;
  city_id: string;
  category_id: string | null;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  cover_media_id?: string | null;
  status: ContentStatus;
  published_at: string | null;
  created_at?: string | null;
};

export type Plan = {
  id: string;
  name: string;
  target_entity: EntityKind;
  placement_type: PlacementKind;
  price_cents: number;
  duration_days: number | null;
  is_active: boolean;
};

export type Placement = {
  id: string;
  city_id: string;
  entity_type: EntityKind;
  entity_id: string;
  plan_id: string | null;
  placement_type: PlacementKind;
  starts_at: string;
  ends_at: string | null;
  priority: number;
  paid_amount_cents: number;
  payment_status: PaymentStatus;
  is_active: boolean;
  notes: string | null;
  created_at?: string | null;
};

export type ClickSummary = {
  day: string;
  entity_type: EntityKind;
  entity_id: string;
  click_type: string;
  total: number;
};

export type SubmissionRequest = {
  id: string;
  city_id: string;
  content_type:
    | "company"
    | "event"
    | "job"
    | "promotion"
    | "classified"
    | "lost_found";
  requester_name: string;
  requester_whatsapp: string;
  requester_email: string | null;
  title: string;
  description: string | null;
  payload: Record<string, unknown>;
  image_urls: string[];
  status:
    | "pending"
    | "reviewing"
    | "contacted"
    | "approved"
    | "rejected"
    | "archived";
  admin_notes: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type CityHallSubmission = {
  id: string;
  city_id: string;
  created_by: string | null;
  content_type: "alert" | "news";
  title: string;
  summary: string | null;
  body: string | null;
  payload: Record<string, unknown>;
  image_urls: string[];
  status: "pending" | "reviewing" | "approved" | "rejected" | "archived";
  admin_notes: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type NotificationItem = {
  id: string;
  city_id: string;
  title: string;
  body: string | null;
  entity_type: EntityKind | null;
  entity_id: string | null;
  image_media_id?: string | null;
  status: ContentStatus;
  published_at: string | null;
  created_at?: string | null;
};

export type PushCampaign = {
  id: string;
  city_id: string;
  notification_id: string | null;
  title: string;
  body: string;
  entity_type: EntityKind | null;
  entity_id: string | null;
  audience: "all" | "alerts" | "commercial";
  send_status: "draft" | "pending" | "sending" | "sent" | "failed" | "cancelled";
  scheduled_at: string | null;
  sent_at: string | null;
  target_count: number;
  success_count: number;
  failure_count: number;
  paid_amount_cents: number;
  payment_status: PaymentStatus;
  billing_notes: string | null;
  created_at: string;
};

export type UsefulService = {
  id: string;
  city_id: string;
  service_type:
    | "pharmacy"
    | "hospital"
    | "samu"
    | "police"
    | "firefighters"
    | "city_hall"
    | "enel"
    | "cagece"
    | "other";
  name: string;
  phone: string | null;
  whatsapp: string | null;
  address_line: string | null;
  latitude: number | null;
  longitude: number | null;
  note: string | null;
  status: ContentStatus;
  manual_priority: number;
  created_at?: string | null;
};

export type AppVersion = {
  id: string;
  city_id: string | null;
  platform: "all" | "android" | "ios";
  latest_version: string;
  minimum_version: string;
  message: string;
  android_url: string | null;
  ios_url: string | null;
  update_required: boolean;
  status: ContentStatus;
  manual_priority: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Promotion = {
  id: string;
  city_id: string;
  company_id: string | null;
  category_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  old_price_cents: number | null;
  new_price_cents: number | null;
  price_label: string | null;
  valid_until: string | null;
  whatsapp: string | null;
  image_media_id?: string | null;
  status: ContentStatus;
  manual_priority: number;
  published_at: string | null;
  created_at?: string;
};

export type LostFoundItem = {
  id: string;
  city_id: string;
  title: string;
  slug: string;
  item_type: "lost" | "found";
  description: string | null;
  contact_label: string | null;
  image_media_id?: string | null;
  occurred_at: string | null;
  status: ContentStatus;
  manual_priority: number;
  published_at: string | null;
  created_at?: string | null;
};

export type ClassifiedItem = {
  id: string;
  city_id: string;
  title: string;
  slug: string;
  description: string | null;
  price_label: string | null;
  whatsapp: string | null;
  cover_media_id?: string | null;
  photo_1_media_id?: string | null;
  photo_2_media_id?: string | null;
  photo_3_media_id?: string | null;
  valid_until: string | null;
  status: ContentStatus;
  manual_priority: number;
  published_at: string | null;
  created_at?: string | null;
};

export type Job = {
  id: string;
  city_id: string;
  company_id: string | null;
  category_id: string | null;
  title: string;
  slug: string;
  company_name: string | null;
  location_label: string | null;
  contract_type: string | null;
  salary_label: string | null;
  description: string | null;
  requirements: string | null;
  application_url: string | null;
  whatsapp: string | null;
  status: ContentStatus;
  manual_priority: number;
  published_at: string | null;
  created_at?: string | null;
};

export type AlertItem = {
  id: string;
  city_id: string;
  category_id: string | null;
  title: string;
  slug: string;
  summary: string | null;
  body: string | null;
  importance: "normal" | "important" | "urgent";
  affected_areas: string | null;
  expected_resolution: string | null;
  image_media_id?: string | null;
  status: ContentStatus;
  manual_priority: number;
  published_at: string | null;
  created_at?: string | null;
};

export type CityUpdate = {
  id: string;
  city_id: string;
  related_entity_type: EntityKind | null;
  related_entity_id: string | null;
  category_id: string | null;
  title: string;
  slug: string;
  summary: string | null;
  body: string | null;
  image_media_id?: string | null;
  status: ContentStatus;
  manual_priority: number;
  published_at: string | null;
  created_at?: string | null;
};

export type Pharmacy = {
  id: string;
  city_id: string;
  company_id: string | null;
  name: string;
  slug: string;
  whatsapp: string | null;
  phone: string | null;
  address_line: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  logo_media_id?: string | null;
  status: ContentStatus;
  manual_priority: number;
};

export type PharmacyDutyShift = {
  id: string;
  city_id: string;
  pharmacy_id: string;
  starts_at: string;
  ends_at: string;
  note: string | null;
  status: ContentStatus;
};
