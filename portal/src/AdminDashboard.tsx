import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'events' | 'boiadas'>('overview');
  
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [boiadas, setBoiadas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Modals State
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [editingBoiada, setEditingBoiada] = useState<any>(null);

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
        youtube: editingUser.youtube
      }).eq('id', editingUser.id);
      setEditingUser(null);
      fetchDashboardData();
      alert('Usuário salvo com sucesso!');
    } catch (err) {
      alert('Erro ao salvar.');
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.from('eventos_oficiais').update({
        nome: editingEvent.nome,
        cidade: editingEvent.cidade,
        data: editingEvent.data
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
        status: editingBoiada.status
      }).eq('id', editingBoiada.id);
      setEditingBoiada(null);
      fetchDashboardData();
      alert('Boiada salva com sucesso!');
    } catch (err) {
      alert('Erro ao salvar.');
    }
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
                    <button className="btn btn-outline" style={{ padding: '0.5rem 1rem' }} onClick={() => setEditingUser(u)}>Editar</button>
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
          <div className="auth-modal" style={{ maxWidth: '500px', width: '100%' }}>
            <button className="close-btn" onClick={() => setEditingUser(null)}>×</button>
            <h2 style={{ marginBottom: '1.5rem' }}>Editar Usuário</h2>
            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Nome</label>
                <input className="form-input" value={editingUser.nome || ''} onChange={e => setEditingUser({...editingUser, nome: e.target.value})} />
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
              <button type="submit" className="btn btn-primary">Salvar Alterações</button>
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
                  <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>{ev.cidade}</td>
                  <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>{ev.data}</td>
                  <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                    <button className="btn btn-outline" style={{ padding: '0.5rem 1rem' }} onClick={() => setEditingEvent(ev)}>Editar</button>
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
          <div className="auth-modal" style={{ maxWidth: '500px', width: '100%' }}>
            <button className="close-btn" onClick={() => setEditingEvent(null)}>×</button>
            <h2 style={{ marginBottom: '1.5rem' }}>Editar Evento</h2>
            <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Nome</label>
                <input className="form-input" value={editingEvent.nome || ''} onChange={e => setEditingEvent({...editingEvent, nome: e.target.value})} />
              </div>
              <div>
                <label className="form-label">Cidade</label>
                <input className="form-input" value={editingEvent.cidade || ''} onChange={e => setEditingEvent({...editingEvent, cidade: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary">Salvar Alterações</button>
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
                    <button className="btn btn-outline" style={{ padding: '0.5rem 1rem' }} onClick={() => setEditingBoiada(b)}>Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Editing Boiada Modal */}
      {editingBoiada && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="auth-modal" style={{ maxWidth: '500px', width: '100%' }}>
            <button className="close-btn" onClick={() => setEditingBoiada(null)}>×</button>
            <h2 style={{ marginBottom: '1.5rem' }}>Editar Boiada</h2>
            <form onSubmit={handleSaveBoiada} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Nome da CIA</label>
                <input className="form-input" value={editingBoiada.nome || ''} onChange={e => setEditingBoiada({...editingBoiada, nome: e.target.value})} />
              </div>
              <div>
                <label className="form-label">Status</label>
                <select className="form-input" value={editingBoiada.status || ''} onChange={e => setEditingBoiada({...editingBoiada, status: e.target.value})}>
                  <option value="pendente">Pendente</option>
                  <option value="aprovado">Aprovado</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary">Salvar Alterações</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
