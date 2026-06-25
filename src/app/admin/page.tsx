"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";

function getRemainingTime(dataAtivacao: string | null, diasValidos: number) {
  if (!dataAtivacao) return null;
  const expiry = new Date(dataAtivacao);
  expiry.setDate(expiry.getDate() + diasValidos);
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, total: 0, expiry };
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return { days, hours, minutes, total: diff, expiry };
}
import { 
  LayoutDashboard, 
  UserPlus, 
  ShieldCheck, 
  Key, 
  Search, 
  Plus, 
  Clock, 
  Trash2,
  Download,
  Phone,
  Mail,
  Zap,
  X,
  Pause,
  Play,
  MessageCircle,
  Info,
  Lock,
  ArrowRight,
  LogOut,
  Fingerprint,
  Menu,
  ChevronRight,
  Database,
  Eye,
  EyeOff,
  Star,
  DollarSign,
  TrendingUp,
  PiggyBank,
  Percent
} from "lucide-react";

const formatSide = (s: any) => {
  if (!s) return s;
  if (typeof s !== 'string') return s;
  const l = s.toLowerCase();
  if (l === 'direito' || l === 'd') return 'Certo (C)';
  if (l === 'esquerdo' || l === 'e') return 'Errado (E)';
  return s;
};

export default function AdminDashboard() {
  const [session, setSession] = useState<any>(null);
  const [authStep, setAuthStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile menu toggle
  const [licenses, setLicenses] = useState<any[]>([]);
  const [boiadas, setBoiadas] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [boiadaName, setBoiadaName] = useState("");
  const [tourosTexto, setTourosTexto] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    whatsapp: "",
    descricao: "",
    plano: 30
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLicense, setSelectedLicense] = useState<any>(null);
  const [selectedClientToRelease, setSelectedClientToRelease] = useState<any>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [hoveredLicenseId, setHoveredLicenseId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tempDays, setTempDays] = useState<number>(0);
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);
  const [selectedSportsRegister, setSelectedSportsRegister] = useState<string[]>(["rodeio"]);
  const [tempSports, setTempSports] = useState<string[]>([]);

  // Financial & Sponsorship States
  const [patrocinios, setPatrocinios] = useState<any[]>([]);
  const [despesas, setDespesas] = useState<any[]>([]);

  // New Sponsor Form States
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
  const [sponsorEmpresa, setSponsorEmpresa] = useState('');
  const [sponsorValor, setSponsorValor] = useState('');
  const [sponsorTempo, setSponsorTempo] = useState('1'); // months
  const [sponsorPortal, setSponsorPortal] = useState(true);
  const [sponsorApp, setSponsorApp] = useState(false);
  const [sponsorLogo, setSponsorLogo] = useState('');
  const [sponsorClickUrl, setSponsorClickUrl] = useState('');
  const [sponsorPosition, setSponsorPosition] = useState('3'); // 1-5
  const [isSavingSponsor, setIsSavingSponsor] = useState(false);

  // Edit Sponsor Config States
  const [selectedSponsorForConfig, setSelectedSponsorForConfig] = useState<any>(null);
  const [editSponsorEmpresa, setEditSponsorEmpresa] = useState('');
  const [editSponsorValor, setEditSponsorValor] = useState('');
  const [editSponsorTempo, setEditSponsorTempo] = useState('1');
  const [editSponsorPortal, setEditSponsorPortal] = useState(false);
  const [editSponsorApp, setEditSponsorApp] = useState(false);
  const [editSponsorLogo, setEditSponsorLogo] = useState('');
  const [editSponsorClickUrl, setEditSponsorClickUrl] = useState('');
  const [editSponsorPosition, setEditSponsorPosition] = useState('3'); // 1-5
  const [editSponsorDetalhes, setEditSponsorDetalhes] = useState<any>({});
  const [configSubTab, setConfigSubTab] = useState<'contrato' | 'portal' | 'app' | 'relatorio'>('contrato');
  const [isSavingSponsorEdit, setIsSavingSponsorEdit] = useState(false);

  // New Expense Form States
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseValor, setExpenseValor] = useState('');
  const [expenseData, setExpenseData] = useState(new Date().toISOString().split('T')[0]);
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  // Competidores & Touros state
  const [relSearchQuery, setRelSearchQuery] = useState('');
  const [relSearchResultCompetidores, setRelSearchResultCompetidores] = useState<any[]>([]);
  const [relSearchResultTouros, setRelSearchResultTouros] = useState<any[]>([]);
  const [relSearchResultCias, setRelSearchResultCias] = useState<any[]>([]);
  
  const [selectedCompetidor, setSelectedCompetidor] = useState<any>(null);
  const [selectedTouro, setSelectedTouro] = useState<any>(null);
  const [selectedCia, setSelectedCia] = useState<any>(null);
  const [ciaBulls, setCiaBulls] = useState<any[]>([]);
  const [relHistory, setRelHistory] = useState<any[]>([]);
  const [allRelEvents, setAllRelEvents] = useState<any[]>([]);

  // Modals for relational DB
  const [isManualEventModalOpen, setIsManualEventModalOpen] = useState(false);
  const [manualEventName, setManualEventName] = useState('');
  const [manualEventCidade, setManualEventCidade] = useState('');
  const [manualEventData, setManualEventData] = useState('');

  const [isManualRideModalOpen, setIsManualRideModalOpen] = useState(false);
  const [manualRideEventId, setManualRideEventId] = useState<number | null>(null);
  const [manualRideCompetidorId, setManualRideCompetidorId] = useState<number | null>(null);
  const [manualRideCompetidorNome, setManualRideCompetidorNome] = useState('');
  const [manualRideTouroId, setManualRideTouroId] = useState<number | null>(null);
  
  // Forms for adding/creating a new ride
  const [rideDia, setRideDia] = useState('DIA 1');
  const [rideTempo, setRideTempo] = useState('8.0');
  const [rideJ1Peao, setRideJ1Peao] = useState('0');
  const [rideJ2Peao, setRideJ2Peao] = useState('0');
  const [rideJ1Touro, setRideJ1Touro] = useState('0');
  const [rideJ2Touro, setRideJ2Touro] = useState('0');
  const [rideStatus, setRideStatus] = useState('ativa');

  // Input states for inserting competitor/bull on-the-fly during manual creation
  const [manualRideTouroNome, setManualRideTouroNome] = useState('');
  const [manualRideCiaNome, setManualRideCiaNome] = useState('');
  const [manualRideEscaladoNoEvento, setManualRideEscaladoNoEvento] = useState('');

  // Editing/Creating new competitors / bulls
  const [isNewCompetidorModalOpen, setIsNewCompetidorModalOpen] = useState(false);
  const [newCompetidorNome, setNewCompetidorNome] = useState('');
  const [newCompetidorCpf, setNewCompetidorCpf] = useState('');
  const [newCompetidorCidade, setNewCompetidorCidade] = useState('');

  const [isNewTouroModalOpen, setIsNewTouroModalOpen] = useState(false);
  const [newTouroNome, setNewTouroNome] = useState('');
  const [newTouroCia, setNewTouroCia] = useState('');
  const [newTouroLado, setNewTouroLado] = useState('Esquerdo');

  useEffect(() => {
    if (selectedLicense) {
      setTempDays(selectedLicense.dias_validos || 0);
      const sportsList = selectedLicense.esportes
        ? selectedLicense.esportes.split(",").map((s: string) => s.trim())
        : ["rodeio"];
      setTempSports(sportsList);
    }
  }, [selectedLicense]);

  useEffect(() => {
    if (session) {
      console.log("RODEOAPP Realtime: Inicializando canal de broadcast no Admin...");
      const channel = supabase.channel("rodeo-realtime-channel");
      channel.subscribe();
      setRealtimeChannel(channel);

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchLicenses();
      fetchBoiadas();
      fetchEventos();
      fetchPatrocinios();
      fetchDespesas();
      const interval = setInterval(() => {
        fetchLicenses();
        fetchBoiadas();
        fetchEventos();
        fetchPatrocinios();
        fetchDespesas();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.toLowerCase() !== "g7briellrms@gmail.com") {
      alert("Acesso negado: E-mail não autorizado.");
      return;
    }
    
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase(),
      options: { shouldCreateUser: true }
    });

    if (error) {
      alert("Erro ao enviar código: " + error.message);
    } else {
      setAuthStep("code");
    }
    setAuthLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.toLowerCase(),
      token: otp,
      type: 'email',
    });

    if (error) {
      alert("Código inválido ou expirado.");
    } else {
      setSession(data.session);
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setAuthStep("email");
    setEmail("");
    setOtp("");
  };

  async function fetchLicenses() {
    const { data, error } = await supabase.from("licencas").select("*").order("created_at", { ascending: false });
    if (error) console.error("Erro ao carregar licenças:", error);
    if (data) setLicenses(data);
  }

  async function fetchBoiadas() {
    const { data, error } = await supabase.from("boiadas_oficiais").select("*").order("nome", { ascending: true });
    if (error) console.error("Erro ao carregar boiadas:", error);
    if (data) setBoiadas(data);
  }

  async function fetchEventos() {
    const { data, error } = await supabase.from("eventos_oficiais").select("*").order("created_at", { ascending: false });
    if (error) console.error("Erro ao carregar eventos:", error);
    if (data) setEventos(data);
  }

  async function fetchPatrocinios() {
    try {
      const res = await fetch("/api/admin-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "select-sponsors" })
      });
      const resJson = await res.json();
      if (resJson.success && resJson.data) {
        setPatrocinios(resJson.data);
      } else {
        console.error("Erro ao carregar patrocínios:", resJson.error);
      }
    } catch (err) {
      console.error("Erro ao carregar patrocínios:", err);
    }
  }

  async function fetchDespesas() {
    try {
      const res = await fetch("/api/admin-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "select-expenses" })
      });
      const resJson = await res.json();
      if (resJson.success && resJson.data) {
        setDespesas(resJson.data);
      } else {
        console.error("Erro ao carregar despesas:", resJson.error);
      }
    } catch (err) {
      console.error("Erro ao carregar despesas:", err);
    }
  }

  const handleApproveEvento = async (id: string) => {
    if (!window.confirm("Aprovar este evento para aparecer no portal?")) return;
    const { error } = await supabase
      .from("eventos_oficiais")
      .update({ status: 'aprovado' })
      .eq("id", id);
    if (!error) {
      alert("Evento aprovado com sucesso!");
      fetchEventos();
    } else {
      alert("Erro ao aprovar evento: " + error.message);
    }
  };

  const handleRejectEvento = async (id: string) => {
    if (!window.confirm("Rejeitar/Excluir este evento?")) return;
    
    try {
      const res = await fetch('/api/admin-delete-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const json = await res.json();
      
      if (json.success) {
        alert("Evento removido!");
        fetchEventos();
      } else {
        alert("Erro ao remover evento: " + (json.error || 'Desconhecido'));
      }
    } catch (e: any) {
      alert("Erro ao conectar com a API: " + e.message);
    }
  };

  const handleUpdateEventConfig = async (eventoId: string, currentDetalhes: any, field: string, value: any) => {
    try {
      const parsedDetalhes = typeof currentDetalhes === 'string' ? JSON.parse(currentDetalhes) : (currentDetalhes || {});
      const portalConfig = parsedDetalhes.portalConfig || { ordem: 999, ocultarDaHome: false };
      portalConfig[field] = value;
      parsedDetalhes.portalConfig = portalConfig;

      const { error } = await supabase.from('eventos_oficiais').update({ detalhes: parsedDetalhes }).eq('id', eventoId);
      if (error) throw error;
      fetchEventos();
    } catch(e: any) {
      alert("Erro ao atualizar configuração: " + e.message);
    }
  };

  const handleSaveBoiada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boiadaName.trim()) return alert("Digite o nome da CIA");
    setLoading(true);
    
    // Parse touros
    const splitLines = (text: string) => text.split("\n").map(l => l.trim().toUpperCase()).filter(l => l);
    const touros = splitLines(tourosTexto);
    
    const lados: Record<string, string> = {};
    touros.forEach(t => lados[t] = "");

    const { error } = await supabase.from("boiadas_oficiais").insert([{
      nome: boiadaName.trim().toUpperCase(),
      lados: lados
    }]);

    if (!error) {
      alert("Boiada cadastrada com sucesso no banco oficial!");
      setBoiadaName("");
      setTourosTexto("");
      fetchBoiadas();
    } else {
      alert("Erro ao cadastrar boiada: " + error.message);
    }
    setLoading(false);
  };

  const handleDeleteBoiada = async (id: string, nome: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a CIA ${nome} do banco oficial?`)) {
      const { error } = await supabase.from("boiadas_oficiais").delete().eq("id", id);
      if (!error) {
        fetchBoiadas();
        alert("Boiada excluída!");
      } else {
        alert("Erro ao excluir: " + error.message);
      }
    }
  };

  const handleApproveBoiada = async (id: string, currentLados: any) => {
    if (!window.confirm("Aprovar esta boiada para o banco oficial?")) return;
    const updatedLados = { ...currentLados };
    if (updatedLados.__meta) {
      updatedLados.__meta.status = 'aprovado';
    }
    const { error } = await supabase
      .from("boiadas_oficiais")
      .update({ lados: updatedLados })
      .eq("id", id);
    if (!error) {
      alert("Boiada aprovada com sucesso e liberada para todos!");
      fetchBoiadas();
    } else {
      alert("Erro ao aprovar boiada: " + error.message);
    }
  };

  const handleRejectBoiada = async (id: string) => {
    if (!window.confirm("Rejeitar e excluir esta solicitação de boiada?")) return;
    const { error } = await supabase.from("boiadas_oficiais").delete().eq("id", id);
    if (!error) {
      alert("Solicitação rejeitada e boiada removida!");
      fetchBoiadas();
    } else {
      alert("Erro ao rejeitar boiada: " + error.message);
    }
  };

  const handleSaveSponsorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsorEmpresa) return alert('Por favor, informe o nome da empresa.');

    setIsSavingSponsor(true);
    try {
      const insertData = {
        id: Date.now(),
        empresa: sponsorEmpresa,
        valor_contrato: parseFloat(sponsorValor) || 0,
        tempo_contrato: parseInt(sponsorTempo) || 1,
        tipo: 'consolidated',
        logo_url: '',
        click_url: '#',
        status: 'ativo',
        detalhes: {
          splash_app: {
            ativo: false,
            logo_url: '',
            click_url: '',
            posicao: 3
          },
          portal_noticias: {
            ativo: false,
            fino_redacao: { logo_url: '', click_url: '' },
            meio_materia: { logo_url: '', click_url: '' },
            fino_ia: { logo_url: '', click_url: '' },
            grid_lateral: {
              main: { logo_url: '', click_url: '' },
              sub1: { logo_url: '', click_url: '' },
              sub2: { logo_url: '', click_url: '' }
            }
          }
        }
      };

      const res = await fetch("/api/admin-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "insert-sponsor", data: insertData })
      });
      const resJson = await res.json();
      if (!resJson.success) throw new Error(resJson.error);

      setSponsorEmpresa('');
      setSponsorValor('');
      setSponsorTempo('1');
      setIsSponsorModalOpen(false);
      fetchPatrocinios();
      alert('Patrocinador adicionado! Agora clique em "Configurar" para enviar as artes e definir as posições.');
    } catch (err: any) {
      alert('Erro ao salvar patrocinador: ' + err.message);
    } finally {
      setIsSavingSponsor(false);
    }
  };

  const handleOpenSponsorConfig = (pat: any) => {
    setSelectedSponsorForConfig(pat);
    setEditSponsorEmpresa(pat.empresa || '');
    setEditSponsorValor(String(pat.valor_contrato || ''));
    setEditSponsorTempo(String(pat.tempo_contrato || '1'));
    setConfigSubTab('contrato'); // reset config sub-tab to default
    
    // Initialize default detalhes
    const defaultDetalhes = {
      splash_app: {
        ativo: false,
        logo_url: '',
        click_url: '',
        posicao: 3
      },
      portal_noticias: {
        ativo: false,
        fino_redacao: { logo_url: '', click_url: '' },
        meio_materia: { logo_url: '', click_url: '' },
        fino_ia: { logo_url: '', click_url: '' },
        grid_lateral: {
          main: { logo_url: '', click_url: '' },
          sub1: { logo_url: '', click_url: '' },
          sub2: { logo_url: '', click_url: '' }
        }
      }
    };

    setEditSponsorDetalhes({
      ...defaultDetalhes,
      ...pat.detalhes,
      splash_app: {
        ...defaultDetalhes.splash_app,
        ...(pat.detalhes?.splash_app || {})
      },
      portal_noticias: {
        ...defaultDetalhes.portal_noticias,
        ...(pat.detalhes?.portal_noticias || {}),
        fino_redacao: {
          ...defaultDetalhes.portal_noticias.fino_redacao,
          ...(pat.detalhes?.portal_noticias?.fino_redacao || {})
        },
        meio_materia: {
          ...defaultDetalhes.portal_noticias.meio_materia,
          ...(pat.detalhes?.portal_noticias?.meio_materia || {})
        },
        fino_ia: {
          ...defaultDetalhes.portal_noticias.fino_ia,
          ...(pat.detalhes?.portal_noticias?.fino_ia || {})
        },
        grid_lateral: {
          ...defaultDetalhes.portal_noticias.grid_lateral,
          ...(pat.detalhes?.portal_noticias?.grid_lateral || {}),
          main: {
            ...defaultDetalhes.portal_noticias.grid_lateral.main,
            ...(pat.detalhes?.portal_noticias?.grid_lateral?.main || {})
          },
          sub1: {
            ...defaultDetalhes.portal_noticias.grid_lateral.sub1,
            ...(pat.detalhes?.portal_noticias?.grid_lateral?.sub1 || {})
          },
          sub2: {
            ...defaultDetalhes.portal_noticias.grid_lateral.sub2,
            ...(pat.detalhes?.portal_noticias?.grid_lateral?.sub2 || {})
          }
        }
      }
    });
  };

  const handleSaveSponsorEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSponsorForConfig) return;
    if (!editSponsorEmpresa) return alert('Por favor, informe o nome da empresa.');

    setIsSavingSponsorEdit(true);
    try {
      const updates = {
        empresa: editSponsorEmpresa,
        valor_contrato: parseFloat(editSponsorValor) || 0,
        tempo_contrato: parseInt(editSponsorTempo) || 1,
        // Sync legacy top level fields with primary values
        logo_url: editSponsorDetalhes.portal_noticias?.fino_redacao?.logo_url || editSponsorDetalhes.splash_app?.logo_url || selectedSponsorForConfig.logo_url || '',
        click_url: editSponsorDetalhes.portal_noticias?.fino_redacao?.click_url || editSponsorDetalhes.splash_app?.click_url || '#',
        detalhes: editSponsorDetalhes
      };

      const res = await fetch("/api/admin-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-sponsor",
          data: {
            id: selectedSponsorForConfig.id,
            updates
          }
        })
      });
      const resJson = await res.json();
      if (!resJson.success) throw new Error(resJson.error);

      setSelectedSponsorForConfig(null);
      fetchPatrocinios();
      alert('Configuração do patrocinador salva com sucesso!');
    } catch (err: any) {
      alert('Erro ao salvar configurações: ' + err.message);
    } finally {
      setIsSavingSponsorEdit(false);
    }
  };

  const handleDeleteSponsor = async (id: number) => {
    if (!window.confirm('Deseja excluir este patrocinador permanentemente?')) return;
    try {
      const res = await fetch("/api/admin-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-sponsor", data: { id } })
      });
      const resJson = await res.json();
      if (!resJson.success) throw new Error(resJson.error);
      fetchPatrocinios();
      alert('Patrocinador removido!');
    } catch (err: any) {
      alert('Erro ao remover: ' + err.message);
    }
  };

  const handleToggleSponsorStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo';
    try {
      const res = await fetch("/api/admin-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-sponsor-status", data: { id, status: nextStatus } })
      });
      const resJson = await res.json();
      if (!resJson.success) throw new Error(resJson.error);
      fetchPatrocinios();
    } catch (err: any) {
      alert('Erro ao alterar status: ' + err.message);
    }
  };

  const handleSaveExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc) return alert('Por favor, informe a descrição da despesa.');

    setIsSavingExpense(true);
    try {
      const res = await fetch("/api/admin-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "insert-expense",
          data: {
            descricao: expenseDesc,
            valor: parseFloat(expenseValor) || 0,
            data: expenseData
          }
        })
      });
      const resJson = await res.json();
      if (!resJson.success) throw new Error(resJson.error);

      setExpenseDesc('');
      setExpenseValor('');
      setExpenseData(new Date().toISOString().split('T')[0]);
      setIsExpenseModalOpen(false);
      fetchDespesas();
      alert('Despesa registrada com sucesso!');
    } catch (err: any) {
      alert('Erro ao salvar despesa: ' + err.message);
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!window.confirm('Deseja excluir esta despesa permanentemente?')) return;
    try {
      const res = await fetch("/api/admin-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-expense", data: { id } })
      });
      const resJson = await res.json();
      if (!resJson.success) throw new Error(resJson.error);
      fetchDespesas();
      alert('Despesa removida!');
    } catch (err: any) {
      alert('Erro ao remover: ' + err.message);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        callback(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const newKey = `APP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + formData.plano);
    const validadeStr = expiryDate.toLocaleDateString('pt-BR');

    const { error } = await supabase.from("licencas").insert([{
      id: crypto.randomUUID(),
      nome: formData.nome,
      email: formData.email,
      whatsapp: formData.whatsapp,
      descricao: formData.descricao,
      key_code: newKey,
      dias_validos: formData.plano,
      is_active: true,
      esportes: selectedSportsRegister.join(",")
    }]);

    if (!error) {
      fetch('/api/send-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          nome: formData.nome,
          token: newKey,
          validade: validadeStr
        })
      });

      setGeneratedKey(newKey);
      setFormData({ nome: "", email: "", whatsapp: "", descricao: "", plano: 30 });
      setSelectedSportsRegister(["rodeio"]);
      fetchLicenses();
      setActiveTab("keys"); // Redireciona para ver a nova licença
    } else {
      alert("Erro ao gerar chave: " + error.message);
    }
    setLoading(false);
  };

  const sendLicenseBroadcast = async (email: string) => {
    try {
      if (realtimeChannel) {
        await realtimeChannel.send({
          type: "broadcast",
          event: "license-updated",
          payload: { email: email.toLowerCase().trim() }
        });
      }
    } catch (err) {
      console.error("Erro ao enviar broadcast:", err);
    }
  };

  const sendForceUpdateBroadcast = async (email: string) => {
    try {
      const forceChannel = supabase.channel("rodeo-force-update-channel");
      forceChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await forceChannel.send({
            type: "broadcast",
            event: "force-update",
            payload: { email: email.toLowerCase().trim() }
          });
          alert("Comando de atualização remota enviado para " + email);
          supabase.removeChannel(forceChannel);
        }
      });
    } catch (e) {
      console.error(e);
      alert("Erro ao enviar comando.");
    }
  };

  const handleUpdateSports = async (id: string, sports: string[]) => {
    if (!selectedLicense || !selectedLicense.email) return;
    const sportsStr = sports.join(",");
    const { error } = await supabase
      .from("licencas")
      .update({ esportes: sportsStr })
      .ilike("email", selectedLicense.email);
      
    if (!error) {
      setSelectedLicense({ ...selectedLicense, esportes: sportsStr });
      fetchLicenses();
      sendLicenseBroadcast(selectedLicense.email);
      alert("Esportes atualizados com sucesso!");
    } else {
      alert("Erro ao atualizar: " + error.message);
    }
  };

  const handleUpdateDays = async (id: string, newDays: number) => {
    if (!selectedLicense || !selectedLicense.email) return;
    const nowISO = new Date().toISOString();
    const { error } = await supabase
      .from("licencas")
      .update({ dias_validos: newDays, data_ativacao: nowISO })
      .ilike("email", selectedLicense.email);

    if (!error) {
      setSelectedLicense({ ...selectedLicense, dias_validos: newDays, data_ativacao: nowISO });
      fetchLicenses();
      sendLicenseBroadcast(selectedLicense.email);
      alert(`Atualizado! Cronômetro reiniciado com ${newDays} dias.`);
    } else {
      alert("Erro ao atualizar dias: " + error.message);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    if (!selectedLicense || !selectedLicense.email) return;
    const { error } = await supabase
      .from("licencas")
      .update({ is_active: !currentStatus })
      .ilike("email", selectedLicense.email);

    if (!error) {
      setSelectedLicense({ ...selectedLicense, is_active: !currentStatus });
      fetchLicenses();
      sendLicenseBroadcast(selectedLicense.email);
    } else {
      alert("Erro ao alterar status: " + error.message);
    }
  };

  const handleDeleteLicense = async (id: string, nome: string) => {
    if (window.confirm(`ATENÇÃO: Tem certeza que deseja excluir DEFINITIVAMENTE a licença do cliente ${nome}?`)) {
      const { error } = await supabase.from("licencas").delete().eq("id", id);
      if (!error) {
        if (selectedLicense && selectedLicense.id === id) setSelectedLicense(null);
        fetchLicenses();
        alert("Cliente excluído com sucesso!");
      } else {
        alert("Erro ao excluir cliente: " + error.message);
      }
    }
  };

  const handleGenerateAdditionalKey = async (license: any) => {
    if (!license) return;
    if (!window.confirm(`Deseja gerar uma chave adicional para ${license.nome} (${license.email})?`)) return;
    
    try {
      const newKey = `APP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      
      const { error } = await supabase.from("licencas").insert([{
        id: crypto.randomUUID(),
        nome: license.nome,
        email: license.email,
        whatsapp: license.whatsapp,
        descricao: `${license.descricao || ''} (Chave adicional baseada na chave ${license.key_code})`.trim(),
        key_code: newKey,
        dias_validos: license.dias_validos || 30,
        is_active: true,
        esportes: license.esportes || "rodeio"
      }]);

      if (error) throw error;

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (license.dias_validos || 30));
      const validadeStr = expiryDate.toLocaleDateString('pt-BR');

      fetch('/api/send-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: license.email,
          nome: license.nome,
          token: newKey,
          validade: validadeStr
        })
      });

      alert(`Nova chave gerada e enviada por e-mail!\n\nChave Adicional: ${newKey}`);
      fetchLicenses();
      setSelectedLicense(null);
    } catch (err: any) {
      alert("Erro ao gerar chave adicional: " + err.message);
    }
  };
  // Competidores & Touros handlers
  const handleRelationalSearch = async (query: string) => {
    setRelSearchQuery(query);
    if (!query.trim()) {
      setRelSearchResultCompetidores([]);
      setRelSearchResultTouros([]);
      setRelSearchResultCias([]);
      return;
    }

    try {
      const cleanQ = query.trim();
      
      // 1. Search Competidores
      let compReq = supabase.from('rel_competidores').select('*');
      if (/\d/.test(cleanQ)) {
        compReq = compReq.ilike('cpf', `%${cleanQ.replace(/\D/g, '')}%`);
      } else {
        compReq = compReq.ilike('nome', `%${cleanQ}%`);
      }
      const { data: comps } = await compReq.limit(20);
      setRelSearchResultCompetidores(comps || []);

      // 2. Search Bulls
      const { data: bulls } = await supabase.from('rel_touros')
        .select('*')
        .ilike('nome', `%${cleanQ}%`)
        .limit(20);
      setRelSearchResultTouros(bulls || []);

      // 3. Search Cias
      const { data: cias } = await supabase.from('rel_cias')
        .select('*')
        .ilike('nome', `%${cleanQ}%`)
        .limit(20);
      setRelSearchResultCias(cias || []);
    } catch (err) {
      console.error("Error searching relational DB", err);
    }
  };

  const handleSelectCompetidor = async (comp: any) => {
    setSelectedCompetidor(comp);
    setSelectedTouro(null);
    setSelectedCia(null);
    try {
      const { data: rides, error } = await supabase.from('rel_montarias')
        .select('*, rel_eventos(*), rel_touros(*)')
        .eq('competidor_id', comp.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRelHistory(rides || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectTouro = async (bull: any) => {
    setSelectedTouro(bull);
    setSelectedCompetidor(null);
    setSelectedCia(null);
    try {
      const { data: rides, error } = await supabase.from('rel_montarias')
        .select('*, rel_eventos(*), rel_competidores(*)')
        .eq('touro_id', bull.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRelHistory(rides || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectCia = async (cia: any) => {
    setSelectedCia(cia);
    setSelectedCompetidor(null);
    setSelectedTouro(null);
    try {
      const { data: bulls, error } = await supabase.from('rel_touros')
        .select('*')
        .eq('cia', cia.nome)
        .order('nome', { ascending: true });
      if (error) throw error;
      setCiaBulls(bulls || []);
    } catch (err) {
      console.error(err);
    }
  };

  const syncRelationalEventToEventosOficiais = async (eventName: string) => {
    try {
      const { data: relEv } = await supabase.from('rel_eventos')
        .select('*')
        .eq('nome', eventName.trim().toUpperCase())
        .maybeSingle();
      if (!relEv) return;

      const { data: rides } = await supabase.from('rel_montarias')
        .select('*, rel_competidores(*), rel_touros(*)')
        .eq('evento_id', relEv.id);

      const notas = (rides || []).map(r => ({
        id: r.id.toString(),
        dia: r.dia,
        peao: r.rel_competidores?.nome || 'DESCONHECIDO',
        cpf: r.rel_competidores?.cpf || '',
        cidade: r.rel_competidores?.cidade || '',
        touro: r.rel_touros?.nome || 'DESCONHECIDO',
        cia: r.rel_touros?.cia || 'DESCONHECIDA',
        status: r.status,
        tempo: r.tempo,
        j1_peao: r.j1_peao,
        j2_peao: r.j2_peao,
        j1_touro: r.j1_touro,
        j2_touro: r.j2_touro,
        totalPeao: r.total_peao,
        totalTouro: r.total_touro
      }));

      const competitorScores = new Map<string, { nome: string, cpf: string, score: number, cidade: string, tempoAcumulado: number }>();
      notas.forEach(n => {
        const key = n.cpf ? n.cpf : n.peao;
        if (!competitorScores.has(key)) {
          competitorScores.set(key, {
            nome: n.peao,
            cpf: n.cpf,
            score: 0,
            cidade: n.cidade,
            tempoAcumulado: 0
          });
        }
        const score = (n.totalPeao || 0) + (n.totalTouro || 0);
        const isParada = n.tempo >= 8 || n.tempo == null;
        const entry = competitorScores.get(key)!;
        entry.score += score;
        if (isParada) {
          entry.tempoAcumulado += 8;
        } else {
          entry.tempoAcumulado += n.tempo || 0;
        }
      });

      const ranking = Array.from(competitorScores.values()).sort((a, b) => b.score - a.score);

      const boiadasMap = new Map<string, Set<string>>();
      notas.forEach(n => {
        if (n.cia && n.touro) {
          if (!boiadasMap.has(n.cia)) {
            boiadasMap.set(n.cia, new Set());
          }
          boiadasMap.get(n.cia)!.add(n.touro);
        }
      });
      const boiadas = Array.from(boiadasMap.entries()).map(([ciaName, tourosSet]) => ({
        nome: ciaName,
        lados: {},
        touros: Array.from(tourosSet)
      }));

      const { data: existingEvs } = await supabase.from('eventos_oficiais')
        .select('*')
        .eq('nome', relEv.nome)
        .limit(1);

      const existingEv = existingEvs && existingEvs.length > 0 ? existingEvs[0] : null;

      const payload = {
        nome: relEv.nome,
        data_inicio: relEv.data || '',
        data_fim: '',
        local: relEv.cidade,
        organizador_email: existingEv ? existingEv.organizador_email : 'admin@rodeoapp.pro',
        status: 'aprovado',
        detalhes: {
          ...(existingEv?.detalhes || {}),
          notas,
          ranking,
          boiadas,
          portalConfig: {
            ...(existingEv?.detalhes?.portalConfig || {}),
            manual: relEv.is_manual
          }
        }
      };

      if (existingEv) {
        await supabase.from('eventos_oficiais').update(payload).eq('id', existingEv.id);
      } else {
        await supabase.from('eventos_oficiais').insert({
          ...payload,
          id: typeof window !== 'undefined' && window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 15)
        });
      }
    } catch (err) {
      console.error("Error syncing back to raw events", err);
    }
  };

  const handleCreateManualEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEventName || !manualEventCidade) return alert("Preencha nome e cidade.");
    try {
      const evName = manualEventName.trim().toUpperCase();
      const { error } = await supabase.from('rel_eventos')
        .insert({
          nome: evName,
          cidade: manualEventCidade.trim().toUpperCase(),
          data: manualEventData || new Date().toLocaleDateString('pt-BR'),
          is_manual: true
        })
        .select('id')
        .single();
      if (error) throw error;
      
      await syncRelationalEventToEventosOficiais(evName);

      alert("Evento criado com sucesso!");
      setIsManualEventModalOpen(false);
      setManualEventName('');
      setManualEventCidade('');
      setManualEventData('');

      if (selectedCompetidor) {
        handleSelectCompetidor(selectedCompetidor);
      }
    } catch (err: any) {
      alert("Erro ao criar evento: " + err.message);
    }
  };

  const handleCreateManualRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRideEventId) return alert("Selecione um evento.");
    if (!manualRideTouroNome || !manualRideCiaNome) return alert("Preencha Touro e Cia.");
    if (!selectedCompetidor && !manualRideCompetidorNome) return alert("Preencha o Nome do Competidor.");

    try {
      const tName = manualRideTouroNome.trim().toUpperCase();
      const cName = manualRideCiaNome.trim().toUpperCase();

      // Update Escalado no Evento in boiadas_oficiais
      const { data: bData } = await supabase.from('boiadas_oficiais').select('id, lados').ilike('nome', cName).maybeSingle();
      if (bData && bData.lados && typeof bData.lados === 'object') {
        const ladosObj = { ...bData.lados };
        if (ladosObj.__meta && ladosObj.__meta.touros_info) {
          let changed = false;
          const cleanTName = tName.toLowerCase();
          for (const key of Object.keys(ladosObj.__meta.touros_info)) {
            if (key.toLowerCase().trim() === cleanTName) {
              const currentEscalado = ladosObj.__meta.touros_info[key].escalado_no_evento || '';
              if (currentEscalado !== manualRideEscaladoNoEvento) {
                ladosObj.__meta.touros_info[key].escalado_no_evento = manualRideEscaladoNoEvento || undefined;
                changed = true;
              }
            }
          }
          if (changed) {
            await supabase.from('boiadas_oficiais').update({ lados: ladosObj }).eq('id', bData.id);
          }
        }
      }

      // Resolve Cia
      const { data: ciaData } = await supabase.from('rel_cias').select('id').eq('nome', cName).maybeSingle();
      if (!ciaData) {
        await supabase.from('rel_cias').insert({ nome: cName });
      }

      // Resolve Touro
      let { data: bullData } = await supabase.from('rel_touros').select('id').eq('nome', tName).eq('cia', cName).maybeSingle();
      let bId = bullData?.id;
      if (!bId) {
        const { data: newB } = await supabase.from('rel_touros').insert({ nome: tName, cia: cName }).select('id').single();
        bId = newB?.id;
      }

      const tVal = parseFloat(rideTempo) || 0;
      const j1p = parseFloat(rideJ1Peao) || 0;
      const j2p = parseFloat(rideJ2Peao) || 0;
      const j1t = parseFloat(rideJ1Touro) || 0;
      const j2t = parseFloat(rideJ2Touro) || 0;

      const totPeao = j1p + j2p;
      const totTouro = j1t + j2t;
      const notaFin = totPeao + totTouro;

      // Resolve Competidor
      let cId = selectedCompetidor ? selectedCompetidor.id : manualRideCompetidorId;
      if (!cId && manualRideCompetidorNome) {
        const compName = manualRideCompetidorNome.trim().toUpperCase();
        let { data: compData } = await supabase.from('rel_competidores').select('id').eq('nome', compName).maybeSingle();
        cId = compData?.id;
        if (!cId) {
          const { data: newC } = await supabase.from('rel_competidores').insert({ nome: compName }).select('id').single();
          cId = newC?.id;
        }
      }

      const payload = {
        evento_id: manualRideEventId,
        competidor_id: cId || null,
        touro_id: bId || manualRideTouroId || null,
        dia: rideDia || 'DIA 1',
        tempo: tVal,
        j1_peao: j1p,
        j2_peao: j2p,
        j1_touro: j1t,
        j2_touro: j2t,
        total_peao: totPeao,
        total_touro: totTouro,
        nota_final: notaFin,
        status: rideStatus
      };

      const { error } = await supabase.from('rel_montarias').insert(payload);
      if (error) throw error;

      const targetEvent = allRelEvents.find(ev => ev.id === manualRideEventId);
      if (targetEvent) {
        await syncRelationalEventToEventosOficiais(targetEvent.nome);
      }

      alert("Montaria adicionada com sucesso!");
      setIsManualRideModalOpen(false);

      setManualRideTouroNome('');
      setManualRideCiaNome('');
      setManualRideEscaladoNoEvento('');
      setManualRideCompetidorNome('');
      setRideTempo('8.0');
      setRideJ1Peao('0');
      setRideJ2Peao('0');
      setRideJ1Touro('0');
      setRideJ2Touro('0');

      if (selectedCompetidor) {
        handleSelectCompetidor(selectedCompetidor);
      } else if (selectedTouro) {
        handleSelectTouro(selectedTouro);
      }
    } catch (err: any) {
      alert("Erro ao salvar montaria: " + err.message);
    }
  };

  const handleDeleteRide = async (rideId: number, eventName?: string) => {
    if (!window.confirm("Deseja realmente excluir esta montaria? (Se for do painel, será apagada definitivamente)")) return;
    try {
      const { error } = await supabase.from('rel_montarias').delete().eq('id', rideId);
      if (error) throw error;
      if (eventName) {
        await syncRelationalEventToEventosOficiais(eventName);
      }
      setRelHistory(prev => prev.filter(r => r.id !== rideId));
      alert("Montaria excluída com sucesso!");
    } catch (err: any) {
      alert("Erro ao excluir montaria: " + err.message);
    }
  };

  const handleCreateCompetidor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompetidorNome) return alert("Nome é obrigatório.");
    try {
      const { data, error } = await supabase.from('rel_competidores')
        .insert({
          nome: newCompetidorNome.trim().toUpperCase(),
          cpf: newCompetidorCpf.replace(/\D/g, '') || null,
          cidade: newCompetidorCidade.trim().toUpperCase() || null
        })
        .select('*')
        .single();
      if (error) throw error;

      alert("Competidor cadastrado com sucesso!");
      setIsNewCompetidorModalOpen(false);
      setNewCompetidorNome('');
      setNewCompetidorCpf('');
      setNewCompetidorCidade('');
      handleSelectCompetidor(data);
    } catch (err: any) {
      alert("Erro ao cadastrar competidor: " + err.message);
    }
  };

  const handleCreateTouro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTouroNome || !newTouroCia) return alert("Nome e Cia são obrigatórios.");
    try {
      const cName = newTouroCia.trim().toUpperCase();
      const tName = newTouroNome.trim().toUpperCase();

      const { data: ciaData } = await supabase.from('rel_cias').select('id').eq('nome', cName).maybeSingle();
      if (!ciaData) {
        await supabase.from('rel_cias').insert({ nome: cName });
      }

      const { data, error } = await supabase.from('rel_touros')
        .insert({
          nome: tName,
          cia: cName,
          lado: newTouroLado
        })
        .select('*')
        .single();
      if (error) throw error;

      alert("Touro cadastrado com sucesso!");
      setIsNewTouroModalOpen(false);
      setNewTouroNome('');
      setNewTouroCia('');
      handleSelectTouro(data);
    } catch (err: any) {
      alert("Erro ao cadastrar touro: " + err.message);
    }
  };

  const openManualRideModal = async (eventId: number | null, compId: number | null, bullId: number | null) => {
    setManualRideEventId(eventId);
    setManualRideCompetidorId(compId);
    setManualRideTouroId(bullId);
    
    if (compId) {
      const { data: comp } = await supabase.from('rel_competidores').select('*').eq('id', compId).maybeSingle();
      if (comp) {
        setManualRideCompetidorNome(comp.nome);
      } else {
        setManualRideCompetidorNome('');
      }
    } else {
      setManualRideCompetidorNome('');
    }

    if (bullId) {
      const { data: bull } = await supabase.from('rel_touros').select('*').eq('id', bullId).maybeSingle();
      if (bull) {
        setManualRideTouroNome(bull.nome);
        setManualRideCiaNome(bull.cia);
      }
    } else {
      setManualRideTouroNome('');
      setManualRideCiaNome('');
      setManualRideEscaladoNoEvento('');
    }
    
    const { data } = await supabase.from('rel_eventos').select('*').order('nome', { ascending: true });
    setAllRelEvents(data || []);
    
    setIsManualRideModalOpen(true);
  };
  // Finance and Sponsorship calculations
  const totalEntradas = patrocinios.reduce((acc, p) => acc + (Number(p.valor_contrato) || 0), 0);
  const totalSaidas = despesas.reduce((acc, d) => acc + (Number(d.valor) || 0), 0);
  const saldoLiquido = totalEntradas - totalSaidas;
  
  // Calculate forecast monthly income: only from active sponsorships
  const previsaoMensal = patrocinios
    .filter(p => p.status === 'ativo')
    .reduce((acc, p) => {
      const valor = Number(p.valor_contrato) || 0;
      const meses = Number(p.tempo_contrato) || 1;
      return acc + (valor / meses);
    }, 0);

  const filteredLicenses = licenses.filter(l => 
    l.nome?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.key_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // VIEW: LOGIN
  if (!session) {
    return (
      <div className="min-h-screen bg-[#000000] text-white flex items-center justify-center p-6 font-sans">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />
        </div>

        <div className="max-w-md w-full relative z-10">
          <div className="text-center mb-10">
            <img src="/splash_logo.png" alt="RODEOAPP Logo" className="h-20 mx-auto mb-6 object-contain" />
            <p className="text-white/30 font-black text-[10px] uppercase tracking-[0.4em]">Acesso Administrativo Master</p>
          </div>

          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl">
            {authStep === "email" ? (
              <form onSubmit={handleSendOtp} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">E-mail do Administrador</label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@rodeoapp.pro" 
                      className="w-full bg-black border border-white/10 rounded-2xl pl-14 pr-6 py-4 outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-bold text-sm"
                      required
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={authLoading}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-yellow-500/20 active:scale-95 disabled:opacity-50"
                >
                  {authLoading ? "ENVIANDO..." : "RECEBER CÓDIGO MASTER"} <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="space-y-2 text-center mb-4">
                  <p className="text-white/40 text-sm font-bold uppercase tracking-tight">Insira o código enviado para <br /><span className="text-yellow-500 font-black tracking-normal lowercase">{email}</span></p>
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <Fingerprint className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <input 
                      type="text" 
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="00000000" 
                      className="w-full bg-black border border-white/10 rounded-2xl pl-14 pr-6 py-4 outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-black text-2xl tracking-[0.3em] text-center text-yellow-500"
                      maxLength={8}
                      required
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={authLoading}
                  className="w-full bg-white text-black hover:bg-yellow-500 py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-white/5 active:scale-95 disabled:opacity-50"
                >
                  {authLoading ? "VERIFICANDO..." : "LIBERAR PAINEL"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setAuthStep("email")}
                  className="w-full text-white/20 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  Voltar para o e-mail
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // VIEW: DASHBOARD
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-yellow-500 selection:text-black flex flex-col overflow-hidden relative">
      
      {/* Fundo Dinâmico de Vidro (Mesh Gradient) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-yellow-500/10 rounded-full blur-[120px] mix-blend-screen animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Floating Top Nav Bar (Liquidglass) */}
      <nav className="relative z-50 flex flex-wrap md:flex-nowrap items-center justify-between p-4 md:px-8 md:py-4 bg-white/5 backdrop-blur-3xl border border-white/10 m-4 md:m-6 rounded-[2rem] shadow-2xl">
        <div className="flex items-center gap-3">
           <img src="/header_logo.png" alt="RODEOAPP Logo" className="h-8 md:h-10 object-contain" />
           <p className="hidden md:block text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em] ml-1">Admin Pro</p>
        </div>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-2">
          <TopNavBtn icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
          <TopNavBtn icon={<UserPlus className="w-4 h-4" />} label="Novo Cliente" active={activeTab === "new"} onClick={() => setActiveTab("new")} />
          <TopNavBtn icon={<Key className="w-4 h-4" />} label="Chaves" active={activeTab === "keys"} onClick={() => setActiveTab("keys")} />
          <TopNavBtn icon={<Database className="w-4 h-4" />} label="Boiadas" active={activeTab === "boiadas"} onClick={() => setActiveTab("boiadas")} />
          <TopNavBtn icon={<Database className="w-4 h-4" />} label="Eventos" active={activeTab === "eventos"} onClick={() => setActiveTab("eventos")} />
          <TopNavBtn icon={<Download className="w-4 h-4" />} label="Download" active={activeTab === "download"} onClick={() => setActiveTab("download")} />
          <TopNavBtn icon={<DollarSign className="w-4 h-4" />} label="Patrocinadores" active={activeTab === "patrocinios"} onClick={() => setActiveTab("patrocinios")} />
          <TopNavBtn icon={<ShieldCheck className="w-4 h-4" />} label="Competidores" active={activeTab === "competidores"} onClick={() => setActiveTab("competidores")} />
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 bg-black/30 rounded-2xl p-2 px-4 border border-white/5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-500 to-yellow-700 border border-white/20" />
            <div className="text-[9px] font-black text-white/50 uppercase tracking-widest truncate max-w-[100px]">{session.user.email}</div>
          </div>
          <button onClick={handleLogout} className="p-2 md:px-4 md:py-2 rounded-xl font-black text-[10px] text-white/50 hover:text-red-500 hover:bg-red-500/10 transition-all uppercase tracking-[0.2em] flex items-center gap-2 bg-white/5 border border-white/5">
            <LogOut className="w-4 h-4" /> <span className="hidden md:inline">Sair</span>
          </button>
          
          {/* Mobile Menu Toggle */}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden text-yellow-500 p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 active:scale-95 transition-all">
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown (Liquidglass) */}
      <div className={`lg:hidden absolute top-24 left-4 right-4 z-40 bg-white/10 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-4 shadow-2xl transition-all duration-300 origin-top ${isSidebarOpen ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0 pointer-events-none'}`}>
        <div className="flex flex-col gap-2">
          <TopNavBtn icon={<LayoutDashboard className="w-5 h-5" />} label="DASHBOARD" active={activeTab === "dashboard"} onClick={() => { setActiveTab("dashboard"); setIsSidebarOpen(false); }} fullWidth />
          <TopNavBtn icon={<UserPlus className="w-5 h-5" />} label="NOVO CLIENTE" active={activeTab === "new"} onClick={() => { setActiveTab("new"); setIsSidebarOpen(false); }} fullWidth />
          <TopNavBtn icon={<Key className="w-5 h-5" />} label="GERENCIAR CHAVES" active={activeTab === "keys"} onClick={() => { setActiveTab("keys"); setIsSidebarOpen(false); }} fullWidth />
          <TopNavBtn icon={<Database className="w-5 h-5" />} label="BOIADAS" active={activeTab === "boiadas"} onClick={() => { setActiveTab("boiadas"); setIsSidebarOpen(false); }} fullWidth />
          <TopNavBtn icon={<Database className="w-5 h-5" />} label="EVENTOS" active={activeTab === "eventos"} onClick={() => { setActiveTab("eventos"); setIsSidebarOpen(false); }} fullWidth />
          <TopNavBtn icon={<Download className="w-5 h-5" />} label="DOWNLOAD" active={activeTab === "download"} onClick={() => { setActiveTab("download"); setIsSidebarOpen(false); }} fullWidth />
          <TopNavBtn icon={<DollarSign className="w-5 h-5" />} label="PATROCINADORES" active={activeTab === "patrocinios"} onClick={() => { setActiveTab("patrocinios"); setIsSidebarOpen(false); }} fullWidth />
          <TopNavBtn icon={<ShieldCheck className="w-5 h-5" />} label="COMPETIDORES" active={activeTab === "competidores"} onClick={() => { setActiveTab("competidores"); setIsSidebarOpen(false); }} fullWidth />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 md:px-12 pb-12 custom-scrollbar relative z-10 w-full max-w-[1600px] mx-auto">
        
        {activeTab === "dashboard" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-8 md:mb-12 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
              <div>
                <p className="text-yellow-500 font-black text-[10px] md:text-xs uppercase tracking-[0.5em] mb-2">Visão Estratégica</p>
                <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase">Métricas</h2>
              </div>
              <div className="md:text-right bg-white/5 md:bg-transparent p-6 md:p-0 rounded-[2rem] md:rounded-none border border-white/10 md:border-none">
                <div className="text-4xl md:text-5xl font-black text-white">{licenses.length}</div>
                <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Total de Licenças</div>
              </div>
            </header>

            {/* Financial Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-6 backdrop-blur-xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Faturamento Total</span>
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-black text-emerald-400">
                    R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="text-[9px] text-white/20 uppercase tracking-wider mt-4">
                  Soma de todos os contratos
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-6 backdrop-blur-xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Despesas Registradas</span>
                    <PiggyBank className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className="text-2xl font-black text-red-400">
                    R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="text-[9px] text-white/20 uppercase tracking-wider mt-4">
                  Total de saídas registradas
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-6 backdrop-blur-xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Saldo Líquido</span>
                    <DollarSign className={`w-5 h-5 ${saldoLiquido >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                  </div>
                  <h3 className={`text-2xl font-black ${saldoLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    R$ {saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="text-[9px] text-white/20 uppercase tracking-wider mt-4">
                  Entradas menos saídas
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-6 backdrop-blur-xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Previsão Mensal</span>
                    <Percent className="w-5 h-5 text-yellow-500" />
                  </div>
                  <h3 className="text-2xl font-black text-yellow-500">
                    R$ {previsaoMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<span className="text-xs font-normal text-white/50">/mês</span>
                  </h3>
                </div>
                <div className="text-[9px] text-white/20 uppercase tracking-wider mt-4">
                  Apenas contratos ativos
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="flex gap-4 mb-8">
              <button 
                onClick={() => setIsSponsorModalOpen(true)}
                className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-yellow-500/10"
              >
                <Plus className="w-4 h-4" /> Novo Patrocínio
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <DashboardCard 
                title="Atividades Recentes" 
                icon={<Clock className="w-6 h-6 text-yellow-500" />} 
                items={licenses.slice(0, 5)}
                emptyMsg="Aguardando novas atividades..."
              />
              <DashboardCard 
                title="Infraestrutura" 
                icon={<Zap className="w-6 h-6 text-yellow-500" />} 
                items={[]}
                emptyMsg="Sistemas RODEOAPP: Online"
              />
            </div>
          </div>
        )}

        {activeTab === "new" && (
          <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500 mx-auto md:mx-0">
            <h2 className="text-4xl md:text-5xl font-black mb-8 md:mb-10 italic uppercase tracking-tighter">Novo Cliente</h2>
            <form onSubmit={handleCreateClient} className="bg-white/5 border border-white/10 p-6 md:p-12 rounded-[2rem] md:rounded-[3.5rem] space-y-8 backdrop-blur-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputGroup label="Nome do Responsável" value={formData.nome} onChange={(v: any) => setFormData({...formData, nome: v})} placeholder="Ex: RODRIGO SILVA" />
                <InputGroup label="E-mail Principal" value={formData.email} onChange={(v: any) => setFormData({...formData, email: v})} placeholder="contato@empresa.com" type="email" />
                <InputGroup label="WhatsApp de Suporte" value={formData.whatsapp} onChange={(v: any) => setFormData({...formData, whatsapp: v})} placeholder="(18) 00000-0000" />
                <div>
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1 mb-3 block">Período de Licença</label>
                  <select 
                    value={formData.plano} 
                    onChange={(e: any) => setFormData({...formData, plano: parseInt(e.target.value)})}
                    className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-yellow-500 transition-all appearance-none cursor-pointer font-black text-xs text-yellow-500 uppercase tracking-widest"
                  >
                    <option value={5}>5 Dias (Trial)</option>
                    <option value={30}>30 Dias (Mensal)</option>
                    <option value={90}>90 Dias (Trimestral)</option>
                    <option value={365}>365 Dias (Anual)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1 mb-3 block">Informações Internas</label>
                <textarea 
                  value={formData.descricao} 
                  onChange={(e: any) => setFormData({...formData, descricao: e.target.value})}
                  className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-yellow-500 h-32 resize-none font-bold text-sm text-white/60"
                  placeholder="Notas e detalhes do evento..."
                ></textarea>
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1 block">Categorias Liberadas</label>
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 bg-black border border-white/10 rounded-2xl p-6 flex-wrap">
                  <label className="flex items-center gap-3 cursor-pointer text-sm font-bold text-white/80 select-none">
                    <input 
                      type="checkbox" 
                      checked={selectedSportsRegister.includes("rodeio")}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSportsRegister([...selectedSportsRegister, "rodeio"]);
                        } else {
                          setSelectedSportsRegister(selectedSportsRegister.filter(s => s !== "rodeio"));
                        }
                      }}
                      className="w-5 h-5 accent-yellow-500 rounded border-white/20 bg-black cursor-pointer"
                    />
                    Rodeio em Touros
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer text-sm font-bold text-white/80 select-none">
                    <input 
                      type="checkbox" 
                      checked={selectedSportsRegister.includes("3tambores")}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSportsRegister([...selectedSportsRegister, "3tambores"]);
                        } else {
                          setSelectedSportsRegister(selectedSportsRegister.filter(s => s !== "3tambores"));
                        }
                      }}
                      className="w-5 h-5 accent-yellow-500 rounded border-white/20 bg-black cursor-pointer"
                    />
                    3 Tambores
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer text-sm font-bold text-white/80 select-none">
                    <input 
                      type="checkbox" 
                      checked={selectedSportsRegister.includes("transmissao")}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSportsRegister([...selectedSportsRegister, "transmissao"]);
                        } else {
                          setSelectedSportsRegister(selectedSportsRegister.filter(s => s !== "transmissao"));
                        }
                      }}
                      className="w-5 h-5 accent-yellow-500 rounded border-white/20 bg-black cursor-pointer"
                    />
                    Transmissão
                  </label>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-6 rounded-2xl font-black text-lg md:text-xl shadow-2xl shadow-yellow-500/20 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-tighter"
              >
                {loading ? "Processando..." : "Gerar e Enviar Acesso"}
              </button>
            </form>
          </div>
        )}

        {activeTab === "download" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl md:text-5xl font-black mb-8 md:mb-10 italic uppercase tracking-tighter">Instalador Oficial</h2>
            <div className="bg-white/5 border border-white/10 p-6 md:p-12 rounded-[2rem] md:rounded-[3.5rem] space-y-8 backdrop-blur-xl max-w-3xl">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-24 h-24 bg-gradient-to-tr from-yellow-500 to-yellow-700 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-yellow-500/20 shrink-0">
                  <Download className="w-10 h-10 text-black" />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter text-yellow-500 mb-2">RODEOAPP SETUP 1.0.0</h3>
                  <p className="text-white/40 font-bold text-sm uppercase tracking-widest leading-relaxed">
                    Hospede o arquivo ".exe" no seu Google Drive, copie o link público e deixe aqui. Quando o cliente solicitar, basta vir aqui e copiar o link da versão mais recente!
                  </p>
                </div>
              </div>

              <div className="bg-black border border-white/10 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <input 
                  type="text"
                  placeholder="Cole o link do seu Google Drive aqui..."
                  className="bg-transparent text-yellow-500 font-mono text-sm sm:text-base outline-none w-full"
                  defaultValue="https://drive.google.com/file/d/SEU_LINK_AQUI"
                />
                <button 
                  onClick={() => alert("Lembre-se de hospedar o arquivo .exe atualizado no seu Google Drive e colar o link real aqui!")}
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all w-full sm:w-auto shrink-0"
                >
                  COPIAR LINK
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "boiadas" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter mb-10">Boiadas em Nuvem</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-sm">
                <h3 className="font-black italic uppercase text-yellow-500 mb-6">Cadastrar Nova Boiada</h3>
                <form onSubmit={handleSaveBoiada} className="space-y-6">
                  <InputGroup label="NOME DA COMPANHIA" placeholder="Ex: CIA Tércio Miranda" value={boiadaName} onChange={setBoiadaName} />
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">TOUROS (Um por linha)</label>
                    <textarea value={tourosTexto} onChange={e=>setTourosTexto(e.target.value)} placeholder="Cole aqui a lista de touros da CIA..." className="w-full h-64 bg-black border border-white/10 rounded-2xl p-4 font-bold text-xs outline-none focus:border-yellow-500 transition-all resize-none"></textarea>
                  </div>
                  
                  <button type="submit" disabled={loading} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-yellow-500/20 active:scale-95 disabled:opacity-50 mt-4">
                    {loading ? "SALVANDO..." : "SALVAR NO BANCO OFICIAL"} <Database className="w-4 h-4" />
                  </button>
                </form>
              </div>

              <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-sm flex flex-col max-h-[600px] overflow-hidden">
                <h3 className="font-black italic uppercase text-white mb-6">Solicitações de Boiadas</h3>
                <div className="flex-1 overflow-y-auto pr-4 mb-6 space-y-4 custom-scrollbar" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
                  {boiadas.filter(b => b.lados?.__meta && b.lados.__meta.status === 'pendente').length === 0 ? (
                    <div className="text-white/30 text-xs font-bold uppercase tracking-widest py-8 text-center">Nenhuma solicitação pendente</div>
                  ) : (
                    boiadas.filter(b => b.lados?.__meta && b.lados.__meta.status === 'pendente').map(b => {
                      const totalTouros = Object.keys(b.lados || {}).filter(k => k !== '__meta').length;
                      return (
                        <div key={b.id} className="bg-black border border-white/10 p-5 rounded-2xl space-y-4 group hover:border-yellow-500/50 transition-all">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-black uppercase text-sm mb-1">{b.nome}</div>
                              <div className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest">Tropeiro: {b.lados.__meta.tropeiro_email}</div>
                              <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1">{totalTouros} TOUROS</div>
                            </div>
                            
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleApproveBoiada(b.id, b.lados)} 
                                className="px-3 py-1.5 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 text-[10px] font-black uppercase tracking-wider"
                              >
                                Aprovar
                              </button>
                              <button 
                                onClick={() => handleRejectBoiada(b.id)} 
                                className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 text-[10px] font-black uppercase tracking-wider"
                              >
                                Recusar
                              </button>
                            </div>
                          </div>
                          
                          <div className="space-y-1 text-white/40 text-[10px] font-mono max-h-[100px] overflow-y-auto pr-2 custom-scrollbar">
                            {Object.keys(b.lados || {}).filter(k => k !== '__meta').map(t => {
                              const details = b.lados.__meta.touros_info?.[t] || {};
                              return (
                                <div key={t} className="flex justify-between border-b border-white/5 py-1">
                                  <span>{t}</span>
                                  <span>Giro: {formatSide(details.lado || b.lados[t])} {details.video_url ? '🎥' : ''} {details.foto ? '🖼️' : ''}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <h3 className="font-black italic uppercase text-white mb-6">Banco Oficial</h3>
                <div className="flex-1 overflow-y-auto pr-4 space-y-4 custom-scrollbar">
                  {boiadas.filter(b => !b.lados?.__meta || b.lados.__meta.status !== 'pendente').length === 0 ? (
                    <div className="text-white/30 text-xs font-bold uppercase tracking-widest py-8 text-center">Nenhuma boiada cadastrada</div>
                  ) : (
                    boiadas.filter(b => !b.lados?.__meta || b.lados.__meta.status !== 'pendente').map(b => {
                      const totalTouros = Object.keys(b.lados || {}).filter(k => k !== '__meta').length;
                      return (
                        <div key={b.id} className="bg-black border border-white/10 p-5 rounded-2xl flex justify-between items-center group hover:border-yellow-500/50 transition-all">
                          <div>
                            <div className="font-black uppercase text-sm mb-1">{b.nome}</div>
                            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{totalTouros} TOUROS</div>
                          </div>
                          <button onClick={() => handleDeleteBoiada(b.id, b.nome)} className="p-3 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "eventos" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter mb-10">Eventos Oficiais</h2>
            <div className="grid md:grid-cols-2 gap-8">
              
              <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-sm flex flex-col max-h-[600px] overflow-hidden">
                <h3 className="font-black italic uppercase text-white mb-6">Solicitações de Eventos</h3>
                <div className="flex-1 overflow-y-auto pr-4 mb-6 space-y-4 custom-scrollbar" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
                  {eventos.filter(e => e.status === 'pendente').length === 0 ? (
                    <div className="text-white/30 text-xs font-bold uppercase tracking-widest py-8 text-center">Nenhuma solicitação pendente</div>
                  ) : (
                    eventos.filter(e => e.status === 'pendente').map(e => (
                      <div key={e.id} className="bg-black border border-white/10 p-5 rounded-2xl space-y-4 group hover:border-yellow-500/50 transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-black uppercase text-sm mb-1">{e.nome}</div>
                            <div className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest">Organizador: {e.organizador_email}</div>
                            <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1">{e.local} | {e.data_inicio} - {e.data_fim}</div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleApproveEvento(e.id)} 
                              className="px-3 py-1.5 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 text-[10px] font-black uppercase tracking-wider"
                            >
                              Aprovar
                            </button>
                            <button 
                              onClick={() => handleRejectEvento(e.id)} 
                              className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 text-[10px] font-black uppercase tracking-wider"
                            >
                              Recusar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-sm flex flex-col max-h-[600px] overflow-hidden">
                <h3 className="font-black italic uppercase text-white mb-6">Eventos Aprovados</h3>
                <div className="flex-1 overflow-y-auto pr-4 space-y-4 custom-scrollbar">
                  {eventos.filter(e => e.status === 'aprovado').length === 0 ? (
                    <div className="text-white/30 text-xs font-bold uppercase tracking-widest py-8 text-center">Nenhum evento aprovado</div>
                  ) : (
                    eventos.filter(e => e.status === 'aprovado').map(e => {
                      const portalConfig = (typeof e.detalhes === 'string' ? JSON.parse(e.detalhes) : (e.detalhes || {})).portalConfig || { ordem: '', ocultarDaHome: false };
                      return (
                      <div key={e.id} className="bg-black border border-white/10 p-5 rounded-2xl flex justify-between items-center group hover:border-yellow-500/50 transition-all">
                        <div className="flex-1">
                          <div className="font-black uppercase text-sm mb-1">{e.nome}</div>
                          <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{e.local} | {e.data_inicio}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-3 py-1">
                            <span className="text-[9px] font-black uppercase text-white/40 mr-2">Ordem</span>
                            <input 
                              type="number" 
                              className="w-12 bg-transparent text-white text-xs font-bold outline-none text-center" 
                              placeholder="999"
                              defaultValue={portalConfig.ordem !== 999 ? portalConfig.ordem : ''}
                              onBlur={(ev) => handleUpdateEventConfig(e.id, e.detalhes, 'ordem', ev.target.value ? parseInt(ev.target.value) : 999)}
                            />
                          </div>
                          <button 
                            onClick={() => handleUpdateEventConfig(e.id, e.detalhes, 'ocultarDaHome', !portalConfig.ocultarDaHome)} 
                            className={`p-3 rounded-xl transition-all border ${portalConfig.ocultarDaHome ? 'text-red-500 bg-red-500/10 border-red-500/20 hover:bg-red-500/20' : 'text-green-500 bg-green-500/10 border-green-500/20 hover:bg-green-500/20'}`} 
                            title={portalConfig.ocultarDaHome ? "Oculto no Portal (Clique para Mostrar)" : "Visível no Portal (Clique para Ocultar)"}
                          >
                            {portalConfig.ocultarDaHome ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                          <button 
                            onClick={() => handleUpdateEventConfig(e.id, e.detalhes, 'destaque', !portalConfig.destaque)} 
                            className={`p-3 rounded-xl transition-all border ${portalConfig.destaque ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'text-white/20 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white/50'}`} 
                            title={portalConfig.destaque ? "Remover Destaque da Semana" : "Definir como Destaque da Semana"}
                          >
                            <Star className={`w-5 h-5 ${portalConfig.destaque ? 'fill-current' : ''}`} />
                          </button>
                          <button onClick={() => handleRejectEvento(e.id)} className="p-3 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all" title="Excluir">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )})
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === "keys" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-10">
              <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">Gestão de Chaves</h2>
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                <input 
                  type="text" 
                  placeholder="BUSCAR LICENÇA..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-5 w-full md:w-[350px] outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-black text-xs tracking-widest uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredLicenses.map((l) => {
                const rt = getRemainingTime(l.data_ativacao, l.dias_validos);
                const urgency = !l.data_ativacao ? 'text-white/20' : !rt || rt.total <= 0 ? 'text-red-500' : rt.days < 3 ? 'text-red-400' : rt.days < 7 ? 'text-orange-400' : 'text-emerald-400';
                const timeLabel = !l.data_ativacao
                  ? 'Não ativado'
                  : !rt || rt.total <= 0
                  ? 'EXPIRADO'
                  : rt.days > 0
                  ? `${rt.days}d ${rt.hours}h restantes`
                  : `${rt.hours}h ${rt.minutes}min restantes`;
                const isOnline = l.last_seen ? (new Date().getTime() - new Date(l.last_seen).getTime() < 3 * 60 * 1000) : false;

                return (
                  <div
                    key={l.id}
                    className="group bg-white/5 border border-white/5 p-6 md:p-8 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/10 hover:border-white/10 transition-all backdrop-blur-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                      <div className={`w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-[1rem] md:rounded-[1.5rem] flex items-center justify-center border-2 ${l.is_active ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : 'bg-white/5 border-white/5 text-white/20'}`}>
                        <Key className="w-6 h-6 md:w-7 md:h-7" />
                      </div>
                      <div>
                        <div className="text-sm md:text-base font-black text-white uppercase tracking-wider mb-1 flex items-center gap-3">
                          {l.nome}
                          {isOnline && (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/20 text-green-400 text-[9px] rounded-full uppercase tracking-widest font-black">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                              Online
                            </span>
                          )}
                          {l.app_version && (
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[9px] rounded uppercase tracking-widest font-black border border-purple-500/20">
                              {l.app_version}
                            </span>
                          )}
                          {!l.is_active && <span className="px-2 py-1 bg-red-500/20 text-red-500 text-[8px] rounded uppercase tracking-widest">Desativado</span>}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-4 text-[9px] md:text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mt-2">
                          <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> <span className="truncate max-w-[200px]">{l.email}</span></span>
                          <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {l.whatsapp}</span>
                        </div>
                        <div className={`text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mt-3 ${urgency}`}>
                          <Clock className="w-3 h-3 inline mr-1" />{timeLabel}
                        </div>
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {(!l.esportes ? ["rodeio"] : l.esportes.split(",")).map((sp: string) => (
                            <span 
                              key={sp} 
                              className="text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-lg"
                            >
                              {sp === "3tambores" ? "3 Tambores" : sp === "transmissao" ? "Transmissão" : "Rodeio"}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6 mt-6 md:mt-0 w-full md:w-auto shrink-0">
                      <div className="text-left md:text-right flex-1 sm:flex-none">
                        <div className="text-2xl md:text-3xl font-black font-mono text-yellow-500 leading-none tracking-tighter break-all">{l.key_code}</div>
                        <div className="text-[9px] md:text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mt-2">{l.dias_validos} DIAS</div>
                      </div>
                      <div className="flex gap-3 w-full sm:w-auto">
                        <button onClick={() => sendForceUpdateBroadcast(l.email)} title="Forçar Atualização Remota no Computador do Cliente" className="flex-1 sm:flex-none p-4 md:p-5 bg-black rounded-xl md:rounded-2xl flex justify-center hover:bg-blue-500/20 transition-all border border-white/10 text-white/40 hover:text-blue-500"><Download className="w-5 h-5 md:w-6 md:h-6" /></button>
                        <button onClick={() => setSelectedLicense(l)} title="Informações da Licença" className="flex-1 sm:flex-none p-4 md:p-5 bg-black rounded-xl md:rounded-2xl flex justify-center hover:bg-white/5 transition-all border border-white/10 text-white/40 hover:text-white"><Info className="w-5 h-5 md:w-6 md:h-6" /></button>
                        <button onClick={() => handleDeleteLicense(l.id, l.nome)} title="Excluir Cliente" className="flex-1 sm:flex-none p-4 md:p-5 bg-black rounded-xl md:rounded-2xl flex justify-center hover:bg-red-500/20 transition-all border border-white/10 text-white/40 hover:text-red-500"><Trash2 className="w-5 h-5 md:w-6 md:h-6" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "patrocinios" && selectedSponsorForConfig ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 max-w-3xl">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-yellow-500 font-black text-[10px] md:text-xs uppercase tracking-[0.5em] mb-2">Configurações</p>
                <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase text-white">Editar Patrocinador</h2>
              </div>
              <button 
                onClick={() => setSelectedSponsorForConfig(null)}
                className="bg-white/5 hover:bg-white/10 text-white px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 border border-white/10"
              >
                Voltar à Lista
              </button>
            </div>

            {/* Sub-tab selection */}
            <div className="flex border-b border-white/10 pb-4 mb-6 gap-2 overflow-x-auto">
              {[
                { id: 'contrato', label: 'Dados do Contrato' },
                { id: 'portal', label: 'Portal Notícias' },
                { id: 'app', label: 'Splash App' },
                { id: 'relatorio', label: 'Relatório / Desempenho' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setConfigSubTab(tab.id as any)}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all border ${
                    configSubTab === tab.id
                      ? 'bg-yellow-500 text-black border-yellow-500 shadow-md shadow-yellow-500/10'
                      : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveSponsorEditSubmit} className="bg-white/5 border border-white/10 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] space-y-6 backdrop-blur-xl">
              {configSubTab === 'contrato' && (
                <div className="space-y-6">
                  <InputGroup label="Nome da Empresa" value={editSponsorEmpresa} onChange={setEditSponsorEmpresa} placeholder="Ex: Cerveja Império" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <InputGroup label="Valor do Contrato (R$)" type="number" value={editSponsorValor} onChange={setEditSponsorValor} placeholder="Ex: 5000.00" />
                    <div>
                      <label className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2 block mb-2">Tempo de Contrato (meses)</label>
                      <input 
                        type="number"
                        className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-5 md:px-6 py-4 outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-bold text-xs md:text-sm text-white" 
                        value={editSponsorTempo} 
                        onChange={e => setEditSponsorTempo(e.target.value)} 
                        placeholder="Ex: 12"
                        min="1"
                        required 
                      />
                    </div>
                  </div>
                </div>
              )}

              {configSubTab === 'portal' && (
                <div className="space-y-6">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={editSponsorDetalhes.portal_noticias?.ativo || false} 
                        onChange={(e) => {
                          const det = { ...editSponsorDetalhes };
                          det.portal_noticias = { ...det.portal_noticias, ativo: e.target.checked };
                          setEditSponsorDetalhes(det);
                        }}
                        className="w-4 h-4 accent-yellow-500 rounded border-white/20 bg-black cursor-pointer"
                      />
                      Ativar vinculação no Portal de Notícias
                    </label>
                  </div>

                  {editSponsorDetalhes.portal_noticias?.ativo && (
                    <div className="space-y-8 border-t border-white/5 pt-6 animate-in fade-in duration-300">
                      {/* Fino Redação */}
                      <div className="bg-black/20 border border-white/5 p-5 rounded-2xl space-y-4">
                        <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest">1. Banner Fino (Abaixo do Autor da Matéria) - Recomenda-se 728x90px</h4>
                        <InputGroup 
                          label="Link de Redirecionamento (Fino Redação)" 
                          type="url" 
                          value={editSponsorDetalhes.portal_noticias?.fino_redacao?.click_url || ''} 
                          onChange={(val: any) => {
                            const det = { ...editSponsorDetalhes };
                            det.portal_noticias.fino_redacao.click_url = val;
                            setEditSponsorDetalhes(det);
                          }} 
                          placeholder="Ex: https://imperio.com.br/redacao" 
                          required={false}
                        />
                        <div>
                          <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] ml-2 block mb-2">Upload da Arte</label>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 outline-none text-xs text-white" 
                            onChange={e => handlePhotoUpload(e, (b64) => {
                              const det = { ...editSponsorDetalhes };
                              det.portal_noticias.fino_redacao.logo_url = b64;
                              setEditSponsorDetalhes(det);
                            })} 
                          />
                          {editSponsorDetalhes.portal_noticias?.fino_redacao?.logo_url && (
                            <img src={editSponsorDetalhes.portal_noticias.fino_redacao.logo_url} alt="Fino Redação" className="mt-3 max-h-[60px] object-contain bg-white p-1 rounded" />
                          )}
                        </div>
                      </div>

                      {/* Meio Matéria */}
                      <div className="bg-black/20 border border-white/5 p-5 rounded-2xl space-y-4">
                        <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest">2. Banner do Meio da Matéria (Continua após publicidade) - Recomenda-se 728x90px</h4>
                        <InputGroup 
                          label="Link de Redirecionamento (Meio Matéria)" 
                          type="url" 
                          value={editSponsorDetalhes.portal_noticias?.meio_materia?.click_url || ''} 
                          onChange={(val: any) => {
                            const det = { ...editSponsorDetalhes };
                            det.portal_noticias.meio_materia.click_url = val;
                            setEditSponsorDetalhes(det);
                          }} 
                          placeholder="Ex: https://imperio.com.br/meio" 
                          required={false}
                        />
                        <div>
                          <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] ml-2 block mb-2">Upload da Arte</label>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 outline-none text-xs text-white" 
                            onChange={e => handlePhotoUpload(e, (b64) => {
                              const det = { ...editSponsorDetalhes };
                              det.portal_noticias.meio_materia.logo_url = b64;
                              setEditSponsorDetalhes(det);
                            })} 
                          />
                          {editSponsorDetalhes.portal_noticias?.meio_materia?.logo_url && (
                            <img src={editSponsorDetalhes.portal_noticias.meio_materia.logo_url} alt="Meio Matéria" className="mt-3 max-h-[60px] object-contain bg-white p-1 rounded" />
                          )}
                        </div>
                      </div>

                      {/* Fino IA */}
                      <div className="bg-black/20 border border-white/5 p-5 rounded-2xl space-y-4">
                        <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest">3. Banner Fino Inferior (Acima do aviso de IA) - Recomenda-se 728x90px</h4>
                        <InputGroup 
                          label="Link de Redirecionamento (Fino Rodapé)" 
                          type="url" 
                          value={editSponsorDetalhes.portal_noticias?.fino_ia?.click_url || ''} 
                          onChange={(val: any) => {
                            const det = { ...editSponsorDetalhes };
                            det.portal_noticias.fino_ia.click_url = val;
                            setEditSponsorDetalhes(det);
                          }} 
                          placeholder="Ex: https://imperio.com.br/rodape" 
                          required={false}
                        />
                        <div>
                          <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] ml-2 block mb-2">Upload da Arte</label>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 outline-none text-xs text-white" 
                            onChange={e => handlePhotoUpload(e, (b64) => {
                              const det = { ...editSponsorDetalhes };
                              det.portal_noticias.fino_ia.logo_url = b64;
                              setEditSponsorDetalhes(det);
                            })} 
                          />
                          {editSponsorDetalhes.portal_noticias?.fino_ia?.logo_url && (
                            <img src={editSponsorDetalhes.portal_noticias.fino_ia.logo_url} alt="Fino IA" className="mt-3 max-h-[60px] object-contain bg-white p-1 rounded" />
                          )}
                        </div>
                      </div>

                      {/* Grade Lateral AliExpress */}
                      <div className="bg-black/20 border border-white/5 p-5 rounded-2xl space-y-6">
                        <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest">4. Anúncio Lateral Quadrado</h4>
                        
                        {/* Main Lateral */}
                        <div className="space-y-4">
                          <h5 className="text-[9px] font-black text-white/60 uppercase tracking-wider">Imagem Principal (Recomenda-se 320x280px)</h5>
                          <InputGroup 
                            label="Link Principal" 
                            type="url" 
                            value={editSponsorDetalhes.portal_noticias?.grid_lateral?.main?.click_url || ''} 
                            onChange={(val: any) => {
                              const det = { ...editSponsorDetalhes };
                              det.portal_noticias.grid_lateral.main.click_url = val;
                              setEditSponsorDetalhes(det);
                            }} 
                            placeholder="Ex: https://imperio.com.br/principal" 
                            required={false}
                          />
                          <div>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 outline-none text-xs text-white" 
                              onChange={e => handlePhotoUpload(e, (b64) => {
                                const det = { ...editSponsorDetalhes };
                                det.portal_noticias.grid_lateral.main.logo_url = b64;
                                setEditSponsorDetalhes(det);
                              })} 
                            />
                            {editSponsorDetalhes.portal_noticias?.grid_lateral?.main?.logo_url && (
                              <img src={editSponsorDetalhes.portal_noticias.grid_lateral.main.logo_url} alt="Grid Main" className="mt-2 max-h-[80px] object-contain bg-white p-1 rounded" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {configSubTab === 'app' && (
                <div className="space-y-6">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={editSponsorDetalhes.splash_app?.ativo || false} 
                        onChange={(e) => {
                          const det = { ...editSponsorDetalhes };
                          det.splash_app = { ...det.splash_app, ativo: e.target.checked };
                          setEditSponsorDetalhes(det);
                        }}
                        className="w-4 h-4 accent-yellow-500 rounded border-white/20 bg-black cursor-pointer"
                      />
                      Ativar vinculação no Splash do Aplicativo
                    </label>
                  </div>

                  {editSponsorDetalhes.splash_app?.ativo && (
                    <div className="space-y-6 border-t border-white/5 pt-6 animate-in fade-in duration-300">
                      <InputGroup 
                        label="Link de Redirecionamento (Splash App)" 
                        type="url" 
                        value={editSponsorDetalhes.splash_app?.click_url || ''} 
                        onChange={(val: any) => {
                          const det = { ...editSponsorDetalhes };
                          det.splash_app.click_url = val;
                          setEditSponsorDetalhes(det);
                        }} 
                        placeholder="Ex: https://imperio.com.br/app" 
                      />

                      <div>
                        <label className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2 block mb-2">Posição no Splash (1 a 5)</label>
                        <select 
                          value={editSponsorDetalhes.splash_app?.posicao || 3} 
                          onChange={(e: any) => {
                            const det = { ...editSponsorDetalhes };
                            det.splash_app.posicao = parseInt(e.target.value);
                            setEditSponsorDetalhes(det);
                          }}
                          className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-5 md:px-6 py-4 outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-black text-xs md:text-sm text-yellow-500 uppercase tracking-widest cursor-pointer"
                        >
                          <option value="1">1 - Ponta Esquerda</option>
                          <option value="2">2 - Meio-Esquerda</option>
                          <option value="3">3 - Centro (Meio)</option>
                          <option value="4">4 - Meio-Direita</option>
                          <option value="5">5 - Ponta Direita</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] ml-2 block mb-2">Upload do Logotipo / Splash Banner</label>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 outline-none text-xs text-white" 
                          onChange={e => handlePhotoUpload(e, (b64) => {
                            const det = { ...editSponsorDetalhes };
                            det.splash_app.logo_url = b64;
                            setEditSponsorDetalhes(det);
                          })} 
                        />
                        {editSponsorDetalhes.splash_app?.logo_url && (
                          <div className="mt-4 text-center bg-black/40 border border-white/5 p-4 rounded-xl">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-wider block mb-2">Pré-visualização da Logo (Splash):</span>
                            <img src={editSponsorDetalhes.splash_app.logo_url} alt="Splash Logo Preview" className="mx-auto max-h-[120px] object-contain bg-white p-2 rounded-lg" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {configSubTab === 'relatorio' && (
                <div className="space-y-6">
                  <div className="bg-black/20 border border-white/5 p-6 rounded-3xl text-center space-y-4">
                    <span className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em] block">Total de Visualizações (Impressões)</span>
                    <span className="text-6xl md:text-7xl font-black font-mono leading-none tracking-tighter text-white block">
                      {selectedSponsorForConfig.views_count || 0}
                    </span>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-wider max-w-md mx-auto">
                      Esta métrica representa a soma das exibições do patrocinador em todos os canais (Splash do aplicativo desktop e posições do portal de notícias).
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-black/40 border border-white/10 p-5 rounded-2xl text-center">
                      <span className="text-[8px] font-black text-rose-400 uppercase tracking-[0.2em] block mb-1">Visualizações no Portal</span>
                      <span className="text-2xl font-black font-mono text-white">
                        {editSponsorDetalhes.portal_noticias?.ativo ? "Ativo (Integrado)" : "Inativo"}
                      </span>
                    </div>
                    <div className="bg-black/40 border border-white/10 p-5 rounded-2xl text-center">
                      <span className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em] block mb-1">Visualizações no App</span>
                      <span className="text-2xl font-black font-mono text-white">
                        {editSponsorDetalhes.splash_app?.ativo ? `Ativo (Posição ${editSponsorDetalhes.splash_app.posicao})` : "Inativo"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-5 rounded-2xl font-black text-sm transition-all shadow-xl shadow-yellow-500/20 active:scale-95 disabled:opacity-50" disabled={isSavingSponsorEdit}>
                {isSavingSponsorEdit ? 'Salvando Alterações...' : 'Salvar Alterações'}
              </button>
            </form>
          </div>
        ) : activeTab === "patrocinios" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter mb-6">Patrocinadores</h2>
            
            {/* Action buttons */}
            <div className="flex gap-4">
              <button 
                onClick={() => setIsSponsorModalOpen(true)}
                className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-yellow-500/10"
              >
                <Plus className="w-4 h-4" /> Novo Patrocínio
              </button>
            </div>

            {/* Patrocinadores list */}
            <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-[2rem] backdrop-blur-xl">
              <h3 className="text-lg font-black uppercase tracking-wider text-yellow-500 mb-6">Patrocinadores Ativos ({patrocinios.length})</h3>
              
              {patrocinios.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {patrocinios.map((pat: any) => (
                    <div key={pat.id} className="bg-black/40 border border-white/10 p-5 rounded-2xl flex flex-col justify-between gap-4 hover:border-yellow-500/30 transition-all">
                      <div>
                        <div className="flex items-center gap-4 mb-4">
                          {pat.logo_url || pat.detalhes?.portal_noticias?.fino_redacao?.logo_url || pat.detalhes?.splash_app?.logo_url ? (
                            <img 
                              src={pat.logo_url || pat.detalhes?.portal_noticias?.fino_redacao?.logo_url || pat.detalhes?.splash_app?.logo_url} 
                              alt="Logo" 
                              className="w-14 h-14 object-contain bg-white rounded-lg p-1 shrink-0" 
                            />
                          ) : (
                            <div className="w-14 h-14 bg-white/5 rounded-lg flex items-center justify-center shrink-0 border border-white/10 font-black text-white/40">S</div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-sm text-white truncate">{pat.empresa}</h4>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(pat.detalhes?.portal_noticias?.ativo || pat.tipo === 'portal') && (
                                <span className="text-[8px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">Portal</span>
                              )}
                              {(pat.detalhes?.splash_app?.ativo || pat.tipo === 'app') && (
                                <span className="text-[8px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">Splash App</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-[10px] text-white/50 space-y-1.5 uppercase font-bold tracking-wider">
                          <div><span className="text-white/30">Valor:</span> <span className="text-white">R$ {Number(pat.valor_contrato).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                          <div><span className="text-white/30">Tempo:</span> <span className="text-white">{pat.tempo_contrato} {pat.tempo_contrato === 1 ? 'mês' : 'meses'}</span></div>
                          <div><span className="text-white/30">Visualizações:</span> <span className="text-yellow-500 font-black">{pat.views_count || 0}</span></div>
                          <div>
                            <span className="text-white/30">Artes:</span>{' '}
                            <span className="text-white font-black">
                              {[
                                pat.detalhes?.portal_noticias?.fino_redacao?.logo_url,
                                pat.detalhes?.portal_noticias?.meio_materia?.logo_url,
                                pat.detalhes?.portal_noticias?.fino_ia?.logo_url,
                                pat.detalhes?.portal_noticias?.grid_lateral?.main?.logo_url,
                                pat.detalhes?.splash_app?.logo_url
                              ].filter(Boolean).length} / 5
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-2 pt-3 border-t border-white/5">
                        <button 
                          className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${pat.status === 'ativo' ? 'bg-yellow-500 text-black hover:bg-yellow-400' : 'bg-white/5 text-white/50 hover:bg-white/10'}`} 
                          onClick={() => handleToggleSponsorStatus(pat.id, pat.status)}
                        >
                          {pat.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </button>
                        <button 
                          className="px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all"
                          onClick={() => handleOpenSponsorConfig(pat)}
                        >
                          Configurar
                        </button>
                        <button 
                          className="px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                          onClick={() => handleDeleteSponsor(pat.id)}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/30 text-xs font-bold uppercase tracking-widest text-center py-12 bg-black/20 rounded-2xl border border-white/5">Nenhum patrocinador cadastrado.</p>
              )}
            </div>

            {/* Despesas list */}
            <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-[2rem] backdrop-blur-xl">
              <h3 className="text-lg font-black uppercase tracking-wider text-white mb-6">Histórico de Despesas ({despesas.length})</h3>
              
              {despesas.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[9px] font-black text-white/30 uppercase tracking-widest">
                        <th className="pb-4 font-black">Descrição</th>
                        <th className="pb-4 font-black">Valor</th>
                        <th className="pb-4 font-black">Data</th>
                        <th className="pb-4 font-black text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs text-white/80 font-bold">
                      {despesas.map((exp: any) => (
                        <tr key={exp.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-4">{exp.descricao}</td>
                          <td className="py-4 text-red-400 font-bold">
                            R$ {Number(exp.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 text-white/50">
                            {new Date(exp.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                          </td>
                          <td className="py-4 text-right">
                            <button 
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="px-2.5 py-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 text-[9px] font-black uppercase tracking-wider transition-all"
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-white/30 text-xs font-bold uppercase tracking-widest text-center py-12 bg-black/20 rounded-2xl border border-white/5">Nenhuma despesa registrada.</p>
              )}
            </div>
          </div>
        )}

      {/* MODAL DE CONTROLE MASTER */}
      {selectedLicense && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/95 backdrop-blur-xl overflow-y-auto">
          <div className="bg-[#080808] border border-white/10 p-6 md:p-12 rounded-[2rem] md:rounded-[4rem] max-w-2xl w-full relative shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
            <button onClick={() => setSelectedLicense(null)} className="absolute top-6 right-6 md:top-10 md:right-10 text-white/20 hover:text-white transition-colors bg-white/5 md:bg-transparent rounded-full p-2 md:p-0"><X className="w-6 h-6 md:w-10 md:h-10" /></button>
            
            <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8 mb-10 md:mb-16 text-left mt-8 md:mt-0">
              <div className="w-16 h-16 md:w-24 md:h-24 shrink-0 bg-yellow-500 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-center md:rotate-6 shadow-2xl shadow-yellow-500/20 md:transition-transform md:hover:rotate-0 duration-500">
                <Key className="w-8 h-8 md:w-12 md:h-12 text-black" />
              </div>
              <div>
                <h2 className="text-3xl md:text-5xl font-black tracking-tighter italic leading-none uppercase text-white break-words pr-8">{selectedLicense.nome}</h2>
                <div className="text-yellow-500 font-black tracking-[0.2em] md:tracking-[0.4em] text-[9px] md:text-[10px] mt-4 uppercase opacity-80 break-all">TOKEN: {selectedLicense.key_code}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-10 md:mb-16 text-left">
              <div className="bg-white/5 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-white/10">
                <div className="text-[9px] md:text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">Suporte WhatsApp</div>
                <div className="text-sm md:text-lg font-black flex items-center gap-3 text-white"><MessageCircle className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" /> {selectedLicense.whatsapp}</div>
              </div>
              
              <div className="bg-white/5 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-white/10">
                <div className="text-[9px] md:text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">Gestão de Dias</div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <input 
                    type="number" 
                    value={tempDays}
                    onChange={(e) => setTempDays(parseInt(e.target.value) || 0)}
                    className="bg-black border-2 border-yellow-500/30 rounded-xl px-4 py-3 sm:w-24 text-xl md:text-2xl font-black text-yellow-500 outline-none focus:border-yellow-500 transition-all text-center"
                  />
                  <button 
                    onClick={() => handleUpdateDays(selectedLicense.id, tempDays)}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-3.5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-wider transition-all active:scale-95 flex-1 shadow-lg shadow-yellow-500/10 whitespace-nowrap"
                  >
                    Atualizar
                  </button>
                </div>
              </div>

              <div className="bg-white/5 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-white/10 md:col-span-2">
                <div className="text-[9px] md:text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">Categorias Liberadas</div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 flex-wrap">
                    <label className="flex items-center gap-3 cursor-pointer text-xs md:text-sm font-bold text-white/80 select-none">
                      <input 
                        type="checkbox" 
                        checked={tempSports.includes("rodeio")}
                        onChange={(e) => {
                          if (e.target.checked) setTempSports([...tempSports, "rodeio"]);
                          else setTempSports(tempSports.filter(s => s !== "rodeio"));
                        }}
                        className="w-5 h-5 accent-yellow-500 rounded border-white/20 bg-black cursor-pointer"
                      />
                      Rodeio
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer text-xs md:text-sm font-bold text-white/80 select-none">
                      <input 
                        type="checkbox" 
                        checked={tempSports.includes("3tambores")}
                        onChange={(e) => {
                          if (e.target.checked) setTempSports([...tempSports, "3tambores"]);
                          else setTempSports(tempSports.filter(s => s !== "3tambores"));
                        }}
                        className="w-5 h-5 accent-yellow-500 rounded border-white/20 bg-black cursor-pointer"
                      />
                      3 Tambores
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer text-xs md:text-sm font-bold text-white/80 select-none">
                      <input 
                        type="checkbox" 
                        checked={tempSports.includes("transmissao")}
                        onChange={(e) => {
                          if (e.target.checked) setTempSports([...tempSports, "transmissao"]);
                          else setTempSports(tempSports.filter(s => s !== "transmissao"));
                        }}
                        className="w-5 h-5 accent-yellow-500 rounded border-white/20 bg-black cursor-pointer"
                      />
                      Transmissão
                    </label>
                  </div>
                  <button 
                    onClick={() => handleUpdateSports(selectedLicense.id, tempSports)}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3.5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-yellow-500/10 w-full sm:w-auto"
                  >
                    Salvar
                  </button>
                </div>
              </div>

              <div className="bg-white/5 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-white/10 md:col-span-2">
                <div className="text-[9px] md:text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">Descrição Interna</div>
                <div className="text-xs md:text-sm font-bold text-white/40 italic break-words">{selectedLicense.descricao || "Nenhum detalhe adicional registrado."}</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => handleToggleActive(selectedLicense.id, selectedLicense.is_active)}
                className={`w-full py-5 md:py-6 rounded-[1rem] md:rounded-[1.5rem] font-black text-[10px] md:text-xs tracking-[0.2em] flex items-center justify-center gap-3 transition-all uppercase ${selectedLicense.is_active ? 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10' : 'bg-yellow-500 text-black border border-yellow-500/20'}`}
              >
                {selectedLicense.is_active ? <><Pause className="w-4 h-4 fill-current" /> Pausar Acesso</> : <><Play className="w-4 h-4 fill-current" /> Retomar Acesso</>}
              </button>
              
              <button 
                onClick={() => handleGenerateAdditionalKey(selectedLicense)}
                className="w-full py-5 md:py-6 rounded-[1rem] md:rounded-[1.5rem] font-black text-[10px] md:text-xs tracking-[0.2em] flex items-center justify-center gap-3 transition-all uppercase bg-yellow-500 text-black hover:bg-yellow-400 border border-yellow-500/20 shadow-lg shadow-yellow-500/10"
              >
                <Plus className="w-4 h-4" /> Gerar Chave Adicional
              </button>
            </div>
          </div>
        </div>
      )}

        {activeTab === "competidores" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter mb-8 mt-4">Competidores & Animais</h2>
            
            {/* Action buttons */}
            <div className="flex gap-4 flex-wrap mb-6">
              <button onClick={() => setIsNewCompetidorModalOpen(true)} className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-yellow-500/10 active:scale-95 flex items-center gap-2">
                + CADASTRAR COMPETIDOR
              </button>
              <button onClick={() => setIsNewTouroModalOpen(true)} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2">
                + CADASTRAR NOVO TOURO
              </button>
              <button onClick={() => setIsManualEventModalOpen(true)} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2">
                + CRIAR NOVO EVENTO MANUAL
              </button>
            </div>

            {/* Search Box */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-sm mb-8">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1 block mb-3">Pesquisar Competidor (Nome ou CPF), Touro ou Cia</label>
              <input 
                type="text" 
                value={relSearchQuery} 
                onChange={e => handleRelationalSearch(e.target.value)} 
                placeholder="Digite o nome do peão, CPF (apenas números), nome do touro ou nome da Cia..." 
                className="w-full bg-black border border-white/10 rounded-2xl p-4 font-bold text-sm outline-none focus:border-yellow-500 transition-all text-white"
              />
            </div>

            {/* Search Results */}
            {!selectedCompetidor && !selectedTouro && !selectedCia && relSearchQuery.trim() !== '' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Competidores Results */}
                <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-sm">
                  <h3 className="font-black italic uppercase text-yellow-500 mb-6 pb-2 border-b border-white/10">Competidores ({relSearchResultCompetidores.length})</h3>
                  {relSearchResultCompetidores.length > 0 ? (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {relSearchResultCompetidores.map(c => (
                        <div 
                          key={c.id} 
                          onClick={() => handleSelectCompetidor(c)}
                          className="p-4 bg-black/40 border border-white/10 rounded-2xl hover:border-yellow-500 cursor-pointer transition-all"
                        >
                          <strong className="text-white text-sm uppercase">{c.nome}</strong>
                          <div className="text-[10px] text-white/40 mt-1 uppercase">
                            CPF: {c.cpf || 'Não informado'} | Cidade: {c.cidade || 'Não informada'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-white/30 font-bold uppercase tracking-wider">Nenhum competidor encontrado.</p>}
                </div>

                {/* Touros Results */}
                <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-sm">
                  <h3 className="font-black italic uppercase text-yellow-500 mb-6 pb-2 border-b border-white/10">Touros ({relSearchResultTouros.length})</h3>
                  {relSearchResultTouros.length > 0 ? (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {relSearchResultTouros.map(t => (
                        <div 
                          key={t.id} 
                          onClick={() => handleSelectTouro(t)}
                          className="p-4 bg-black/40 border border-white/10 rounded-2xl hover:border-yellow-500 cursor-pointer transition-all"
                        >
                          <strong className="text-white text-sm uppercase">{t.nome}</strong>
                          <div className="text-[10px] text-white/40 mt-1 uppercase">
                            Cia: {t.cia} | Lado: {t.lado || 'Não informado'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-white/30 font-bold uppercase tracking-wider">Nenhum touro encontrado.</p>}
                </div>

                {/* Cias Results */}
                <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-sm">
                  <h3 className="font-black italic uppercase text-yellow-500 mb-6 pb-2 border-b border-white/10">Cias / Tropeiros ({relSearchResultCias.length})</h3>
                  {relSearchResultCias.length > 0 ? (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {relSearchResultCias.map(cia => (
                        <div 
                          key={cia.id} 
                          onClick={() => handleSelectCia(cia)}
                          className="p-4 bg-black/40 border border-white/10 rounded-2xl hover:border-yellow-500 cursor-pointer transition-all"
                        >
                          <strong className="text-white text-sm uppercase">{cia.nome}</strong>
                          <div className="text-[10px] text-white/40 mt-1 uppercase">Clique para ver os touros</div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-white/30 font-bold uppercase tracking-wider">Nenhuma Cia encontrada.</p>}
                </div>

              </div>
            )}

            {/* Selected Competidor Profile */}
            {selectedCompetidor && (
              <div className="bg-white/5 border border-white/10 p-8 md:p-10 rounded-[2rem] backdrop-blur-sm">
                <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-white/10 pb-6 mb-8">
                  <div>
                    <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Ficha do Competidor</span>
                    <h3 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter mt-1">{selectedCompetidor.nome}</h3>
                    <p className="text-xs font-bold text-white/40 uppercase tracking-wider mt-2">
                      CPF: {selectedCompetidor.cpf || 'Não informado'} | Cidade: {selectedCompetidor.cidade || 'Não informada'}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => openManualRideModal(null, selectedCompetidor.id, null)} className="bg-yellow-500 hover:bg-yellow-400 text-black px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all">
                      + Cadastrar Montaria
                    </button>
                    <button onClick={() => setSelectedCompetidor(null)} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all">
                      Voltar
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="font-black italic uppercase text-lg text-white mb-6">Histórico de Montarias ({relHistory.length})</h4>
                  {relHistory.length > 0 ? (
                    (() => {
                      const eventsMap = new Map<number, { event: any, rides: any[] }>();
                      relHistory.forEach(ride => {
                        if (!ride.rel_eventos) return;
                        const evId = ride.rel_eventos.id;
                        if (!eventsMap.has(evId)) {
                          eventsMap.set(evId, { event: ride.rel_eventos, rides: [] });
                        }
                        eventsMap.get(evId)!.rides.push(ride);
                      });

                      return Array.from(eventsMap.values()).map(({ event, rides }) => (
                        <div key={event.id} className="bg-black/40 border border-white/10 rounded-[1.5rem] p-6 space-y-4">
                          <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <div>
                              <h5 className="font-black uppercase tracking-wider text-yellow-500">{event.nome}</h5>
                              <span className="text-[10px] font-bold text-white/30 uppercase">Cidade: {event.cidade} | Data: {event.data}</span>
                            </div>
                            <button onClick={() => openManualRideModal(event.id, selectedCompetidor.id, null)} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all">
                              + Adicionar Montaria
                            </button>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="text-white/40 uppercase font-black border-b border-white/10">
                                  <th className="pb-3">Round</th>
                                  <th className="pb-3">Touro / Cia</th>
                                  <th className="pb-3">Tempo</th>
                                  <th className="pb-3">Notas (Peão / Touro)</th>
                                  <th className="pb-3">Total</th>
                                  <th className="pb-3">Status</th>
                                  <th className="pb-3 text-right">Ações</th>
                                </tr>
                              </thead>
                              <tbody className="font-bold text-white/80">
                                {rides.map(r => (
                                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                                    <td className="py-3">{r.dia}</td>
                                    <td className="py-3">
                                      {r.rel_touros ? (
                                        <span onClick={() => handleSelectTouro(r.rel_touros)} className="text-yellow-500 cursor-pointer hover:underline">
                                          {r.rel_touros.nome}
                                        </span>
                                      ) : 'Desconhecido'}
                                      <div className="text-[9px] text-white/30 uppercase mt-0.5">Cia: {r.rel_touros?.cia || 'Desconhecida'}</div>
                                    </td>
                                    <td className="py-3">{r.tempo != null ? `${r.tempo}s` : '-'}</td>
                                    <td className="py-3">
                                      P: {r.j1_peao} / {r.j2_peao} | T: {r.j1_touro} / {r.j2_touro}
                                    </td>
                                    <td className="py-3 text-yellow-500">{r.nota_final} pts</td>
                                    <td className="py-3 uppercase text-[10px]">
                                      <span className={r.status === 'ativa' ? 'text-green-500' : 'text-red-500'}>{r.status}</span>
                                    </td>
                                    <td className="py-3 text-right">
                                      <button 
                                        onClick={() => handleDeleteRide(r.id, event.nome)}
                                        className="px-2 py-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 text-[9px] font-black uppercase tracking-wider transition-all"
                                      >
                                        Excluir
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ));
                    })()
                  ) : <p className="text-xs text-white/30 font-bold uppercase tracking-wider py-4">Nenhuma montaria registrada.</p>}
                </div>
              </div>
            )}

            {/* Selected Touro Profile */}
            {selectedTouro && (
              <div className="bg-white/5 border border-white/10 p-8 md:p-10 rounded-[2rem] backdrop-blur-sm">
                <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-white/10 pb-6 mb-8">
                  <div>
                    <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Ficha do Touro</span>
                    <h3 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter mt-1">{selectedTouro.nome}</h3>
                    <p className="text-xs font-bold text-white/40 uppercase tracking-wider mt-2">
                      Cia: {selectedTouro.cia} | Lado: {selectedTouro.lado || 'Não informado'}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => openManualRideModal(null, null, selectedTouro.id)} className="bg-yellow-500 hover:bg-yellow-400 text-black px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all">
                      + Cadastrar Montaria
                    </button>
                    <button onClick={() => setSelectedTouro(null)} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all">
                      Voltar
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="font-black italic uppercase text-lg text-white mb-6">Montarias nesse Touro ({relHistory.length})</h4>
                  {relHistory.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-white/40 uppercase font-black border-b border-white/10">
                            <th className="pb-3">Evento</th>
                            <th className="pb-3">Competidor</th>
                            <th className="pb-3">Round</th>
                            <th className="pb-3">Tempo</th>
                            <th className="pb-3">Nota Final</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="font-bold text-white/80">
                          {relHistory.map(r => (
                            <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                              <td className="py-3">
                                <div className="text-white">{r.rel_eventos?.nome}</div>
                                <div className="text-[9px] text-white/30 uppercase mt-0.5">{r.rel_eventos?.cidade}</div>
                              </td>
                              <td className="py-3">
                                {r.rel_competidores ? (
                                  <span onClick={() => handleSelectCompetidor(r.rel_competidores)} className="text-yellow-500 cursor-pointer hover:underline">
                                    {r.rel_competidores.nome}
                                  </span>
                                ) : 'Desconhecido'}
                                <div className="text-[9px] text-white/30 mt-0.5">CPF: {r.rel_competidores?.cpf || '-'}</div>
                              </td>
                              <td className="py-3">{r.dia}</td>
                              <td className="py-3">{r.tempo != null ? `${r.tempo}s` : '-'}</td>
                              <td className="py-3 text-yellow-500">{r.nota_final} pts</td>
                              <td className="py-3 uppercase text-[10px]">
                                <span className={r.status === 'ativa' ? 'text-green-500' : 'text-red-500'}>{r.status}</span>
                              </td>
                              <td className="py-3 text-right">
                                <button 
                                  onClick={() => handleDeleteRide(r.id, r.rel_eventos?.nome)}
                                  className="px-2 py-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 text-[9px] font-black uppercase tracking-wider transition-all"
                                >
                                  Excluir
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <p className="text-xs text-white/30 font-bold uppercase tracking-wider py-4">Nenhuma montaria registrada.</p>}
                </div>
              </div>
            )}

            {/* Selected Cia View */}
            {selectedCia && (
              <div className="bg-white/5 border border-white/10 p-8 md:p-10 rounded-[2rem] backdrop-blur-sm">
                <div className="flex justify-between items-center border-b border-white/10 pb-6 mb-8">
                  <div>
                    <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Companhia de Rodeio</span>
                    <h3 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter mt-1">{selectedCia.nome}</h3>
                  </div>
                  <button onClick={() => setSelectedCia(null)} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all">
                    Voltar
                  </button>
                </div>

                <div>
                  <h4 className="font-black italic uppercase text-lg text-white mb-6">Touros Associados ({ciaBulls.length})</h4>
                  {ciaBulls.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                      {ciaBulls.map(b => (
                        <div 
                          key={b.id} 
                          onClick={() => handleSelectTouro(b)}
                          className="p-6 bg-black/40 border border-white/10 rounded-2xl hover:border-yellow-500 cursor-pointer transition-all"
                        >
                          <h5 className="font-black uppercase tracking-wider text-yellow-500 text-sm">{b.nome}</h5>
                          <span className="text-[10px] font-bold text-white/30 mt-1 block">Lado: {b.lado || 'Não informado'}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-white/30 font-bold uppercase tracking-wider">Nenhum touro associado a esta Cia.</p>}
                </div>
              </div>
            )}

          </div>
        )}
      </main>

      {/* Manual Event Registration Modal */}
      {isManualEventModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/95 backdrop-blur-xl overflow-y-auto">
          <div className="bg-[#080808] border border-white/10 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] max-w-md w-full relative shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
            <button className="absolute top-6 right-6 md:top-8 md:right-8 text-white/20 hover:text-white transition-colors bg-white/5 md:bg-transparent rounded-full p-2 font-bold text-xl" onClick={() => setIsManualEventModalOpen(false)}>×</button>
            <h2 className="text-2xl md:text-3xl font-black mb-6 uppercase italic tracking-tighter text-yellow-500">Novo Evento Manual</h2>
            <form onSubmit={handleCreateManualEvent} className="space-y-6">
              <InputGroup label="Nome do Evento" value={manualEventName} onChange={setManualEventName} placeholder="Ex: RODEIO DE COLORADO" />
              <InputGroup label="Cidade / Estado" value={manualEventCidade} onChange={setManualEventCidade} placeholder="Ex: COLORADO - PR" />
              <InputGroup label="Data" value={manualEventData} onChange={setManualEventData} placeholder="Ex: 23/06/2026" required={false} />
              
              <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-5 rounded-2xl font-black text-sm transition-all shadow-xl shadow-yellow-500/20 active:scale-95">
                Criar Evento
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manual Ride Registration Modal */}
      {isManualRideModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/95 backdrop-blur-xl overflow-y-auto">
          <div className="bg-[#080808] border border-white/10 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] max-w-xl w-full relative shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
            <button className="absolute top-6 right-6 md:top-8 md:right-8 text-white/20 hover:text-white transition-colors bg-white/5 md:bg-transparent rounded-full p-2 font-bold text-xl" onClick={() => setIsManualRideModalOpen(false)}>×</button>
            <h2 className="text-2xl md:text-3xl font-black mb-6 uppercase italic tracking-tighter text-yellow-500">Cadastrar Montaria</h2>
            <form onSubmit={handleCreateManualRide} className="space-y-6">
              
              <div>
                <label className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2 block mb-2">Evento</label>
                <select 
                  className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-bold text-xs md:text-sm text-white" 
                  value={manualRideEventId || ''} 
                  onChange={e => setManualRideEventId(Number(e.target.value) || null)}
                  required
                >
                  <option value="">-- Selecione o Evento --</option>
                  {allRelEvents.map(e => (
                    <option key={e.id} value={e.id}>{e.nome} ({e.cidade})</option>
                  ))}
                </select>
              </div>

              {!selectedCompetidor && (
                <InputGroup label="Nome do Competidor" value={manualRideCompetidorNome} onChange={setManualRideCompetidorNome} placeholder="Ex: GABRIEL HENRIQUE" />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <InputGroup label="Nome do Touro" value={manualRideTouroNome} onChange={setManualRideTouroNome} placeholder="Ex: ACESSO NEGADO" />
                <InputGroup label="Cia / Tropeiro" value={manualRideCiaNome} onChange={setManualRideCiaNome} placeholder="Ex: TERCIO MIRANDA" />
              </div>

              <div>
                <label className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2 block mb-2">Escalado no Evento (Status do Touro)</label>
                <select 
                  className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-bold text-xs md:text-sm text-white" 
                  value={manualRideEscaladoNoEvento} 
                  onChange={e => setManualRideEscaladoNoEvento(e.target.value)}
                >
                  <option value="">-- Automático / Nenhum --</option>
                  {allRelEvents.map(e => (
                    <option key={e.id} value={e.nome}>{e.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <InputGroup label="Round / Dia" value={rideDia} onChange={setRideDia} placeholder="Ex: DIA 1" />
                <InputGroup label="Tempo (s)" type="number" value={rideTempo} onChange={setRideTempo} />
                <div>
                  <label className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2 block mb-2">Status</label>
                  <select 
                    className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-bold text-xs md:text-sm text-white" 
                    value={rideStatus} 
                    onChange={e => setRideStatus(e.target.value)}
                  >
                    <option value="ativa">Parada (8s)</option>
                    <option value="queda">Queda</option>
                  </select>
                </div>
              </div>

              <div className="bg-black/30 border border-white/10 p-6 rounded-2xl space-y-4">
                <h4 className="font-black uppercase tracking-wider text-yellow-500 text-xs">Notas dos Juízes</h4>
                
                <div className="grid grid-cols-2 gap-6">
                  <InputGroup label="J1 - Nota Peão" type="number" value={rideJ1Peao} onChange={setRideJ1Peao} />
                  <InputGroup label="J1 - Nota Touro" type="number" value={rideJ1Touro} onChange={setRideJ1Touro} />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <InputGroup label="J2 - Nota Peão" type="number" value={rideJ2Peao} onChange={setRideJ2Peao} />
                  <InputGroup label="J2 - Nota Touro" type="number" value={rideJ2Touro} onChange={setRideJ2Touro} />
                </div>
              </div>

              <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-5 rounded-2xl font-black text-sm transition-all shadow-xl shadow-yellow-500/20 active:scale-95">
                Salvar Montaria
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create New Competidor Modal */}
      {isNewCompetidorModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/95 backdrop-blur-xl overflow-y-auto">
          <div className="bg-[#080808] border border-white/10 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] max-w-md w-full relative shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
            <button className="absolute top-6 right-6 md:top-8 md:right-8 text-white/20 hover:text-white transition-colors bg-white/5 md:bg-transparent rounded-full p-2 font-bold text-xl" onClick={() => setIsNewCompetidorModalOpen(false)}>×</button>
            <h2 className="text-2xl md:text-3xl font-black mb-6 uppercase italic tracking-tighter text-yellow-500">Novo Competidor</h2>
            <form onSubmit={handleCreateCompetidor} className="space-y-6">
              <InputGroup label="Nome Completo" value={newCompetidorNome} onChange={setNewCompetidorNome} placeholder="Ex: ADRIANO MORAES" />
              <InputGroup label="CPF (Apenas números)" value={newCompetidorCpf} onChange={setNewCompetidorCpf} placeholder="Ex: 12345678901" required={false} />
              <InputGroup label="Cidade de Origem" value={newCompetidorCidade} onChange={setNewCompetidorCidade} placeholder="Ex: QUINTANA - SP" required={false} />
              
              <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-5 rounded-2xl font-black text-sm transition-all shadow-xl shadow-yellow-500/20 active:scale-95">
                Salvar Competidor
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create New Touro Modal */}
      {isNewTouroModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/95 backdrop-blur-xl overflow-y-auto">
          <div className="bg-[#080808] border border-white/10 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] max-w-md w-full relative shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
            <button className="absolute top-6 right-6 md:top-8 md:right-8 text-white/20 hover:text-white transition-colors bg-white/5 md:bg-transparent rounded-full p-2 font-bold text-xl" onClick={() => setIsNewTouroModalOpen(false)}>×</button>
            <h2 className="text-2xl md:text-3xl font-black mb-6 uppercase italic tracking-tighter text-yellow-500">Novo Touro</h2>
            <form onSubmit={handleCreateTouro} className="space-y-6">
              <InputGroup label="Nome do Touro" value={newTouroNome} onChange={setNewTouroNome} placeholder="Ex: ACESSO NEGADO" />
              <InputGroup label="Cia / Proprietário" value={newTouroCia} onChange={setNewTouroCia} placeholder="Ex: TERCIO MIRANDA" />
              <div>
                <label className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2 block mb-2">Lado Preferido de Giro</label>
                <select 
                  className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-bold text-xs md:text-sm text-white" 
                  value={newTouroLado} 
                  onChange={e => setNewTouroLado(e.target.value)}
                >
                  <option value="Esquerdo">Esquerdo</option>
                  <option value="Direito">Direito</option>
                  <option value="Indefinido">Indefinido</option>
                </select>
              </div>
              
              <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-5 rounded-2xl font-black text-sm transition-all shadow-xl shadow-yellow-500/20 active:scale-95">
                Salvar Touro
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Novo Patrocínio Modal */}
      {isSponsorModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/95 backdrop-blur-xl overflow-y-auto">
          <div className="bg-[#080808] border border-white/10 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] max-w-xl w-full relative shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
            <button className="absolute top-6 right-6 md:top-8 md:right-8 text-white/20 hover:text-white transition-colors bg-white/5 md:bg-transparent rounded-full p-2 font-bold text-xl" onClick={() => setIsSponsorModalOpen(false)}>×</button>
            <h2 className="text-2xl md:text-3xl font-black mb-6 uppercase italic tracking-tighter text-yellow-500">Novo Patrocinador</h2>
            <form onSubmit={handleSaveSponsorSubmit} className="space-y-6">
              <InputGroup label="Nome da Empresa" value={sponsorEmpresa} onChange={setSponsorEmpresa} placeholder="Ex: Cerveja Império" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <InputGroup label="Valor do Contrato (R$)" type="number" value={sponsorValor} onChange={setSponsorValor} placeholder="Ex: 5000.00" />
                <div>
                  <label className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2 block mb-2">Tempo de Contrato (meses)</label>
                  <input 
                    type="number"
                    className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-5 md:px-6 py-4 outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-bold text-xs md:text-sm text-white" 
                    value={sponsorTempo} 
                    onChange={e => setSponsorTempo(e.target.value)} 
                    placeholder="Ex: 12"
                    min="1"
                    required 
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-5 rounded-2xl font-black text-sm transition-all shadow-xl shadow-yellow-500/20 active:scale-95 disabled:opacity-50" disabled={isSavingSponsor}>
                {isSavingSponsor ? 'Salvando...' : 'Confirmar Patrocínio'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Nova Despesa Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/95 backdrop-blur-xl overflow-y-auto">
          <div className="bg-[#080808] border border-white/10 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] max-w-lg w-full relative shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
            <button className="absolute top-6 right-6 md:top-8 md:right-8 text-white/20 hover:text-white transition-colors bg-white/5 md:bg-transparent rounded-full p-2 font-bold text-xl" onClick={() => setIsExpenseModalOpen(false)}>×</button>
            <h2 className="text-2xl md:text-3xl font-black mb-6 uppercase italic tracking-tighter text-yellow-500">Registrar Despesa</h2>
            <form onSubmit={handleSaveExpenseSubmit} className="space-y-6">
              <InputGroup label="Descrição / Finalidade" value={expenseDesc} onChange={setExpenseDesc} placeholder="Ex: Aluguel de geradores para etapa" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <InputGroup label="Valor (R$)" type="number" value={expenseValor} onChange={setExpenseValor} placeholder="Ex: 1500.00" />
                <div>
                  <label className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2 block mb-2">Data de Lançamento</label>
                  <input 
                    type="date"
                    className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-5 md:px-6 py-4 outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-bold text-xs md:text-sm text-white" 
                    value={expenseData} 
                    onChange={e => setExpenseData(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-5 rounded-2xl font-black text-sm transition-all shadow-xl shadow-yellow-500/20 active:scale-95 disabled:opacity-50" disabled={isSavingExpense}>
                {isSavingExpense ? 'Salvando...' : 'Confirmar Despesa'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TopNavBtn({ icon, label, active, onClick, fullWidth = false }: any) {
  return (
    <button 
      onClick={onClick}
      className={`${fullWidth ? 'w-full' : ''} flex items-center gap-2 md:gap-3 px-4 py-3 md:px-6 md:py-3 rounded-[1.25rem] font-black text-[10px] md:text-xs uppercase tracking-[0.1em] md:tracking-[0.2em] transition-all duration-300 active:scale-95 ${active ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20 scale-105' : 'text-white/60 hover:bg-white/10 hover:text-white backdrop-blur-md bg-white/5 border border-white/5'}`}
    >
      {icon} {label}
    </button>
  );
}

function DashboardCard({ title, icon, items, emptyMsg }: any) {
  return (
    <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-[2rem] backdrop-blur-3xl shadow-2xl transition-all duration-300 hover:bg-white/10 hover:border-white/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 shadow-inner">
          {icon}
        </div>
        <h3 className="font-black italic uppercase tracking-tighter text-lg md:text-xl text-yellow-500">{title}</h3>
      </div>
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="text-white/30 text-xs font-bold uppercase tracking-widest py-8 text-center bg-black/20 rounded-2xl border border-white/5">{emptyMsg}</div>
        ) : (
          items.map((item: any, i: number) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 gap-2 hover:bg-black/60 transition-all">
              <span className="font-bold text-xs uppercase tracking-wider truncate max-w-[150px] md:max-w-[200px] text-white/90">{item.nome}</span>
              <span className="text-[9px] font-black bg-yellow-500/10 text-yellow-500 px-3 py-1.5 rounded-xl uppercase tracking-widest border border-yellow-500/20">{item.key_code}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function InputGroup({ label, placeholder, value, onChange, type = "text", required = true }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2 block mb-2">{label}</label>
      <input 
        type={type} 
        placeholder={placeholder} 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-5 md:px-6 py-4 outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-bold text-xs md:text-sm placeholder:text-white/20 text-white shadow-inner hover:bg-black/60 focus:bg-black/80"
        required={required}
      />
    </div>
  );
}
