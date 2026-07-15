import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import BoiadaVisualEditor from './BoiadaVisualEditor';
import { toPng } from 'html-to-image';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'events' | 'boiadas' | 'noticias' | 'patrocinios' | 'competidores' | 'artes'>('overview');
  
  // Artes tab states
  const [artBgImage, setArtBgImage] = useState<string>('');
  const [artTitle, setArtTitle] = useState<string>('Maior Nota');
  const [artShowTitle, setArtShowTitle] = useState<boolean>(true);
  const [artSubtitle, setArtSubtitle] = useState<string>('1º Round');
  const [artShowSubtitle, setArtShowSubtitle] = useState<boolean>(true);
  const [artEventLogo, setArtEventLogo] = useState<string>('');
  const [artShowEventLogo, setArtShowEventLogo] = useState<boolean>(true);
  const [isGeneratingArt, setIsGeneratingArt] = useState<boolean>(false);

  const handleDownloadArt = async () => {
    const node = document.getElementById('instagram-art-canvas');
    if (!node) return;
    setIsGeneratingArt(true);
    try {
      const dataUrl = await toPng(node, {
        width: 1080,
        height: 1350,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: '1080px',
          height: '1350px'
        }
      });
      const link = document.createElement('a');
      link.download = `arte-rodeo-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Erro ao gerar imagem:', error);
      alert('Erro ao gerar imagem. Tente novamente.');
    } finally {
      setIsGeneratingArt(false);
    }
  };
  
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [boiadas, setBoiadas] = useState<any[]>([]);
  const [patrocinios, setPatrocinios] = useState<any[]>([]);
  const [despesas, setDespesas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Editing/Creating new competitors / bulls
  const [isNewCompetidorModalOpen, setIsNewCompetidorModalOpen] = useState(false);
  const [newCompetidorNome, setNewCompetidorNome] = useState('');
  const [newCompetidorCpf, setNewCompetidorCpf] = useState('');
  const [newCompetidorCidade, setNewCompetidorCidade] = useState('');

  const [isNewTouroModalOpen, setIsNewTouroModalOpen] = useState(false);
  const [newTouroNome, setNewTouroNome] = useState('');
  const [newTouroCia, setNewTouroCia] = useState('');
  const [newTouroLado, setNewTouroLado] = useState('Esquerdo');

  // Edit Modals State
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [editingBoiada, setEditingBoiada] = useState<any>(null);
  const [editingNews, setEditingNews] = useState<any>(null);

  // New Sponsor Form States
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
  const [sponsorEmpresa, setSponsorEmpresa] = useState('');
  const [sponsorValor, setSponsorValor] = useState('');
  const [sponsorTempo, setSponsorTempo] = useState('1'); // months
  const [sponsorTipo, setSponsorTipo] = useState<'portal' | 'app'>('portal');
  const [sponsorLogo, setSponsorLogo] = useState('');
  const [sponsorClickUrl, setSponsorClickUrl] = useState('');
  const [isSavingSponsor, setIsSavingSponsor] = useState(false);

  // New Expense Form States
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseValor, setExpenseValor] = useState('');
  const [expenseData, setExpenseData] = useState(new Date().toISOString().split('T')[0]);
  const [isSavingExpense, setIsSavingExpense] = useState(false);

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
      const [usersRes, eventsRes, boiadasRes, patrociniosRes, despesasRes] = await Promise.all([
        supabase.from('perfis_portal').select('*'),
        supabase.from('eventos_oficiais').select('*'),
        supabase.from('boiadas_oficiais').select('*'),
        supabase.from('patrocinios').select('*').order('created_at', { ascending: false }),
        supabase.from('despesas').select('*').order('data', { ascending: false })
      ]);

      if (usersRes.data) setUsers(usersRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
      if (boiadasRes.data) setBoiadas(boiadasRes.data);
      if (patrociniosRes.data) setPatrocinios(patrociniosRes.data);
      if (despesasRes.data) setDespesas(despesasRes.data);
    } catch (err) {
      console.error('Error fetching admin data', err);
    }
    setLoading(false);
  };

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
          id: self.crypto.randomUUID ? self.crypto.randomUUID() : Math.random().toString(36).substring(2, 15)
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
      
      // Sincroniza para a tabela legado eventos_oficiais
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

    try {
      const tName = manualRideTouroNome.trim().toUpperCase();
      const cName = manualRideCiaNome.trim().toUpperCase();

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

      const payload = {
        evento_id: manualRideEventId,
        competidor_id: selectedCompetidor ? selectedCompetidor.id : manualRideCompetidorId,
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

      // Sincroniza de volta para a tabela legado eventos_oficiais
      const targetEvent = allRelEvents.find(e => e.id === manualRideEventId);
      if (targetEvent) {
        await syncRelationalEventToEventosOficiais(targetEvent.nome);
      }

      alert("Montaria adicionada com sucesso!");
      setIsManualRideModalOpen(false);

      setManualRideTouroNome('');
      setManualRideCiaNome('');
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
    
    if (bullId) {
      const { data: bull } = await supabase.from('rel_touros').select('*').eq('id', bullId).maybeSingle();
      if (bull) {
        setManualRideTouroNome(bull.nome);
        setManualRideCiaNome(bull.cia);
      }
    } else {
      setManualRideTouroNome('');
      setManualRideCiaNome('');
    }
    
    // Fetch all events for the dropdown
    const { data } = await supabase.from('rel_eventos').select('*').order('nome', { ascending: true });
    setAllRelEvents(data || []);
    
    setIsManualRideModalOpen(true);
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

  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNews) return;
    try {
      const event = events.find(ev => ev.id === editingNews.eventId);
      if (!event) return;
      const noticias = event.detalhes?.noticias || [];
      const updatedNoticias = noticias.map((n: any) => 
        n.id === editingNews.id 
          ? { ...n, titulo: editingNews.titulo, conteudo: editingNews.conteudo } 
          : n
      );
      const updatedDetalhes = { ...event.detalhes, noticias: updatedNoticias };
      
      const { error } = await supabase
        .from('eventos_oficiais')
        .update({ detalhes: updatedDetalhes })
        .eq('id', editingNews.eventId);
        
      if (error) throw error;
      setEditingNews(null);
      fetchDashboardData();
      alert('Notícia salva com sucesso!');
    } catch (err: any) {
      alert('Erro ao salvar notícia: ' + err.message);
    }
  };

  const handleSaveSponsorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsorEmpresa) return alert('Por favor, informe o nome da empresa.');
    if (!sponsorLogo) return alert('Por favor, envie o logotipo do patrocinador.');

    setIsSavingSponsor(true);
    try {
      const { error } = await supabase
        .from('patrocinios')
        .insert({
          empresa: sponsorEmpresa,
          valor_contrato: parseFloat(sponsorValor) || 0,
          tempo_contrato: parseInt(sponsorTempo) || 1,
          tipo: sponsorTipo,
          logo_url: sponsorLogo,
          click_url: sponsorClickUrl || '#',
          status: 'ativo'
        });

      if (error) throw error;

      setSponsorEmpresa('');
      setSponsorValor('');
      setSponsorTempo('1');
      setSponsorLogo('');
      setSponsorClickUrl('');
      setIsSponsorModalOpen(false);
      fetchDashboardData();
      alert('Patrocinador adicionado com sucesso!');
    } catch (err: any) {
      alert('Erro ao salvar patrocinador: ' + err.message);
    } finally {
      setIsSavingSponsor(false);
    }
  };

  const handleDeleteSponsor = async (id: number) => {
    if (!window.confirm('Deseja excluir este patrocinador permanentemente?')) return;
    try {
      const { error } = await supabase.from('patrocinios').delete().eq('id', id);
      if (error) throw error;
      fetchDashboardData();
      alert('Patrocinador removido!');
    } catch (err: any) {
      alert('Erro ao remover: ' + err.message);
    }
  };

  const handleToggleSponsorStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo';
    try {
      const { error } = await supabase.from('patrocinios').update({ status: nextStatus }).eq('id', id);
      if (error) throw error;
      fetchDashboardData();
    } catch (err: any) {
      alert('Erro ao alterar status: ' + err.message);
    }
  };

  const handleSaveExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc) return alert('Por favor, informe a descrição da despesa.');

    setIsSavingExpense(true);
    try {
      const { error } = await supabase
        .from('despesas')
        .insert({
          descricao: expenseDesc,
          valor: parseFloat(expenseValor) || 0,
          data: expenseData
        });

      if (error) throw error;

      setExpenseDesc('');
      setExpenseValor('');
      setExpenseData(new Date().toISOString().split('T')[0]);
      setIsExpenseModalOpen(false);
      fetchDashboardData();
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
      const { error } = await supabase.from('despesas').delete().eq('id', id);
      if (error) throw error;
      fetchDashboardData();
      alert('Despesa removida!');
    } catch (err: any) {
      alert('Erro ao remover: ' + err.message);
    }
  };



  const pendingNews: any[] = [];
  const approvedNews: any[] = [];
  events.forEach(ev => {
    const noticias = ev.detalhes?.noticias || [];
    noticias.forEach((n: any) => {
      const newsItem = {
        ...n,
        eventId: ev.id,
        eventNome: ev.nome
      };
      if (n.status === 'pendente') {
        pendingNews.push(newsItem);
      } else if (n.status === 'aprovado') {
        approvedNews.push(newsItem);
      }
    });
  });

  const visibleBoiadas = boiadas.filter(b => b.nome !== '__PUBLICIDADES__');

  const openEventModal = (ev: any) => {
    setEditingEvent({ ...ev, detalhes: ev.detalhes || {} });
  };

  const openBoiadaModal = (b: any) => {
    setEditingBoiada({ ...b, lados: b.lados || {} });
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

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Carregando Painel Admin...</div>;

  return (
    <div>
      <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Painel <span className="text-primary">Admin</span></h2>
      <p className="text-muted" style={{ marginBottom: '2rem' }}>Bem-vindo à central de controle do RodeoApp.</p>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', overflowX: 'auto' }}>
        <button className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('overview')}>Visão Geral</button>
        <button className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('users')}>Usuários ({users.length})</button>
        <button className={`btn ${activeTab === 'events' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('events')}>Eventos ({events.length})</button>
        <button className={`btn ${activeTab === 'boiadas' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('boiadas')}>Boiadas ({visibleBoiadas.length})</button>
        <button className={`btn ${activeTab === 'noticias' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('noticias')} style={pendingNews.length > 0 ? { border: '1px solid #eab308' } : {}}>
          Notícias ({pendingNews.length + approvedNews.length})
        </button>
        <button className={`btn ${activeTab === 'patrocinios' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('patrocinios')}>
          Patrocínios & Finanças
        </button>
        <button className={`btn ${activeTab === 'competidores' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('competidores')}>
          Competidores & Animais
        </button>
        <button className={`btn ${activeTab === 'artes' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('artes')}>
          Artes Instagram
        </button>
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Main counts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total de Usuários</h3>
              <p style={{ fontSize: '2.5rem', margin: 0, fontWeight: 'bold', color: 'var(--accent)' }}>{users.length}</p>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Eventos Oficiais</h3>
              <p style={{ fontSize: '2.5rem', margin: 0, fontWeight: 'bold', color: 'var(--accent)' }}>{events.length}</p>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Boiadas Cadastradas</h3>
              <p style={{ fontSize: '2.5rem', margin: 0, fontWeight: 'bold', color: 'var(--accent)' }}>{visibleBoiadas.length}</p>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Patrocínios Ativos</h3>
              <p style={{ fontSize: '2.5rem', margin: 0, fontWeight: 'bold', color: 'var(--accent)' }}>{patrocinios.filter(p => p.status === 'ativo').length}</p>
            </div>
          </div>

          {/* Finance card panel */}
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--primary)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Dinheiro Entrou (Total)</span>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0 0 0', color: '#10b981' }}>
                R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Dinheiro Saiu (Despesas)</span>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0 0 0', color: '#ef4444' }}>
                R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Saldo Líquido</span>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0 0 0', color: saldoLiquido >= 0 ? '#10b981' : '#ef4444' }}>
                R$ {saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Faturamento Mensal (Previsão)</span>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0 0 0', color: 'var(--primary)' }}>
                R$ {previsaoMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
              </p>
            </div>
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
              
              <div>
                <label className="form-label">Circuito</label>
                <input className="form-input" value={editingEvent.detalhes?.circuito || ''} onChange={e => setEditingEvent({...editingEvent, detalhes: { ...editingEvent.detalhes, circuito: e.target.value }})} placeholder="Ex: Circuito Rancho Primavera" />
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
              {visibleBoiadas.map(b => (
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          {/* Notícias Pendentes */}
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', textTransform: 'uppercase', color: '#eab308', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚠️ Notícias Pendentes ({pendingNews.length})
            </h3>
            {pendingNews.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {pendingNews.map((news: any) => (
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
                          className="btn btn-outline" 
                          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                          onClick={() => setEditingNews(news)}
                        >
                          Editar
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
                ))}
              </div>
            ) : (
              <div style={{ padding: '3rem 2rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '24px', border: '1px dashed var(--border-light)' }}>
                <p style={{ color: '#94a3b8', margin: 0 }}>Nenhuma notícia aguardando aprovação no momento.</p>
              </div>
            )}
          </div>

          {/* Notícias Publicadas */}
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', textTransform: 'uppercase', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ✅ Notícias Publicadas / No Ar ({approvedNews.length})
            </h3>
            {approvedNews.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {approvedNews.map((news: any) => (
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
                        <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', marginRight: '0.5rem' }}>
                          NO AR
                        </span>
                        <span style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                          {news.eventNome}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                          onClick={() => setEditingNews(news)}
                        >
                          Editar
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
                ))}
              </div>
            ) : (
              <div style={{ padding: '3rem 2rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '24px', border: '1px dashed var(--border-light)' }}>
                <p style={{ color: '#94a3b8', margin: 0 }}>Nenhuma notícia publicada até o momento.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {activeTab === 'patrocinios' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-primary" onClick={() => setIsSponsorModalOpen(true)}>
              + Novo Patrocínio
            </button>
            <button className="btn btn-outline" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }} onClick={() => setIsExpenseModalOpen(true)}>
              + Nova Despesa
            </button>
          </div>

          {/* Patrocinadores list */}
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-light)' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', textTransform: 'uppercase' }}>Patrocinadores Ativos ({patrocinios.length})</h3>
            
            {patrocinios.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {patrocinios.map((pat: any) => (
                  <div key={pat.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <img src={pat.logo_url} alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain', background: '#fff', borderRadius: '8px', padding: '0.25rem' }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h4 style={{ margin: 0, color: '#fff', textTransform: 'none', fontSize: '1.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {pat.empresa}
                        </h4>
                        <span style={{ fontSize: '0.8rem', color: pat.tipo === 'app' ? '#38bdf8' : '#fb7185', fontWeight: 'bold' }}>
                          {pat.tipo === 'app' ? '📱 Splash App' : '📰 Portal Notícias'}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div><strong>Valor:</strong> R$ {Number(pat.valor_contrato).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      <div><strong>Tempo:</strong> {pat.tempo_contrato} {pat.tempo_contrato === 1 ? 'mês' : 'meses'}</div>
                      <div><strong>Link:</strong> <a href={pat.click_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>Acessar Link</a></div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                      <button 
                        className={`btn ${pat.status === 'ativo' ? 'btn-primary' : 'btn-outline'}`} 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', height: 'auto', textTransform: 'uppercase' }}
                        onClick={() => handleToggleSponsorStatus(pat.id, pat.status)}
                      >
                        {pat.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </button>
                      <button 
                        className="btn" 
                        style={{ background: 'rgba(255,50,50,0.15)', color: '#ff5555', border: '1px solid rgba(255,50,50,0.3)', padding: '0.4rem 0.8rem', fontSize: '0.75rem', height: 'auto' }}
                        onClick={() => handleDeleteSponsor(pat.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#94a3b8', margin: 0, textAlign: 'center', padding: '2rem 0' }}>Nenhum patrocinador cadastrado.</p>
            )}
          </div>

          {/* Despesas list */}
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-light)' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', textTransform: 'uppercase' }}>Histórico de Despesas ({despesas.length})</h3>
            
            {despesas.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>Descrição</th>
                      <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>Valor</th>
                      <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>Data</th>
                      <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {despesas.map((exp: any) => (
                      <tr key={exp.id}>
                        <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>{exp.descricao}</td>
                        <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)', color: '#ef4444', fontWeight: 'bold' }}>
                          R$ {Number(exp.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                          {new Date(exp.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </td>
                        <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                          <button 
                            className="btn" 
                            style={{ background: 'rgba(255,50,50,0.15)', color: '#ff5555', border: '1px solid rgba(255,50,50,0.3)', padding: '0.4rem 0.8rem', fontSize: '0.75rem', height: 'auto' }}
                            onClick={() => handleDeleteExpense(exp.id)}
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
              <p style={{ color: '#94a3b8', margin: 0, textAlign: 'center', padding: '2rem 0' }}>Nenhuma despesa registrada.</p>
            )}
          </div>

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

      {/* Editing News Modal */}
      {editingNews && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="auth-modal" style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="close-btn" onClick={() => setEditingNews(null)}>×</button>
            <h2 style={{ marginBottom: '1.5rem', textTransform: 'uppercase' }}>Editar Notícia</h2>
            <form onSubmit={handleSaveNews} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Título da Matéria</label>
                <input 
                  className="form-input" 
                  value={editingNews.titulo || ''} 
                  onChange={e => setEditingNews({...editingNews, titulo: e.target.value})} 
                  required
                />
              </div>
              <div>
                <label className="form-label">Corpo do Texto</label>
                <textarea 
                  className="form-input" 
                  rows={10}
                  style={{ minHeight: '250px', resize: 'vertical', lineHeight: '1.6' }}
                  value={editingNews.conteudo || ''} 
                  onChange={e => setEditingNews({...editingNews, conteudo: e.target.value})} 
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Salvar Alterações da Notícia</button>
            </form>
          </div>
        </div>
      )}
      {/* Novo Patrocínio Modal */}
      {isSponsorModalOpen && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="auth-modal" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="close-btn" onClick={() => setIsSponsorModalOpen(false)}>×</button>
            <h2 style={{ marginBottom: '1.5rem', textTransform: 'uppercase' }}>Novo Patrocinador</h2>
            <form onSubmit={handleSaveSponsorSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Nome da Empresa</label>
                <input 
                  className="form-input" 
                  value={sponsorEmpresa} 
                  onChange={e => setSponsorEmpresa(e.target.value)} 
                  placeholder="Ex: Cerveja Império"
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Valor do Contrato (R$)</label>
                  <input 
                    type="number"
                    step="0.01"
                    className="form-input" 
                    value={sponsorValor} 
                    onChange={e => setSponsorValor(e.target.value)} 
                    placeholder="Ex: 5000.00"
                    required 
                  />
                </div>
                <div>
                  <label className="form-label">Tempo de Contrato (meses)</label>
                  <input 
                    type="number"
                    className="form-input" 
                    value={sponsorTempo} 
                    onChange={e => setSponsorTempo(e.target.value)} 
                    placeholder="Ex: 12"
                    min="1"
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Tipo de Veiculação</label>
                  <select 
                    className="form-input" 
                    value={sponsorTipo} 
                    onChange={e => setSponsorTipo(e.target.value as any)}
                  >
                    <option value="portal">Notícias Portal</option>
                    <option value="app">Patrocínio App (Splash)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Link de Redirecionamento (Click URL)</label>
                  <input 
                    type="url"
                    className="form-input" 
                    value={sponsorClickUrl} 
                    onChange={e => setSponsorClickUrl(e.target.value)} 
                    placeholder="Ex: https://imperio.com.br"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Logotipo (Imagem/GIF)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="form-input" 
                  onChange={e => handlePhotoUpload(e, (b64) => setSponsorLogo(b64))} 
                  required
                />
                {sponsorLogo && (
                  <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>Pré-visualização da Logo:</span>
                    <img src={sponsorLogo} alt="Logo Preview" style={{ maxWidth: '100%', maxHeight: '100px', objectFit: 'contain', background: '#fff', padding: '0.5rem', borderRadius: '8px' }} />
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }} disabled={isSavingSponsor}>
                {isSavingSponsor ? 'Salvando...' : 'Confirmar Patrocínio'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Nova Despesa Modal */}
      {isExpenseModalOpen && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="auth-modal" style={{ maxWidth: '500px', width: '100%' }}>
            <button className="close-btn" onClick={() => setIsExpenseModalOpen(false)}>×</button>
            <h2 style={{ marginBottom: '1.5rem', textTransform: 'uppercase' }}>Registrar Despesa</h2>
            <form onSubmit={handleSaveExpenseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Descrição / Finalidade</label>
                <input 
                  className="form-input" 
                  value={expenseDesc} 
                  onChange={e => setExpenseDesc(e.target.value)} 
                  placeholder="Ex: Aluguel de geradores para etapa"
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Valor (R$)</label>
                  <input 
                    type="number"
                    step="0.01"
                    className="form-input" 
                    value={expenseValor} 
                    onChange={e => setExpenseValor(e.target.value)} 
                    placeholder="Ex: 1500.00"
                    required 
                  />
                </div>
                <div>
                  <label className="form-label">Data de Lançamento</label>
                  <input 
                    type="date"
                    className="form-input" 
                    value={expenseData} 
                    onChange={e => setExpenseData(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }} disabled={isSavingExpense}>
                {isSavingExpense ? 'Salvando...' : 'Confirmar Despesa'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'competidores' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Header Actions */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => setIsNewCompetidorModalOpen(true)}>
              + Cadastrar Competidor
            </button>
            <button className="btn btn-outline" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }} onClick={() => setIsNewTouroModalOpen(true)}>
              + Cadastrar Novo Touro
            </button>
            <button className="btn btn-outline" onClick={() => setIsManualEventModalOpen(true)}>
              + Criar Novo Evento Manual
            </button>
          </div>

          {/* Search Box */}
          <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
            <label className="form-label" style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Pesquisar Competidor (Nome ou CPF), Touro ou Cia</label>
            <input 
              className="form-input" 
              value={relSearchQuery} 
              onChange={e => handleRelationalSearch(e.target.value)} 
              placeholder="Digite o nome do peão, CPF (apenas números), nome do touro ou nome da Cia..." 
              style={{ fontSize: '1.1rem', padding: '0.8rem' }}
            />
          </div>

          {/* Search Results */}
          {!selectedCompetidor && !selectedTouro && !selectedCia && relSearchQuery.trim() !== '' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              
              {/* Competidores Results */}
              <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--primary)', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                  Competidores ({relSearchResultCompetidores.length})
                </h3>
                {relSearchResultCompetidores.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {relSearchResultCompetidores.map(c => (
                      <div 
                        key={c.id} 
                        onClick={() => handleSelectCompetidor(c)}
                        style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', cursor: 'pointer', border: '1px solid transparent' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                      >
                        <strong>{c.nome}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          CPF: {c.cpf || 'Não informado'} | Cidade: {c.cidade || 'Não informada'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p style={{ color: 'var(--text-muted)' }}>Nenhum competidor encontrado.</p>}
              </div>

              {/* Touros Results */}
              <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--primary)', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                  Touros ({relSearchResultTouros.length})
                </h3>
                {relSearchResultTouros.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {relSearchResultTouros.map(t => (
                      <div 
                        key={t.id} 
                        onClick={() => handleSelectTouro(t)}
                        style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', cursor: 'pointer', border: '1px solid transparent' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                      >
                        <strong>{t.nome}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Cia: {t.cia} | Lado: {t.lado || 'Não informado'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p style={{ color: 'var(--text-muted)' }}>Nenhum touro encontrado.</p>}
              </div>

              {/* Cias Results */}
              <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--primary)', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                  Cias / Tropeiros ({relSearchResultCias.length})
                </h3>
                {relSearchResultCias.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {relSearchResultCias.map(cia => (
                      <div 
                        key={cia.id} 
                        onClick={() => handleSelectCia(cia)}
                        style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', cursor: 'pointer', border: '1px solid transparent' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                      >
                        <strong>{cia.nome}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Clique para ver os touros desta Cia</div>
                      </div>
                    ))}
                  </div>
                ) : <p style={{ color: 'var(--text-muted)' }}>Nenhuma Cia encontrada.</p>}
              </div>

            </div>
          )}

          {/* Selected Competidor Profile View */}
          {selectedCompetidor && (
            <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Ficha do Competidor</span>
                  <h2 style={{ fontSize: '2.2rem', margin: '0.2rem 0', textTransform: 'uppercase', fontWeight: '900' }}>{selectedCompetidor.nome}</h2>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                    <strong>CPF:</strong> {selectedCompetidor.cpf || 'Não informado'} | <strong>Cidade:</strong> {selectedCompetidor.cidade || 'Não informada'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-outline" onClick={() => openManualRideModal(null, selectedCompetidor.id, null)}>
                    + Cadastrar Montaria
                  </button>
                  <button className="btn btn-outline" onClick={() => setSelectedCompetidor(null)}>
                    Voltar à Pesquisa
                  </button>
                </div>
              </div>

              {/* Rides History by Event */}
              <div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', textTransform: 'uppercase' }}>Histórico de Eventos e Montarias ({relHistory.length})</h3>
                {relHistory.length > 0 ? (
                  (() => {
                    // Group rides by event
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
                      <div key={event.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '1.2rem', textTransform: 'uppercase', color: 'var(--primary)' }}>{event.nome}</h4>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cidade: {event.cidade} | Data: {event.data || 'Não informada'}</span>
                          </div>
                          <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', height: 'auto' }} onClick={() => openManualRideModal(event.id, selectedCompetidor.id, null)}>
                            + Adicionar Montaria
                          </button>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                            <thead>
                              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <th style={{ padding: '0.6rem', borderBottom: '1px solid var(--border-light)' }}>Round</th>
                                <th style={{ padding: '0.6rem', borderBottom: '1px solid var(--border-light)' }}>Touro / Cia</th>
                                <th style={{ padding: '0.6rem', borderBottom: '1px solid var(--border-light)' }}>Tempo</th>
                                <th style={{ padding: '0.6rem', borderBottom: '1px solid var(--border-light)' }}>Notas Juízes (Peão/Touro)</th>
                                <th style={{ padding: '0.6rem', borderBottom: '1px solid var(--border-light)' }}>Total</th>
                                <th style={{ padding: '0.6rem', borderBottom: '1px solid var(--border-light)' }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rides.map(r => (
                                <tr key={r.id}>
                                  <td style={{ padding: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{r.dia}</td>
                                  <td style={{ padding: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    {r.rel_touros ? (
                                      <span style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleSelectTouro(r.rel_touros)}>
                                        {r.rel_touros.nome}
                                      </span>
                                    ) : 'Desconhecido'}
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cia: {r.rel_touros?.cia || 'Desconhecida'}</div>
                                  </td>
                                  <td style={{ padding: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{r.tempo != null ? `${r.tempo}s` : '-'}</td>
                                  <td style={{ padding: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    P: {r.j1_peao} / {r.j2_peao} | T: {r.j1_touro} / {r.j2_touro}
                                  </td>
                                  <td style={{ padding: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 'bold' }}>{r.nota_final} pts</td>
                                  <td style={{ padding: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <span style={{ color: r.status === 'ativa' ? '#10b981' : '#ef4444', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                      {r.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ));
                  })()
                ) : (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Este competidor ainda não tem montarias registradas.</p>
                )}
              </div>
            </div>
          )}

          {/* Selected Touro Profile View */}
          {selectedTouro && (
            <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Ficha do Touro</span>
                  <h2 style={{ fontSize: '2.2rem', margin: '0.2rem 0', textTransform: 'uppercase', fontWeight: '900' }}>{selectedTouro.nome}</h2>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                    <strong>CIA / Tropeiro:</strong> {selectedTouro.cia} | <strong>Lado de Pulada:</strong> {selectedTouro.lado || 'Não informado'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-outline" onClick={() => openManualRideModal(null, null, selectedTouro.id)}>
                    + Cadastrar Montaria
                  </button>
                  <button className="btn btn-outline" onClick={() => setSelectedTouro(null)}>
                    Voltar à Pesquisa
                  </button>
                </div>
              </div>

              {/* Rides History */}
              <div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', textTransform: 'uppercase' }}>Montarias registradas neste Touro ({relHistory.length})</h3>
                {relHistory.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>Evento</th>
                          <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>Competidor</th>
                          <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>Round</th>
                          <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>Tempo</th>
                          <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>Nota Final</th>
                          <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relHistory.map(r => (
                          <tr key={r.id}>
                            <td style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <strong>{r.rel_eventos?.nome || 'Manual'}</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.rel_eventos?.cidade}</div>
                            </td>
                            <td style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              {r.rel_competidores ? (
                                <span style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleSelectCompetidor(r.rel_competidores)}>
                                  {r.rel_competidores.nome}
                                </span>
                              ) : 'Desconhecido'}
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CPF: {r.rel_competidores?.cpf || '-'}</div>
                            </td>
                            <td style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{r.dia}</td>
                            <td style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{r.tempo != null ? `${r.tempo}s` : '-'}</td>
                            <td style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 'bold' }}>{r.nota_final} pts</td>
                            <td style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <span style={{ color: r.status === 'ativa' ? '#10b981' : '#ef4444', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Nenhuma montaria registrada neste touro.</p>
                )}
              </div>
            </div>
          )}

          {/* Selected Cia View */}
          {selectedCia && (
            <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Companhia de Rodeio</span>
                  <h2 style={{ fontSize: '2.2rem', margin: '0.2rem 0', textTransform: 'uppercase', fontWeight: '900' }}>{selectedCia.nome}</h2>
                </div>
                <button className="btn btn-outline" onClick={() => setSelectedCia(null)}>
                  Voltar à Pesquisa
                </button>
              </div>

              {/* Bulls List */}
              <div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', textTransform: 'uppercase' }}>Touros Associados ({ciaBulls.length})</h3>
                {ciaBulls.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                    {ciaBulls.map(b => (
                      <div 
                        key={b.id} 
                        onClick={() => handleSelectTouro(b)}
                        style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
                      >
                        <h4 style={{ margin: 0, color: 'var(--accent)', textTransform: 'uppercase' }}>{b.nome}</h4>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lado: {b.lado || 'Não informado'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>Nenhum touro associado a esta Cia no momento.</p>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Manual Event Registration Modal */}
      {isManualEventModalOpen && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="auth-modal" style={{ maxWidth: '500px', width: '100%' }}>
            <button className="close-btn" onClick={() => setIsManualEventModalOpen(false)}>×</button>
            <h2 style={{ marginBottom: '1.5rem', textTransform: 'uppercase' }}>Novo Evento Manual</h2>
            <form onSubmit={handleCreateManualEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Nome do Evento</label>
                <input 
                  className="form-input" 
                  value={manualEventName} 
                  onChange={e => setManualEventName(e.target.value)} 
                  placeholder="Ex: RODEIO DE COLORADO"
                  required 
                />
              </div>
              <div>
                <label className="form-label">Cidade / Estado</label>
                <input 
                  className="form-input" 
                  value={manualEventCidade} 
                  onChange={e => setManualEventCidade(e.target.value)} 
                  placeholder="Ex: COLORADO - PR"
                  required 
                />
              </div>
              <div>
                <label className="form-label">Data</label>
                <input 
                  className="form-input" 
                  value={manualEventData} 
                  onChange={e => setManualEventData(e.target.value)} 
                  placeholder="Ex: 23/06/2026"
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                Criar Evento
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manual Ride Registration Modal */}
      {isManualRideModalOpen && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="auth-modal" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="close-btn" onClick={() => setIsManualRideModalOpen(false)}>×</button>
            <h2 style={{ marginBottom: '1.5rem', textTransform: 'uppercase' }}>Cadastrar Montaria</h2>
            <form onSubmit={handleCreateManualRide} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div>
                <label className="form-label">Evento</label>
                <select 
                  className="form-input" 
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
                <div>
                  <label className="form-label">ID do Competidor</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={manualRideCompetidorId || ''} 
                    onChange={e => setManualRideCompetidorId(Number(e.target.value) || null)} 
                    required 
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Nome do Touro</label>
                  <input 
                    className="form-input" 
                    value={manualRideTouroNome} 
                    onChange={e => setManualRideTouroNome(e.target.value)} 
                    placeholder="Ex: ACESSO NEGADO"
                    required 
                  />
                </div>
                <div>
                  <label className="form-label">Cia / Tropeiro</label>
                  <input 
                    className="form-input" 
                    value={manualRideCiaNome} 
                    onChange={e => setManualRideCiaNome(e.target.value)} 
                    placeholder="Ex: TERCIO MIRANDA"
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Round / Dia</label>
                  <input 
                    className="form-input" 
                    value={rideDia} 
                    onChange={e => setRideDia(e.target.value)} 
                    placeholder="Ex: DIA 1"
                    required 
                  />
                </div>
                <div>
                  <label className="form-label">Tempo (segundos)</label>
                  <input 
                    type="number"
                    step="0.01"
                    className="form-input" 
                    value={rideTempo} 
                    onChange={e => setRideTempo(e.target.value)} 
                    required 
                  />
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select 
                    className="form-input" 
                    value={rideStatus} 
                    onChange={e => setRideStatus(e.target.value)}
                  >
                    <option value="ativa">Parada (8 segundos)</option>
                    <option value="queda">Queda</option>
                  </select>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: 'var(--primary)', textTransform: 'uppercase' }}>Notas dos Juízes</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Juiz 1 - Nota Peão</label>
                    <input type="number" step="0.25" className="form-input" value={rideJ1Peao} onChange={e => setRideJ1Peao(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Juiz 1 - Nota Touro</label>
                    <input type="number" step="0.25" className="form-input" value={rideJ1Touro} onChange={e => setRideJ1Touro(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Juiz 2 - Nota Peão</label>
                    <input type="number" step="0.25" className="form-input" value={rideJ2Peao} onChange={e => setRideJ2Peao(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Juiz 2 - Nota Touro</label>
                    <input type="number" step="0.25" className="form-input" value={rideJ2Touro} onChange={e => setRideJ2Touro(e.target.value)} />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                Salvar Montaria
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create New Competidor Modal */}
      {isNewCompetidorModalOpen && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="auth-modal" style={{ maxWidth: '500px', width: '100%' }}>
            <button className="close-btn" onClick={() => setIsNewCompetidorModalOpen(false)}>×</button>
            <h2 style={{ marginBottom: '1.5rem', textTransform: 'uppercase' }}>Novo Competidor</h2>
            <form onSubmit={handleCreateCompetidor} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Nome Completo</label>
                <input 
                  className="form-input" 
                  value={newCompetidorNome} 
                  onChange={e => setNewCompetidorNome(e.target.value)} 
                  placeholder="Ex: ADRIANO MORAES"
                  required 
                />
              </div>
              <div>
                <label className="form-label">CPF (Apenas números)</label>
                <input 
                  className="form-input" 
                  value={newCompetidorCpf} 
                  onChange={e => setNewCompetidorCpf(e.target.value)} 
                  placeholder="Ex: 12345678901"
                />
              </div>
              <div>
                <label className="form-label">Cidade de Origem</label>
                <input 
                  className="form-input" 
                  value={newCompetidorCidade} 
                  onChange={e => setNewCompetidorCidade(e.target.value)} 
                  placeholder="Ex: QUINTANA - SP"
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                Salvar Competidor
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create New Touro Modal */}
      {isNewTouroModalOpen && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="auth-modal" style={{ maxWidth: '500px', width: '100%' }}>
            <button className="close-btn" onClick={() => setIsNewTouroModalOpen(false)}>×</button>
            <h2 style={{ marginBottom: '1.5rem', textTransform: 'uppercase' }}>Novo Touro</h2>
            <form onSubmit={handleCreateTouro} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Nome do Touro</label>
                <input 
                  className="form-input" 
                  value={newTouroNome} 
                  onChange={e => setNewTouroNome(e.target.value)} 
                  placeholder="Ex: ACESSO NEGADO"
                  required 
                />
              </div>
              <div>
                <label className="form-label">Cia / Proprietário</label>
                <input 
                  className="form-input" 
                  value={newTouroCia} 
                  onChange={e => setNewTouroCia(e.target.value)} 
                  placeholder="Ex: TERCIO MIRANDA"
                  required 
                />
              </div>
              <div>
                <label className="form-label">Lado Preferido de Giro</label>
                <select 
                  className="form-input" 
                  value={newTouroLado} 
                  onChange={e => setNewTouroLado(e.target.value)}
                >
                  <option value="Esquerdo">Esquerdo</option>
                  <option value="Direito">Direito</option>
                  <option value="Indefinido">Indefinido</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                Salvar Touro
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'artes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            
            {/* Form Controls */}
            <div style={{ flex: '1 1 400px', background: 'var(--bg-card)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h3 style={{ textTransform: 'uppercase', margin: 0, color: 'var(--accent)', fontSize: '1.3rem' }}>Configurações da Arte</h3>
              
              <div>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Título</span>
                  <input type="checkbox" checked={artShowTitle} onChange={e => setArtShowTitle(e.target.checked)} style={{ width: 'auto', cursor: 'pointer' }} />
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={artTitle} 
                  onChange={e => setArtTitle(e.target.value)} 
                  disabled={!artShowTitle}
                  placeholder="Ex: Maior Nota"
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Subtítulo</span>
                  <input type="checkbox" checked={artShowSubtitle} onChange={e => setArtShowSubtitle(e.target.checked)} style={{ width: 'auto', cursor: 'pointer' }} />
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={artSubtitle} 
                  onChange={e => setArtSubtitle(e.target.value)} 
                  disabled={!artShowSubtitle}
                  placeholder="Ex: 1º Round"
                />
              </div>

              <div>
                <label className="form-label">Imagem de Fundo (Inspiração/Modelo)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="form-input"
                  onChange={e => handlePhotoUpload(e, (b64) => setArtBgImage(b64))} 
                />
                {artBgImage && (
                  <button className="btn btn-outline" style={{ marginTop: '0.5rem', color: '#ef4444', borderColor: '#ef4444', padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setArtBgImage('')}>
                    Remover Fundo
                  </button>
                )}
              </div>

              <div>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Logo da Festa / Evento</span>
                  <input type="checkbox" checked={artShowEventLogo} onChange={e => setArtShowEventLogo(e.target.checked)} style={{ width: 'auto', cursor: 'pointer' }} />
                </label>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="form-input"
                  disabled={!artShowEventLogo}
                  onChange={e => handlePhotoUpload(e, (b64) => setArtEventLogo(b64))} 
                />
                {artEventLogo && artShowEventLogo && (
                  <button className="btn btn-outline" style={{ marginTop: '0.5rem', color: '#ef4444', borderColor: '#ef4444', padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setArtEventLogo('')}>
                    Remover Logo
                  </button>
                )}
              </div>

              <button 
                onClick={handleDownloadArt} 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '1rem', fontWeight: 'bold', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                disabled={isGeneratingArt}
              >
                {isGeneratingArt ? 'Gerando Imagem...' : 'Baixar Arte (Instagram)'}
              </button>
            </div>

            {/* Preview Container */}
            <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <h3 style={{ textTransform: 'uppercase', margin: 0, fontSize: '1.1rem', color: 'var(--text-muted)' }}>Pré-visualização (4:5 Feed)</h3>
              
              {/* Scaled viewport wrapper */}
              <div style={{
                width: '400px',
                height: '500px',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '16px',
                border: '1px solid var(--border-light)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                background: '#151515'
              }}>
                
                {/* 1080x1350 Canvas Node scaled down by 0.37037 */}
                <div 
                  id="instagram-art-canvas"
                  style={{
                    width: '1080px',
                    height: '1350px',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    transform: 'scale(0.37037)',
                    transformOrigin: 'top left',
                    background: '#151515',
                    backgroundImage: artBgImage ? `url(${artBgImage})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    fontFamily: "'Inter', sans-serif",
                    color: 'white',
                    userSelect: 'none'
                  }}
                >
                  
                  {/* Top Header Logo Placeholder (Header Logo) */}
                  <div style={{
                    position: 'absolute',
                    top: '40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '100%',
                    textAlign: 'center',
                    zIndex: 2
                  }}>
                    <img src="/splash_logo.png" style={{ height: '70px', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>

                  {/* Top Left Title/Subtitle */}
                  <div style={{
                    position: 'absolute',
                    top: '120px',
                    left: '60px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '12px',
                    zIndex: 5
                  }}>
                    {artShowTitle && artTitle && (
                      <div style={{
                        background: 'white',
                        color: 'black',
                        padding: '16px 45px',
                        fontSize: '78px',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        lineHeight: 1,
                        letterSpacing: '-0.02em',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                        fontFamily: "'Arial Black', sans-serif"
                      }}>
                        {artTitle}
                      </div>
                    )}
                    {artShowSubtitle && artSubtitle && (
                      <div style={{
                        background: 'black',
                        color: 'white',
                        padding: '10px 30px',
                        fontSize: '36px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        lineHeight: 1,
                        letterSpacing: '0.05em',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        {artSubtitle}
                      </div>
                    )}
                  </div>

                  {/* Top Right Event Logo */}
                  {artShowEventLogo && artEventLogo && (
                    <div style={{
                      position: 'absolute',
                      top: '120px',
                      right: '60px',
                      zIndex: 5
                    }}>
                      <img 
                        src={artEventLogo} 
                        style={{
                          width: '160px',
                          height: '160px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '6px solid white',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                        }} 
                      />
                    </div>
                  )}

                  {/* Bottom shadow & overlays */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '520px',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0.4) 75%, rgba(0,0,0,0) 100%)',
                    zIndex: 3
                  }} />

                  {/* Brand name and sponsors list */}
                  <div style={{
                    position: 'absolute',
                    bottom: '50px',
                    left: 0,
                    right: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '30px',
                    zIndex: 4,
                    width: '100%'
                  }}>
                    
                    {/* RODEOAPP.PRO Logo */}
                    <div style={{
                      fontSize: '36px',
                      fontWeight: 900,
                      fontStyle: 'italic',
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: 'white',
                      fontFamily: "'Trebuchet MS', sans-serif"
                    }}>
                      RODEO<span style={{ color: '#eab308' }}>APP.PRO</span>
                    </div>

                    {/* Sponsor logos row */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '45px',
                      flexWrap: 'wrap',
                      width: '100%',
                      padding: '0 60px'
                    }}>
                      {patrocinios.filter(p => p.status === 'ativo' && p.tipo === 'app').length > 0 ? (
                        patrocinios.filter(p => p.status === 'ativo' && p.tipo === 'app').map((p, idx) => (
                          <img 
                            key={idx}
                            src={p.logo_url} 
                            style={{
                              maxHeight: '65px',
                              maxWidth: '160px',
                              objectFit: 'contain',
                              filter: 'brightness(0) invert(1)'
                            }} 
                          />
                        ))
                      ) : (
                        <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          Nenhum Patrocinador Ativo (App)
                        </div>
                      )}
                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
