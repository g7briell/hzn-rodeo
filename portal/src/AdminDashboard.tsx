import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import BoiadaVisualEditor from './BoiadaVisualEditor';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'events' | 'boiadas' | 'noticias'>('overview');
  
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [boiadas, setBoiadas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Modals State
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [editingBoiada, setEditingBoiada] = useState<any>(null);

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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [usersRes, eventsRes, boiadasRes] = await Promise.all([
        supabase.from('perfis_portal').select('*'),
        supabase.from('eventos_oficiais').select('*'),
        supabase.from('boiadas_oficiais').select('*')
      ]);

      if (usersRes.data) setUsers(usersRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
      if (boiadasRes.data) setBoiadas(boiadasRes.data);
    } catch (err) {
      console.error('Error fetching admin data', err);
    }
    setLoading(false);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.from('perfis_portal').update({
        nome: editingUser.nome,
        bio: editingUser.bio,
        cargo: editingUser.cargo,
        instagram: editingUser.instagram,
        youtube: editingUser.youtube,
        cpf: editingUser.cpf,
        rg: editingUser.rg,
        whatsapp: editingUser.whatsapp,
        endereco: editingUser.endereco,
        foto: editingUser.foto
      }).eq('id', editingUser.id);
      setEditingUser(null);
      fetchDashboardData();
      alert('Usuário salvo com sucesso!');
    } catch (err) {
      alert('Erro ao salvar.');
    }
  };

  const handleDeleteUser = async (id: number, nome: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o usuário "${nome}"? Esta ação removerá o perfil público dele permanentemente.`)) {
      try {
        await supabase.from('perfis_portal').delete().eq('id', id);
        fetchDashboardData();
        alert('Usuário excluído com sucesso!');
      } catch (err) {
        alert('Erro ao excluir usuário.');
      }
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.from('eventos_oficiais').update({
        nome: editingEvent.nome,
        local: editingEvent.local,
        data_inicio: editingEvent.data_inicio,
        detalhes: editingEvent.detalhes
      }).eq('id', editingEvent.id);
      setEditingEvent(null);
      fetchDashboardData();
      alert('Evento salvo com sucesso!');
    } catch (err) {
      alert('Erro ao salvar.');
    }
  };

  const handleSaveBoiada = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.from('boiadas_oficiais').update({
        nome: editingBoiada.nome,
        status: editingBoiada.status,
        lados: editingBoiada.lados
      }).eq('id', editingBoiada.id);
      setEditingBoiada(null);
      fetchDashboardData();
      alert('Boiada salva com sucesso!');
    } catch (err) {
      alert('Erro ao salvar.');
    }
  };

  const handleApproveNews = async (eventId: string, newsId: string) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;
      const noticias = event.detalhes?.noticias || [];
      const updatedNoticias = noticias.map((n: any) => n.id === newsId ? { ...n, status: 'aprovado' } : n);
      const updatedDetalhes = { ...event.detalhes, noticias: updatedNoticias };
      
      const { error } = await supabase
        .from('eventos_oficiais')
        .update({ detalhes: updatedDetalhes })
        .eq('id', eventId);
        
      if (error) throw error;
      alert("Notícia aprovada e publicada no portal!");
      fetchDashboardData();
    } catch (err: any) {
      alert("Erro ao aprovar notícia: " + err.message);
    }
  };

  const handleDeleteNews = async (eventId: string, newsId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta notícia permanentemente?")) return;
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;
      const noticias = event.detalhes?.noticias || [];
      const updatedNoticias = noticias.filter((n: any) => n.id !== newsId);
      const updatedDetalhes = { ...event.detalhes, noticias: updatedNoticias };
      
      const { error } = await supabase
        .from('eventos_oficiais')
        .update({ detalhes: updatedDetalhes })
        .eq('id', eventId);
        
      if (error) throw error;
      alert("Notícia excluída com sucesso!");
      fetchDashboardData();
    } catch (err: any) {
      alert("Erro ao excluir notícia: " + err.message);
    }
  };

  const pendingNews: any[] = [];
  events.forEach(ev => {
    const noticias = ev.detalhes?.noticias || [];
    noticias.forEach((n: any) => {
      if (n.status === 'pendente') {
        pendingNews.push({
          ...n,
          eventId: ev.id,
          eventNome: ev.nome
        });
      }
    });
  });

  const openEventModal = (ev: any) => {
    setEditingEvent({ ...ev, detalhes: ev.detalhes || {} });
  };

  const openBoiadaModal = (b: any) => {
    setEditingBoiada({ ...b, lados: b.lados || {} });
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Carregando Painel Admin...</div>;

  return (
    <div>
      <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Painel <span className="text-primary">Admin</span></h2>
      <p className="text-muted" style={{ marginBottom: '2rem' }}>Bem-vindo à central de controle do RodeoApp.</p>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', overflowX: 'auto' }}>
        <button className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('overview')}>Visão Geral</button>
        <button className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('users')}>Usuários ({users.length})</button>
        <button className={`btn ${activeTab === 'events' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('events')}>Eventos ({events.length})</button>
        <button className={`btn ${activeTab === 'boiadas' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('boiadas')}>Boiadas ({boiadas.length})</button>
        <button className={`btn ${activeTab === 'noticias' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('noticias')} style={pendingNews.length > 0 ? { border: '1px solid #eab308' } : {}}>
          Notícias Pendentes ({pendingNews.length})
        </button>
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--primary)' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)' }}>Total de Usuários</h3>
            <p style={{ fontSize: '3rem', margin: 0, fontWeight: 'bold', color: 'var(--primary)' }}>{users.length}</p>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--primary)' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)' }}>Eventos Oficiais</h3>
            <p style={{ fontSize: '3rem', margin: 0, fontWeight: 'bold', color: 'var(--primary)' }}>{events.length}</p>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--primary)' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)' }}>Boiadas Cadastradas</h3>
            <p style={{ fontSize: '3rem', margin: 0, fontWeight: 'bold', color: 'var(--primary)' }}>{boiadas.length}</p>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>Nome</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>CPF</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>Cargo</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>{u.nome}</td>
                  <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>{u.cpf}</td>
                  <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>{u.cargo || 'Membro'}</td>
                  <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-outline" style={{ padding: '0.5rem 1rem' }} onClick={() => setEditingUser(u)}>Editar</button>
                      <button className="btn" style={{ padding: '0.5rem 1rem', background: 'rgba(255,50,50,0.15)', color: '#ff5555', border: '1px solid rgba(255,50,50,0.3)' }} onClick={() => handleDeleteUser(u.id, u.nome)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Editing User Modal */}
      {editingUser && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="auth-modal" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="close-btn" onClick={() => setEditingUser(null)}>×</button>
            <h2 style={{ marginBottom: '1.5rem' }}>Editar Usuário</h2>
            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px' }}>
                <img 
                  src={editingUser.foto || '/user_placeholder.png'} 
                  alt="Foto do Usuário" 
                  style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
                />
                <div>
                  <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
                    Alterar Foto
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoUpload(e, (b64) => setEditingUser({...editingUser, foto: b64}))} />
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 2 }}>
                  <label className="form-label">Nome</label>
                  <input className="form-input" value={editingUser.nome || ''} onChange={e => setEditingUser({...editingUser, nome: e.target.value})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">WhatsApp</label>
                  <input className="form-input" value={editingUser.whatsapp || ''} onChange={e => setEditingUser({...editingUser, whatsapp: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">CPF</label>
                  <input className="form-input" value={editingUser.cpf || ''} onChange={e => setEditingUser({...editingUser, cpf: e.target.value})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">RG</label>
                  <input className="form-input" value={editingUser.rg || ''} onChange={e => setEditingUser({...editingUser, rg: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="form-label">Endereço Completo (Rua, Número, Cidade, Estado)</label>
                <input className="form-input" value={editingUser.endereco || ''} onChange={e => setEditingUser({...editingUser, endereco: e.target.value})} />
              </div>

              <div>
                <label className="form-label">Cargo/Tag</label>
                <select className="form-input" value={editingUser.cargo || ''} onChange={e => setEditingUser({...editingUser, cargo: e.target.value})}>
                  <option value="">Membro Normal</option>
                  <option value="tropeiro">Tropeiro</option>
                  <option value="competidor_touros">Competidor Touros</option>
                  <option value="treinador">Treinador</option>
                </select>
              </div>

              <div>
                <label className="form-label">Bio</label>
                <textarea className="form-input" value={editingUser.bio || ''} onChange={e => setEditingUser({...editingUser, bio: e.target.value})} />
              </div>
              
              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Salvar Alterações</button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>Evento</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>Cidade</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>Data</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.id}>
                  <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>{ev.nome}</td>
                  <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>{ev.local}</td>
                  <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>{ev.data_inicio}</td>
                  <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                    <button className="btn btn-outline" style={{ padding: '0.5rem 1rem' }} onClick={() => openEventModal(ev)}>Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Editing Event Modal */}
      {editingEvent && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="auth-modal" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="close-btn" onClick={() => setEditingEvent(null)}>×</button>
            <h2 style={{ marginBottom: '1.5rem' }}>Editar Evento</h2>
            <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 2 }}>
                  <label className="form-label">Nome</label>
                  <input className="form-input" value={editingEvent.nome || ''} onChange={e => setEditingEvent({...editingEvent, nome: e.target.value})} />
                </div>
                <div style={{ flex: 2 }}>
                  <label className="form-label">Cidade</label>
                  <input className="form-input" value={editingEvent.local || ''} onChange={e => setEditingEvent({...editingEvent, local: e.target.value})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Data</label>
                  <input className="form-input" value={editingEvent.data_inicio || ''} onChange={e => setEditingEvent({...editingEvent, data_inicio: e.target.value})} />
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary)' }}>Mídia do Evento</h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {editingEvent.detalhes?.foto_evento && (
                    <img src={editingEvent.detalhes.foto_evento} alt="Capa" style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <label className="btn btn-outline" style={{ cursor: 'pointer', display: 'inline-block' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '0.5rem' }}><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                      Alterar Foto de Capa (PC)
                      <input 
                        type="file" 
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => handlePhotoUpload(e, (b64) => setEditingEvent({...editingEvent, detalhes: { ...editingEvent.detalhes, foto_evento: b64 }}))}
                      />
                    </label>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Mais opções de mídia e notícias serão adicionadas no futuro.</div>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Salvar Alterações do Evento</button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'boiadas' && (
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>CIA / Boiada</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>Criador (Email)</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>Status</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {boiadas.map(b => (
                <tr key={b.id}>
                  <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>{b.nome}</td>
                  <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>{b.lados?.__meta?.tropeiro_email || 'Desconhecido'}</td>
                  <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ color: b.status === 'aprovado' ? '#00ff00' : 'orange' }}>{b.status}</span>
                  </td>
                  <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                    <button className="btn btn-outline" style={{ padding: '0.5rem 1rem' }} onClick={() => openBoiadaModal(b)}>Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {activeTab === 'noticias' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {pendingNews.length > 0 ? (
            pendingNews.map((news: any) => (
              <div 
                key={news.id} 
                style={{ 
                  background: 'var(--bg-card)', 
                  padding: '2rem', 
                  borderRadius: '24px', 
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', marginRight: '0.5rem' }}>
                      PENDENTE
                    </span>
                    <span style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      {news.eventNome}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: '#10b981', borderColor: '#10b981', color: '#fff' }}
                      onClick={() => handleApproveNews(news.eventId, news.id)}
                    >
                      Aprovar & Publicar
                    </button>
                    <button 
                      className="btn" 
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: 'rgba(255,50,50,0.15)', color: '#ff5555', border: '1px solid rgba(255,50,50,0.3)' }}
                      onClick={() => handleDeleteNews(news.eventId, news.id)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.3rem', fontWeight: '900', textTransform: 'uppercase', fontStyle: 'italic' }}>
                    {news.titulo}
                  </h4>
                  <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {news.conteudo}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '24px', border: '1px dashed var(--border-light)' }}>
              <p style={{ color: '#94a3b8', margin: 0 }}>Nenhuma notícia aguardando aprovação no momento.</p>
            </div>
          )}
        </div>
      )}

      {/* Editing Boiada Modal */}
      {editingBoiada && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="auth-modal" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="close-btn" onClick={() => setEditingBoiada(null)}>×</button>
            <h2 style={{ marginBottom: '1.5rem' }}>Editar Boiada</h2>
            <form onSubmit={handleSaveBoiada} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Nome da CIA</label>
                  <input className="form-input" value={editingBoiada.nome || ''} onChange={e => setEditingBoiada({...editingBoiada, nome: e.target.value})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Status</label>
                  <select className="form-input" value={editingBoiada.status || ''} onChange={e => setEditingBoiada({...editingBoiada, status: e.target.value})}>
                    <option value="pendente">Pendente</option>
                    <option value="aprovado">Aprovado</option>
                  </select>
                </div>
              </div>

              <BoiadaVisualEditor 
                initialLados={editingBoiada.lados} 
                onChange={(newLados) => setEditingBoiada({ ...editingBoiada, lados: newLados })} 
              />

              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Salvar Alterações da Boiada</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
