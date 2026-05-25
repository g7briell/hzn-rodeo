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
  EyeOff
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
      const interval = setInterval(() => {
        fetchLicenses();
        fetchBoiadas();
        fetchEventos();
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

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const newKey = `APP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + formData.plano);
    const validadeStr = expiryDate.toLocaleDateString('pt-BR');

    const { error } = await supabase.from("licencas").insert([{
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
        }
      });
    } catch (e) {
      console.error(e);
      alert("Erro ao enviar comando.");
    }
  };

  const handleUpdateSports = async (id: string, sports: string[]) => {
    const sportsStr = sports.join(",");
    const { error } = await supabase.from("licencas").update({ esportes: sportsStr }).eq("id", id);
      
    if (!error) {
      setSelectedLicense({ ...selectedLicense, esportes: sportsStr });
      fetchLicenses();
      if (selectedLicense && selectedLicense.email) sendLicenseBroadcast(selectedLicense.email);
      alert("Esportes atualizados com sucesso!");
    } else {
      alert("Erro ao atualizar: " + error.message);
    }
  };

  const handleUpdateDays = async (id: string, newDays: number) => {
    const nowISO = new Date().toISOString();
    const { error } = await supabase.from("licencas")
      .update({ dias_validos: newDays, data_ativacao: nowISO })
      .eq("id", id);

    if (!error) {
      setSelectedLicense({ ...selectedLicense, dias_validos: newDays, data_ativacao: nowISO });
      fetchLicenses();
      if (selectedLicense && selectedLicense.email) sendLicenseBroadcast(selectedLicense.email);
      alert(`Atualizado! Cronômetro reiniciado com ${newDays} dias.`);
    } else {
      alert("Erro ao atualizar dias: " + error.message);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from("licencas").update({ is_active: !currentStatus }).eq("id", id);
    if (!error) {
      setSelectedLicense(selectedLicense ? { ...selectedLicense, is_active: !currentStatus } : null);
      fetchLicenses();
      if (selectedLicense && selectedLicense.email) sendLicenseBroadcast(selectedLicense.email);
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
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1 block">Liberar Esportes</label>
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 bg-black border border-white/10 rounded-2xl p-6">
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
                              {sp === "3tambores" ? "3 Tambores" : "Rodeio"}
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
      </main>

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
                <div className="text-[9px] md:text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">Esportes Liberados</div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
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
            </div>
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

function InputGroup({ label, placeholder, value, onChange, type = "text" }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2 block mb-2">{label}</label>
      <input 
        type={type} 
        placeholder={placeholder} 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-5 md:px-6 py-4 outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-bold text-xs md:text-sm placeholder:text-white/20 text-white shadow-inner hover:bg-black/60 focus:bg-black/80"
        required
      />
    </div>
  );
}
