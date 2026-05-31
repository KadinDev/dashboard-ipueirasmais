import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import {
  BarChart3,
  Building2,
  CalendarDays,
  Crown,
  Bell,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Newspaper,
  RefreshCcw,
} from "lucide-react";
import {
  Badge,
  Brand,
  Button,
  Card,
  CardTitle,
  Empty,
  ErrorBox,
  Field,
  FormGrid,
  Grid,
  Header,
  Input,
  Main,
  Muted,
  Nav,
  NavButton,
  Page,
  Select,
  Sidebar,
  StatValue,
  Table,
  TableWrap,
  TextArea,
  Title,
  Toolbar,
} from "./styles/ui";
import { hasSupabaseEnv, supabase } from "./lib/supabase";
import { centsToBRL, dateInputValue, slugify, toIsoOrNull } from "./lib/format";
import type {
  Banner,
  Category,
  City,
  ClickSummary,
  Company,
  CompanyContact,
  CompanyHour,
  EventItem,
  NewsItem,
  NotificationItem,
  Placement,
  Plan,
} from "./lib/types";

type Tab =
  | "overview"
  | "companies"
  | "events"
  | "news"
  | "notifications"
  | "placements"
  | "banners"
  | "metrics";

const tabs: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Resumo", icon: LayoutDashboard },
  { id: "companies", label: "Empresas", icon: Building2 },
  { id: "events", label: "Eventos", icon: CalendarDays },
  { id: "news", label: "Notícias", icon: Newspaper },
  { id: "notifications", label: "Notificações", icon: Bell },
  { id: "placements", label: "Destaques", icon: Crown },
  { id: "banners", label: "Banners", icon: Megaphone },
  { id: "metrics", label: "Métricas", icon: BarChart3 },
];

const statusLabels = {
  draft: "Rascunho",
  published: "Publicado",
  paused: "Pausado",
  archived: "Arquivado",
};

const placementLabels = {
  basic: "Básico",
  featured: "Destaque",
  super_featured: "Super destaque",
  home_banner: "Banner home",
  event_featured: "Evento destaque",
};

const dayLabels = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

function statusTone(status: string) {
  if (status === "published") return "green";
  if (status === "paused") return "orange";
  if (status === "archived") return "red";
  return "blue";
}

function textValue(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function messageFromError(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Não foi possível salvar. Verifique os campos e tente novamente.";
}

async function assertNoError<T extends { error: unknown }>(result: T) {
  if (result.error) throw result.error;
  return result;
}

function fileValue(form: FormData, name: string) {
  const value = form.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}

function ImagePreviewInput({
  name,
  label,
}: {
  name: string;
  label: string;
}) {
  const [previewUrl, setPreviewUrl] = useState("");

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      setPreviewUrl("");
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return nextUrl;
    });
  }

  return (
    <Field>
      {label}
      <Input
        name={name}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleChange}
      />
      {previewUrl && (
        <ImagePreviewCard>
          <img src={previewUrl} alt={`Prévia de ${label}`} />
          <span>Prévia da imagem selecionada</span>
        </ImagePreviewCard>
      )}
    </Field>
  );
}

async function uploadMedia(file: File, folder: string, altText: string) {
  const extension = file.name.split(".").pop() || "webp";
  const storagePath = `${folder}/${crypto.randomUUID()}.${extension}`;
  const upload = await supabase.storage
    .from("public-media")
    .upload(storagePath, file, {
      cacheControl: "31536000",
      upsert: false,
    });

  if (upload.error) throw upload.error;

  const { data } = supabase.storage
    .from("public-media")
    .getPublicUrl(storagePath);
  const media = await supabase
    .from("media_assets")
    .insert({
      bucket: "public-media",
      storage_path: storagePath,
      public_url: data.publicUrl,
      alt_text: altText,
      size_bytes: file.size,
    })
    .select("id")
    .single();

  if (media.error) throw media.error;
  return media.data.id as string;
}

export function App() {
  const [sessionReady, setSessionReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(Boolean(data.session));
      setSessionReady(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session));
    });

    return () => data.subscription.unsubscribe();
  }, []);

  if (!hasSupabaseEnv) {
    return (
      <Centered>
        <LoginCard>
          <Brand>Guia da Cidade Admin</Brand>
          <ErrorBox>
            Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em um
            arquivo `.env` antes de usar o dashboard.
          </ErrorBox>
          <Muted>Use o arquivo `.env.example` como modelo.</Muted>
        </LoginCard>
      </Centered>
    );
  }

  if (!sessionReady) {
    return <Centered>Carregando...</Centered>;
  }

  return isLoggedIn ? <AdminDashboard /> : <Login />;
}

function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const email = textValue(form.get("email"));
    const password = textValue(form.get("password"));
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) setError(signInError.message);
    setLoading(false);
  }

  return (
    <Centered>
      <LoginCard as="form" onSubmit={handleSubmit}>
        <Brand>Guia da Cidade Admin</Brand>
        <Muted>Entre com o usuário administrador cadastrado no Supabase.</Muted>
        {error && <ErrorBox>{error}</ErrorBox>}
        <Field>
          E-mail
          <Input
            name="email"
            type="email"
            required
            placeholder="voce@email.com"
          />
        </Field>
        <Field>
          Senha
          <Input
            name="password"
            type="password"
            required
            placeholder="Sua senha"
          />
        </Field>
        <Button type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </LoginCard>
    </Centered>
  );
}

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyContacts, setCompanyContacts] = useState<CompanyContact[]>([]);
  const [companyHours, setCompanyHours] = useState<CompanyHour[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [metrics, setMetrics] = useState<ClickSummary[]>([]);

  const cityId = cities[0]?.id || "";

  async function loadData() {
    setLoading(true);
    setError("");

    const requests = await Promise.all([
      supabase.from("cities").select("*").order("name"),
      supabase.from("categories").select("*").order("kind").order("sort_order"),
      supabase
        .from("companies")
        .select("*")
        .order("manual_priority")
        .order("name"),
      supabase.from("company_contacts").select("*").order("sort_order"),
      supabase.from("company_hours").select("*").order("day_of_week"),
      supabase.from("events").select("*").order("starts_at"),
      supabase
        .from("news")
        .select("*")
        .order("published_at", { ascending: false }),
      supabase
        .from("notifications")
        .select("*")
        .order("published_at", { ascending: false }),
      supabase.from("banners").select("*").order("manual_priority"),
      supabase.from("plans").select("*").order("price_cents"),
      supabase
        .from("placements")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("admin_click_summary_daily")
        .select("*")
        .order("day", { ascending: false })
        .limit(100),
    ]);

    const firstError = requests.find((request) => request.error)?.error;
    if (firstError) {
      setError(firstError.message);
    } else {
      setCities((requests[0].data || []) as City[]);
      setCategories((requests[1].data || []) as Category[]);
      setCompanies((requests[2].data || []) as Company[]);
      setCompanyContacts((requests[3].data || []) as CompanyContact[]);
      setCompanyHours((requests[4].data || []) as CompanyHour[]);
      setEvents((requests[5].data || []) as EventItem[]);
      setNews((requests[6].data || []) as NewsItem[]);
      setNotifications((requests[7].data || []) as NotificationItem[]);
      setBanners((requests[8].data || []) as Banner[]);
      setPlans((requests[9].data || []) as Plan[]);
      setPlacements((requests[10].data || []) as Placement[]);
      setMetrics((requests[11].data || []) as ClickSummary[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const companyCategories = categories.filter(
    (category) => category.kind === "company",
  );
  const eventCategories = categories.filter(
    (category) => category.kind === "event",
  );
  const newsCategories = categories.filter(
    (category) => category.kind === "news",
  );
  const activePlacements = placements.filter(
    (placement) =>
      placement.is_active &&
      (!placement.ends_at || new Date(placement.ends_at) >= new Date()),
  );
  const totalClicks = metrics.reduce((sum, item) => sum + item.total, 0);

  return (
    <Page>
      <Sidebar>
        <Brand>Guia Admin</Brand>
        <Muted>Controle empresas, eventos e destaques.</Muted>
        <Nav>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavButton
                key={tab.id}
                $active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                {tab.label}
              </NavButton>
            );
          })}
        </Nav>
        <SidebarFooter>
          <Button $variant="ghost" onClick={loadData}>
            <RefreshCcw size={16} /> Atualizar
          </Button>
          <Button $variant="ghost" onClick={() => supabase.auth.signOut()}>
            <LogOut size={16} /> Sair
          </Button>
        </SidebarFooter>
      </Sidebar>

      <Main>
        <Header>
          <div>
            <Title>{tabs.find((tab) => tab.id === activeTab)?.label}</Title>
            <Muted>
              {loading
                ? "Carregando dados..."
                : "Dashboard conectado ao Supabase."}
            </Muted>
          </div>
        </Header>

        {error && <ErrorBox>{error}</ErrorBox>}

        {activeTab === "overview" && (
          <Overview
            companies={companies}
            events={events}
            banners={banners}
            activePlacements={activePlacements.length}
            totalClicks={totalClicks}
          />
        )}

        {activeTab === "companies" && (
          <CompaniesSection
            cityId={cityId}
            companies={companies}
            contacts={companyContacts}
            hours={companyHours}
            categories={companyCategories}
            onSaved={loadData}
          />
        )}

        {activeTab === "events" && (
          <EventsSection
            cityId={cityId}
            events={events}
            categories={eventCategories}
            onSaved={loadData}
          />
        )}

        {activeTab === "news" && (
          <NewsSection
            cityId={cityId}
            news={news}
            categories={newsCategories}
            onSaved={loadData}
          />
        )}

        {activeTab === "notifications" && (
          <NotificationsSection
            cityId={cityId}
            notifications={notifications}
            news={news}
            events={events}
            onSaved={loadData}
          />
        )}

        {activeTab === "placements" && (
          <PlacementsSection
            cityId={cityId}
            placements={placements}
            companies={companies}
            events={events}
            plans={plans}
            onSaved={loadData}
          />
        )}

        {activeTab === "banners" && (
          <BannersSection
            cityId={cityId}
            banners={banners}
            onSaved={loadData}
          />
        )}

        {activeTab === "metrics" && (
          <MetricsSection
            metrics={metrics}
            companies={companies}
            events={events}
          />
        )}
      </Main>
    </Page>
  );
}

function Overview({
  companies,
  events,
  banners,
  activePlacements,
  totalClicks,
}: {
  companies: Company[];
  events: EventItem[];
  banners: Banner[];
  activePlacements: number;
  totalClicks: number;
}) {
  return (
    <Grid>
      <Card>
        <Muted>Empresas publicadas</Muted>
        <StatValue>
          {companies.filter((item) => item.status === "published").length}
        </StatValue>
      </Card>
      <Card>
        <Muted>Eventos futuros</Muted>
        <StatValue>
          {
            events.filter((item) => new Date(item.starts_at) >= new Date())
              .length
          }
        </StatValue>
      </Card>
      <Card>
        <Muted>Destaques ativos</Muted>
        <StatValue>{activePlacements}</StatValue>
      </Card>
      <Card>
        <Muted>Cliques registrados</Muted>
        <StatValue>{totalClicks}</StatValue>
      </Card>
      <Card>
        <CardTitle>Banners ativos</CardTitle>
        <StatValue>
          {banners.filter((item) => item.status === "published").length}
        </StatValue>
      </Card>
    </Grid>
  );
}

function CompaniesSection({
  cityId,
  companies,
  contacts,
  hours,
  categories,
  onSaved,
}: {
  cityId: string;
  companies: Company[];
  contacts: CompanyContact[];
  hours: CompanyHour[];
  categories: Category[];
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const editingContacts = contacts.filter(
    (contact) => contact.company_id === editing?.id,
  );
  const editingHours = hours.filter((item) => item.company_id === editing?.id);
  const contactValue = (kind: CompanyContact["kind"]) =>
    editingContacts.find((contact) => contact.kind === kind)?.value || "";
  const hourValue = (day: number) =>
    editingHours.find((item) => item.day_of_week === day);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setFormError("");
    setFormSuccess("");
    const form = new FormData(formElement);
    try {
      const name = textValue(form.get("name"));
      const logoFile = fileValue(form, "logo");
      const coverFile = fileValue(form, "cover");
      const logoId = logoFile
        ? await uploadMedia(logoFile, "companies/logos", name)
        : null;
      const coverId = coverFile
        ? await uploadMedia(coverFile, "companies/covers", name)
        : null;
      const status = textValue(form.get("status"));
      const payload = {
        city_id: cityId,
        category_id: textValue(form.get("category_id")) || null,
        name,
        slug: textValue(form.get("slug")) || slugify(name),
        subtitle: null,
        short_description: null,
        description: textValue(form.get("description")) || null,
        rating: textValue(form.get("rating")) ? Number(form.get("rating")) : null,
        rating_count: textValue(form.get("rating_count"))
          ? Number(form.get("rating_count"))
          : null,
        address_line: textValue(form.get("address_line")) || null,
        neighborhood: textValue(form.get("neighborhood")) || null,
        latitude: textValue(form.get("latitude"))
          ? Number(form.get("latitude"))
          : null,
        longitude: textValue(form.get("longitude"))
          ? Number(form.get("longitude"))
          : null,
        status,
        manual_priority: Number(form.get("manual_priority") || 100),
        listing_paid_amount_cents: Math.round(
          Number(form.get("listing_paid_amount") || 30) * 100,
        ),
        listing_payment_status:
          textValue(form.get("listing_payment_status")) || "paid",
        listing_paid_until: textValue(form.get("listing_paid_until")) || null,
        billing_notes: textValue(form.get("billing_notes")) || null,
        published_at: status === "published" ? new Date().toISOString() : null,
        ...(logoId ? { logo_media_id: logoId } : {}),
        ...(coverId ? { cover_media_id: coverId } : {}),
      };

      let companyId = editing?.id;
      if (editing) {
        await assertNoError(
          await supabase.from("companies").update(payload).eq("id", editing.id),
        );
      } else {
        const created = await assertNoError(
          await supabase.from("companies").insert(payload).select("id").single(),
        );
        if (!created.data) throw new Error("Empresa criada, mas o Supabase não retornou o ID.");
        companyId = created.data.id;
      }

      if (companyId) {
        await assertNoError(
          await supabase.from("company_contacts").delete().eq("company_id", companyId),
        );
        const nextContacts = [
          {
            kind: "whatsapp",
            label: "WhatsApp",
            value: textValue(form.get("whatsapp")),
            is_primary: true,
            sort_order: 10,
          },
        {
          kind: "phone",
          label: "Ligar",
          value: textValue(form.get("phone")),
          is_primary: true,
          sort_order: 20,
        },
        {
          kind: "instagram",
          label: "Instagram",
          value: textValue(form.get("instagram")),
          is_primary: true,
          sort_order: 30,
        },
        {
          kind: "maps",
          label: "Rota",
          value: textValue(form.get("maps")),
          is_primary: true,
          sort_order: 40,
        },
        ].filter((contact) => contact.value);

        if (nextContacts.length > 0) {
          await assertNoError(
            await supabase.from("company_contacts").insert(
              nextContacts.map((contact) => ({
                ...contact,
                company_id: companyId,
              })),
            ),
          );
        }

        await assertNoError(
          await supabase.from("company_hours").delete().eq("company_id", companyId),
        );
        const nextHours = dayLabels
          .filter((day) => form.get(`works_${day.value}`) === "on")
          .map((day) => ({
            company_id: companyId,
            day_of_week: day.value,
            opens_at: textValue(form.get(`opens_${day.value}`)) || null,
            closes_at: textValue(form.get(`closes_${day.value}`)) || null,
            is_closed: false,
            note: textValue(form.get(`note_${day.value}`)) || null,
          }));

        if (nextHours.length > 0) {
          await assertNoError(await supabase.from("company_hours").insert(nextHours));
        }
      }

      setEditing(null);
      formElement.reset();
      setFormSuccess("Empresa salva com sucesso.");
      await onSaved();
    } catch (error) {
      setFormError(messageFromError(error));
    } finally {
      setSaving(false);
    }
  }

  async function archiveCompany(id: string) {
    await supabase
      .from("companies")
      .update({ status: "archived" })
      .eq("id", id);
    await onSaved();
  }

  return (
    <>
      <EditorCard title={editing ? "Editar empresa" : "Nova empresa"}>
        <form onSubmit={handleSubmit}>
          {formError && <ErrorBox>{formError}</ErrorBox>}
          {formSuccess && <SuccessBox>{formSuccess}</SuccessBox>}
          <FormGrid>
            <Field>
              Nome
              <Input name="name" required defaultValue={editing?.name || ""} />
            </Field>
            <Field>
              Slug
              <Input
                name="slug"
                defaultValue={editing?.slug || ""}
                placeholder="gerado automaticamente se vazio"
              />
            </Field>
            <Field>
              Categoria
              <Select
                name="category_id"
                defaultValue={editing?.category_id || ""}
              >
                <option value="">Sem categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Status
              <Select name="status" defaultValue={editing?.status || "draft"}>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Bairro
              <Input
                name="neighborhood"
                defaultValue={editing?.neighborhood || ""}
              />
            </Field>
            <Field>
              Nota exibida
              <Input
                name="rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                defaultValue={editing?.rating ?? ""}
                placeholder="opcional"
              />
            </Field>
            <Field>
              Qtd. avaliações
              <Input
                name="rating_count"
                type="number"
                min="0"
                defaultValue={editing?.rating_count ?? ""}
                placeholder="opcional"
              />
            </Field>
            <Field>
              Prioridade
              <Input
                name="manual_priority"
                type="number"
                defaultValue={editing?.manual_priority || 100}
              />
            </Field>
            <Field>
              Valor mensal da empresa
              <Input
                name="listing_paid_amount"
                type="number"
                min="0"
                step="0.01"
                defaultValue={(editing?.listing_paid_amount_cents || 3000) / 100}
              />
            </Field>
            <Field>
              Pagamento da mensalidade
              <Select
                name="listing_payment_status"
                defaultValue={editing?.listing_payment_status || "paid"}
              >
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
                <option value="overdue">Atrasado</option>
                <option value="cancelled">Cancelado</option>
              </Select>
            </Field>
            <Field>
              Pago até
              <Input
                name="listing_paid_until"
                type="date"
                defaultValue={editing?.listing_paid_until || ""}
              />
            </Field>
            <Field>
              Endereço
              <Input
                name="address_line"
                defaultValue={editing?.address_line || ""}
              />
            </Field>
            <Field>
              Latitude
              <Input
                name="latitude"
                type="number"
                step="0.0000001"
                defaultValue={editing?.latitude ?? ""}
                placeholder="opcional para mapa"
              />
            </Field>
            <Field>
              Longitude
              <Input
                name="longitude"
                type="number"
                step="0.0000001"
                defaultValue={editing?.longitude ?? ""}
                placeholder="opcional para mapa"
              />
            </Field>
            <Field>
              WhatsApp
              <Input
                name="whatsapp"
                defaultValue={contactValue("whatsapp")}
                placeholder="5588999999999"
              />
            </Field>
            <Field>
              Telefone para ligar (opcional)
              <Input name="phone" defaultValue={contactValue("phone")} />
            </Field>
            <Field>
              Instagram
              <Input
                name="instagram"
                defaultValue={contactValue("instagram")}
                placeholder="https://instagram.com/..."
              />
            </Field>
            <Field>
              Rota/Maps
              <Input
                name="maps"
                defaultValue={contactValue("maps")}
                placeholder="https://maps.google.com/..."
              />
            </Field>
            <ImagePreviewInput name="logo" label="Logo" />
            <ImagePreviewInput name="cover" label="Capa" />
          </FormGrid>
          <Field>
            Sobre a empresa
            <TextArea
              name="description"
              defaultValue={editing?.description || ""}
            />
          </Field>
          <Field>
            Observações de cobrança
            <TextArea
              name="billing_notes"
              defaultValue={editing?.billing_notes || ""}
            />
          </Field>
          <CardTitle>Horário de funcionamento</CardTitle>
          <HoursGrid>
            {dayLabels.map((day) => {
              const current = hourValue(day.value);
              return (
                <HourRow key={day.value}>
                  <CheckLabel>
                    <input
                      name={`works_${day.value}`}
                      type="checkbox"
                      defaultChecked={Boolean(current)}
                    />
                    {day.label}
                  </CheckLabel>
                  <Input
                    name={`opens_${day.value}`}
                    type="time"
                    defaultValue={current?.opens_at?.slice(0, 5) || ""}
                  />
                  <Input
                    name={`closes_${day.value}`}
                    type="time"
                    defaultValue={current?.closes_at?.slice(0, 5) || ""}
                  />
                  <Input
                    name={`note_${day.value}`}
                    placeholder="Observação"
                    defaultValue={current?.note || ""}
                  />
                </HourRow>
              );
            })}
          </HoursGrid>
          <Actions>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Salvando..."
                : editing
                  ? "Salvar empresa"
                  : "Criar empresa"}
            </Button>
            {editing && (
              <Button
                type="button"
                $variant="ghost"
                disabled={saving}
                onClick={() => setEditing(null)}
              >
                Cancelar
              </Button>
            )}
          </Actions>
        </form>
      </EditorCard>

      <ResourceTable
        title="Empresas cadastradas"
        empty="Nenhuma empresa cadastrada ainda."
        headers={["Nome", "Status", "Nota", "Prioridade", "Ações"]}
      >
        {companies.map((company) => (
          <tr key={company.id}>
            <td>
              <strong>{company.name}</strong>
              <Muted>{company.neighborhood}</Muted>
            </td>
            <td>
              <Badge $tone={statusTone(company.status)}>
                {statusLabels[company.status]}
              </Badge>
            </td>
            <td>
              {company.rating != null
                ? `${company.rating.toFixed(1)} (${company.rating_count ?? 0})`
                : "Sem nota"}
            </td>
            <td>{company.manual_priority}</td>
            <td>
              <InlineActions>
                <Button $variant="ghost" onClick={() => setEditing(company)}>
                  Editar
                </Button>
                <Button
                  $variant="danger"
                  onClick={() => archiveCompany(company.id)}
                >
                  Arquivar
                </Button>
              </InlineActions>
            </td>
          </tr>
        ))}
      </ResourceTable>
    </>
  );
}

function EventsSection({
  cityId,
  events,
  categories,
  onSaved,
}: {
  cityId: string;
  events: EventItem[];
  categories: Category[];
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setFormError("");
    setFormSuccess("");
    const form = new FormData(formElement);
    try {
      const title = textValue(form.get("title"));
      const coverFile = fileValue(form, "cover");
      const coverId = coverFile
        ? await uploadMedia(coverFile, "events/covers", title)
        : null;
      const status = textValue(form.get("status"));
      const payload = {
        city_id: cityId,
        category_id: textValue(form.get("category_id")) || null,
        title,
        slug: textValue(form.get("slug")) || slugify(title),
        short_description: null,
        description: textValue(form.get("description")) || null,
        venue_name: textValue(form.get("venue_name")) || null,
        address_line: textValue(form.get("address_line")) || null,
        neighborhood: textValue(form.get("neighborhood")) || null,
        latitude: textValue(form.get("latitude"))
          ? Number(form.get("latitude"))
          : null,
        longitude: textValue(form.get("longitude"))
          ? Number(form.get("longitude"))
          : null,
        starts_at: new Date(textValue(form.get("starts_at"))).toISOString(),
        ends_at: toIsoOrNull(textValue(form.get("ends_at"))),
        is_free: form.get("is_free") === "on",
        price_label: textValue(form.get("price_label")) || null,
        ticket_url: textValue(form.get("ticket_url")) || null,
        whatsapp: textValue(form.get("whatsapp")) || null,
        show_add_to_calendar: form.get("show_add_to_calendar") === "on",
        status,
        manual_priority: Number(form.get("manual_priority") || 100),
        paid_amount_cents: Math.round(
          Number(form.get("paid_amount") || 30) * 100,
        ),
        payment_status: textValue(form.get("payment_status")) || "paid",
        billing_notes: textValue(form.get("billing_notes")) || null,
        published_at: status === "published" ? new Date().toISOString() : null,
        ...(coverId ? { cover_media_id: coverId } : {}),
      };

      if (editing) {
        await assertNoError(await supabase.from("events").update(payload).eq("id", editing.id));
      } else {
        await assertNoError(await supabase.from("events").insert(payload));
      }

      setEditing(null);
      formElement.reset();
      setFormSuccess("Evento salvo com sucesso.");
      await onSaved();
    } catch (error) {
      setFormError(messageFromError(error));
    } finally {
      setSaving(false);
    }
  }

  async function archiveEvent(id: string) {
    await supabase.from("events").update({ status: "archived" }).eq("id", id);
    await onSaved();
  }

  return (
    <>
      <EditorCard title={editing ? "Editar evento" : "Novo evento"}>
        <form onSubmit={handleSubmit}>
          {formError && <ErrorBox>{formError}</ErrorBox>}
          {formSuccess && <SuccessBox>{formSuccess}</SuccessBox>}
          <FormGrid>
            <Field>
              Título
              <Input
                name="title"
                required
                defaultValue={editing?.title || ""}
              />
            </Field>
            <Field>
              Slug
              <Input
                name="slug"
                defaultValue={editing?.slug || ""}
                placeholder="gerado automaticamente se vazio"
              />
            </Field>
            <Field>
              Categoria
              <Select
                name="category_id"
                defaultValue={editing?.category_id || ""}
              >
                <option value="">Sem categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Status
              <Select name="status" defaultValue={editing?.status || "draft"}>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Início
              <Input
                name="starts_at"
                type="datetime-local"
                required
                defaultValue={dateInputValue(editing?.starts_at)}
              />
            </Field>
            <Field>
              Fim
              <Input
                name="ends_at"
                type="datetime-local"
                defaultValue={dateInputValue(editing?.ends_at)}
              />
            </Field>
            <Field>
              Local
              <Input
                name="venue_name"
                defaultValue={editing?.venue_name || ""}
              />
            </Field>
            <Field>
              Endereço
              <Input
                name="address_line"
                defaultValue={editing?.address_line || ""}
              />
            </Field>
            <Field>
              Bairro
              <Input
                name="neighborhood"
                defaultValue={editing?.neighborhood || ""}
              />
            </Field>
            <Field>
              Latitude
              <Input
                name="latitude"
                type="number"
                step="0.0000001"
                defaultValue={editing?.latitude ?? ""}
                placeholder="opcional para mapa"
              />
            </Field>
            <Field>
              Longitude
              <Input
                name="longitude"
                type="number"
                step="0.0000001"
                defaultValue={editing?.longitude ?? ""}
                placeholder="opcional para mapa"
              />
            </Field>
            <Field>
              Preço exibido
              <Input
                name="price_label"
                defaultValue={editing?.price_label || ""}
                placeholder="Grátis, R$ 30..."
              />
            </Field>
            <Field>
              WhatsApp
              <Input name="whatsapp" defaultValue={editing?.whatsapp || ""} />
            </Field>
            <Field>
              Link de ingresso/reserva
              <Input
                name="ticket_url"
                defaultValue={editing?.ticket_url || ""}
              />
            </Field>
            <Field>
              Prioridade
              <Input
                name="manual_priority"
                type="number"
                defaultValue={editing?.manual_priority || 100}
              />
            </Field>
            <Field>
              Valor do cadastro
              <Input
                name="paid_amount"
                type="number"
                min="0"
                step="0.01"
                defaultValue={(editing?.paid_amount_cents || 3000) / 100}
              />
            </Field>
            <Field>
              Pagamento
              <Select
                name="payment_status"
                defaultValue={editing?.payment_status || "paid"}
              >
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
                <option value="overdue">Atrasado</option>
                <option value="cancelled">Cancelado</option>
              </Select>
            </Field>
            <ImagePreviewInput name="cover" label="Capa do evento" />
          </FormGrid>
          <CheckLabel>
            <input
              name="is_free"
              type="checkbox"
              defaultChecked={editing?.is_free ?? true}
            />{" "}
            Evento gratuito
          </CheckLabel>
          <CheckLabel>
            <input
              name="show_add_to_calendar"
              type="checkbox"
              defaultChecked={editing?.show_add_to_calendar ?? true}
            />{" "}
            Mostrar botão "Adicionar ao calendário"
          </CheckLabel>
          <Field>
            Descrição
            <TextArea
              name="description"
              defaultValue={editing?.description || ""}
            />
          </Field>
          <Field>
            Observações de cobrança
            <TextArea
              name="billing_notes"
              defaultValue={editing?.billing_notes || ""}
            />
          </Field>
          <Actions>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Salvando..."
                : editing
                  ? "Salvar evento"
                  : "Criar evento"}
            </Button>
            {editing && (
              <Button
                type="button"
                $variant="ghost"
                disabled={saving}
                onClick={() => setEditing(null)}
              >
                Cancelar
              </Button>
            )}
          </Actions>
        </form>
      </EditorCard>

      <ResourceTable
        title="Eventos cadastrados"
        empty="Nenhum evento cadastrado ainda."
        headers={["Evento", "Data", "Status", "Ações"]}
      >
        {events.map((event) => (
          <tr key={event.id}>
            <td>
              <strong>{event.title}</strong>
              <Muted>{event.venue_name}</Muted>
            </td>
            <td>{new Date(event.starts_at).toLocaleString("pt-BR")}</td>
            <td>
              <Badge $tone={statusTone(event.status)}>
                {statusLabels[event.status]}
              </Badge>
            </td>
            <td>
              <InlineActions>
                <Button $variant="ghost" onClick={() => setEditing(event)}>
                  Editar
                </Button>
                <Button
                  $variant="danger"
                  onClick={() => archiveEvent(event.id)}
                >
                  Arquivar
                </Button>
              </InlineActions>
            </td>
          </tr>
        ))}
      </ResourceTable>
    </>
  );
}

function NewsSection({
  cityId,
  news,
  categories,
  onSaved,
}: {
  cityId: string;
  news: NewsItem[];
  categories: Category[];
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setFormError("");
    setFormSuccess("");
    const form = new FormData(formElement);
    try {
      const title = textValue(form.get("title"));
      const coverFile = fileValue(form, "cover");
      const coverId = coverFile
        ? await uploadMedia(coverFile, "news/covers", title)
        : null;
      const status = textValue(form.get("status"));
      const payload = {
        city_id: cityId,
        category_id: textValue(form.get("category_id")) || null,
        title,
        slug: textValue(form.get("slug")) || slugify(title),
        excerpt: textValue(form.get("excerpt")) || null,
        body: textValue(form.get("body")) || null,
        status,
        published_at: status === "published" ? new Date().toISOString() : null,
        ...(coverId ? { cover_media_id: coverId } : {}),
      };

      if (editing) {
        await assertNoError(await supabase.from("news").update(payload).eq("id", editing.id));
      } else {
        await assertNoError(await supabase.from("news").insert(payload));
      }

      setEditing(null);
      formElement.reset();
      setFormSuccess("Notícia salva com sucesso.");
      await onSaved();
    } catch (error) {
      setFormError(messageFromError(error));
    } finally {
      setSaving(false);
    }
  }

  async function archiveNews(id: string) {
    await supabase.from("news").update({ status: "archived" }).eq("id", id);
    await onSaved();
  }

  return (
    <>
      <EditorCard title={editing ? "Editar notícia" : "Nova notícia"}>
        <form onSubmit={handleSubmit}>
          {formError && <ErrorBox>{formError}</ErrorBox>}
          {formSuccess && <SuccessBox>{formSuccess}</SuccessBox>}
          <FormGrid>
            <Field>
              Título
              <Input
                name="title"
                required
                defaultValue={editing?.title || ""}
              />
            </Field>
            <Field>
              Slug
              <Input
                name="slug"
                defaultValue={editing?.slug || ""}
                placeholder="gerado automaticamente se vazio"
              />
            </Field>
            <Field>
              Categoria
              <Select
                name="category_id"
                defaultValue={editing?.category_id || ""}
              >
                <option value="">Sem categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Status
              <Select name="status" defaultValue={editing?.status || "draft"}>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <ImagePreviewInput name="cover" label="Capa" />
          </FormGrid>
          <Field>
            Resumo
            <Input name="excerpt" defaultValue={editing?.excerpt || ""} />
          </Field>
          <Field>
            Conteúdo
            <TextArea name="body" defaultValue={editing?.body || ""} />
          </Field>
          <Actions>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Salvando..."
                : editing
                  ? "Salvar notícia"
                  : "Criar notícia"}
            </Button>
            {editing && (
              <Button
                type="button"
                $variant="ghost"
                disabled={saving}
                onClick={() => setEditing(null)}
              >
                Cancelar
              </Button>
            )}
          </Actions>
        </form>
      </EditorCard>

      <ResourceTable
        title="Notícias cadastradas"
        empty="Nenhuma notícia cadastrada ainda."
        headers={["Título", "Status", "Publicado", "Ações"]}
      >
        {news.map((item) => (
          <tr key={item.id}>
            <td>
              <strong>{item.title}</strong>
              <Muted>{item.excerpt}</Muted>
            </td>
            <td>
              <Badge $tone={statusTone(item.status)}>
                {statusLabels[item.status]}
              </Badge>
            </td>
            <td>
              {item.published_at
                ? new Date(item.published_at).toLocaleDateString("pt-BR")
                : "Ainda não"}
            </td>
            <td>
              <InlineActions>
                <Button $variant="ghost" onClick={() => setEditing(item)}>
                  Editar
                </Button>
                <Button $variant="danger" onClick={() => archiveNews(item.id)}>
                  Arquivar
                </Button>
              </InlineActions>
            </td>
          </tr>
        ))}
      </ResourceTable>
    </>
  );
}

function NotificationsSection({
  cityId,
  notifications,
  news,
  events,
  onSaved,
}: {
  cityId: string;
  notifications: NotificationItem[];
  news: NewsItem[];
  events: EventItem[];
  onSaved: () => Promise<void>;
}) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const entityType = textValue(form.get("entity_type")) || null;
    const payload = {
      city_id: cityId,
      title: textValue(form.get("title")),
      body: textValue(form.get("body")) || null,
      entity_type: entityType,
      entity_id: textValue(form.get("entity_id")) || null,
      status: textValue(form.get("status")),
      published_at:
        textValue(form.get("status")) === "published"
          ? new Date().toISOString()
          : null,
    };

    await supabase.from("notifications").insert(payload);
    formElement.reset();
    await onSaved();
  }

  async function archiveNotification(id: string) {
    await supabase
      .from("notifications")
      .update({ status: "archived" })
      .eq("id", id);
    await onSaved();
  }

  return (
    <>
      <EditorCard title="Nova notificação interna">
        <form onSubmit={handleSubmit}>
          <FormGrid>
            <Field>
              Título
              <Input name="title" required />
            </Field>
            <Field>
              Status
              <Select name="status" defaultValue="published">
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Tipo de destino
              <Select name="entity_type" defaultValue="">
                <option value="">Sem destino</option>
                <option value="event">Evento</option>
                <option value="news">Notícia</option>
              </Select>
            </Field>
            <Field>
              Destino
              <Select name="entity_id" defaultValue="">
                <option value="">Nenhum</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    Evento: {event.title}
                  </option>
                ))}
                {news.map((item) => (
                  <option key={item.id} value={item.id}>
                    Notícia: {item.title}
                  </option>
                ))}
              </Select>
            </Field>
          </FormGrid>
          <Field>
            Texto
            <TextArea name="body" />
          </Field>
          <Actions>
            <Button type="submit">Criar notificação</Button>
          </Actions>
        </form>
      </EditorCard>

      <ResourceTable
        title="Notificações"
        empty="Nenhuma notificação cadastrada ainda."
        headers={["Título", "Status", "Publicado", "Ações"]}
      >
        {notifications.map((item) => (
          <tr key={item.id}>
            <td>
              <strong>{item.title}</strong>
              <Muted>{item.body}</Muted>
            </td>
            <td>
              <Badge $tone={statusTone(item.status)}>
                {statusLabels[item.status]}
              </Badge>
            </td>
            <td>
              {item.published_at
                ? new Date(item.published_at).toLocaleDateString("pt-BR")
                : "Ainda não"}
            </td>
            <td>
              <Button
                $variant="danger"
                onClick={() => archiveNotification(item.id)}
              >
                Arquivar
              </Button>
            </td>
          </tr>
        ))}
      </ResourceTable>
    </>
  );
}

function PlacementsSection({
  cityId,
  placements,
  companies,
  events,
  plans,
  onSaved,
}: {
  cityId: string;
  placements: Placement[];
  companies: Company[];
  events: EventItem[];
  plans: Plan[];
  onSaved: () => Promise<void>;
}) {
  const [entityType, setEntityType] = useState<"company" | "event">("company");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const targetOptions = entityType === "company" ? companies : events;
  const placementOptions =
    entityType === "company"
      ? [["featured", "Empresa destaque"]]
      : [["event_featured", "Evento destaque"]];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setFormError("");
    setFormSuccess("");
    const form = new FormData(formElement);
    try {
      const planId = textValue(form.get("plan_id")) || null;
      const selectedPlan = plans.find((plan) => plan.id === planId);
      const payload = {
        city_id: cityId,
        entity_type: entityType,
        entity_id: textValue(form.get("entity_id")),
        plan_id: planId,
        placement_type:
          textValue(form.get("placement_type")) ||
          selectedPlan?.placement_type ||
          "featured",
        starts_at:
          toIsoOrNull(textValue(form.get("starts_at"))) ||
          new Date().toISOString(),
        ends_at: toIsoOrNull(textValue(form.get("ends_at"))),
        priority: Number(form.get("priority") || 10),
        paid_amount_cents: Math.round(Number(form.get("paid_amount") || 0) * 100),
        payment_status: textValue(form.get("payment_status")) || "paid",
        is_active: true,
        notes: textValue(form.get("notes")) || null,
      };

      await assertNoError(await supabase.from("placements").insert(payload));
      formElement.reset();
      setFormSuccess("Destaque criado com sucesso.");
      await onSaved();
    } catch (error) {
      setFormError(messageFromError(error));
    } finally {
      setSaving(false);
    }
  }

  async function pausePlacement(id: string) {
    await supabase.from("placements").update({ is_active: false }).eq("id", id);
    await onSaved();
  }

  function entityName(placement: Placement) {
    if (placement.entity_type === "company")
      return (
        companies.find((company) => company.id === placement.entity_id)?.name ||
        "Empresa"
      );
    return (
      events.find((event) => event.id === placement.entity_id)?.title ||
      "Evento"
    );
  }

  return (
    <>
      <EditorCard title="Novo destaque pago">
        <form onSubmit={handleSubmit}>
          {formError && <ErrorBox>{formError}</ErrorBox>}
          {formSuccess && <SuccessBox>{formSuccess}</SuccessBox>}
          <FormGrid>
            <Field>
              Tipo
              <Select
                value={entityType}
                onChange={(event) =>
                  setEntityType(event.target.value as "company" | "event")
                }
              >
                <option value="company">Empresa</option>
                <option value="event">Evento</option>
              </Select>
            </Field>
            <Field>
              Item
              <Select name="entity_id" required>
                <option value="">Selecione</option>
                {targetOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {"name" in item ? item.name : item.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Plano
              <Select name="plan_id">
                <option value="">Sem plano</option>
                {plans
                  .filter(
                    (plan) =>
                      plan.target_entity === entityType &&
                      plan.is_active &&
                      (entityType === "company"
                        ? plan.placement_type === "featured"
                        : plan.placement_type === "event_featured"),
                  )
                  .map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - {centsToBRL(plan.price_cents)}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field>
              Destaque
              <Select
                name="placement_type"
                defaultValue={
                  entityType === "event" ? "event_featured" : "featured"
                }
              >
                {placementOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Início
              <Input name="starts_at" type="datetime-local" />
            </Field>
            <Field>
              Fim
              <Input name="ends_at" type="datetime-local" />
            </Field>
            <Field>
              Prioridade
              <Input name="priority" type="number" defaultValue={10} />
            </Field>
            <Field>
              Valor pago
              <Input
                name="paid_amount"
                type="number"
                min="0"
                step="0.01"
                defaultValue={0}
              />
            </Field>
            <Field>
              Pagamento
              <Select name="payment_status" defaultValue="paid">
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
                <option value="overdue">Atrasado</option>
                <option value="cancelled">Cancelado</option>
              </Select>
            </Field>
          </FormGrid>
          <Field>
            Observações
            <TextArea name="notes" />
          </Field>
          <Actions>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Criar destaque"}
            </Button>
          </Actions>
        </form>
      </EditorCard>

      <ResourceTable
        title="Destaques ativos e históricos"
        empty="Nenhum destaque cadastrado ainda."
        headers={["Item", "Tipo", "Fim", "Valor", "Status", "Ações"]}
      >
        {placements.map((placement) => (
          <tr key={placement.id}>
            <td>{entityName(placement)}</td>
            <td>{placementLabels[placement.placement_type]}</td>
            <td>
              {placement.ends_at
                ? new Date(placement.ends_at).toLocaleDateString("pt-BR")
                : "Sem fim"}
            </td>
            <td>{centsToBRL(placement.paid_amount_cents)}</td>
            <td>
              <Badge $tone={placement.is_active ? "green" : "red"}>
                {placement.is_active ? "Ativo" : "Pausado"}
              </Badge>
            </td>
            <td>
              <Button
                $variant="danger"
                onClick={() => pausePlacement(placement.id)}
              >
                Pausar
              </Button>
            </td>
          </tr>
        ))}
      </ResourceTable>
    </>
  );
}

function BannersSection({
  cityId,
  banners,
  onSaved,
}: {
  cityId: string;
  banners: Banner[];
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<Banner | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setFormError("");
    setFormSuccess("");
    const form = new FormData(formElement);
    try {
      const title = textValue(form.get("title"));
      const imageFile = fileValue(form, "image");
      const imageId = imageFile
        ? await uploadMedia(imageFile, "banners", title)
        : null;
      const payload = {
        city_id: cityId,
        title,
        subtitle: textValue(form.get("subtitle")) || null,
        action_label: textValue(form.get("action_label")) || null,
        action_url: textValue(form.get("action_url")) || null,
        status: textValue(form.get("status")),
        starts_at: toIsoOrNull(textValue(form.get("starts_at"))),
        ends_at: toIsoOrNull(textValue(form.get("ends_at"))),
        manual_priority: Number(form.get("manual_priority") || 100),
        paid_amount_cents: Math.round(Number(form.get("paid_amount") || 0) * 100),
        payment_status: textValue(form.get("payment_status")) || "paid",
        notes: textValue(form.get("notes")) || null,
        ...(imageId ? { image_media_id: imageId } : {}),
      };

      if (editing) {
        await assertNoError(await supabase.from("banners").update(payload).eq("id", editing.id));
      } else {
        await assertNoError(await supabase.from("banners").insert(payload));
      }

      setEditing(null);
      formElement.reset();
      setFormSuccess("Banner salvo com sucesso.");
      await onSaved();
    } catch (error) {
      setFormError(messageFromError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <EditorCard title={editing ? "Editar banner" : "Novo banner"}>
        <form onSubmit={handleSubmit}>
          {formError && <ErrorBox>{formError}</ErrorBox>}
          {formSuccess && <SuccessBox>{formSuccess}</SuccessBox>}
          <FormGrid>
            <Field>
              Título
              <Input
                name="title"
                required
                defaultValue={editing?.title || ""}
              />
            </Field>
            <Field>
              Status
              <Select name="status" defaultValue={editing?.status || "draft"}>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Botão
              <Input
                name="action_label"
                defaultValue={editing?.action_label || ""}
                placeholder="Ver evento, Abrir WhatsApp..."
              />
            </Field>
            <Field>
              Link do botão
              <Input
                name="action_url"
                defaultValue={editing?.action_url || ""}
              />
            </Field>
            <Field>
              Início
              <Input
                name="starts_at"
                type="datetime-local"
                defaultValue={dateInputValue(editing?.starts_at)}
              />
            </Field>
            <Field>
              Fim
              <Input
                name="ends_at"
                type="datetime-local"
                defaultValue={dateInputValue(editing?.ends_at)}
              />
            </Field>
            <Field>
              Prioridade
              <Input
                name="manual_priority"
                type="number"
                defaultValue={editing?.manual_priority || 100}
              />
            </Field>
            <Field>
              Valor pago
              <Input
                name="paid_amount"
                type="number"
                min="0"
                step="0.01"
                defaultValue={(editing?.paid_amount_cents || 8000) / 100}
              />
            </Field>
            <Field>
              Pagamento
              <Select name="payment_status" defaultValue={editing?.payment_status || "paid"}>
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
                <option value="overdue">Atrasado</option>
                <option value="cancelled">Cancelado</option>
              </Select>
            </Field>
            <ImagePreviewInput name="image" label="Imagem do banner" />
          </FormGrid>
          <Field>
            Subtítulo
            <TextArea name="subtitle" defaultValue={editing?.subtitle || ""} />
          </Field>
          <Field>
            Observações internas
            <TextArea name="notes" defaultValue={editing?.notes || ""} />
          </Field>
          <Actions>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Salvando..."
                : editing
                  ? "Salvar banner"
                  : "Criar banner"}
            </Button>
            {editing && (
              <Button
                type="button"
                $variant="ghost"
                onClick={() => setEditing(null)}
              >
                Cancelar
              </Button>
            )}
          </Actions>
        </form>
      </EditorCard>

      <ResourceTable
        title="Banners cadastrados"
        empty="Nenhum banner cadastrado ainda."
        headers={["Título", "Status", "Período", "Prioridade", "Ações"]}
      >
        {banners.map((banner) => (
          <tr key={banner.id}>
            <td>{banner.title}</td>
            <td>
              <Badge $tone={statusTone(banner.status)}>
                {statusLabels[banner.status]}
              </Badge>
            </td>
            <td>
              {banner.ends_at
                ? `até ${new Date(banner.ends_at).toLocaleDateString("pt-BR")}`
                : "Sem fim"}
            </td>
            <td>{banner.manual_priority}</td>
            <td>
              <Button $variant="ghost" onClick={() => setEditing(banner)}>
                Editar
              </Button>
            </td>
          </tr>
        ))}
      </ResourceTable>
    </>
  );
}

function MetricsSection({
  metrics,
  companies,
  events,
}: {
  metrics: ClickSummary[];
  companies: Company[];
  events: EventItem[];
}) {
  const names = useMemo(() => {
    const map = new Map<string, string>();
    companies.forEach((company) => map.set(company.id, company.name));
    events.forEach((event) => map.set(event.id, event.title));
    return map;
  }, [companies, events]);

  return (
    <ResourceTable
      title="Cliques por dia"
      empty="Nenhuma métrica registrada ainda."
      headers={["Dia", "Item", "Tipo", "Clique", "Total"]}
    >
      {metrics.map((metric) => (
        <tr key={`${metric.day}-${metric.entity_id}-${metric.click_type}`}>
          <td>{new Date(metric.day).toLocaleDateString("pt-BR")}</td>
          <td>{names.get(metric.entity_id) || metric.entity_id}</td>
          <td>{metric.entity_type}</td>
          <td>{metric.click_type}</td>
          <td>{metric.total}</td>
        </tr>
      ))}
    </ResourceTable>
  );
}

function EditorCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      {children}
    </Card>
  );
}

function ResourceTable({
  title,
  empty,
  headers,
  children,
}: {
  title: string;
  empty: string;
  headers: string[];
  children: ReactNode;
}) {
  const rows = Array.isArray(children)
    ? children.filter(Boolean)
    : children
      ? [children]
      : [];

  return (
    <Card>
      <Toolbar>
        <CardTitle>{title}</CardTitle>
      </Toolbar>
      {rows.length === 0 ? (
        <Empty>{empty}</Empty>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </Table>
        </TableWrap>
      )}
    </Card>
  );
}

const Centered = styled.div`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
`;

const LoginCard = styled(Card)`
  width: min(430px, 100%);
  display: grid;
  gap: 14px;
`;

const SidebarFooter = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 28px;

  button {
    justify-content: center;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 14px;
  flex-wrap: wrap;
`;

const InlineActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const CheckLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
  color: #d9d0e7;
`;

const SuccessBox = styled.div`
  border: 1px solid #22c55e;
  background: rgba(22, 101, 52, 0.28);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 14px;
`;

const HoursGrid = styled.div`
  display: grid;
  gap: 10px;
`;

const HourRow = styled.div`
  display: grid;
  grid-template-columns: 150px 120px 120px 1fr;
  gap: 10px;
  align-items: center;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const ImagePreviewCard = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #120b22;
  border-radius: 8px;
  padding: 8px;
  display: grid;
  gap: 8px;

  img {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border-radius: 6px;
    background: #0b0714;
  }

  span {
    color: #a89abc;
    font-size: 12px;
  }
`;
