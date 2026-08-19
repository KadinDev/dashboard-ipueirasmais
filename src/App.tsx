import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import {
  BarChart3,
  BadgePercent,
  Building2,
  CalendarDays,
  Briefcase,
  ClockAlert,
  ClipboardList,
  Crown,
  Bell,
  AlertTriangle,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Newspaper,
  Phone,
  RefreshCcw,
  Search,
  Send,
  ShoppingBag,
  Smartphone,
  Sparkles,
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
  AppVersion,
  AlertItem,
  Category,
  City,
  CityHallSubmission,
  CityUpdate,
  ClickSummary,
  ClassifiedItem,
  Company,
  CompanyContact,
  CompanyHour,
  EventItem,
  Job,
  LostFoundItem,
  NewsItem,
  NotificationItem,
  Pharmacy,
  PharmacyDutyShift,
  Placement,
  Plan,
  PushCampaign,
  Promotion,
  SubmissionRequest,
  UsefulService,
} from "./lib/types";

type Tab =
  | "overview"
  | "companies"
  | "events"
  | "promotions"
  | "expired"
  | "lostFound"
  | "classifieds"
  | "submissions"
  | "jobs"
  | "alerts"
  | "cityUpdates"
  | "pharmacies"
  | "appVersions"
  | "news"
  | "notifications"
  | "push"
  | "placements"
  | "banners"
  | "metrics";

const tabs: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Resumo", icon: LayoutDashboard },
  { id: "companies", label: "Empresas", icon: Building2 },
  { id: "events", label: "Eventos", icon: CalendarDays },
  { id: "promotions", label: "Promoções", icon: BadgePercent },
  { id: "expired", label: "Expirados", icon: ClockAlert },
  { id: "lostFound", label: "Achados e perdidos", icon: Search },
  { id: "classifieds", label: "Classificados", icon: ShoppingBag },
  { id: "submissions", label: "Solicitações", icon: ClipboardList },
  { id: "jobs", label: "Vagas", icon: Briefcase },
  { id: "alerts", label: "Avisos", icon: AlertTriangle },
  { id: "cityUpdates", label: "Novidades", icon: Sparkles },
  { id: "pharmacies", label: "Serviços úteis", icon: Phone },
  { id: "appVersions", label: "Versão app", icon: Smartphone },
  { id: "news", label: "Notícias", icon: Newspaper },
  { id: "notifications", label: "Notificações", icon: Bell },
  { id: "push", label: "Push", icon: Send },
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

const paymentStatusLabels = {
  pending: "Pendente",
  paid: "Pago",
  overdue: "Atrasado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

const pushAudienceLabels = {
  all: "Todos os usuários da cidade",
  alerts: "Avisos da Prefeitura",
  commercial: "Campanha paga/comercial",
};

const pushStatusLabels = {
  draft: "Rascunho",
  pending: "Pendente",
  sending: "Enviando",
  sent: "Enviado",
  failed: "Falhou",
  cancelled: "Cancelado",
};

const submissionStatusLabels = {
  pending: "Pendente",
  reviewing: "Em análise",
  contacted: "Contato feito",
  approved: "Aprovado",
  rejected: "Recusado",
  archived: "Arquivado",
};

const publicSubmissionTypeLabels = {
  company: "Empresa",
  event: "Evento",
  job: "Vaga",
  promotion: "Promoção",
  classified: "Classificado",
  lost_found: "Achado/perdido",
};

const cityHallSubmissionTypeLabels = {
  alert: "Aviso",
  news: "Notícia",
};

const submissionPayloadLabels: Record<string, string> = {
  address: "Endereço",
  affected_areas: "Bairros/áreas afetadas",
  classified_whatsapp: "WhatsApp",
  company_name: "Nome da empresa",
  company_whatsapp: "WhatsApp da empresa",
  contact_info: "Como entrar em contato",
  contract_type: "Tipo de vaga",
  ends_at: "Fim",
  event_whatsapp: "WhatsApp",
  expected_resolution: "Previsão de normalização",
  importance: "Importância",
  instagram: "Instagram",
  item_type: "Tipo",
  job_whatsapp: "WhatsApp",
  neighborhood: "Bairro",
  place: "Local",
  price: "Preço",
  requirements: "Requisitos",
  salary: "Salário",
  starts_at: "Início",
  valid_until: "Válida até",
};

const usefulServiceTypeLabels = {
  pharmacy: "Farmácia",
  hospital: "Hospital",
  samu: "SAMU",
  police: "Polícia",
  firefighters: "Bombeiros",
  city_hall: "Prefeitura",
  enel: "Enel",
  cagece: "Cagece",
  other: "Outro",
};

const appPlatformLabels = {
  all: "Android e iOS",
  android: "Somente Android",
  ios: "Somente iOS",
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

const TABLE_PAGE_SIZE = 20;

type DatedRow = {
  created_at?: string | null;
  published_at?: string | null;
  starts_at?: string | null;
  updated_at?: string | null;
};

function normalizedText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function recentTime(item: DatedRow) {
  const rawDate =
    item.created_at || item.published_at || item.starts_at || item.updated_at || "";
  const time = rawDate ? new Date(rawDate).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function usePaginatedSearch<T extends DatedRow>(
  items: T[],
  getSearchText: (item: T) => string,
) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const normalizedSearch = normalizedText(search.trim());

  const filteredItems = useMemo(() => {
    return [...items]
      .sort((a, b) => recentTime(b) - recentTime(a))
      .filter((item) => {
        if (!normalizedSearch) return true;
        return normalizedText(getSearchText(item)).includes(normalizedSearch);
      });
  }, [getSearchText, items, normalizedSearch]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / TABLE_PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);
  const visibleItems = filteredItems.slice(
    (safePage - 1) * TABLE_PAGE_SIZE,
    safePage * TABLE_PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [normalizedSearch]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return {
    search,
    setSearch,
    page: safePage,
    setPage,
    visibleItems,
    totalItems: filteredItems.length,
    totalPages,
  };
}

function usePaginatedItems<T extends DatedRow>(items: T[]) {
  const [page, setPage] = useState(1);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => recentTime(b) - recentTime(a));
  }, [items]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedItems.length / TABLE_PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);
  const visibleItems = sortedItems.slice(
    (safePage - 1) * TABLE_PAGE_SIZE,
    safePage * TABLE_PAGE_SIZE,
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return {
    page: safePage,
    setPage,
    visibleItems,
    totalItems: sortedItems.length,
    totalPages,
  };
}

function messageFromError(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Não foi possível salvar. Verifique os campos e tente novamente.";
}

async function assertNoError<T extends { error: unknown }>(result: T) {
  if (result.error) throw result.error;
  return result;
}

async function deleteRows(
  table: string,
  id: string,
  onSaved: () => Promise<void>,
) {
  if (!window.confirm("Tem certeza que deseja excluir definitivamente?")) {
    return;
  }

  await assertNoError(await supabase.from(table).delete().eq("id", id));
  await onSaved();
}

function fileValue(form: FormData, name: string) {
  const value = form.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}

function ImagePreviewInput({ name, label }: { name: string; label: string }) {
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

type OptimizedImage = {
  file: File;
  width: number | null;
  height: number | null;
  originalSize: number;
};

function imageUploadSettings(folder: string) {
  if (folder.includes("logos") || folder === "pharmacies") {
    return { maxWidth: 512, quality: 0.82 };
  }

  if (folder.includes("banners") || folder.includes("covers")) {
    return { maxWidth: 1600, quality: 0.78 };
  }

  return { maxWidth: 1400, quality: 0.78 };
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem selecionada."));
    };
    image.src = url;
  });
}

async function optimizeImageBeforeUpload(
  file: File,
  folder: string,
): Promise<OptimizedImage> {
  if (!file.type.startsWith("image/")) {
    return { file, width: null, height: null, originalSize: file.size };
  }

  try {
    const { maxWidth, quality } = imageUploadSettings(folder);
    const image = await loadImage(file);
    const scale = Math.min(1, maxWidth / image.naturalWidth);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas indisponível para otimizar imagem.");

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", quality);
    });

    if (!blob) throw new Error("O navegador não conseguiu gerar WebP.");

    const optimizedFile = new File(
      [blob],
      `${file.name.replace(/\.[^.]+$/, "")}.webp`,
      { type: "image/webp" },
    );

    return {
      file: optimizedFile,
      width,
      height,
      originalSize: file.size,
    };
  } catch (error) {
    console.warn("Upload sem compressão por falha ao otimizar imagem.", error);
    return { file, width: null, height: null, originalSize: file.size };
  }
}

async function uploadMedia(file: File, folder: string, altText: string) {
  const optimized = await optimizeImageBeforeUpload(file, folder);
  const uploadFile = optimized.file;
  const extension = uploadFile.name.split(".").pop() || "webp";
  const storagePath = `${folder}/${crypto.randomUUID()}.${extension}`;
  const upload = await supabase.storage
    .from("public-media")
    .upload(storagePath, uploadFile, {
      cacheControl: "31536000",
      contentType: uploadFile.type || "image/webp",
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
      width: optimized.width,
      height: optimized.height,
      size_bytes: uploadFile.size,
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
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [lostFoundItems, setLostFoundItems] = useState<LostFoundItem[]>([]);
  const [classifieds, setClassifieds] = useState<ClassifiedItem[]>([]);
  const [submissionRequests, setSubmissionRequests] = useState<
    SubmissionRequest[]
  >([]);
  const [cityHallSubmissions, setCityHallSubmissions] = useState<
    CityHallSubmission[]
  >([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [cityUpdates, setCityUpdates] = useState<CityUpdate[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [pharmacyShifts, setPharmacyShifts] = useState<PharmacyDutyShift[]>(
    [],
  );
  const [usefulServices, setUsefulServices] = useState<UsefulService[]>([]);
  const [appVersions, setAppVersions] = useState<AppVersion[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pushCampaigns, setPushCampaigns] = useState<PushCampaign[]>([]);
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
        .from("promotions")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("lost_found_items")
        .select("*")
        .order("published_at", { ascending: false }),
      supabase
        .from("classifieds")
        .select("*")
        .order("published_at", { ascending: false }),
      supabase
        .from("submission_requests")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("city_hall_submissions")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("jobs")
        .select("*")
        .order("published_at", { ascending: false }),
      supabase
        .from("alerts")
        .select("*")
        .order("published_at", { ascending: false }),
      supabase
        .from("city_updates")
        .select("*")
        .order("published_at", { ascending: false }),
      supabase.from("pharmacies").select("*").order("manual_priority"),
      supabase
        .from("pharmacy_duty_shifts")
        .select("*")
        .order("starts_at", { ascending: false }),
      supabase
        .from("useful_services")
        .select("*")
        .order("manual_priority")
        .order("name"),
      supabase
        .from("app_versions")
        .select("*")
        .order("updated_at", { ascending: false }),
      supabase
        .from("news")
        .select("*")
        .order("published_at", { ascending: false }),
      supabase
        .from("notifications")
        .select("*")
        .order("published_at", { ascending: false }),
      supabase
        .from("push_campaigns")
        .select("*")
        .order("created_at", { ascending: false }),
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
      setPromotions((requests[6].data || []) as Promotion[]);
      setLostFoundItems((requests[7].data || []) as LostFoundItem[]);
      setClassifieds((requests[8].data || []) as ClassifiedItem[]);
      setSubmissionRequests((requests[9].data || []) as SubmissionRequest[]);
      setCityHallSubmissions(
        (requests[10].data || []) as CityHallSubmission[],
      );
      setJobs((requests[11].data || []) as Job[]);
      setAlerts((requests[12].data || []) as AlertItem[]);
      setCityUpdates((requests[13].data || []) as CityUpdate[]);
      setPharmacies((requests[14].data || []) as Pharmacy[]);
      setPharmacyShifts((requests[15].data || []) as PharmacyDutyShift[]);
      setUsefulServices((requests[16].data || []) as UsefulService[]);
      setAppVersions((requests[17].data || []) as AppVersion[]);
      setNews((requests[18].data || []) as NewsItem[]);
      setNotifications((requests[19].data || []) as NotificationItem[]);
      setPushCampaigns((requests[20].data || []) as PushCampaign[]);
      setBanners((requests[21].data || []) as Banner[]);
      setPlans((requests[22].data || []) as Plan[]);
      setPlacements((requests[23].data || []) as Placement[]);
      setMetrics((requests[24].data || []) as ClickSummary[]);
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
  const promotionCategories = categories.filter(
    (category) => category.kind === "promotion",
  );
  const jobCategories = categories.filter(
    (category) => category.kind === "job",
  );
  const alertCategories = categories.filter(
    (category) => category.kind === "alert",
  );
  const cityUpdateCategories = categories.filter(
    (category) => category.kind === "city_update",
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
            promotions={promotions}
            lostFoundItems={lostFoundItems}
            classifieds={classifieds}
            jobs={jobs}
            alerts={alerts}
            cityUpdates={cityUpdates}
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

        {activeTab === "promotions" && (
          <PromotionsSection
            cityId={cityId}
            promotions={promotions}
            companies={companies}
            categories={promotionCategories}
            onSaved={loadData}
          />
        )}

        {activeTab === "expired" && (
          <ExpiredSection
            events={events}
            promotions={promotions}
            companies={companies}
            onSaved={loadData}
          />
        )}

        {activeTab === "lostFound" && (
          <LostFoundSection
            cityId={cityId}
            items={lostFoundItems}
            onSaved={loadData}
          />
        )}

        {activeTab === "classifieds" && (
          <ClassifiedsSection
            cityId={cityId}
            classifieds={classifieds}
            onSaved={loadData}
          />
        )}

        {activeTab === "submissions" && (
          <SubmissionsSection
            submissionRequests={submissionRequests}
            cityHallSubmissions={cityHallSubmissions}
            onSaved={loadData}
          />
        )}

        {activeTab === "jobs" && (
          <JobsSection
            cityId={cityId}
            jobs={jobs}
            companies={companies}
            categories={jobCategories}
            onSaved={loadData}
          />
        )}

        {activeTab === "alerts" && (
          <AlertsSection
            cityId={cityId}
            alerts={alerts}
            onSaved={loadData}
          />
        )}

        {activeTab === "cityUpdates" && (
          <CityUpdatesSection
            cityId={cityId}
            updates={cityUpdates}
            categories={cityUpdateCategories}
            companies={companies}
            events={events}
            promotions={promotions}
            lostFoundItems={lostFoundItems}
            classifieds={classifieds}
            jobs={jobs}
            alerts={alerts}
            onSaved={loadData}
          />
        )}

        {activeTab === "pharmacies" && (
          <PharmaciesSection
            cityId={cityId}
            pharmacies={pharmacies}
            shifts={pharmacyShifts}
            usefulServices={usefulServices}
            companies={companies}
            onSaved={loadData}
          />
        )}

        {activeTab === "appVersions" && (
          <AppVersionsSection
            cityId={cityId}
            appVersions={appVersions}
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
            onSaved={loadData}
          />
        )}

        {activeTab === "push" && (
          <PushSection
            cityId={cityId}
            pushCampaigns={pushCampaigns}
            alerts={alerts}
            companies={companies}
            events={events}
            promotions={promotions}
            lostFoundItems={lostFoundItems}
            classifieds={classifieds}
            jobs={jobs}
            news={news}
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
            promotions={promotions}
            lostFoundItems={lostFoundItems}
            classifieds={classifieds}
            jobs={jobs}
            alerts={alerts}
            cityUpdates={cityUpdates}
            pharmacies={pharmacies}
          />
        )}
      </Main>
    </Page>
  );
}

function Overview({
  companies,
  events,
  promotions,
  lostFoundItems,
  classifieds,
  jobs,
  alerts,
  cityUpdates,
  banners,
  activePlacements,
  totalClicks,
}: {
  companies: Company[];
  events: EventItem[];
  promotions: Promotion[];
  lostFoundItems: LostFoundItem[];
  classifieds: ClassifiedItem[];
  jobs: Job[];
  alerts: AlertItem[];
  cityUpdates: CityUpdate[];
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
        <Muted>Promoções publicadas</Muted>
        <StatValue>
          {promotions.filter((item) => item.status === "published").length}
        </StatValue>
      </Card>
      <Card>
        <Muted>Achados e perdidos</Muted>
        <StatValue>
          {lostFoundItems.filter((item) => item.status === "published").length}
        </StatValue>
      </Card>
      <Card>
        <Muted>Classificados publicados</Muted>
        <StatValue>
          {classifieds.filter((item) => item.status === "published").length}
        </StatValue>
      </Card>
      <Card>
        <Muted>Vagas publicadas</Muted>
        <StatValue>
          {jobs.filter((item) => item.status === "published").length}
        </StatValue>
      </Card>
      <Card>
        <Muted>Avisos publicados</Muted>
        <StatValue>
          {alerts.filter((item) => item.status === "published").length}
        </StatValue>
      </Card>
      <Card>
        <Muted>Novidades publicadas</Muted>
        <StatValue>
          {cityUpdates.filter((item) => item.status === "published").length}
        </StatValue>
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
  const companyList = usePaginatedSearch(companies, (company) =>
    [
      company.name,
      company.neighborhood,
      company.description,
      company.address_line,
    ]
      .filter(Boolean)
      .join(" "),
  );
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
        rating: textValue(form.get("rating"))
          ? Number(form.get("rating"))
          : null,
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
          await supabase
            .from("companies")
            .insert(payload)
            .select("id")
            .single(),
        );
        if (!created.data)
          throw new Error("Empresa criada, mas o Supabase não retornou o ID.");
        companyId = created.data.id;
      }

      if (companyId) {
        await assertNoError(
          await supabase
            .from("company_contacts")
            .delete()
            .eq("company_id", companyId),
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
          await supabase
            .from("company_hours")
            .delete()
            .eq("company_id", companyId),
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
          await assertNoError(
            await supabase.from("company_hours").insert(nextHours),
          );
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

  async function deleteCompany(id: string) {
    if (!window.confirm("Tem certeza que deseja excluir esta empresa?")) return;
    await assertNoError(
      await supabase.from("company_contacts").delete().eq("company_id", id),
    );
    await assertNoError(
      await supabase.from("company_hours").delete().eq("company_id", id),
    );
    await assertNoError(
      await supabase
        .from("placements")
        .delete()
        .eq("entity_type", "company")
        .eq("entity_id", id),
    );
    await assertNoError(await supabase.from("companies").delete().eq("id", id));
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
                defaultValue={
                  (editing?.listing_paid_amount_cents || 3000) / 100
                }
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
                placeholder="Ex: -4.5432100"
              />
            </Field>
            <Field>
              Longitude
              <Input
                name="longitude"
                type="number"
                step="0.0000001"
                defaultValue={editing?.longitude ?? ""}
                placeholder="Ex: -40.7178900"
              />
            </Field>
            <Field>
              WhatsApp
              <Input
                name="whatsapp"
                defaultValue={contactValue("whatsapp")}
                placeholder="Ex: 5588999999999"
              />
            </Field>
            <Field>
              Telefone para ligar (opcional)
              <Input
                name="phone"
                defaultValue={contactValue("phone")}
                placeholder="Ex: 88999999999"
              />
            </Field>
            <Field>
              Instagram
              <Input
                name="instagram"
                defaultValue={contactValue("instagram")}
                placeholder="Ex: @perfil ou https://instagram.com/perfil"
              />
            </Field>
            <Field>
              Rota/Maps
              <Input
                name="maps"
                defaultValue={contactValue("maps")}
                placeholder="Opcional: https://maps.google.com/?q=-4.5432100,-40.7178900"
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
        controls={
          <TableControls
            search={companyList.search}
            onSearch={companyList.setSearch}
            placeholder="Pesquisar empresa por nome, bairro, endereço..."
            page={companyList.page}
            totalPages={companyList.totalPages}
            totalItems={companyList.totalItems}
            onPage={companyList.setPage}
          />
        }
      >
        {companyList.visibleItems.map((company) => (
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
                <Button
                  $variant="danger"
                  onClick={() => deleteCompany(company.id)}
                >
                  Excluir
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
  const eventList = usePaginatedSearch(events, (event) =>
    [
      event.title,
      event.description,
      event.venue_name,
      event.address_line,
      event.neighborhood,
    ]
      .filter(Boolean)
      .join(" "),
  );

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
        await assertNoError(
          await supabase.from("events").update(payload).eq("id", editing.id),
        );
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

  async function deleteEvent(id: string) {
    if (!window.confirm("Tem certeza que deseja excluir este evento?")) return;
    await assertNoError(
      await supabase
        .from("placements")
        .delete()
        .eq("entity_type", "event")
        .eq("entity_id", id),
    );
    await assertNoError(await supabase.from("events").delete().eq("id", id));
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
              Início do evento
              <Muted>Data e hora real em que o evento começa.</Muted>
              <Input
                name="starts_at"
                type="datetime-local"
                required
                defaultValue={dateInputValue(editing?.starts_at)}
              />
            </Field>
            <Field>
              Fim do evento
              <Muted>
                Data e hora em que o evento termina, se você souber.
              </Muted>
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
                placeholder="Ex: -4.5432100"
              />
            </Field>
            <Field>
              Longitude
              <Input
                name="longitude"
                type="number"
                step="0.0000001"
                defaultValue={editing?.longitude ?? ""}
                placeholder="Ex: -40.7178900"
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
              <Input
                name="whatsapp"
                defaultValue={editing?.whatsapp || ""}
                placeholder="Ex: 5588996960339"
              />
            </Field>
            <Field>
              Link de ingresso/reserva
              <Input
                name="ticket_url"
                defaultValue={editing?.ticket_url || ""}
                placeholder="Ex: https://site.com/ingressos"
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
        controls={
          <TableControls
            search={eventList.search}
            onSearch={eventList.setSearch}
            placeholder="Pesquisar evento por título, local, endereço..."
            page={eventList.page}
            totalPages={eventList.totalPages}
            totalItems={eventList.totalItems}
            onPage={eventList.setPage}
          />
        }
      >
        {eventList.visibleItems.map((event) => (
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
                <Button
                  $variant="danger"
                  onClick={() => deleteEvent(event.id)}
                >
                  Excluir
                </Button>
              </InlineActions>
            </td>
          </tr>
        ))}
      </ResourceTable>
    </>
  );
}

function PromotionsSection({
  cityId,
  promotions,
  companies,
  categories,
  onSaved,
}: {
  cityId: string;
  promotions: Promotion[];
  companies: Company[];
  categories: Category[];
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const promotionList = usePaginatedSearch(promotions, (promotion) =>
    [
      promotion.title,
      promotion.description,
      promotion.price_label,
      companies.find((company) => company.id === promotion.company_id)?.name,
    ]
      .filter(Boolean)
      .join(" "),
  );

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
        ? await uploadMedia(imageFile, "promotions", title)
        : null;
      const status = textValue(form.get("status"));
      const payload = {
        city_id: cityId,
        company_id: textValue(form.get("company_id")) || null,
        category_id: textValue(form.get("category_id")) || null,
        title,
        slug: textValue(form.get("slug")) || slugify(title),
        description: textValue(form.get("description")) || null,
        old_price_cents: null,
        new_price_cents: textValue(form.get("new_price"))
          ? Math.round(Number(form.get("new_price")) * 100)
          : null,
        price_label: textValue(form.get("price_label")) || null,
        valid_until: toIsoOrNull(textValue(form.get("valid_until"))),
        whatsapp: null,
        status,
        manual_priority: Number(form.get("manual_priority") || 100),
        published_at: status === "published" ? new Date().toISOString() : null,
        ...(imageId ? { image_media_id: imageId } : {}),
      };

      if (editing) {
        await assertNoError(
          await supabase
            .from("promotions")
            .update(payload)
            .eq("id", editing.id),
        );
      } else {
        await assertNoError(await supabase.from("promotions").insert(payload));
      }

      setEditing(null);
      formElement.reset();
      setFormSuccess("Promoção salva com sucesso.");
      await onSaved();
    } catch (error) {
      setFormError(messageFromError(error));
    } finally {
      setSaving(false);
    }
  }

  async function archivePromotion(id: string) {
    await supabase.from("promotions").update({ status: "archived" }).eq("id", id);
    await onSaved();
  }

  async function deletePromotion(id: string) {
    await deleteRows("promotions", id, onSaved);
  }

  return (
    <>
      <EditorCard title={editing ? "Editar promoção" : "Nova promoção"}>
        <form onSubmit={handleSubmit}>
          {formError && <ErrorBox>{formError}</ErrorBox>}
          {formSuccess && <SuccessBox>{formSuccess}</SuccessBox>}
          <FormGrid>
            <Field>
              Título
              <Input name="title" required defaultValue={editing?.title || ""} />
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
              Empresa relacionada
              <Select name="company_id" defaultValue={editing?.company_id || ""}>
                <option value="">Sem empresa</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Select>
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
              Preço novo
              <Input
                name="new_price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={
                  editing?.new_price_cents ? editing.new_price_cents / 100 : ""
                }
              />
            </Field>
            <Field>
              Texto do preço
              <Input
                name="price_label"
                placeholder="Ex: por R$ 29,90"
                defaultValue={editing?.price_label || ""}
              />
            </Field>
            <Field>
              Válida até
              <Input
                name="valid_until"
                type="datetime-local"
                defaultValue={dateInputValue(editing?.valid_until)}
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
              Prioridade
              <Input
                name="manual_priority"
                type="number"
                defaultValue={editing?.manual_priority || 100}
              />
            </Field>
            <ImagePreviewInput name="image" label="Imagem da promoção" />
          </FormGrid>
          <Field>
            Descrição
            <TextArea
              name="description"
              defaultValue={editing?.description || ""}
            />
          </Field>
          <Actions>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Salvando..."
                : editing
                  ? "Salvar promoção"
                  : "Criar promoção"}
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
        title="Promoções cadastradas"
        empty="Nenhuma promoção cadastrada ainda."
        headers={["Título", "Empresa", "Status", "Validade", "Ações"]}
        controls={
          <TableControls
            search={promotionList.search}
            onSearch={promotionList.setSearch}
            placeholder="Pesquisar promoção por título, empresa, preço..."
            page={promotionList.page}
            totalPages={promotionList.totalPages}
            totalItems={promotionList.totalItems}
            onPage={promotionList.setPage}
          />
        }
      >
        {promotionList.visibleItems.map((item) => (
          <tr key={item.id}>
            <td>
              <strong>{item.title}</strong>
              <Muted>{item.price_label || item.description}</Muted>
            </td>
            <td>
              {companies.find((company) => company.id === item.company_id)
                ?.name || "Sem empresa"}
            </td>
            <td>
              <Badge $tone={statusTone(item.status)}>
                {statusLabels[item.status]}
              </Badge>
            </td>
            <td>
              {item.valid_until
                ? new Date(item.valid_until).toLocaleDateString("pt-BR")
                : "Sem validade"}
            </td>
            <td>
              <InlineActions>
                <Button $variant="ghost" onClick={() => setEditing(item)}>
                  Editar
                </Button>
                <Button
                  $variant="danger"
                  onClick={() => archivePromotion(item.id)}
                >
                  Arquivar
                </Button>
                <Button
                  $variant="danger"
                  onClick={() => deletePromotion(item.id)}
                >
                  Excluir
                </Button>
              </InlineActions>
            </td>
          </tr>
        ))}
      </ResourceTable>
    </>
  );
}

function ExpiredSection({
  events,
  promotions,
  companies,
  onSaved,
}: {
  events: EventItem[];
  promotions: Promotion[];
  companies: Company[];
  onSaved: () => Promise<void>;
}) {
  const now = Date.now();

  const expiredEvents = useMemo(() => {
    return events.filter((event) => {
      if (event.status === "archived") return false;
      const referenceDate = event.ends_at || event.starts_at;
      const referenceTime = new Date(referenceDate).getTime();
      return Number.isFinite(referenceTime) && referenceTime < now;
    });
  }, [events, now]);

  const expiredPromotions = useMemo(() => {
    return promotions.filter((promotion) => {
      if (promotion.status === "archived" || !promotion.valid_until) {
        return false;
      }
      const validUntil = new Date(promotion.valid_until).getTime();
      return Number.isFinite(validUntil) && validUntil < now;
    });
  }, [promotions, now]);

  const eventList = usePaginatedItems(expiredEvents);
  const promotionList = usePaginatedItems(expiredPromotions);

  async function archiveEvent(id: string) {
    await assertNoError(
      await supabase.from("events").update({ status: "archived" }).eq("id", id),
    );
    await onSaved();
  }

  async function deleteEvent(id: string) {
    if (!window.confirm("Tem certeza que deseja excluir este evento?")) return;
    await assertNoError(
      await supabase
        .from("placements")
        .delete()
        .eq("entity_type", "event")
        .eq("entity_id", id),
    );
    await assertNoError(await supabase.from("events").delete().eq("id", id));
    await onSaved();
  }

  async function archivePromotion(id: string) {
    await assertNoError(
      await supabase
        .from("promotions")
        .update({ status: "archived" })
        .eq("id", id),
    );
    await onSaved();
  }

  async function deletePromotion(id: string) {
    await deleteRows("promotions", id, onSaved);
  }

  return (
    <>
      <Card>
        <CardTitle>Conteúdos expirados</CardTitle>
        <Muted>
          Use esta tela para encontrar rapidamente eventos que já terminaram e
          promoções que passaram da validade. Arquivar tira do app e mantém o
          histórico; excluir remove definitivamente.
        </Muted>
      </Card>

      <ResourceTable
        title="Eventos encerrados"
        empty="Nenhum evento encerrado encontrado."
        headers={["Evento", "Fim usado", "Status", "Ações"]}
        controls={
          <PaginationControls
            page={eventList.page}
            totalPages={eventList.totalPages}
            totalItems={eventList.totalItems}
            onPage={eventList.setPage}
          />
        }
      >
        {eventList.visibleItems.map((event) => {
          const referenceDate = event.ends_at || event.starts_at;
          return (
            <tr key={event.id}>
              <td>
                <strong>{event.title}</strong>
                <Muted>{event.venue_name || event.address_line}</Muted>
              </td>
              <td>{new Date(referenceDate).toLocaleString("pt-BR")}</td>
              <td>
                <Badge $tone={statusTone(event.status)}>
                  {statusLabels[event.status]}
                </Badge>
              </td>
              <td>
                <InlineActions>
                  <Button
                    $variant="danger"
                    onClick={() => archiveEvent(event.id)}
                  >
                    Arquivar
                  </Button>
                  <Button
                    $variant="danger"
                    onClick={() => deleteEvent(event.id)}
                  >
                    Excluir
                  </Button>
                </InlineActions>
              </td>
            </tr>
          );
        })}
      </ResourceTable>

      <ResourceTable
        title="Promoções vencidas"
        empty="Nenhuma promoção vencida encontrada."
        headers={["Promoção", "Empresa", "Validade", "Ações"]}
        controls={
          <PaginationControls
            page={promotionList.page}
            totalPages={promotionList.totalPages}
            totalItems={promotionList.totalItems}
            onPage={promotionList.setPage}
          />
        }
      >
        {promotionList.visibleItems.map((promotion) => (
          <tr key={promotion.id}>
            <td>
              <strong>{promotion.title}</strong>
              <Muted>{promotion.price_label || promotion.description}</Muted>
            </td>
            <td>
              {companies.find((company) => company.id === promotion.company_id)
                ?.name || "Sem empresa"}
            </td>
            <td>
              {promotion.valid_until
                ? new Date(promotion.valid_until).toLocaleString("pt-BR")
                : "Sem validade"}
            </td>
            <td>
              <InlineActions>
                <Button
                  $variant="danger"
                  onClick={() => archivePromotion(promotion.id)}
                >
                  Arquivar
                </Button>
                <Button
                  $variant="danger"
                  onClick={() => deletePromotion(promotion.id)}
                >
                  Excluir
                </Button>
              </InlineActions>
            </td>
          </tr>
        ))}
      </ResourceTable>
    </>
  );
}

function LostFoundSection({
  cityId,
  items,
  onSaved,
}: {
  cityId: string;
  items: LostFoundItem[];
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<LostFoundItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const itemList = usePaginatedSearch(items, (item) =>
    [item.title, item.description, item.contact_label, item.item_type]
      .filter(Boolean)
      .join(" "),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const title = textValue(form.get("title"));
    const imageFile = fileValue(form, "image");
    const status = textValue(form.get("status"));

    setSaving(true);
    setFormError("");
    setFormSuccess("");

    try {
      const imageId = imageFile
        ? await uploadMedia(imageFile, "lost-found", title)
        : null;
      const payload = {
        city_id: cityId,
        title,
        slug: textValue(form.get("slug")) || slugify(title),
        item_type: textValue(form.get("item_type")) || "lost",
        description: textValue(form.get("description")) || null,
        contact_label: textValue(form.get("contact_label")) || null,
        occurred_at: toIsoOrNull(textValue(form.get("occurred_at"))),
        status,
        manual_priority: Number(form.get("manual_priority") || 100),
        published_at: status === "published" ? new Date().toISOString() : null,
        ...(imageId ? { image_media_id: imageId } : {}),
      };

      if (editing) {
        await assertNoError(
          await supabase
            .from("lost_found_items")
            .update(payload)
            .eq("id", editing.id),
        );
      } else {
        await assertNoError(
          await supabase.from("lost_found_items").insert(payload),
        );
      }

      setEditing(null);
      formElement.reset();
      setFormSuccess("Achado/perdido salvo com sucesso.");
      await onSaved();
    } catch (error) {
      setFormError(messageFromError(error));
    } finally {
      setSaving(false);
    }
  }

  async function archiveItem(id: string) {
    await assertNoError(
      await supabase
        .from("lost_found_items")
        .update({ status: "archived" })
        .eq("id", id),
    );
    await onSaved();
  }

  async function deleteItem(id: string) {
    await deleteRows("lost_found_items", id, onSaved);
  }

  return (
    <>
      <EditorCard
        title={editing ? "Editar achado/perdido" : "Novo achado ou perdido"}
      >
        <Muted>
          Cadastre documentos, objetos, chaves, celulares, pets ou qualquer
          item achado/perdido na cidade. O contato pode ficar na descrição ou no
          campo de contato.
        </Muted>
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
                placeholder="Ex: Documento perdido no Centro"
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
              Tipo
              <Select name="item_type" defaultValue={editing?.item_type || "lost"}>
                <option value="lost">Perdido</option>
                <option value="found">Achado</option>
              </Select>
            </Field>
            <Field>
              Data
              <Input
                name="occurred_at"
                type="datetime-local"
                defaultValue={dateInputValue(editing?.occurred_at)}
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
              Prioridade
              <Input
                name="manual_priority"
                type="number"
                defaultValue={editing?.manual_priority || 100}
              />
            </Field>
            <ImagePreviewInput name="image" label="Imagem do item" />
          </FormGrid>
          <Field>
            Como entrar em contato
            <Input
              name="contact_label"
              defaultValue={editing?.contact_label || ""}
              placeholder="Ex: Entrar em contato pelo WhatsApp 88 99999-9999"
            />
          </Field>
          <Field>
            Descrição
            <TextArea
              name="description"
              defaultValue={editing?.description || ""}
              placeholder="Explique se foi achado ou perdido, onde aconteceu e como a pessoa deve entrar em contato."
            />
          </Field>
          <Actions>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Salvando..."
                : editing
                  ? "Salvar achado/perdido"
                  : "Criar achado/perdido"}
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
        title="Achados e perdidos cadastrados"
        empty="Nenhum achado ou perdido cadastrado ainda."
        headers={["Item", "Tipo", "Data", "Status", "Ações"]}
        controls={
          <TableControls
            search={itemList.search}
            onSearch={itemList.setSearch}
            placeholder="Pesquisar por título, descrição ou contato..."
            page={itemList.page}
            totalPages={itemList.totalPages}
            totalItems={itemList.totalItems}
            onPage={itemList.setPage}
          />
        }
      >
        {itemList.visibleItems.map((item) => (
          <tr key={item.id}>
            <td>
              <strong>{item.title}</strong>
              <Muted>{item.description}</Muted>
            </td>
            <td>{item.item_type === "found" ? "Achado" : "Perdido"}</td>
            <td>
              {item.occurred_at
                ? new Date(item.occurred_at).toLocaleDateString("pt-BR")
                : item.published_at
                  ? new Date(item.published_at).toLocaleDateString("pt-BR")
                  : "Sem data"}
            </td>
            <td>
              <Badge $tone={statusTone(item.status)}>
                {statusLabels[item.status]}
              </Badge>
            </td>
            <td>
              <InlineActions>
                <Button $variant="ghost" onClick={() => setEditing(item)}>
                  Editar
                </Button>
                <Button $variant="danger" onClick={() => archiveItem(item.id)}>
                  Arquivar
                </Button>
                <Button $variant="danger" onClick={() => deleteItem(item.id)}>
                  Excluir
                </Button>
              </InlineActions>
            </td>
          </tr>
        ))}
      </ResourceTable>
    </>
  );
}

function ClassifiedsSection({
  cityId,
  classifieds,
  onSaved,
}: {
  cityId: string;
  classifieds: ClassifiedItem[];
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<ClassifiedItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const classifiedList = usePaginatedSearch(classifieds, (item) =>
    [item.title, item.description, item.price_label, item.whatsapp]
      .filter(Boolean)
      .join(" "),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const title = textValue(form.get("title"));
    const coverFile = fileValue(form, "cover");
    const photo1File = fileValue(form, "photo_1");
    const photo2File = fileValue(form, "photo_2");
    const photo3File = fileValue(form, "photo_3");
    const status = textValue(form.get("status"));

    setSaving(true);
    setFormError("");
    setFormSuccess("");

    try {
      const coverId = coverFile
        ? await uploadMedia(coverFile, "classifieds/covers", title)
        : null;
      const photo1Id = photo1File
        ? await uploadMedia(photo1File, "classifieds/photos", title)
        : null;
      const photo2Id = photo2File
        ? await uploadMedia(photo2File, "classifieds/photos", title)
        : null;
      const photo3Id = photo3File
        ? await uploadMedia(photo3File, "classifieds/photos", title)
        : null;
      const payload = {
        city_id: cityId,
        title,
        slug: textValue(form.get("slug")) || slugify(title),
        description: textValue(form.get("description")) || null,
        price_label: textValue(form.get("price_label")) || null,
        whatsapp: textValue(form.get("whatsapp")) || null,
        valid_until: toIsoOrNull(textValue(form.get("valid_until"))),
        status,
        manual_priority: Number(form.get("manual_priority") || 100),
        published_at: status === "published" ? new Date().toISOString() : null,
        ...(coverId ? { cover_media_id: coverId } : {}),
        ...(photo1Id ? { photo_1_media_id: photo1Id } : {}),
        ...(photo2Id ? { photo_2_media_id: photo2Id } : {}),
        ...(photo3Id ? { photo_3_media_id: photo3Id } : {}),
      };

      if (editing) {
        await assertNoError(
          await supabase
            .from("classifieds")
            .update(payload)
            .eq("id", editing.id),
        );
      } else {
        await assertNoError(await supabase.from("classifieds").insert(payload));
      }

      setEditing(null);
      formElement.reset();
      setFormSuccess("Classificado salvo com sucesso.");
      await onSaved();
    } catch (error) {
      setFormError(messageFromError(error));
    } finally {
      setSaving(false);
    }
  }

  async function archiveClassified(id: string) {
    await assertNoError(
      await supabase
        .from("classifieds")
        .update({ status: "archived" })
        .eq("id", id),
    );
    await onSaved();
  }

  async function deleteClassified(id: string) {
    await deleteRows("classifieds", id, onSaved);
  }

  return (
    <>
      <EditorCard
        title={editing ? "Editar classificado" : "Novo classificado"}
      >
        <Muted>
          Cadastre produtos, veículos, imóveis ou itens usados. A capa aparece
          no card e as fotos extras ficam prontas para a tela de detalhe no app.
        </Muted>
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
                placeholder="Ex: Bicicleta aro 29"
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
              Valor
              <Input
                name="price_label"
                defaultValue={editing?.price_label || ""}
                placeholder="Ex: R$ 850,00"
              />
            </Field>
            <Field>
              WhatsApp
              <Input
                name="whatsapp"
                defaultValue={editing?.whatsapp || ""}
                placeholder="Ex: 5588999999999"
              />
            </Field>
            <Field>
              Válido até
              <Input
                name="valid_until"
                type="datetime-local"
                defaultValue={dateInputValue(editing?.valid_until)}
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
              Prioridade
              <Input
                name="manual_priority"
                type="number"
                defaultValue={editing?.manual_priority || 100}
              />
            </Field>
            <ImagePreviewInput name="cover" label="Imagem de capa" />
            <ImagePreviewInput name="photo_1" label="Foto extra 1" />
            <ImagePreviewInput name="photo_2" label="Foto extra 2" />
            <ImagePreviewInput name="photo_3" label="Foto extra 3" />
          </FormGrid>
          <Field>
            Descrição
            <TextArea
              name="description"
              defaultValue={editing?.description || ""}
              placeholder="Descreva estado do produto, detalhes, forma de entrega e contato."
            />
          </Field>
          <Actions>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Salvando..."
                : editing
                  ? "Salvar classificado"
                  : "Criar classificado"}
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
        title="Classificados cadastrados"
        empty="Nenhum classificado cadastrado ainda."
        headers={["Classificado", "Valor", "Validade", "Status", "Ações"]}
        controls={
          <TableControls
            search={classifiedList.search}
            onSearch={classifiedList.setSearch}
            placeholder="Pesquisar por título, descrição, valor ou WhatsApp..."
            page={classifiedList.page}
            totalPages={classifiedList.totalPages}
            totalItems={classifiedList.totalItems}
            onPage={classifiedList.setPage}
          />
        }
      >
        {classifiedList.visibleItems.map((item) => (
          <tr key={item.id}>
            <td>
              <strong>{item.title}</strong>
              <Muted>{item.description}</Muted>
            </td>
            <td>{item.price_label || "Sem valor"}</td>
            <td>
              {item.valid_until
                ? new Date(item.valid_until).toLocaleDateString("pt-BR")
                : "Sem validade"}
            </td>
            <td>
              <Badge $tone={statusTone(item.status)}>
                {statusLabels[item.status]}
              </Badge>
            </td>
            <td>
              <InlineActions>
                <Button $variant="ghost" onClick={() => setEditing(item)}>
                  Editar
                </Button>
                <Button
                  $variant="danger"
                  onClick={() => archiveClassified(item.id)}
                >
                  Arquivar
                </Button>
                <Button
                  $variant="danger"
                  onClick={() => deleteClassified(item.id)}
                >
                  Excluir
                </Button>
              </InlineActions>
            </td>
          </tr>
        ))}
      </ResourceTable>
    </>
  );
}

function SubmissionsSection({
  submissionRequests,
  cityHallSubmissions,
  onSaved,
}: {
  submissionRequests: SubmissionRequest[];
  cityHallSubmissions: CityHallSubmission[];
  onSaved: () => Promise<void>;
}) {
  const publicList = usePaginatedSearch(submissionRequests, (item) =>
    [
      item.title,
      item.description,
      item.requester_name,
      item.requester_whatsapp,
      item.content_type,
      item.status,
    ]
      .filter(Boolean)
      .join(" "),
  );
  const cityHallList = usePaginatedSearch(cityHallSubmissions, (item) =>
    [item.title, item.summary, item.body, item.content_type, item.status]
      .filter(Boolean)
      .join(" "),
  );
  const [selectedSubmission, setSelectedSubmission] = useState<
    | { source: "public"; item: SubmissionRequest }
    | { source: "cityHall"; item: CityHallSubmission }
    | null
  >(null);

  async function updatePublicStatus(
    id: string,
    status: SubmissionRequest["status"],
  ) {
    await assertNoError(
      await supabase.from("submission_requests").update({ status }).eq("id", id),
    );
    await onSaved();
  }

  async function updateCityHallStatus(
    id: string,
    status: CityHallSubmission["status"],
  ) {
    await assertNoError(
      await supabase
        .from("city_hall_submissions")
        .update({ status })
        .eq("id", id),
    );
    await onSaved();
  }

  async function deletePublicRequest(id: string) {
    await deleteRows("submission_requests", id, onSaved);
  }

  async function deleteCityHallRequest(id: string) {
    await deleteRows("city_hall_submissions", id, onSaved);
  }

  return (
    <>
      <Card>
        <CardTitle>Solicitações recebidas</CardTitle>
        <Muted>
          Esta tela é uma triagem. O envio público e o painel da Prefeitura não
          publicam nada automaticamente no app. Revise, entre em contato e faça
          o cadastro final nas telas oficiais.
        </Muted>
      </Card>

      <ResourceTable
        title="Envios do portal público"
        empty="Nenhuma solicitação pública recebida ainda."
        headers={["Solicitação", "Tipo", "Status", "Ações"]}
        controls={
          <TableControls
            search={publicList.search}
            onSearch={publicList.setSearch}
            placeholder="Pesquisar por título, contato, tipo ou status..."
            page={publicList.page}
            totalPages={publicList.totalPages}
            totalItems={publicList.totalItems}
            onPage={publicList.setPage}
          />
        }
      >
        {publicList.visibleItems.map((item) => (
          <tr key={item.id}>
            <td>
              <strong>{item.title}</strong>
              <MoreButton
                type="button"
                onClick={() => setSelectedSubmission({ source: "public", item })}
              >
                Ver mais
              </MoreButton>
            </td>
            <td>{publicSubmissionTypeLabels[item.content_type]}</td>
            <td>
              <Select
                value={item.status}
                onChange={(event) =>
                  updatePublicStatus(
                    item.id,
                    event.target.value as SubmissionRequest["status"],
                  )
                }
              >
                {Object.entries(submissionStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </td>
            <td>
              <InlineActions>
                <Button
                  $variant="danger"
                  onClick={() => updatePublicStatus(item.id, "archived")}
                >
                  Arquivar
                </Button>
                <Button
                  $variant="danger"
                  onClick={() => deletePublicRequest(item.id)}
                >
                  Excluir
                </Button>
              </InlineActions>
            </td>
          </tr>
        ))}
      </ResourceTable>

      <ResourceTable
        title="Envios da Prefeitura"
        empty="Nenhuma solicitação da Prefeitura recebida ainda."
        headers={["Solicitação", "Tipo", "Status", "Ações"]}
        controls={
          <TableControls
            search={cityHallList.search}
            onSearch={cityHallList.setSearch}
            placeholder="Pesquisar por título, texto, tipo ou status..."
            page={cityHallList.page}
            totalPages={cityHallList.totalPages}
            totalItems={cityHallList.totalItems}
            onPage={cityHallList.setPage}
          />
        }
      >
        {cityHallList.visibleItems.map((item) => (
          <tr key={item.id}>
            <td>
              <strong>{item.title}</strong>
              <MoreButton
                type="button"
                onClick={() =>
                  setSelectedSubmission({ source: "cityHall", item })
                }
              >
                Ver mais
              </MoreButton>
            </td>
            <td>{cityHallSubmissionTypeLabels[item.content_type]}</td>
            <td>
              <Select
                value={item.status}
                onChange={(event) =>
                  updateCityHallStatus(
                    item.id,
                    event.target.value as CityHallSubmission["status"],
                  )
                }
              >
                {Object.entries(submissionStatusLabels)
                  .filter(([value]) => value !== "contacted")
                  .map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
              </Select>
            </td>
            <td>
              <InlineActions>
                <Button
                  $variant="danger"
                  onClick={() => updateCityHallStatus(item.id, "archived")}
                >
                  Arquivar
                </Button>
                <Button
                  $variant="danger"
                  onClick={() => deleteCityHallRequest(item.id)}
                >
                  Excluir
                </Button>
              </InlineActions>
            </td>
          </tr>
        ))}
      </ResourceTable>

      {selectedSubmission ? (
        <SubmissionModal
          source={selectedSubmission.source}
          item={selectedSubmission.item}
          onClose={() => setSelectedSubmission(null)}
        />
      ) : null}
    </>
  );
}

function SubmissionModal({
  source,
  item,
  onClose,
}: {
  source: "public" | "cityHall";
  item: SubmissionRequest | CityHallSubmission;
  onClose: () => void;
}) {
  const typeLabel =
    source === "public"
      ? publicSubmissionTypeLabels[(item as SubmissionRequest).content_type]
      : cityHallSubmissionTypeLabels[(item as CityHallSubmission).content_type];
  const publicItem = source === "public" ? (item as SubmissionRequest) : null;
  const cityHallItem =
    source === "cityHall" ? (item as CityHallSubmission) : null;
  const isJobRequest = publicItem?.content_type === "job";
  const jobRequirements = String(publicItem?.payload?.requirements || "").trim();

  return (
    <ModalBackdrop onClick={onClose}>
      <ModalCard onClick={(event) => event.stopPropagation()}>
        <ModalHeader>
          <div>
            <Badge $tone="blue">{typeLabel}</Badge>
            <h2>{item.title}</h2>
            <Muted>
              Enviado em {new Date(item.created_at).toLocaleString("pt-BR")}
            </Muted>
          </div>
          <Button type="button" $variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </ModalHeader>

        <SubmissionInfoGrid>
          <SubmissionInfo>
            <span>Status</span>
            <strong>{submissionStatusLabels[item.status]}</strong>
          </SubmissionInfo>
          {publicItem ? (
            <>
              <SubmissionInfo>
                <span>Nome</span>
                <strong>{publicItem.requester_name || "Não informado"}</strong>
              </SubmissionInfo>
              <SubmissionInfo>
                <span>WhatsApp</span>
                <strong>{publicItem.requester_whatsapp || "Não informado"}</strong>
              </SubmissionInfo>
              <SubmissionInfo>
                <span>E-mail</span>
                <strong>{publicItem.requester_email || "Não informado"}</strong>
              </SubmissionInfo>
            </>
          ) : null}
        </SubmissionInfoGrid>

        {isJobRequest ? (
          <SubmissionBlock>
            <strong>Descrição da vaga</strong>
            <p>{publicItem.description || "Não informado"}</p>
          </SubmissionBlock>
        ) : null}

        {isJobRequest ? (
          <SubmissionBlock>
            <strong>Requisitos</strong>
            <p>{jobRequirements || "Não informado"}</p>
          </SubmissionBlock>
        ) : null}

        {publicItem?.description && !isJobRequest ? (
          <SubmissionBlock>
            <strong>Descrição</strong>
            <p>{publicItem.description}</p>
          </SubmissionBlock>
        ) : null}

        {cityHallItem?.summary ? (
          <SubmissionBlock>
            <strong>Resumo</strong>
            <p>{cityHallItem.summary}</p>
          </SubmissionBlock>
        ) : null}

        {cityHallItem?.body ? (
          <SubmissionBlock>
            <strong>Conteúdo</strong>
            <p>{cityHallItem.body}</p>
          </SubmissionBlock>
        ) : null}

        <PayloadPreview
          payload={item.payload}
          imageUrls={item.image_urls}
          hiddenKeys={isJobRequest ? ["requirements"] : []}
        />
      </ModalCard>
    </ModalBackdrop>
  );
}

function PayloadPreview({
  payload,
  imageUrls,
  hiddenKeys = [],
}: {
  payload: Record<string, unknown>;
  imageUrls: string[];
  hiddenKeys?: string[];
}) {
  const hiddenKeySet = new Set(hiddenKeys);
  const entries = Object.entries(payload || {}).filter(([, value]) => {
    if (value === null || value === undefined || value === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }).filter(([key]) => !hiddenKeySet.has(key));

  return (
    <SubmissionDetails>
      {entries.length ? (
        <SubmissionBlock>
          <strong>Informações enviadas</strong>
          <SubmissionFields>
            {entries.map(([key, value]) => (
              <SubmissionInfo key={key}>
                <span>{submissionPayloadLabels[key] || key}</span>
                <strong>
                  {Array.isArray(value) ? value.join(", ") : String(value)}
                </strong>
              </SubmissionInfo>
            ))}
          </SubmissionFields>
        </SubmissionBlock>
      ) : null}
      {imageUrls.length ? (
        <SubmissionImages>
          {imageUrls.slice(0, 4).map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              imagem
            </a>
          ))}
        </SubmissionImages>
      ) : null}
    </SubmissionDetails>
  );
}

function JobsSection({
  cityId,
  jobs,
  companies,
  categories,
  onSaved,
}: {
  cityId: string;
  jobs: Job[];
  companies: Company[];
  categories: Category[];
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<Job | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const jobList = usePaginatedItems(jobs);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setFormError("");
    setFormSuccess("");
    const form = new FormData(formElement);
    try {
      const title = textValue(form.get("title"));
      const status = textValue(form.get("status"));
      const payload = {
        city_id: cityId,
        company_id: textValue(form.get("company_id")) || null,
        category_id: textValue(form.get("category_id")) || null,
        title,
        slug: textValue(form.get("slug")) || slugify(title),
        company_name: textValue(form.get("company_name")) || null,
        location_label: textValue(form.get("location_label")) || null,
        contract_type: textValue(form.get("contract_type")) || null,
        salary_label: textValue(form.get("salary_label")) || null,
        description: textValue(form.get("description")) || null,
        requirements: textValue(form.get("requirements")) || null,
        application_url: textValue(form.get("application_url")) || null,
        whatsapp: textValue(form.get("whatsapp")) || null,
        status,
        manual_priority: Number(form.get("manual_priority") || 100),
        published_at: status === "published" ? new Date().toISOString() : null,
      };

      if (editing) {
        await assertNoError(
          await supabase.from("jobs").update(payload).eq("id", editing.id),
        );
      } else {
        await assertNoError(await supabase.from("jobs").insert(payload));
      }

      setEditing(null);
      formElement.reset();
      setFormSuccess("Vaga salva com sucesso.");
      await onSaved();
    } catch (error) {
      setFormError(messageFromError(error));
    } finally {
      setSaving(false);
    }
  }

  async function archiveJob(id: string) {
    await supabase.from("jobs").update({ status: "archived" }).eq("id", id);
    await onSaved();
  }

  async function deleteJob(id: string) {
    await deleteRows("jobs", id, onSaved);
  }

  return (
    <>
      <EditorCard title={editing ? "Editar vaga" : "Nova vaga"}>
        <form onSubmit={handleSubmit}>
          {formError && <ErrorBox>{formError}</ErrorBox>}
          {formSuccess && <SuccessBox>{formSuccess}</SuccessBox>}
          <FormGrid>
            <Field>
              Cargo
              <Input name="title" required defaultValue={editing?.title || ""} />
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
              Empresa relacionada
              <Select name="company_id" defaultValue={editing?.company_id || ""}>
                <option value="">Sem empresa</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Nome da empresa
              <Input
                name="company_name"
                placeholder="Use se não vinculou uma empresa"
                defaultValue={editing?.company_name || ""}
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
              Local
              <Input
                name="location_label"
                placeholder="Ipueiras - CE"
                defaultValue={editing?.location_label || ""}
              />
            </Field>
            <Field>
              Tipo de vaga
              <Input
                name="contract_type"
                placeholder="Tempo integral, meio período..."
                defaultValue={editing?.contract_type || ""}
              />
            </Field>
            <Field>
              Salário
              <Input
                name="salary_label"
                placeholder="A combinar"
                defaultValue={editing?.salary_label || ""}
              />
            </Field>
            <Field>
              WhatsApp
              <Input
                name="whatsapp"
                placeholder="Ex: 5588992777500"
                defaultValue={editing?.whatsapp || ""}
              />
            </Field>
            <Field>
              Como entrar em contato
              <Input
                name="application_url"
                defaultValue={editing?.application_url || ""}
                placeholder="Entre em contato em..."
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
              Prioridade
              <Input
                name="manual_priority"
                type="number"
                defaultValue={editing?.manual_priority || 100}
              />
            </Field>
          </FormGrid>
          <Field>
            Descrição da vaga
            <TextArea
              name="description"
              defaultValue={editing?.description || ""}
            />
          </Field>
          <Field>
            Requisitos
            <TextArea
              name="requirements"
              defaultValue={editing?.requirements || ""}
            />
          </Field>
          <Actions>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Salvando..."
                : editing
                  ? "Salvar vaga"
                  : "Criar vaga"}
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
        title="Vagas cadastradas"
        empty="Nenhuma vaga cadastrada ainda."
        headers={["Cargo", "Empresa", "Status", "Publicado", "Ações"]}
        controls={
          <PaginationControls
            page={jobList.page}
            totalPages={jobList.totalPages}
            totalItems={jobList.totalItems}
            onPage={jobList.setPage}
          />
        }
      >
        {jobList.visibleItems.map((item) => (
          <tr key={item.id}>
            <td>
              <strong>{item.title}</strong>
              <Muted>{item.location_label || item.contract_type}</Muted>
            </td>
            <td>
              {item.company_name ||
                companies.find((company) => company.id === item.company_id)
                  ?.name ||
                "Sem empresa"}
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
                <Button $variant="danger" onClick={() => archiveJob(item.id)}>
                  Arquivar
                </Button>
                <Button
                  $variant="danger"
                  onClick={() => deleteJob(item.id)}
                >
                  Excluir
                </Button>
              </InlineActions>
            </td>
          </tr>
        ))}
      </ResourceTable>
    </>
  );
}

function AlertsSection({
  cityId,
  alerts,
  onSaved,
}: {
  cityId: string;
  alerts: AlertItem[];
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<AlertItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const alertList = usePaginatedSearch(alerts, (alert) =>
    [
      alert.title,
      alert.summary,
      alert.body,
      alert.importance,
      alert.affected_areas,
    ]
      .filter(Boolean)
      .join(" "),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setFormError("");
    setFormSuccess("");
    const form = new FormData(formElement);
    try {
      const title = textValue(form.get("title"));
      const status = textValue(form.get("status"));
      const payload = {
        city_id: cityId,
        category_id: null,
        title,
        slug: textValue(form.get("slug")) || slugify(title),
        summary: textValue(form.get("summary")) || null,
        body: textValue(form.get("body")) || null,
        importance: textValue(form.get("importance")) || "normal",
        affected_areas: textValue(form.get("affected_areas")) || null,
        expected_resolution: textValue(form.get("expected_resolution")) || null,
        status,
        manual_priority: Number(form.get("manual_priority") || 100),
        published_at: status === "published" ? new Date().toISOString() : null,
      };

      if (editing) {
        await assertNoError(
          await supabase.from("alerts").update(payload).eq("id", editing.id),
        );
      } else {
        await assertNoError(await supabase.from("alerts").insert(payload));
      }

      setEditing(null);
      formElement.reset();
      setFormSuccess("Aviso salvo com sucesso.");
      await onSaved();
    } catch (error) {
      setFormError(messageFromError(error));
    } finally {
      setSaving(false);
    }
  }

  async function archiveAlert(id: string) {
    await supabase.from("alerts").update({ status: "archived" }).eq("id", id);
    await onSaved();
  }

  async function deleteAlert(id: string) {
    await deleteRows("alerts", id, onSaved);
  }

  return (
    <>
      <EditorCard title={editing ? "Editar aviso" : "Novo aviso"}>
        <form onSubmit={handleSubmit}>
          {formError && <ErrorBox>{formError}</ErrorBox>}
          {formSuccess && <SuccessBox>{formSuccess}</SuccessBox>}
          <FormGrid>
            <Field>
              Título
              <Input name="title" required defaultValue={editing?.title || ""} />
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
              Importância
              <Select
                name="importance"
                defaultValue={editing?.importance || "normal"}
              >
                <option value="normal">Normal</option>
                <option value="important">Importante</option>
                <option value="urgent">Urgente</option>
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
              Prioridade
              <Input
                name="manual_priority"
                type="number"
                defaultValue={editing?.manual_priority || 100}
              />
            </Field>
          </FormGrid>
          <Field>
            Resumo
            <Input name="summary" defaultValue={editing?.summary || ""} />
          </Field>
          <Field>
            Texto do aviso
            <TextArea name="body" defaultValue={editing?.body || ""} />
          </Field>
          <FormGrid>
            <Field>
              Bairros/áreas afetadas
              <TextArea
                name="affected_areas"
                defaultValue={editing?.affected_areas || ""}
              />
            </Field>
            <Field>
              Previsão de normalização
              <TextArea
                name="expected_resolution"
                defaultValue={editing?.expected_resolution || ""}
              />
            </Field>
          </FormGrid>
          <Actions>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Salvando..."
                : editing
                  ? "Salvar aviso"
                  : "Criar aviso"}
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
        title="Avisos cadastrados"
        empty="Nenhum aviso cadastrado ainda."
        headers={["Título", "Importância", "Status", "Publicado", "Ações"]}
        controls={
          <TableControls
            search={alertList.search}
            onSearch={alertList.setSearch}
            placeholder="Pesquisar aviso por título, texto, área afetada..."
            page={alertList.page}
            totalPages={alertList.totalPages}
            totalItems={alertList.totalItems}
            onPage={alertList.setPage}
          />
        }
      >
        {alertList.visibleItems.map((item) => (
          <tr key={item.id}>
            <td>
              <strong>{item.title}</strong>
              <Muted>{item.body}</Muted>
            </td>
            <td>{item.importance}</td>
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
                <Button $variant="danger" onClick={() => archiveAlert(item.id)}>
                  Arquivar
                </Button>
                <Button $variant="danger" onClick={() => deleteAlert(item.id)}>
                  Excluir
                </Button>
              </InlineActions>
            </td>
          </tr>
        ))}
      </ResourceTable>
    </>
  );
}

function CityUpdatesSection({
  cityId,
  updates,
  categories,
  companies,
  events,
  promotions,
  lostFoundItems,
  classifieds,
  jobs,
  alerts,
  onSaved,
}: {
  cityId: string;
  updates: CityUpdate[];
  categories: Category[];
  companies: Company[];
  events: EventItem[];
  promotions: Promotion[];
  lostFoundItems: LostFoundItem[];
  classifieds: ClassifiedItem[];
  jobs: Job[];
  alerts: AlertItem[];
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<CityUpdate | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const updateList = usePaginatedItems(updates);
  const relatedOptions = [
    ...companies.map((item) => ({
      type: "company",
      id: item.id,
      label: `Empresa: ${item.name}`,
    })),
    ...events.map((item) => ({
      type: "event",
      id: item.id,
      label: `Evento: ${item.title}`,
    })),
    ...promotions.map((item) => ({
      type: "promotion",
      id: item.id,
      label: `Promoção: ${item.title}`,
    })),
    ...lostFoundItems.map((item) => ({
      type: "lost_found",
      id: item.id,
      label: `Achado/perdido: ${item.title}`,
    })),
    ...classifieds.map((item) => ({
      type: "classified",
      id: item.id,
      label: `Classificado: ${item.title}`,
    })),
    ...jobs.map((item) => ({
      type: "job",
      id: item.id,
      label: `Vaga: ${item.title}`,
    })),
    ...alerts.map((item) => ({
      type: "alert",
      id: item.id,
      label: `Aviso: ${item.title}`,
    })),
  ];
  const relatedValue =
    editing?.related_entity_type && editing.related_entity_id
      ? `${editing.related_entity_type}:${editing.related_entity_id}`
      : "";

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
        ? await uploadMedia(imageFile, "city-updates", title)
        : null;
      const related = textValue(form.get("related"));
      const [relatedType, relatedId] = related ? related.split(":") : [];
      const status = textValue(form.get("status"));
      const payload = {
        city_id: cityId,
        related_entity_type: relatedType || null,
        related_entity_id: relatedId || null,
        category_id: textValue(form.get("category_id")) || null,
        title,
        slug: textValue(form.get("slug")) || slugify(title),
        summary: null,
        body: textValue(form.get("body")) || null,
        status,
        manual_priority: Number(form.get("manual_priority") || 100),
        published_at: status === "published" ? new Date().toISOString() : null,
        ...(imageId ? { image_media_id: imageId } : {}),
      };

      if (editing) {
        await assertNoError(
          await supabase
            .from("city_updates")
            .update(payload)
            .eq("id", editing.id),
        );
      } else {
        await assertNoError(await supabase.from("city_updates").insert(payload));
      }

      setEditing(null);
      formElement.reset();
      setFormSuccess("Novidade salva com sucesso.");
      await onSaved();
    } catch (error) {
      setFormError(messageFromError(error));
    } finally {
      setSaving(false);
    }
  }

  async function archiveUpdate(id: string) {
    await supabase
      .from("city_updates")
      .update({ status: "archived" })
      .eq("id", id);
    await onSaved();
  }

  async function deleteUpdate(id: string) {
    await deleteRows("city_updates", id, onSaved);
  }

  return (
    <>
      <EditorCard title={editing ? "Editar novidade" : "Nova novidade"}>
        <form onSubmit={handleSubmit}>
          {formError && <ErrorBox>{formError}</ErrorBox>}
          {formSuccess && <SuccessBox>{formSuccess}</SuccessBox>}
          <FormGrid>
            <Field>
              Título
              <Input name="title" required defaultValue={editing?.title || ""} />
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
              Relacionar com item do app
              <Select name="related" defaultValue={relatedValue}>
                <option value="">Sem relação</option>
                {relatedOptions.map((option) => (
                  <option
                    key={`${option.type}:${option.id}`}
                    value={`${option.type}:${option.id}`}
                  >
                    {option.label}
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
              Prioridade
              <Input
                name="manual_priority"
                type="number"
                defaultValue={editing?.manual_priority || 100}
              />
            </Field>
            <ImagePreviewInput name="image" label="Imagem da novidade" />
          </FormGrid>
          <Field>
            Texto
            <TextArea name="body" defaultValue={editing?.body || ""} />
          </Field>
          <Actions>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Salvando..."
                : editing
                  ? "Salvar novidade"
                  : "Criar novidade"}
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
        title="Novidades cadastradas"
        empty="Nenhuma novidade cadastrada ainda."
        headers={["Título", "Status", "Publicado", "Ações"]}
        controls={
          <PaginationControls
            page={updateList.page}
            totalPages={updateList.totalPages}
            totalItems={updateList.totalItems}
            onPage={updateList.setPage}
          />
        }
      >
        {updateList.visibleItems.map((item) => (
          <tr key={item.id}>
            <td>
              <strong>{item.title}</strong>
              <Muted>{item.summary}</Muted>
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
                <Button $variant="danger" onClick={() => archiveUpdate(item.id)}>
                  Arquivar
                </Button>
                <Button
                  $variant="danger"
                  onClick={() => deleteUpdate(item.id)}
                >
                  Excluir
                </Button>
              </InlineActions>
            </td>
          </tr>
        ))}
      </ResourceTable>
    </>
  );
}

function PharmaciesSection({
  cityId,
  pharmacies,
  shifts,
  usefulServices,
  companies,
  onSaved,
}: {
  cityId: string;
  pharmacies: Pharmacy[];
  shifts: PharmacyDutyShift[];
  usefulServices: UsefulService[];
  companies: Company[];
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<Pharmacy | null>(null);
  const [editingService, setEditingService] = useState<UsefulService | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [serviceSaving, setServiceSaving] = useState(false);
  const [shiftSaving, setShiftSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const usefulServiceList = usePaginatedItems(usefulServices);

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
      const logoId = logoFile
        ? await uploadMedia(logoFile, "pharmacies", name)
        : null;
      const payload = {
        city_id: cityId,
        company_id: textValue(form.get("company_id")) || null,
        name,
        slug: textValue(form.get("slug")) || slugify(name),
        whatsapp: textValue(form.get("whatsapp")) || null,
        phone: textValue(form.get("phone")) || null,
        address_line: textValue(form.get("address_line")) || null,
        neighborhood: textValue(form.get("neighborhood")) || null,
        latitude: textValue(form.get("latitude"))
          ? Number(form.get("latitude"))
          : null,
        longitude: textValue(form.get("longitude"))
          ? Number(form.get("longitude"))
          : null,
        status: textValue(form.get("status")),
        manual_priority: Number(form.get("manual_priority") || 100),
        ...(logoId ? { logo_media_id: logoId } : {}),
      };

      if (editing) {
        await assertNoError(
          await supabase
            .from("pharmacies")
            .update(payload)
            .eq("id", editing.id),
        );
      } else {
        await assertNoError(await supabase.from("pharmacies").insert(payload));
      }

      setEditing(null);
      formElement.reset();
      setFormSuccess("Farmácia salva com sucesso.");
      await onSaved();
    } catch (error) {
      setFormError(messageFromError(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleShiftSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setShiftSaving(true);
    setFormError("");
    setFormSuccess("");
    const form = new FormData(formElement);
    try {
      await assertNoError(
        await supabase.from("pharmacy_duty_shifts").insert({
          city_id: cityId,
          pharmacy_id: textValue(form.get("pharmacy_id")),
          starts_at: toIsoOrNull(textValue(form.get("starts_at"))),
          ends_at: toIsoOrNull(textValue(form.get("ends_at"))),
          note: textValue(form.get("note")) || null,
          status: textValue(form.get("status")) || "published",
        }),
      );

      formElement.reset();
      setFormSuccess("Plantão salvo com sucesso.");
      await onSaved();
    } catch (error) {
      setFormError(messageFromError(error));
    } finally {
      setShiftSaving(false);
    }
  }

  async function handleUsefulServiceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setServiceSaving(true);
    setFormError("");
    setFormSuccess("");
    const form = new FormData(formElement);
    try {
      const payload = {
        city_id: cityId,
        service_type: textValue(form.get("service_type")),
        name: textValue(form.get("name")),
        phone: textValue(form.get("phone")) || null,
        whatsapp: textValue(form.get("whatsapp")) || null,
        address_line: textValue(form.get("address_line")) || null,
        latitude: textValue(form.get("latitude"))
          ? Number(form.get("latitude"))
          : null,
        longitude: textValue(form.get("longitude"))
          ? Number(form.get("longitude"))
          : null,
        note: textValue(form.get("note")) || null,
        status: textValue(form.get("status")) || "published",
        manual_priority: Number(form.get("manual_priority") || 100),
      };

      if (editingService) {
        await assertNoError(
          await supabase
            .from("useful_services")
            .update(payload)
            .eq("id", editingService.id),
        );
      } else {
        await assertNoError(
          await supabase.from("useful_services").insert(payload),
        );
      }

      setEditingService(null);
      formElement.reset();
      setFormSuccess("Serviço útil salvo com sucesso.");
      await onSaved();
    } catch (error) {
      setFormError(messageFromError(error));
    } finally {
      setServiceSaving(false);
    }
  }

  async function archivePharmacy(id: string) {
    await supabase.from("pharmacies").update({ status: "archived" }).eq("id", id);
    await onSaved();
  }

  async function archiveShift(id: string) {
    await supabase
      .from("pharmacy_duty_shifts")
      .update({ status: "archived" })
      .eq("id", id);
    await onSaved();
  }

  async function archiveUsefulService(id: string) {
    await supabase
      .from("useful_services")
      .update({ status: "archived" })
      .eq("id", id);
    await onSaved();
  }

  async function deleteUsefulService(id: string) {
    await deleteRows("useful_services", id, onSaved);
  }

  return (
    <>
      <EditorCard title={editing ? "Editar farmácia" : "Nova farmácia"}>
        <Muted>
          Use este cadastro para farmácia de plantão. Aqui vale preencher
          WhatsApp, endereço e localização para o app mostrar botões de contato
          e mapa.
        </Muted>
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
              Empresa relacionada
              <Select name="company_id" defaultValue={editing?.company_id || ""}>
                <option value="">Sem empresa</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              WhatsApp
              <Input
                name="whatsapp"
                placeholder="Ex: 5588999999999"
                defaultValue={editing?.whatsapp || ""}
              />
            </Field>
            <Field>
              Telefone
              <Input
                name="phone"
                defaultValue={editing?.phone || ""}
                placeholder="Ex: 88999999999"
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
                placeholder="Ex: -4.5432100"
              />
            </Field>
            <Field>
              Longitude
              <Input
                name="longitude"
                type="number"
                step="0.0000001"
                defaultValue={editing?.longitude ?? ""}
                placeholder="Ex: -40.7178900"
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
              Prioridade
              <Input
                name="manual_priority"
                type="number"
                defaultValue={editing?.manual_priority || 100}
              />
            </Field>
            <ImagePreviewInput name="logo" label="Logo da farmácia" />
          </FormGrid>
          <Actions>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Salvando..."
                : editing
                  ? "Salvar farmácia"
                  : "Criar farmácia"}
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

      <EditorCard
        title={
          editingService ? "Editar telefone útil" : "Novo telefone útil"
        }
      >
        <Muted>
          Para hospital, SAMU, Polícia, Bombeiros, Prefeitura, Enel e Cagece,
          preencha principalmente nome e telefone. WhatsApp, endereço e
          localização são opcionais e só devem ser usados quando fizer sentido
          exibir ações extras no app.
        </Muted>
        <form onSubmit={handleUsefulServiceSubmit}>
          <FormGrid>
            <Field>
              Tipo de serviço
              <Select
                name="service_type"
                defaultValue={editingService?.service_type || "hospital"}
              >
                {Object.entries(usefulServiceTypeLabels).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </Select>
            </Field>
            <Field>
              Nome
              <Input
                name="name"
                required
                placeholder="Ex: Hospital Municipal"
                defaultValue={editingService?.name || ""}
              />
            </Field>
            <Field>
              Telefone
              <Input
                name="phone"
                placeholder="Ex: 192, 190 ou 88 99999-9999"
                defaultValue={editingService?.phone || ""}
              />
            </Field>
            <Field>
              WhatsApp opcional
              <Input
                name="whatsapp"
                placeholder="Ex: 5588999999999"
                defaultValue={editingService?.whatsapp || ""}
              />
            </Field>
            <Field>
              Endereço opcional
              <Input
                name="address_line"
                placeholder="Preencha só se o app precisar mostrar localização"
                defaultValue={editingService?.address_line || ""}
              />
            </Field>
            <Field>
              Latitude opcional
              <Input
                name="latitude"
                type="number"
                step="0.0000001"
                placeholder="Ex: -4.5432100"
                defaultValue={editingService?.latitude ?? ""}
              />
            </Field>
            <Field>
              Longitude opcional
              <Input
                name="longitude"
                type="number"
                step="0.0000001"
                placeholder="Ex: -40.7178900"
                defaultValue={editingService?.longitude ?? ""}
              />
            </Field>
            <Field>
              Status
              <Select
                name="status"
                defaultValue={editingService?.status || "published"}
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Prioridade
              <Input
                name="manual_priority"
                type="number"
                defaultValue={editingService?.manual_priority || 100}
              />
            </Field>
          </FormGrid>
          <Field>
            Horário ou observação
            <TextArea
              name="note"
              placeholder="Ex: Atendimento 24h, ligação gratuita, plantão administrativo..."
              defaultValue={editingService?.note || ""}
            />
          </Field>
          <Actions>
            <Button type="submit" disabled={serviceSaving}>
              {serviceSaving
                ? "Salvando..."
                : editingService
                  ? "Salvar telefone útil"
                  : "Criar telefone útil"}
            </Button>
            {editingService && (
              <Button
                type="button"
                $variant="ghost"
                disabled={serviceSaving}
                onClick={() => setEditingService(null)}
              >
                Cancelar
              </Button>
            )}
          </Actions>
        </form>
      </EditorCard>

      <EditorCard title="Novo plantão">
        <form onSubmit={handleShiftSubmit}>
          <FormGrid>
            <Field>
              Farmácia
              <Select name="pharmacy_id" required>
                <option value="">Selecione</option>
                {pharmacies.map((pharmacy) => (
                  <option key={pharmacy.id} value={pharmacy.id}>
                    {pharmacy.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Início do plantão
              <Input name="starts_at" type="datetime-local" required />
            </Field>
            <Field>
              Fim do plantão
              <Input name="ends_at" type="datetime-local" required />
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
          </FormGrid>
          <Field>
            Observação
            <Input name="note" />
          </Field>
          <Actions>
            <Button type="submit" disabled={shiftSaving}>
              {shiftSaving ? "Salvando..." : "Criar plantão"}
            </Button>
          </Actions>
        </form>
      </EditorCard>

      <ResourceTable
        title="Farmácias cadastradas"
        empty="Nenhuma farmácia cadastrada ainda."
        headers={["Nome", "Contato", "Status", "Ações"]}
      >
        {pharmacies.map((item) => (
          <tr key={item.id}>
            <td>
              <strong>{item.name}</strong>
              <Muted>{[item.address_line, item.neighborhood].filter(Boolean).join(" - ")}</Muted>
            </td>
            <td>{item.whatsapp || item.phone || "-"}</td>
            <td>
              <Badge $tone={statusTone(item.status)}>
                {statusLabels[item.status]}
              </Badge>
            </td>
            <td>
              <InlineActions>
                <Button $variant="ghost" onClick={() => setEditing(item)}>
                  Editar
                </Button>
                <Button
                  $variant="danger"
                  onClick={() => archivePharmacy(item.id)}
                >
                  Arquivar
                </Button>
              </InlineActions>
            </td>
          </tr>
        ))}
      </ResourceTable>

      <ResourceTable
        title="Telefones úteis cadastrados"
        empty="Nenhum telefone útil cadastrado ainda."
        headers={["Nome", "Tipo", "Contato", "Status", "Ações"]}
        controls={
          <PaginationControls
            page={usefulServiceList.page}
            totalPages={usefulServiceList.totalPages}
            totalItems={usefulServiceList.totalItems}
            onPage={usefulServiceList.setPage}
          />
        }
      >
        {usefulServiceList.visibleItems.map((item) => (
          <tr key={item.id}>
            <td>
              <strong>{item.name}</strong>
              <Muted>{item.note || item.address_line || "Sem observação"}</Muted>
            </td>
            <td>{usefulServiceTypeLabels[item.service_type]}</td>
            <td>{item.phone || item.whatsapp || "-"}</td>
            <td>
              <Badge $tone={statusTone(item.status)}>
                {statusLabels[item.status]}
              </Badge>
            </td>
            <td>
              <InlineActions>
                <Button $variant="ghost" onClick={() => setEditingService(item)}>
                  Editar
                </Button>
                <Button
                  $variant="danger"
                  onClick={() => archiveUsefulService(item.id)}
                >
                  Arquivar
                </Button>
                <Button
                  $variant="danger"
                  onClick={() => deleteUsefulService(item.id)}
                >
                  Excluir
                </Button>
              </InlineActions>
            </td>
          </tr>
        ))}
      </ResourceTable>

      <ResourceTable
        title="Plantões cadastrados"
        empty="Nenhum plantão cadastrado ainda."
        headers={["Farmácia", "Período", "Status", "Ações"]}
      >
        {shifts.map((item) => (
          <tr key={item.id}>
            <td>
              {pharmacies.find((pharmacy) => pharmacy.id === item.pharmacy_id)
                ?.name || item.pharmacy_id}
            </td>
            <td>
              {new Date(item.starts_at).toLocaleString("pt-BR")} até{" "}
              {new Date(item.ends_at).toLocaleString("pt-BR")}
            </td>
            <td>
              <Badge $tone={statusTone(item.status)}>
                {statusLabels[item.status]}
              </Badge>
            </td>
            <td>
              <Button $variant="danger" onClick={() => archiveShift(item.id)}>
                Arquivar
              </Button>
            </td>
          </tr>
        ))}
      </ResourceTable>
    </>
  );
}

function AppVersionsSection({
  cityId,
  appVersions,
  onSaved,
}: {
  cityId: string;
  appVersions: AppVersion[];
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<AppVersion | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const appVersionList = usePaginatedItems(appVersions);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setFormError("");
    setFormSuccess("");
    const form = new FormData(formElement);
    try {
      const payload = {
        city_id: cityId || null,
        platform: textValue(form.get("platform")) || "all",
        latest_version: textValue(form.get("latest_version")),
        minimum_version: textValue(form.get("minimum_version")),
        message: textValue(form.get("message")),
        android_url: textValue(form.get("android_url")) || null,
        ios_url: textValue(form.get("ios_url")) || null,
        update_required: form.get("update_required") === "on",
        status: textValue(form.get("status")) || "published",
        manual_priority: Number(form.get("manual_priority") || 100),
      };

      if (editing) {
        await assertNoError(
          await supabase
            .from("app_versions")
            .update(payload)
            .eq("id", editing.id),
        );
      } else {
        await assertNoError(await supabase.from("app_versions").insert(payload));
      }

      setEditing(null);
      formElement.reset();
      setFormSuccess("Configuração de versão salva com sucesso.");
      await onSaved();
    } catch (error) {
      setFormError(messageFromError(error));
    } finally {
      setSaving(false);
    }
  }

  async function archiveAppVersion(id: string) {
    await supabase
      .from("app_versions")
      .update({ status: "archived" })
      .eq("id", id);
    await onSaved();
  }

  async function deleteAppVersion(id: string) {
    await deleteRows("app_versions", id, onSaved);
  }

  return (
    <>
      <EditorCard
        title={
          editing ? "Editar atualização do app" : "Nova atualização do app"
        }
      >
        <Muted>
          Use atualização opcional para avisar sobre uma versão nova. Marque
          como obrigatória apenas quando uma versão antiga deixar de funcionar
          com segurança por mudança importante na API.
        </Muted>
        <form onSubmit={handleSubmit}>
          {formError && <ErrorBox>{formError}</ErrorBox>}
          {formSuccess && <SuccessBox>{formSuccess}</SuccessBox>}
          <FormGrid>
            <Field>
              Plataforma
              <Select name="platform" defaultValue={editing?.platform || "all"}>
                {Object.entries(appPlatformLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Versão mais recente
              <Input
                name="latest_version"
                required
                placeholder="Ex: 1.2.0"
                defaultValue={editing?.latest_version || ""}
              />
            </Field>
            <Field>
              Versão mínima permitida
              <Input
                name="minimum_version"
                required
                placeholder="Ex: 1.1.0"
                defaultValue={editing?.minimum_version || ""}
              />
            </Field>
            <Field>
              Link da Play Store
              <Input
                name="android_url"
                placeholder="Cole o link do app na Play Store"
                defaultValue={editing?.android_url || ""}
              />
            </Field>
            <Field>
              Link da App Store
              <Input
                name="ios_url"
                placeholder="Cole o link do app na App Store"
                defaultValue={editing?.ios_url || ""}
              />
            </Field>
            <Field>
              Status
              <Select name="status" defaultValue={editing?.status || "published"}>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Prioridade
              <Input
                name="manual_priority"
                type="number"
                defaultValue={editing?.manual_priority || 100}
              />
            </Field>
            <Field style={{ marginTop: 20 }}>
              Atualização obrigatória?
              <Input
                name="update_required"
                type="checkbox"
                defaultChecked={editing?.update_required || false}
                style={{ width: 20, height: 20 }}
              />
            </Field>
          </FormGrid>
          <Field>
            Mensagem exibida ao usuário
            <TextArea
              name="message"
              required
              defaultValue={
                editing?.message ||
                "Uma nova versão do Ipueiras+ está disponível."
              }
            />
          </Field>
          <Actions>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Salvando..."
                : editing
                  ? "Salvar atualização"
                  : "Criar atualização"}
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
        title="Atualizações cadastradas"
        empty="Nenhuma configuração de atualização cadastrada ainda."
        headers={["Versão", "Plataforma", "Tipo", "Status", "Ações"]}
        controls={
          <PaginationControls
            page={appVersionList.page}
            totalPages={appVersionList.totalPages}
            totalItems={appVersionList.totalItems}
            onPage={appVersionList.setPage}
          />
        }
      >
        {appVersionList.visibleItems.map((item) => (
          <tr key={item.id}>
            <td>
              <strong>{item.latest_version}</strong>
              <Muted>Mínima: {item.minimum_version}</Muted>
            </td>
            <td>{appPlatformLabels[item.platform]}</td>
            <td>{item.update_required ? "Obrigatória" : "Opcional"}</td>
            <td>
              <Badge $tone={statusTone(item.status)}>
                {statusLabels[item.status]}
              </Badge>
            </td>
            <td>
              <InlineActions>
                <Button $variant="ghost" onClick={() => setEditing(item)}>
                  Editar
                </Button>
                <Button
                  $variant="danger"
                  onClick={() => archiveAppVersion(item.id)}
                >
                  Arquivar
                </Button>
                <Button
                  $variant="danger"
                  onClick={() => deleteAppVersion(item.id)}
                >
                  Excluir
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
  const newsList = usePaginatedItems(news);

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
        await assertNoError(
          await supabase.from("news").update(payload).eq("id", editing.id),
        );
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

  async function deleteNews(id: string) {
    await deleteRows("news", id, onSaved);
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
        controls={
          <PaginationControls
            page={newsList.page}
            totalPages={newsList.totalPages}
            totalItems={newsList.totalItems}
            onPage={newsList.setPage}
          />
        }
      >
        {newsList.visibleItems.map((item) => (
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
                <Button
                  $variant="danger"
                  onClick={() => deleteNews(item.id)}
                >
                  Excluir
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
  onSaved,
}: {
  cityId: string;
  notifications: NotificationItem[];
  onSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const notificationList = usePaginatedItems(notifications);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const status = textValue(form.get("status"));
    const title = textValue(form.get("title"));
    const body = textValue(form.get("body")) || null;

    setSaving(true);
    try {
      await assertNoError(
        await supabase.from("notifications").insert({
          city_id: cityId,
          title,
          body,
          entity_type: null,
          entity_id: null,
          status,
          published_at: status === "published" ? new Date().toISOString() : null,
        }),
      );
      formElement.reset();
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function archiveNotification(id: string) {
    await supabase
      .from("notifications")
      .update({ status: "archived" })
      .eq("id", id);
    await onSaved();
  }

  async function deleteNotification(id: string) {
    await deleteRows("notifications", id, onSaved);
  }

  return (
    <>
      <EditorCard title="Nova notificação interna">
        <Muted>
          Use esta tela para recados dentro do app, como manutenção, novidades
          do próprio Ipueiras+ ou algum problema sendo resolvido. Isso aparece
          no sino da Home, mas não dispara notificação no celular.
        </Muted>
        <form onSubmit={handleSubmit}>
          <FormGrid>
            <Field>
              Título
              <Input
                name="title"
                required
                placeholder="Ex: Manutenção programada no app"
              />
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
          </FormGrid>
          <Field>
            Texto
            <TextArea
              name="body"
              placeholder="Ex: Estamos ajustando algumas informações do app. Tudo volta ao normal em breve."
            />
          </Field>
          <Actions>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Criar notificação"}
            </Button>
          </Actions>
        </form>
      </EditorCard>

      <ResourceTable
        title="Notificações internas"
        empty="Nenhuma notificação cadastrada ainda."
        headers={["Título", "Status", "Publicado", "Ações"]}
        controls={
          <PaginationControls
            page={notificationList.page}
            totalPages={notificationList.totalPages}
            totalItems={notificationList.totalItems}
            onPage={notificationList.setPage}
          />
        }
      >
        {notificationList.visibleItems.map((item) => (
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
              <InlineActions>
                <Button
                  $variant="danger"
                  onClick={() => archiveNotification(item.id)}
                >
                  Arquivar
                </Button>
                <Button
                  $variant="danger"
                  onClick={() => deleteNotification(item.id)}
                >
                  Excluir
                </Button>
              </InlineActions>
            </td>
          </tr>
        ))}
      </ResourceTable>
    </>
  );
}

function PushSection({
  cityId,
  pushCampaigns,
  alerts,
  companies,
  events,
  promotions,
  lostFoundItems,
  classifieds,
  jobs,
  news,
  onSaved,
}: {
  cityId: string;
  pushCampaigns: PushCampaign[];
  alerts: AlertItem[];
  companies: Company[];
  events: EventItem[];
  promotions: Promotion[];
  lostFoundItems: LostFoundItem[];
  classifieds: ClassifiedItem[];
  jobs: Job[];
  news: NewsItem[];
  onSaved: () => Promise<void>;
}) {
  const [selectedAlertId, setSelectedAlertId] = useState(alerts[0]?.id || "");
  const [entityType, setEntityType] = useState<
    | "company"
    | "event"
    | "promotion"
    | "lost_found"
    | "classified"
    | "job"
    | "news"
    | ""
  >("");
  const [savingAlertPush, setSavingAlertPush] = useState(false);
  const [savingCustomPush, setSavingCustomPush] = useState(false);

  useEffect(() => {
    if (!selectedAlertId && alerts[0]?.id) {
      setSelectedAlertId(alerts[0].id);
    }
  }, [alerts, selectedAlertId]);

  const selectedAlert = alerts.find((alert) => alert.id === selectedAlertId);
  const commercialItems = useMemo(() => {
    if (entityType === "company") {
      return companies.map((item) => ({ id: item.id, label: item.name }));
    }

    if (entityType === "event") {
      return events.map((item) => ({ id: item.id, label: item.title }));
    }

    if (entityType === "promotion") {
      return promotions.map((item) => ({ id: item.id, label: item.title }));
    }

    if (entityType === "lost_found") {
      return lostFoundItems.map((item) => ({ id: item.id, label: item.title }));
    }

    if (entityType === "classified") {
      return classifieds.map((item) => ({ id: item.id, label: item.title }));
    }

    if (entityType === "job") {
      return jobs.map((item) => ({ id: item.id, label: item.title }));
    }

    if (entityType === "news") {
      return news.map((item) => ({ id: item.id, label: item.title }));
    }

    return [];
  }, [
    classifieds,
    companies,
    entityType,
    events,
    jobs,
    lostFoundItems,
    news,
    promotions,
  ]);

  async function handleAlertPush(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAlert) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    setSavingAlertPush(true);
    try {
      await assertNoError(
        await supabase.from("push_campaigns").insert({
          city_id: cityId,
          notification_id: null,
          title: selectedAlert.title,
          body:
            selectedAlert.summary ||
            selectedAlert.body ||
            "Novo aviso da Prefeitura no Ipueiras+.",
          entity_type: "alert",
          entity_id: selectedAlert.id,
          audience: "alerts",
          send_status: "pending",
          scheduled_at: toIsoOrNull(textValue(form.get("scheduled_at"))),
          paid_amount_cents: 0,
          payment_status: "paid",
          billing_notes: textValue(form.get("billing_notes")) || null,
        }),
      );
      formElement.reset();
      await onSaved();
    } finally {
      setSavingAlertPush(false);
    }
  }

  async function handleCustomPush(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const paidAmount = Number(form.get("paid_amount") || 0);
    const selectedType = textValue(form.get("entity_type")) || null;

    setSavingCustomPush(true);
    try {
      await assertNoError(
        await supabase.from("push_campaigns").insert({
          city_id: cityId,
          notification_id: null,
          title: textValue(form.get("title")),
          body: textValue(form.get("body")),
          entity_type: selectedType,
          entity_id: textValue(form.get("entity_id")) || null,
          audience: "commercial",
          send_status: "pending",
          scheduled_at: toIsoOrNull(textValue(form.get("scheduled_at"))),
          paid_amount_cents: Math.round(paidAmount * 100),
          payment_status: textValue(form.get("payment_status")) || "paid",
          billing_notes: textValue(form.get("billing_notes")) || null,
        }),
      );
      formElement.reset();
      setEntityType("");
      await onSaved();
    } finally {
      setSavingCustomPush(false);
    }
  }


  return (
    <>
      <EditorCard title="Push de aviso da Prefeitura">
        <Muted>
          Escolha um aviso já cadastrado na tela Avisos. Ele será preparado
          para aparecer como notificação no dispositivo dos usuários.
        </Muted>
        <form onSubmit={handleAlertPush}>
          <FormGrid>
            <Field>
              Aviso da Prefeitura
              <Select
                value={selectedAlertId}
                onChange={(event) => setSelectedAlertId(event.target.value)}
                required
              >
                <option value="">Selecione um aviso</option>
                {alerts.map((alert) => (
                  <option key={alert.id} value={alert.id}>
                    {alert.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Agendar para
              <Muted>Deixe vazio para enviar assim que a função rodar.</Muted>
              <Input name="scheduled_at" type="datetime-local" />
            </Field>
          </FormGrid>
          {selectedAlert ? (
            <CardPreview>
              <strong>{selectedAlert.title}</strong>
              <Muted>
                {selectedAlert.summary ||
                  selectedAlert.body ||
                  "Sem resumo informado."}
              </Muted>
            </CardPreview>
          ) : null}
          <Field>
            Observações internas
            <TextArea
              name="billing_notes"
              placeholder="Ex: Aviso urgente da Prefeitura sobre falta de água."
            />
          </Field>
          <Actions>
            <Button type="submit" disabled={savingAlertPush || !selectedAlert}>
              {savingAlertPush ? "Preparando..." : "Preparar push do aviso"}
            </Button>
          </Actions>
        </form>
      </EditorCard>

      <EditorCard title="Push comercial ou outro assunto">
        <Muted>
          Use para campanhas pagas de empresas, eventos, promoções, vagas ou
          algum recado manual. Evite excesso para os usuários não desativarem
          as notificações do app.
        </Muted>
        <form onSubmit={handleCustomPush}>
          <FormGrid>
            <Field>
              Título do push
              <Input
                name="title"
                required
                placeholder="Ex: Promoção especial hoje"
              />
            </Field>
            <Field>
              Tipo de destino
              <Select
                name="entity_type"
                value={entityType}
                onChange={(event) =>
                  setEntityType(event.target.value as typeof entityType)
                }
              >
                <option value="">Sem destino</option>
                <option value="company">Empresa</option>
                <option value="event">Evento</option>
                <option value="promotion">Promoção</option>
                <option value="lost_found">Achado/perdido</option>
                <option value="classified">Classificado</option>
                <option value="job">Vaga</option>
                <option value="news">Notícia</option>
              </Select>
            </Field>
            <Field>
              Item relacionado
              <Select name="entity_id" defaultValue="" disabled={!entityType}>
                <option value="">Nenhum</option>
                {commercialItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Agendar para
              <Muted>Deixe vazio para enviar assim que a função rodar.</Muted>
              <Input name="scheduled_at" type="datetime-local" />
            </Field>
            <Field>
              Valor cobrado
              <Input
                name="paid_amount"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                placeholder="Ex: 30.00"
              />
            </Field>
            <Field>
              Pagamento
              <Select name="payment_status" defaultValue="paid">
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
                <option value="overdue">Atrasado</option>
                <option value="cancelled">Cancelado</option>
                <option value="refunded">Reembolsado</option>
              </Select>
            </Field>
          </FormGrid>
          <Field>
            Texto do push
            <TextArea
              name="body"
              required
              placeholder="Ex: Oferta válida somente hoje. Confira no Ipueiras+."
            />
          </Field>
          <Field>
            Observações de cobrança
            <TextArea
              name="billing_notes"
              placeholder="Ex: Push pago por Farmácia Central para campanha de sábado."
            />
          </Field>
          <Actions>
            <Button type="submit" disabled={savingCustomPush}>
              {savingCustomPush ? "Preparando..." : "Preparar push"}
            </Button>
          </Actions>
        </form>
      </EditorCard>

      <ResourceTable
        title="Push no dispositivo"
        empty="Nenhuma campanha push preparada ainda."
        headers={["Título", "Público", "Status", "Cobrança", "Envio"]}
      >
        {pushCampaigns.map((item) => (
          <tr key={item.id}>
            <td>
              <strong>{item.title}</strong>
              <Muted>{item.body}</Muted>
            </td>
            <td>{pushAudienceLabels[item.audience] || item.audience}</td>
            <td>{pushStatusLabels[item.send_status] || item.send_status}</td>
            <td>
              {centsToBRL(item.paid_amount_cents)}
              <Muted>
                {paymentStatusLabels[item.payment_status] ||
                  item.payment_status}
              </Muted>
            </td>
            <td>
              {item.sent_at
                ? new Date(item.sent_at).toLocaleString("pt-BR")
                : item.scheduled_at
                  ? `Agendado: ${new Date(item.scheduled_at).toLocaleString("pt-BR")}`
                  : "Pendente"}
              <Muted>
                Sucesso: {item.success_count} | Falha: {item.failure_count}
              </Muted>
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
  const placementList = usePaginatedSearch(placements, (placement) =>
    [
      entityName(placement),
      placement.entity_type,
      placement.placement_type,
      placement.notes,
      placement.payment_status,
    ]
      .filter(Boolean)
      .join(" "),
  );

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
        paid_amount_cents: Math.round(
          Number(form.get("paid_amount") || 0) * 100,
        ),
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

  async function deletePlacement(id: string) {
    await deleteRows("placements", id, onSaved);
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
              Início do destaque
              <Muted>
                Quando este item começa a aparecer como destaque no app.
              </Muted>
              <Input name="starts_at" type="datetime-local" />
            </Field>
            <Field>
              Fim do destaque
              <Muted>
                Quando este item para de aparecer como destaque no app.
              </Muted>
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
        controls={
          <TableControls
            search={placementList.search}
            onSearch={placementList.setSearch}
            placeholder="Pesquisar destaque por item, tipo, observação..."
            page={placementList.page}
            totalPages={placementList.totalPages}
            totalItems={placementList.totalItems}
            onPage={placementList.setPage}
          />
        }
      >
        {placementList.visibleItems.map((placement) => (
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
                <Button
                  $variant="danger"
                  onClick={() => deletePlacement(placement.id)}
                >
                  Excluir
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
  const bannerList = usePaginatedItems(banners);

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
        paid_amount_cents: Math.round(
          Number(form.get("paid_amount") || 0) * 100,
        ),
        payment_status: textValue(form.get("payment_status")) || "paid",
        notes: textValue(form.get("notes")) || null,
        ...(imageId ? { image_media_id: imageId } : {}),
        is_active_background_image: form.has("is_active_background_image"),
      };

      if (editing) {
        await assertNoError(
          await supabase.from("banners").update(payload).eq("id", editing.id),
        );
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

  async function deleteBanner(id: string) {
    await deleteRows("banners", id, onSaved);
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
              <Input name="title" defaultValue={editing?.title || ""} />
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
              Contato WhatsApp
              <Input
                name="action_label"
                defaultValue={editing?.action_label || "55"}
                required
                placeholder="Ex: 5588999999999"
              />
            </Field>
            <Input
              name="action_url"
              type="hidden"
              defaultValue={editing?.action_url || ""}
            />
            <Field>
              Início da exibição do banner
              <Muted>Quando o banner começa a ficar visível na Home.</Muted>
              <Input
                name="starts_at"
                type="datetime-local"
                defaultValue={dateInputValue(editing?.starts_at)}
              />
            </Field>
            <Field>
              Fim da exibição do banner
              <Muted>Quando o banner para de aparecer na Home.</Muted>
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
            <ImagePreviewInput name="image" label="Imagem do banner" />

            <Field style={{ marginTop: 20 }}>
              Ativar background na imagem?
              <Input
                name="is_active_background_image"
                type="checkbox"
                defaultChecked={editing?.is_active_background_image ?? true}
                style={{ width: 20, height: 20 }}
              />
            </Field>
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
        controls={
          <PaginationControls
            page={bannerList.page}
            totalPages={bannerList.totalPages}
            totalItems={bannerList.totalItems}
            onPage={bannerList.setPage}
          />
        }
      >
        {bannerList.visibleItems.map((banner) => (
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
              <InlineActions>
                <Button $variant="ghost" onClick={() => setEditing(banner)}>
                  Editar
                </Button>
                <Button
                  $variant="danger"
                  onClick={() => deleteBanner(banner.id)}
                >
                  Excluir
                </Button>
              </InlineActions>
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
  promotions,
  lostFoundItems,
  classifieds,
  jobs,
  alerts,
  cityUpdates,
  pharmacies,
}: {
  metrics: ClickSummary[];
  companies: Company[];
  events: EventItem[];
  promotions: Promotion[];
  lostFoundItems: LostFoundItem[];
  classifieds: ClassifiedItem[];
  jobs: Job[];
  alerts: AlertItem[];
  cityUpdates: CityUpdate[];
  pharmacies: Pharmacy[];
}) {
  const names = useMemo(() => {
    const map = new Map<string, string>();
    companies.forEach((company) => map.set(company.id, company.name));
    events.forEach((event) => map.set(event.id, event.title));
    promotions.forEach((promotion) => map.set(promotion.id, promotion.title));
    lostFoundItems.forEach((item) => map.set(item.id, item.title));
    classifieds.forEach((item) => map.set(item.id, item.title));
    jobs.forEach((job) => map.set(job.id, job.title));
    alerts.forEach((alert) => map.set(alert.id, alert.title));
    cityUpdates.forEach((update) => map.set(update.id, update.title));
    pharmacies.forEach((pharmacy) => map.set(pharmacy.id, pharmacy.name));
    return map;
  }, [
    alerts,
    cityUpdates,
    classifieds,
    companies,
    events,
    jobs,
    lostFoundItems,
    pharmacies,
    promotions,
  ]);

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
  controls,
  children,
}: {
  title: string;
  empty: string;
  headers: string[];
  controls?: ReactNode;
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
      {controls}
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

function TableControls({
  search,
  onSearch,
  placeholder,
  page,
  totalPages,
  totalItems,
  onPage,
}: {
  search: string;
  onSearch: (value: string) => void;
  placeholder: string;
  page: number;
  totalPages: number;
  totalItems: number;
  onPage: (page: number) => void;
}) {
  return (
    <TableControlsWrap>
      <Input
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder={placeholder}
      />
      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        onPage={onPage}
      />
    </TableControlsWrap>
  );
}

function PaginationControls({
  page,
  totalPages,
  totalItems,
  onPage,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPage: (page: number) => void;
}) {
  return (
    <Pagination>
      <Muted>
        {totalItems} item{totalItems === 1 ? "" : "s"} | página {page} de{" "}
        {totalPages}
      </Muted>
      <Button
        type="button"
        $variant="ghost"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Anterior
      </Button>
      <Button
        type="button"
        $variant="ghost"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Próxima
      </Button>
    </Pagination>
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
  padding-bottom: 8px;

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

const MoreButton = styled.button`
  border: 0;
  background: transparent;
  color: #ff7a00;
  cursor: pointer;
  display: block;
  font-size: 12px;
  font-weight: 700;
  margin-top: 5px;
  padding: 0;
  text-align: left;

  &:hover {
    text-decoration: underline;
  }
`;

const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(5, 3, 10, 0.78);
  display: grid;
  place-items: center;
  padding: 18px;
`;

const ModalCard = styled(Card)`
  width: min(760px, 100%);
  max-height: min(86vh, 820px);
  overflow: auto;
  margin: 0;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;

  h2 {
    margin: 10px 0 4px;
  }

  @media (max-width: 680px) {
    flex-direction: column;
  }
`;

const SubmissionInfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const SubmissionFields = styled(SubmissionInfoGrid)`
  margin: 0;
`;

const SubmissionInfo = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  padding: 10px;
  display: grid;
  gap: 4px;

  span {
    color: #a89abc;
    font-size: 12px;
  }

  strong {
    color: #fff;
    font-size: 13px;
    overflow-wrap: anywhere;
  }
`;

const SubmissionBlock = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.035);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;

  > strong {
    color: #fff;
    display: block;
    margin-bottom: 8px;
  }

  p {
    color: #d9d0e7;
    line-height: 1.55;
    margin: 0;
    white-space: pre-wrap;
  }
`;

const SubmissionDetails = styled.div`
  margin-top: 12px;
`;

const SubmissionImages = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;

  a {
    color: #ff7a00;
    font-size: 12px;
    font-weight: 700;
    text-decoration: none;
  }
`;

const TableControlsWrap = styled.div`
  display: grid;
  gap: 10px;
  margin-bottom: 14px;

  ${Input} {
    max-width: 420px;
  }
`;

const Pagination = styled.div`
  display: flex;
  align-items: center;
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

const CardPreview = styled.div`
  border: 1px solid rgba(255, 122, 0, 0.28);
  background: rgba(255, 122, 0, 0.08);
  border-radius: 8px;
  padding: 12px;
  margin: 12px 0;
  display: grid;
  gap: 6px;
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



