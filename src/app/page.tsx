"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { 
  LayoutDashboard, 
  UserPlus, 
  ShieldCheck, 
  Key, 
  Search, 
  Plus, 
  Clock, 
  AlertCircle,
  Trash2,
  Phone,
  Mail,
  Zap,
  X,
  Pause,
  Play,
  MessageCircle,
  ExternalLink,
  Info
} from "lucide-react";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // States para Cadastro
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    whatsapp: "",
    descricao: "",
    plano: 30
  });

  // States para Detalhes e Liberação
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLicense, setSelectedLicense] = useState<any>(null);
  const [selectedClientToRelease, setSelectedClientToRelease] = useState<any>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  useEffect(() => {
    alert("SISTEMA CARREGADO COM SUCESSO! SE VOCÊ ESTÁ VENDO ISSO, O JAVASCRIPT ESTÁ FUNCIONANDO.");
    fetchLicenses();
    const interval = setInterval(fetchLicenses, 15000);
    return () => clearInterval(interval);
  }, []);

  async function fetchLicenses() {
    const { data, error } = await supabase.from("licencas").select("*").order("created_at", { ascending: false });
    if (error) console.error("Erro ao carregar licenças:", error);
    if (data) setLicenses(data);
  }

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const newKey = `HZN-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    
    const { error } = await supabase.from("licencas").insert([{
      nome: formData.nome,
      email: formData.email,
      whatsapp: formData.whatsapp,
      descricao: formData.descricao,
      key_code: newKey,
      dias_validos: formData.plano,
      is_active: true
    }]);

    if (!error) {
      setGeneratedKey(newKey);
      setFormData({ nome: "", email: "", whatsapp: "", descricao: "", plano: 30 });
      fetchLicenses();
    } else {
      console.error("Erro Supabase:", error);
      alert("Erro ao gerar chave: " + error.message);
    }
    setLoading(false);
  };

  const handleReleaseKey = async (days: number) => {
    const client = selectedClientToRelease;
    if (!client) return;
    setLoading(true);
    const newKey = `HZN-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    
    const { error } = await supabase.from("licencas").insert([{
      nome: client.nome,
      email: client.email,
      whatsapp: client.whatsapp,
      key_code: newKey,
      dias_validos: days,
      is_active: true
    }]);

    if (!error) {
      setGeneratedKey(newKey);
      setSelectedClientToRelease(null);
      fetchLicenses();
    } else {
      console.error("Erro Supabase:", error);
      alert("Erro ao liberar chave: " + error.message);
    }
    setLoading(false);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from("licencas").update({ is_active: !currentStatus }).eq("id", id);
    if (!error) {
      setSelectedLicense(null);
      fetchLicenses();
    } else {
      alert("Erro ao alterar status: " + error.message);
    }
  };

  const deleteLicense = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir permanentemente esta licença?")) {
      const { error } = await supabase.from("licencas").delete().eq("id", id);
      if (!error) {
        setSelectedLicense(null);
        fetchLicenses();
      }
    }
  };

  const isOnline = (lastSeen: string) => {
    if (!lastSeen) return false;
    const last = new Date(lastSeen).getTime();
    const now = new Date().getTime();
    return now - last < 60000;
  };

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-100 font-sans">
      
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900/50 border-r border-slate-800/50 p-8 flex flex-col gap-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-600/30">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <h1 className="text-2xl font-black italic tracking-tighter">HZN <span className="text-indigo-400">ADMIN</span></h1>
        </div>

        <nav className="flex flex-col gap-2">
          <SidebarLink icon={<LayoutDashboard />} label="Dashboard" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
          <SidebarLink icon={<UserPlus />} label="Novo Cliente" active={activeTab === "cadastro"} onClick={() => setActiveTab("cadastro")} />
          <SidebarLink icon={<ShieldCheck />} label="Licenças Ativas" active={activeTab === "licencas"} onClick={() => setActiveTab("licencas")} />
          <SidebarLink icon={<Key />} label="Liberar Licença" active={activeTab === "liberacao"} onClick={() => setActiveTab("liberacao")} />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-12 overflow-y-auto">
        
        {/* Tab: Dashboard */}
        {activeTab === "dashboard" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl font-black mb-10">Visão Geral</h2>
            <div className="grid grid-cols-2 gap-8">
              <DashboardCard 
                title="Vencendo em breve" 
                icon={<Clock className="text-amber-500" />} 
                items={licenses.filter(l => {
                  if (!l.data_ativacao) return false;
                  const expiry = new Date(l.data_ativacao);
                  expiry.setDate(expiry.getDate() + l.dias_validos);
                  const days = (expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
                  return days > 0 && days <= 7;
                })} 
                emptyMsg="Nenhum cliente vencendo nos próximos 7 dias."
              />
              <DashboardCard 
                title="Vencidos recentemente" 
                icon={<AlertCircle className="text-red-500" />} 
                items={licenses.filter(l => {
                  if (!l.data_ativacao) return false;
                  const expiry = new Date(l.data_ativacao);
                  expiry.setDate(expiry.getDate() + l.dias_validos);
                  return expiry < new Date();
                })} 
                emptyMsg="Nenhum cliente vencido recentemente."
              />
            </div>
          </div>
        )}

        {/* Tab: Cadastro de Cliente */}
        {activeTab === "cadastro" && (
          <div className="max-w-3xl animate-in fade-in slide-in-from-left-4 duration-500">
            <h2 className="text-4xl font-black mb-10">Adicionar Cliente</h2>
            <form onSubmit={handleCreateClient} className="bg-slate-900/40 border border-slate-800/50 p-10 rounded-[2.5rem] space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <InputGroup label="Nome Completo" value={formData.nome} onChange={(v: any) => setFormData({...formData, nome: v})} placeholder="Ex: João Silva" />
                <InputGroup label="E-mail Principal" value={formData.email} onChange={(v: any) => setFormData({...formData, email: v})} placeholder="joao@email.com" type="email" />
                <InputGroup label="WhatsApp" value={formData.whatsapp} onChange={(v: any) => setFormData({...formData, whatsapp: v})} placeholder="(00) 00000-0000" />
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Tempo de Plano</label>
                  <select 
                    value={formData.plano} 
                    onChange={(e: any) => setFormData({...formData, plano: parseInt(e.target.value)})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value={5}>5 Dias (Teste)</option>
                    <option value={30}>30 Dias (Mensal)</option>
                    <option value={90}>90 Dias (Trimestral)</option>
                    <option value={365}>1 Ano (Anual)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Descrição / Observações</label>
                <textarea 
                  value={formData.descricao} 
                  onChange={(e: any) => setFormData({...formData, descricao: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500 h-32 resize-none"
                  placeholder="Informações adicionais sobre o cliente..."
                ></textarea>
              </div>
              <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 py-5 rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-3">
                <UserPlus className="w-6 h-6" />
                CADASTRAR E GERAR CHAVE
              </button>
            </form>
          </div>
        )}

        {/* Tab: Licenças Ativas */}
        {activeTab === "licencas" && (
          <div className="animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-4xl font-black">Licenças Ativas</h2>
              <div className="relative w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 w-4 h-4" />
                <input type="text" placeholder="Filtrar..." className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/50 rounded-[2.5rem] overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-950/50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-6">CLIENTE / STATUS</th>
                    <th className="px-8 py-6">CHAVE</th>
                    <th className="px-8 py-6">VALIDADE</th>
                    <th className="px-8 py-6 text-right">INFO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {licenses
                    .filter(l => l.nome?.toLowerCase().includes(searchQuery.toLowerCase()) || l.email.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(l => (
                    <tr 
                      key={l.id} 
                      onClick={() => setSelectedLicense(l)}
                      className={`hover:bg-indigo-500/5 transition-all cursor-pointer group ${!l.is_active ? 'opacity-40 grayscale' : ''}`}
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${isOnline(l.last_seen) ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-slate-700'}`}></div>
                          <div>
                            <div className="font-bold group-hover:text-indigo-400 transition-colors">{l.nome || 'Sem Nome'}</div>
                            <div className="text-xs text-slate-500">{l.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 font-mono text-indigo-400 font-bold">{l.key_code}</td>
                      <td className="px-8 py-6 text-sm font-medium">{l.dias_validos} dias</td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end">
                          <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-500 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all">
                            <Info className="w-4 h-4" />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Liberar Licença */}
        {activeTab === "liberacao" && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-4xl font-black mb-10">Liberar Nova Licença</h2>
            <div className="relative mb-10">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 w-6 h-6" />
              <input 
                type="text" 
                placeholder="Pesquisar por nome, e-mail ou WhatsApp..." 
                className="w-full bg-slate-900/40 border border-slate-800/50 rounded-[2rem] pl-16 pr-8 py-6 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-xl"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-6">
              {licenses
                .filter(l => (l.nome?.toLowerCase().includes(searchQuery.toLowerCase()) || l.email.toLowerCase().includes(searchQuery.toLowerCase()) || l.whatsapp?.includes(searchQuery)))
                .reduce((acc: any[], current) => {
                   if (!acc.find(item => item.email === current.email)) acc.push(current);
                   return acc;
                }, [])
                .map(client => (
                <button 
                  key={client.id} 
                  onClick={() => setSelectedClientToRelease(client)}
                  className="bg-slate-900/40 border border-slate-800/50 p-8 rounded-[2rem] text-left hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group"
                >
                  <div className="font-black text-xl mb-1 group-hover:text-indigo-400 transition-colors">{client.nome || 'Sem Nome'}</div>
                  <div className="text-sm text-slate-500 mb-4">{client.email}</div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <Phone className="w-3 h-3" /> {client.whatsapp || 'N/A'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* MODAL: DETALHES DO CLIENTE */}
      {selectedLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 p-12 rounded-[3.5rem] max-w-2xl w-full relative shadow-2xl animate-in zoom-in-95 duration-300">
            <button onClick={() => setSelectedLicense(null)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors">
              <X className="w-8 h-8" />
            </button>
            
            <div className="flex items-start gap-8 mb-10">
              <div className="w-24 h-24 bg-indigo-600/20 rounded-[2rem] flex items-center justify-center border border-indigo-500/30">
                <UserPlus className="w-10 h-10 text-indigo-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-4xl font-black italic tracking-tighter mb-1">{selectedLicense.nome || 'Cliente sem Nome'}</h2>
                <div className="flex items-center gap-4 text-slate-400 font-medium">
                  <div className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {selectedLicense.email}</div>
                  <div className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {selectedLicense.whatsapp || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-10">
              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Chave Atual</div>
                <div className="text-xl font-mono font-black text-indigo-400">{selectedLicense.key_code}</div>
              </div>
              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 relative group">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Dias de Acesso</div>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    value={selectedLicense.dias_validos} 
                    onChange={async (e) => {
                      const newVal = parseInt(e.target.value);
                      const { data } = await supabase.from('licencas').update({ dias_validos: newVal }).eq('id', selectedLicense.id).select().single();
                      if (data) {
                        setSelectedLicense(data);
                        fetchLicenses();
                      }
                    }}
                    className="bg-transparent text-3xl font-black outline-none w-24 text-indigo-400 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2"
                  />
                  <span className="text-slate-500 font-bold uppercase text-xs">Dias</span>
                </div>
                <div className="absolute -bottom-6 left-6 text-[8px] text-slate-600 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  Clique para alterar o tempo
                </div>
              </div>
            </div>

            <div className="mb-10">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Descrição</div>
              <p className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-slate-300 min-h-[100px]">
                {selectedLicense.descricao || 'Nenhuma descrição informada.'}
              </p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => handleToggleActive(selectedLicense.id, selectedLicense.is_active)}
                className={`flex-1 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${selectedLicense.is_active ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20'}`}
              >
                {selectedLicense.is_active ? <><Pause className="w-4 h-4 fill-current" /> PAUSAR PLANO</> : <><Play className="w-4 h-4 fill-current" /> ATIVAR PLANO</>}
              </button>
              
              <a 
                href={`https://wa.me/55${selectedLicense.whatsapp?.replace(/\D/g, '')}`} 
                target="_blank"
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all text-white"
              >
                <MessageCircle className="w-4 h-4 fill-current" /> WHATSAPP
              </a>

              <button 
                onClick={() => deleteLicense(selectedLicense.id)}
                className="w-16 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-2xl flex items-center justify-center transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outros Modais (Liberação e Sucesso) Mantidos... */}
      {selectedClientToRelease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 p-12 rounded-[3.5rem] max-w-md w-full text-center relative">
            <button onClick={() => setSelectedClientToRelease(null)} className="absolute top-8 right-8 text-slate-500 hover:text-white"><X className="w-8 h-8" /></button>
            <h2 className="text-3xl font-black mb-10 italic">LIBERAR PLANO</h2>
            <div className="grid grid-cols-1 gap-4">
              <PlanButton label="5 Dias (Teste)" onClick={() => handleReleaseKey(5)} />
              <PlanButton label="1 Mês (Mensal)" onClick={() => handleReleaseKey(30)} />
              <PlanButton label="1 Ano (Anual)" onClick={() => handleReleaseKey(365)} />
            </div>
          </div>
        </div>
      )}

      {generatedKey && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
          <div className="bg-slate-900 border border-slate-800 p-12 rounded-[3.5rem] max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-emerald-500/20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-emerald-500/30 rotate-12">
              <ShieldCheck className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-3xl font-black mb-10">CHAVE GERADA!</h2>
            <div className="bg-slate-950 border-2 border-indigo-500/50 p-6 rounded-3xl mb-10 flex items-center justify-between cursor-pointer active:scale-95 transition-all" onClick={() => { navigator.clipboard.writeText(generatedKey); alert("Copiado!"); }}>
              <span className="text-3xl font-black text-indigo-400 font-mono">{generatedKey}</span>
            </div>
            <button onClick={() => setGeneratedKey(null)} className="w-full bg-slate-800 hover:bg-slate-700 py-5 rounded-2xl font-black">FECHAR</button>
          </div>
        </div>
      )}

    </div>
  );
}

// Subcomponentes mantidos...
function SidebarLink({ icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'}`}>
      {icon} {label}
    </button>
  );
}

function DashboardCard({ title, icon, items, emptyMsg }: any) {
  return (
    <div className="bg-slate-900/40 border border-slate-800/50 rounded-[2.5rem] p-8 flex flex-col h-[400px]">
      <div className="flex items-center gap-3 mb-8">{icon}<h3 className="text-xl font-black uppercase tracking-tighter italic">{title}</h3></div>
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {items.length === 0 ? <p className="text-slate-600 text-sm italic">{emptyMsg}</p> : items.map((item: any) => (
          <div key={item.id} className="bg-slate-950/50 border border-slate-800/50 p-5 rounded-2xl flex justify-between items-center">
            <div><div className="font-bold">{item.nome || 'Sem Nome'}</div><div className="text-[10px] text-slate-500 uppercase font-black">{item.email}</div></div>
            <div className="text-xs font-black bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">{item.dias_validos}D</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InputGroup({ label, value, onChange, placeholder, type = "text" }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" />
    </div>
  );
}

function PlanButton({ label, onClick }: any) {
  return (
    <button onClick={onClick} className="w-full bg-slate-950 hover:bg-indigo-600 border border-slate-800 hover:border-indigo-500 py-4 rounded-2xl font-bold transition-all active:scale-95">{label}</button>
  );
}
