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
  ChevronRight
} from "lucide-react";

export default function AdminDashboard() {
  const [session, setSession] = useState<any>(null);
  const [authStep, setAuthStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile menu toggle
  const [licenses, setLicenses] = useState<any[]>([]);
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
      const interval = setInterval(fetchLicenses, 15000);
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
    <div className="min-h-screen bg-black text-white font-sans selection:bg-yellow-500 selection:text-black flex flex-col md:flex-row overflow-hidden">
      
      {/* Mobile Header (Hambúrguer) */}
      <div className="md:hidden flex items-center justify-between p-6 border-b border-white/10 bg-black/90 backdrop-blur-md z-40">
        <img src="/header_logo.png" alt="RODEOAPP Logo" className="h-8 object-contain" />
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-yellow-500 p-2 bg-yellow-500/10 rounded-xl">
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static inset-y-0 left-0 w-72 md:w-80 bg-black/95 md:bg-white/5 border-r border-white/10 flex flex-col p-8 backdrop-blur-xl transition-transform duration-300 z-50`}>
        <div className="hidden md:flex flex-col items-start gap-3 mb-16">
           <img src="/header_logo.png" alt="RODEOAPP Logo" className="h-10 object-contain" />
           <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em] ml-1">Admin Pro</p>
        </div>

        <nav className="flex-1 space-y-3 mt-10 md:mt-0">
          <SidebarLink icon={<LayoutDashboard className="w-5 h-5" />} label="DASHBOARD" active={activeTab === "dashboard"} onClick={() => { setActiveTab("dashboard"); setIsSidebarOpen(false); }} />
          <SidebarLink icon={<UserPlus className="w-5 h-5" />} label="NOVO CLIENTE" active={activeTab === "new"} onClick={() => { setActiveTab("new"); setIsSidebarOpen(false); }} />
          <SidebarLink icon={<Key className="w-5 h-5" />} label="GERENCIAR CHAVES" active={activeTab === "keys"} onClick={() => { setActiveTab("keys"); setIsSidebarOpen(false); }} />
        </nav>

        <div className="mt-auto pt-8 border-t border-white/10 space-y-4">
          <div className="bg-black/50 rounded-2xl p-4 border border-white/10 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-500 to-yellow-700 border border-white/20" />
            <div className="overflow-hidden">
              <div className="text-[10px] font-black text-white/30 uppercase truncate w-32">{session.user.email}</div>
              <div className="text-[11px] text-yellow-500 font-black uppercase tracking-widest">MASTER OWNER</div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center md:justify-start gap-3 px-6 py-4 rounded-xl font-black text-[10px] text-white/30 hover:text-red-500 hover:bg-red-500/10 transition-all uppercase tracking-[0.2em]">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar relative z-0">
        
        {/* Overlay do Mobile */}
        {isSidebarOpen && <div className="md:hidden fixed inset-0 bg-black/60 z-30" onClick={() => setIsSidebarOpen(false)} />}

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
                        <div className="text-xl md:text-2xl font-black uppercase tracking-tighter text-white break-words">{l.nome}</div>
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
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 md:gap-12 mt-4 md:mt-0 pt-4 md:pt-0 border-t border-white/5 md:border-none w-full md:w-auto">
                      <div className="text-left md:text-right flex-1 sm:flex-none">
                        <div className="text-2xl md:text-3xl font-black font-mono text-yellow-500 leading-none tracking-tighter break-all">{l.key_code}</div>
                        <div className="text-[9px] md:text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mt-2">{l.dias_validos} DIAS</div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button onClick={() => setSelectedLicense(l)} className="flex-1 sm:flex-none p-4 md:p-5 bg-black rounded-xl md:rounded-2xl flex justify-center hover:bg-white/5 transition-all border border-white/10 text-white/40 hover:text-white"><Info className="w-5 h-5 md:w-6 md:h-6" /></button>
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

function SidebarLink({ icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${active ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
    >
      {icon} {label}
    </button>
  );
}

function DashboardCard({ title, icon, items, emptyMsg }: any) {
  return (
    <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-[2rem] backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-6">
        {icon}
        <h3 className="font-black italic uppercase tracking-tighter text-lg md:text-xl text-yellow-500">{title}</h3>
      </div>
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="text-white/30 text-xs font-bold uppercase tracking-widest py-8 text-center">{emptyMsg}</div>
        ) : (
          items.map((item: any, i: number) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-black/50 rounded-xl border border-white/5 gap-2">
              <span className="font-bold text-xs uppercase tracking-wider truncate max-w-[150px] md:max-w-[200px]">{item.nome}</span>
              <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">{item.key_code}</span>
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
      <label className="text-[9px] md:text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1 block mb-3">{label}</label>
      <input 
        type={type} 
        placeholder={placeholder} 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black border border-white/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-4 outline-none focus:ring-2 focus:ring-yellow-500 transition-all font-bold text-xs md:text-sm placeholder:text-white/20"
        required
      />
    </div>
  );
}
