import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import BoiadaVisualEditor from './BoiadaVisualEditor';
import { toPng } from 'html-to-image';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'events' | 'boiadas' | 'noticias' | 'patrocinios' | 'competidores' | 'artes' | 'tablet'>('overview');
  
  // Tablet Control states
  const [selectedTabletEventId, setSelectedTabletEventId] = useState<string | null>(null);
  const [tabletDiaAtivo, setTabletDiaAtivo] = useState<string>('DIA 1');
  const [tabletDiasDisponiveis, setTabletDiasDisponiveis] = useState<string[]>(['DIA 1', 'DIA 2', 'DIA 3', 'FINAL']);
  const [tabletTicker, setTabletTicker] = useState<string>('');
  const [tabletNoticias, setTabletNoticias] = useState<string[]>([]);
  const [newTabletNoticiaInput, setNewTabletNoticiaInput] = useState<string>('');
  const [tabletAberturaAtiva, setTabletAberturaAtiva] = useState<boolean>(false);
  const [tabletAberturaTitulo, setTabletAberturaTitulo] = useState<string>('ABERTURA OFICIAL');
  const [tabletAberturaSubtitulo, setTabletAberturaSubtitulo] = useState<string>('RODEOAPP');
  const [tabletAberturaMidiaUrl, setTabletAberturaMidiaUrl] = useState<string>('');
  const [tabletAberturaTexto, setTabletAberturaTexto] = useState<string>('');
  const [tabletAberturaCompetidoresDestaque, setTabletAberturaCompetidoresDestaque] = useState<string[]>([]);
  const [newTabletCompetidorInput, setNewTabletCompetidorInput] = useState<string>('');
  const [isSavingTabletConfig, setIsSavingTabletConfig] = useState<boolean>(false);

  // Artes tab states
  const [selectedArtTemplate, setSelectedArtTemplate] = useState<string | null>(null);
  const [artBgImage, setArtBgImage] = useState<string>('');
  const [artTitle, setArtTitle] = useState<string>('Maior Nota');
  const [artShowTitle, setArtShowTitle] = useState<boolean>(true);
  const [artSubtitle, setArtSubtitle] = useState<string>('1º Round');
  const [artShowSubtitle, setArtShowSubtitle] = useState<boolean>(true);
  const [artEventLogo, setArtEventLogo] = useState<string>('');
  const [artShowEventLogo, setArtShowEventLogo] = useState<boolean>(true);
  const [isGeneratingArt, setIsGeneratingArt] = useState<boolean>(false);
  const [artFont, setArtFont] = useState<string>('Montserrat');
  const [artCredits, setArtCredits] = useState<string>('');
  const [artShowCredits, setArtShowCredits] = useState<boolean>(true);
  const [artShowSponsors, setArtShowSponsors] = useState<boolean>(true);
  const [isAccordionContentOpen, setIsAccordionContentOpen] = useState<boolean>(true);
  const [isAccordionLayoutOpen, setIsAccordionLayoutOpen] = useState<boolean>(false);

  // Layout fine-tuning transformations
  const [bgX, setBgX] = useState<number>(0);
  const [bgY, setBgY] = useState<number>(0);
  const [bgScale, setBgScale] = useState<number>(1);
  const [textX, setTextX] = useState<number>(0);
  const [textY, setTextY] = useState<number>(0);
  const [textScale, setTextScale] = useState<number>(1);
  const [logoX, setLogoX] = useState<number>(0);
  const [logoY, setLogoY] = useState<number>(0);
  const [logoScale, setLogoScale] = useState<number>(1);

  const handleResetLayout = () => {
    setBgX(0);
    setBgY(0);
    setBgScale(1);
    setTextX(0);
    setTextY(0);
    setTextScale(1);
    setLogoX(0);
    setLogoY(0);
    setLogoScale(1);
  };

  const handleDownloadHtmlArt = async () => {
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
      alert('Erro ao gerar imagem HTML. Tente novamente.');
    } finally {
      setIsGeneratingArt(false);
    }
  };

  const getEventCompetitors = (ev: any): string[] => {
    if (!ev) return [];
    const det = ev.detalhes || {};
    const set = new Set<string>();

    if (Array.isArray(det.sorteios)) {
      det.sorteios.forEach((s: any) => {
        const riders = s.riders || s.peoes || s.competidores || s.peoes_lista || [];
        riders.forEach((r: any) => {
          const name = typeof r === 'string' ? r : (r?.nome || r?.name || r?.peao);
          if (name && typeof name === 'string' && name.trim()) set.add(name.trim());
        });
      });
    }

    if (det.sorteio) {
      const riders = Array.isArray(det.sorteio) ? det.sorteio : (det.sorteio.riders || det.sorteio.peoes || det.sorteio.competidores || []);
      riders.forEach((r: any) => {
        const name = typeof r === 'string' ? r : (r?.nome || r?.name || r?.peao);
        if (name && typeof name === 'string' && name.trim()) set.add(name.trim());
      });
    }

    const montarias = [...(det.notas || []), ...(det.notes || []), ...(det.montarias || [])];
    montarias.forEach((m: any) => {
      const name = typeof m === 'string' ? m : (m?.peao || m?.competidor || m?.rider || m?.nome);
      if (name && typeof name === 'string' && name.trim()) set.add(name.trim());
    });

    const compList = [...(det.competidores || []), ...(det.inscritos || []), ...(det.peoes || [])];
    compList.forEach((c: any) => {
      const name = typeof c === 'string' ? c : (c?.nome || c?.name || c?.peao);
      if (name && typeof name === 'string' && name.trim()) set.add(name.trim());
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  };

  const handleSelectEventForTablet = (ev: any) => {
    setSelectedTabletEventId(ev.id);
    const tc = ev.detalhes?.tablet_config || {};
    setTabletDiaAtivo(tc.dia_ativo || 'DIA 1');
    setTabletDiasDisponiveis(tc.dias_disponiveis || ['DIA 1', 'DIA 2', 'DIA 3', 'FINAL']);
    setTabletTicker(tc.ticker_noticias || tc.ticker || '');
    setTabletNoticias(tc.noticias || []);
    setTabletAberturaAtiva(!!tc.abertura_ativa);
    setTabletAberturaTitulo(tc.abertura_titulo || 'ABERTURA OFICIAL');
    setTabletAberturaSubtitulo(tc.abertura_subtitulo || ev.nome || 'RODEOAPP');
    setTabletAberturaMidiaUrl(tc.abertura_midia_url || '');
    setTabletAberturaTexto(tc.abertura_texto || '');

    const savedComps = tc.abertura_competidores_destaque || tc.competidores_destaque;
    const eventComps = getEventCompetitors(ev);

    if (Array.isArray(savedComps)) {
      setTabletAberturaCompetidoresDestaque(savedComps);
    } else {
      setTabletAberturaCompetidoresDestaque([]);
    }
  };

  const handleAddTabletNoticia = () => {
    if (!newTabletNoticiaInput.trim()) return;
    setTabletNoticias(prev => [...prev, newTabletNoticiaInput.trim()]);
    setNewTabletNoticiaInput('');
  };

  const handleRemoveTabletNoticia = (index: number) => {
    setTabletNoticias(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddTabletCompetidor = () => {
    if (!newTabletCompetidorInput.trim()) return;
    setTabletAberturaCompetidoresDestaque(prev => [...prev, newTabletCompetidorInput.trim()]);
    setNewTabletCompetidorInput('');
  };

  const handleRemoveTabletCompetidor = (index: number) => {
    setTabletAberturaCompetidoresDestaque(prev => prev.filter((_, i) => i !== index));
  };

  const handlePullAllEventCompetitors = () => {
    const selectedEv = events.find(e => e.id === selectedTabletEventId);
    if (!selectedEv) return;
    const eventComps = getEventCompetitors(selectedEv);
    if (eventComps.length === 0) {
      alert("Nenhum competidor cadastrado nas montarias/sorteios deste evento.");
      return;
    }
    setTabletAberturaCompetidoresDestaque(eventComps);
  };

  const handleToggleEventCompetidor = (compName: string) => {
    setTabletAberturaCompetidoresDestaque(prev => {
      if (prev.includes(compName)) {
        return prev.filter(c => c !== compName);
      } else {
        return [...prev, compName];
      }
    });
  };

  const handleToggleTabletDiaDisponivel = (day: string) => {
    if (tabletDiasDisponiveis.includes(day)) {
      if (tabletDiasDisponiveis.length === 1) return alert("Ao menos 1 dia deve estar disponível.");
      setTabletDiasDisponiveis(prev => prev.filter(d => d !== day));
    } else {
      setTabletDiasDisponiveis(prev => [...prev, day]);
    }
  };

  const handleSaveTabletConfig = async () => {
    if (!selectedTabletEventId) return;
    setIsSavingTabletConfig(true);
    try {
      const ev = events.find(e => e.id === selectedTabletEventId);
      if (!ev) return;

      const tabletConfig = {
        dia_ativo: tabletDiaAtivo,
        dias_disponiveis: tabletDiasDisponiveis,
        ticker_noticias: tabletTicker,
        noticias: tabletNoticias,
        abertura_ativa: tabletAberturaAtiva,
        abertura_titulo: tabletAberturaTitulo,
        abertura_subtitulo: tabletAberturaSubtitulo,
        abertura_midia_url: tabletAberturaMidiaUrl,
        abertura_texto: tabletAberturaTexto,
        abertura_competidores_destaque: tabletAberturaCompetidoresDestaque,
        updated_at: new Date().toISOString()
      };

      const updatedDetalhes = {
        ...(ev.detalhes || {}),
        tablet_config: tabletConfig
      };

      const { error } = await supabase
        .from('eventos_oficiais')
        .update({ detalhes: updatedDetalhes })
        .eq('id', selectedTabletEventId);

      if (error) throw error;

      setEvents(prev => prev.map(item => item.id === selectedTabletEventId ? { ...item, detalhes: updatedDetalhes } : item));
      alert('📱 Configurações do Controle Tablet salvas com sucesso!');
    } catch (err: any) {
      console.error('Error saving tablet config', err);
      alert('Erro ao salvar configurações do Tablet: ' + (err.message || err));
    } finally {
      setIsSavingTabletConfig(false);
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
        <button className={`btn ${activeTab === 'tablet' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('tablet')} style={{ borderColor: '#d4af37', color: activeTab === 'tablet' ? '#000' : '#d4af37' }}>
          📱 Controle Tablet
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
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,700;0,800;0,900;1,900&display=swap');
          `}</style>
          
          {selectedArtTemplate === null ? (
            /* Model Selection Gallery */
            <div style={{ background: 'var(--bg-card)', padding: '2.5rem', borderRadius: '24px', border: '1px solid var(--border-light)' }}>
              <h2 style={{ textTransform: 'uppercase', margin: '0 0 0.5rem 0', color: 'var(--text-light)', letterSpacing: '0.05em' }}>Modelos de Artes Disponíveis</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem' }}>Selecione um modelo de arte para customizar e gerar a imagem final para as redes sociais.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
                <div 
                  onClick={() => setSelectedArtTemplate('maior_da_noite')}
                  style={{
                    background: '#151515',
                    borderRadius: '16px',
                    border: '2px solid var(--border-light)',
                    padding: '1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.transform = 'translateY(-5px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border-light)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div style={{ 
                    height: '160px', 
                    background: 'linear-gradient(135deg, #1e1e1e 0%, #111 100%)', 
                    borderRadius: '12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    fontSize: '2.5rem'
                  }}>
                    🏆
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>Arte Maior da Noite</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.4' }}>
                      Gere posts de Instagram no formato 4:5 contendo a maior nota da noite, patrocinadores em branco e foto de fundo da montaria.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Selected Art Editor Screen */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button 
                  onClick={() => setSelectedArtTemplate(null)}
                  className="btn btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                >
                  ← Voltar para Modelos
                </button>
                <h2 style={{ margin: 0, fontSize: '1.5rem', textTransform: 'uppercase', color: 'var(--text-light)' }}>
                  {selectedArtTemplate === 'maior_da_noite' && 'Arte Maior da Noite'}
                </h2>
              </div>

              {selectedArtTemplate === 'maior_da_noite' && (
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                  
                  {/* Form Controls */}
                  <div style={{ flex: '1 1 400px', background: 'var(--bg-card)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <h3 style={{ textTransform: 'uppercase', margin: 0, color: 'var(--accent)', fontSize: '1.3rem' }}>Configurações da Arte</h3>
                    
                    {/* Bloco 1: Conteúdo, Imagens e Patrocinadores */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div 
                        onClick={() => setIsAccordionContentOpen(!isAccordionContentOpen)}
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        <span style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          📝 1. Conteúdo & Imagens
                        </span>
                        <span style={{ fontSize: '1.1rem', color: 'var(--accent)' }}>
                          {isAccordionContentOpen ? '▼' : '▶'}
                        </span>
                      </div>

                      {isAccordionContentOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '0.5rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
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
                            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>Créditos da Foto</span>
                              <input type="checkbox" checked={artShowCredits} onChange={e => setArtShowCredits(e.target.checked)} style={{ width: 'auto', cursor: 'pointer' }} />
                            </label>
                            <input 
                              type="text" 
                              className="form-input" 
                              value={artCredits} 
                              onChange={e => setArtCredits(e.target.value)} 
                              disabled={!artShowCredits}
                              placeholder="Ex: Foto por: @nomedofotografo"
                            />
                          </div>

                          <div>
                            <label className="form-label">Fonte da Arte</label>
                            <select 
                              className="form-input" 
                              value={artFont} 
                              onChange={e => setArtFont(e.target.value)}
                            >
                              <option value="Montserrat">Montserrat</option>
                              <option value="Inter">Inter</option>
                              <option value="Outfit">Outfit</option>
                              <option value="Articulat CF">Articulat CF</option>
                              <option value="Arial Black">Arial Black</option>
                            </select>
                          </div>

                          <div>
                            <label className="form-label">Imagem de Fundo (Montaria)</label>
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

                          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0, cursor: 'pointer' }}>
                              <span style={{ fontWeight: 500, color: 'var(--text-light)' }}>Exibir Patrocinadores no Rodapé</span>
                              <input type="checkbox" checked={artShowSponsors} onChange={e => setArtShowSponsors(e.target.checked)} style={{ width: 'auto', cursor: 'pointer' }} />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bloco 2: Ajuste de Posições e Tamanho */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div 
                        onClick={() => setIsAccordionLayoutOpen(!isAccordionLayoutOpen)}
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        <span style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          📐 2. Ajustes de Posições & Tamanho
                        </span>
                        <span style={{ fontSize: '1.1rem', color: 'var(--accent)' }}>
                          {isAccordionLayoutOpen ? '▼' : '▶'}
                        </span>
                      </div>

                      {isAccordionLayoutOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '0.5rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          {/* Background adjustments */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-light)' }}>Foto de Fundo:</span>
                            <div>
                              <label className="form-label" style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Zoom (Escala): {bgScale.toFixed(2)}x</span>
                              </label>
                              <input type="range" min="0.5" max="3" step="0.05" value={bgScale} onChange={e => setBgScale(parseFloat(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                              <div>
                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Mover X: {bgX}px</label>
                                <input type="range" min="-500" max="500" step="5" value={bgX} onChange={e => setBgX(parseInt(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                              </div>
                              <div>
                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Mover Y: {bgY}px</label>
                                <input type="range" min="-500" max="500" step="5" value={bgY} onChange={e => setBgY(parseInt(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                              </div>
                            </div>
                          </div>

                          {/* Titles adjustments */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-light)' }}>Textos (Títulos):</span>
                            <div>
                              <label className="form-label" style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Tamanho (Escala): {textScale.toFixed(2)}x</span>
                              </label>
                              <input type="range" min="0.5" max="2" step="0.05" value={textScale} onChange={e => setTextScale(parseFloat(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                              <div>
                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Mover X: {textX}px</label>
                                <input type="range" min="-200" max="500" step="5" value={textX} onChange={e => setTextX(parseInt(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                              </div>
                              <div>
                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Mover Y: {textY}px</label>
                                <input type="range" min="-300" max="500" step="5" value={textY} onChange={e => setTextY(parseInt(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                              </div>
                            </div>
                          </div>

                          {/* Event Logo adjustments */}
                          {artShowEventLogo && artEventLogo && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                              <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-light)' }}>Logo do Evento:</span>
                              <div>
                                <label className="form-label" style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Tamanho (Escala): {logoScale.toFixed(2)}x</span>
                                </label>
                                <input type="range" min="0.3" max="2" step="0.05" value={logoScale} onChange={e => setLogoScale(parseFloat(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <div>
                                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Mover X: {logoX}px</label>
                                  <input type="range" min="-500" max="200" step="5" value={logoX} onChange={e => setLogoX(parseInt(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                                </div>
                                <div>
                                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Mover Y: {logoY}px</label>
                                  <input type="range" min="-200" max="500" step="5" value={logoY} onChange={e => setLogoY(parseInt(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                                </div>
                              </div>
                            </div>
                          )}

                          <button 
                            onClick={handleResetLayout} 
                            className="btn btn-outline" 
                            style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', color: '#999', borderColor: '#444' }}
                          >
                            Resetar Posições
                          </button>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={handleDownloadHtmlArt} 
                      className="btn btn-primary" 
                      style={{ width: '100%', padding: '1rem', fontWeight: 'bold', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
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
                          fontFamily: "'Inter', sans-serif",
                          color: 'white',
                          userSelect: 'none',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Background Image Layer */}
                        {artBgImage && (
                          <img 
                            src={artBgImage} 
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '1080px',
                              height: '1350px',
                              objectFit: 'cover',
                              transform: `translate(${bgX}px, ${bgY}px) scale(${bgScale})`,
                              transformOrigin: 'center center',
                              zIndex: 1
                            }}
                          />
                        )}

                        {/* Top Left Title/Subtitle */}
                        <div style={{
                          position: 'absolute',
                          top: '120px',
                          left: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: '12px',
                          zIndex: 5,
                          transform: `translate(${textX}px, ${textY}px) scale(${textScale})`,
                          transformOrigin: 'top left'
                        }}>
                          {artShowTitle && artTitle && (
                            <div style={{
                              background: 'white',
                              color: 'black',
                              padding: '16px 45px 16px 60px',
                              fontSize: '78px',
                              fontWeight: 900,
                              lineHeight: 1.1,
                              letterSpacing: '-0.06em',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                              fontFamily: artFont === 'Articulat CF' ? "'Articulat CF - Heavy', 'Articulat CF', 'Arial Black', sans-serif" : `'${artFont}', sans-serif`
                            }}>
                              {artTitle}
                            </div>
                          )}
                          {artShowSubtitle && artSubtitle && (
                            <div style={{
                              background: 'black',
                              color: 'white',
                              padding: '12px 30px 12px 60px',
                              fontSize: '36px',
                              fontWeight: 500,
                              lineHeight: 1,
                              letterSpacing: '-0.02em',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderLeft: 'none',
                              fontFamily: artFont === 'Articulat CF' ? "'Articulat CF - Normal', 'Articulat CF', 'Arial', sans-serif" : `'${artFont}', sans-serif`
                            }}>
                              {artSubtitle}
                            </div>
                          )}
                        </div>

                        {/* Top right corner dark gradient overlay */}
                        {artShowEventLogo && artEventLogo && (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: '560px',
                            height: '560px',
                            background: 'radial-gradient(circle at top right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 45%, rgba(0,0,0,0) 75%)',
                            zIndex: 4,
                            pointerEvents: 'none'
                          }} />
                        )}

                        {/* Top Right Event Logo */}
                        {artShowEventLogo && artEventLogo && (
                          <div style={{
                            position: 'absolute',
                            top: '70px',
                            right: '60px',
                            width: '260px',
                            height: '260px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            zIndex: 5,
                            transform: `translate(${logoX}px, ${logoY}px) scale(${logoScale})`,
                            transformOrigin: 'center center'
                          }}>
                            <img 
                              src={artEventLogo} 
                              style={{
                                width: '180px',
                                height: '180px',
                                objectFit: 'contain',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                              }} 
                            />
                          </div>
                        )}

                        {/* Rotated Credits Text (Centered Vertically) */}
                        {artShowCredits && artCredits && (
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            right: '20px',
                            transform: 'translate(50%, -50%) rotate(-90deg)',
                            transformOrigin: 'center center',
                            color: 'rgba(255, 255, 255, 0.55)',
                            fontSize: '20px',
                            fontWeight: 500,
                            letterSpacing: '0.05em',
                            zIndex: 10,
                            whiteSpace: 'nowrap',
                            textAlign: 'center',
                            fontFamily: artFont === 'Articulat CF' ? "'Articulat CF - Normal', 'Articulat CF', sans-serif" : `'${artFont}', sans-serif`
                          }}>
                            {artCredits}
                          </div>
                        )}

                        {/* Bottom shadow & overlays */}
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: artShowSponsors ? '520px' : '380px',
                          background: 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0.4) 75%, rgba(0,0,0,0) 100%)',
                          zIndex: 3
                        }} />

                        {/* Brand name and sponsors list */}
                        <div style={{
                          position: 'absolute',
                          bottom: artShowSponsors ? '50px' : '65px',
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
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <img 
                              src="/header_logo.png" 
                              style={{
                                height: '30px',
                                objectFit: 'contain'
                              }} 
                            />
                          </div>

                          {/* Sponsor logos row */}
                          {artShowSponsors && (
                            <div style={{
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              gap: '45px',
                              flexWrap: 'wrap',
                              width: '100%',
                              padding: '0 60px'
                            }}>
                              {patrocinios.filter(p => p.status === 'ativo').length > 0 ? (
                                patrocinios.filter(p => p.status === 'ativo').map((p, idx) => (
                                  <img 
                                    key={idx}
                                    src={p.detalhes?.splash_app?.logo_url || p.logo_url} 
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
                                  Nenhum Patrocinador Ativo
                                </div>
                              )}
                            </div>
                          )}

                        </div>

                      </div>

                    </div>

                  </div>

                </div>
              )}

            </div>
          )}
        </div>
      )}

      {activeTab === 'tablet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(200,148,28,0.02) 100%)', border: '1px solid rgba(212,175,55,0.2)', padding: '1.5rem 2rem', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', color: '#d4af37', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  📱 Controle do Tablet (Painel ao Vivo)
                </h3>
                <p style={{ margin: '0.3rem 0 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem' }}>
                  Gerencie em tempo real os dias ativos, notícias, avisos em faixa e a tela de abertura exibidos nos Tablets (rodeoapp.pro/tablet).
                </p>
              </div>
              <a
                href="/tablet"
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline"
                style={{ borderColor: '#d4af37', color: '#d4af37', fontWeight: 800, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                ↗ Abrir /tablet em Nova Aba
              </a>
            </div>
          </div>

          {/* Event Selector Grid */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1rem', color: 'var(--text-muted)' }}>
              1. Selecione o Evento para Controlar:
            </h4>
            {events.length === 0 ? (
              <div style={{ padding: '2rem', background: 'var(--bg-card)', borderRadius: '16px', textTransform: 'uppercase', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Nenhum evento oficial cadastrado.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                {events.map(ev => {
                  const isSelected = selectedTabletEventId === ev.id;
                  const tc = ev.detalhes?.tablet_config;
                  const activeDay = tc?.dia_ativo || 'N/D';
                  return (
                    <div
                      key={ev.id}
                      onClick={() => handleSelectEventForTablet(ev)}
                      style={{
                        padding: '1.25rem',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(212,175,55,0.12)' : 'var(--bg-card)',
                        border: isSelected ? '2px solid #d4af37' : '1px solid var(--border-light)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: isSelected ? '#d4af37' : 'var(--text-muted)' }}>
                          {ev.local || 'RODEIO'}
                        </span>
                        {tc?.abertura_ativa && (
                          <span style={{ background: '#dc2626', color: '#fff', fontSize: '0.65rem', fontWeight: 900, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                            🎬 ABERTURA ATIVA
                          </span>
                        )}
                      </div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase' }}>
                        {ev.nome}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.78rem' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Dia Ativo: <strong style={{ color: '#fff' }}>{activeDay}</strong></span>
                        <span style={{ color: isSelected ? '#d4af37' : 'var(--text-muted)', fontWeight: 800 }}>
                          {isSelected ? '✓ Selecionado' : 'Configurar →'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form Settings Panel */}
          {selectedTabletEventId && (
            <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '24px', border: '1px solid #d4af37', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.1em' }}>PAINEL DE CONTROLE DO TABLET AO VIVO</span>
                  <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.6rem', fontWeight: 900, textTransform: 'uppercase' }}>
                    {events.find(e => e.id === selectedTabletEventId)?.nome}
                  </h3>
                </div>
                <button
                  onClick={handleSaveTabletConfig}
                  disabled={isSavingTabletConfig}
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #d4af37 0%, #c8941c 100%)', color: '#000', fontWeight: 900, padding: '0.75rem 1.8rem', fontSize: '0.95rem' }}
                >
                  {isSavingTabletConfig ? 'Salvando...' : '💾 Salvar no Tablet ao Vivo'}
                </button>
              </div>

              {/* Section A: Active Days */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 800, textTransform: 'uppercase', color: '#d4af37', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📅 1. Round/Dia Atual em Destaque
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
                    Selecione qual round/dia será carregado por padrão na tela do tablet:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {['DIA 1', 'DIA 2', 'DIA 3', 'DIA 4', 'SEMI-FINAL', 'FINAL'].map(day => (
                      <button
                        key={day}
                        onClick={() => setTabletDiaAtivo(day)}
                        style={{
                          padding: '0.6rem 1.2rem',
                          borderRadius: '8px',
                          border: tabletDiaAtivo === day ? '2px solid #d4af37' : '1px solid rgba(255,255,255,0.1)',
                          background: tabletDiaAtivo === day ? '#d4af37' : 'rgba(255,255,255,0.03)',
                          color: tabletDiaAtivo === day ? '#000' : '#fff',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          textTransform: 'uppercase'
                        }}
                      >
                        {day} {tabletDiaAtivo === day ? '★' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 800, textTransform: 'uppercase', color: '#d4af37', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🗓️ 2. Rounds Habilitados no Tablet
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
                    Marque quais rounds os usuários poderão navegar no tablet:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {['DIA 1', 'DIA 2', 'DIA 3', 'DIA 4', 'SEMI-FINAL', 'FINAL'].map(day => {
                      const isChecked = tabletDiasDisponiveis.includes(day);
                      return (
                        <button
                          key={day}
                          onClick={() => handleToggleTabletDiaDisponivel(day)}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            border: isChecked ? '1px solid rgba(34,197,94,0.5)' : '1px solid rgba(255,255,255,0.1)',
                            background: isChecked ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.02)',
                            color: isChecked ? '#22c55e' : 'rgba(255,255,255,0.4)',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          {isChecked ? '✓ ' : '+ '} {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section B: News Ticker and Event News */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, textTransform: 'uppercase', color: '#d4af37', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📰 3. Notícias e Letreiro em Tempo Real (Ticker)
                </h4>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>
                    Texto do Letreiro Deslizante (Ticker Banner):
                  </label>
                  <input
                    type="text"
                    value={tabletTicker}
                    onChange={e => setTabletTicker(e.target.value)}
                    placeholder="Ex: Acompanhe os resultados oficiais da Etapa ao vivo pelo RodeoApp!"
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>
                    Avisos / Notícias Destaque do Evento:
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <input
                      type="text"
                      value={newTabletNoticiaInput}
                      onChange={e => setNewTabletNoticiaInput(e.target.value)}
                      placeholder="Adicionar novo aviso..."
                      onKeyDown={e => { if (e.key === 'Enter') handleAddTabletNoticia(); }}
                      style={{ flex: 1, padding: '0.65rem 1rem', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem' }}
                    />
                    <button onClick={handleAddTabletNoticia} className="btn btn-outline" style={{ borderColor: '#d4af37', color: '#d4af37', fontWeight: 800 }}>
                      + Adicionar Aviso
                    </button>
                  </div>

                  {tabletNoticias.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                      Nenhum aviso específico adicionado.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {tabletNoticias.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize: '0.85rem', color: '#fff' }}>• {item}</span>
                          <button onClick={() => handleRemoveTabletNoticia(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 800, cursor: 'pointer' }}>
                            ✕ Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Section C: Opening Control */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, textTransform: 'uppercase', color: '#d4af37', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🎬 4. Controle de Abertura (Tela Cheia no Tablet)
                  </h4>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={tabletAberturaAtiva}
                      onChange={e => setTabletAberturaAtiva(e.target.checked)}
                      style={{ width: '20px', height: '20px', accentColor: '#d4af37' }}
                    />
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: tabletAberturaAtiva ? '#22c55e' : 'rgba(255,255,255,0.4)' }}>
                      {tabletAberturaAtiva ? 'Modo Abertura ATIVADO' : 'Modo Abertura Desativado'}
                    </span>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>
                      Título Principal da Abertura:
                    </label>
                    <input
                      type="text"
                      value={tabletAberturaTitulo}
                      onChange={e => setTabletAberturaTitulo(e.target.value)}
                      placeholder="Ex: ABERTURA OFICIAL"
                      style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>
                      Subtítulo / Etapa:
                    </label>
                    <input
                      type="text"
                      value={tabletAberturaSubtitulo}
                      onChange={e => setTabletAberturaSubtitulo(e.target.value)}
                      placeholder="Ex: COPA MD SUPER BULLS 2026"
                      style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>
                    URL de Vídeo ou Foto da Abertura (Mídia):
                  </label>
                  <input
                    type="url"
                    value={tabletAberturaMidiaUrl}
                    onChange={e => setTabletAberturaMidiaUrl(e.target.value)}
                    placeholder="Ex: https://meuservidor.com/video-abertura.mp4 ou foto"
                    style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>

                {/* Featured Competitors Overlay Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#d4af37' }}>
                        ⭐ Competidores em Destaque (Aparecem em cima da foto na Abertura):
                      </label>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                        O sistema puxa automaticamente os competidores cadastrados neste evento. Selecione quais aparecerão na abertura ou adicione pessoas específicas (salva-vidas, convidados) abaixo.
                      </p>
                    </div>

                    {selectedTabletEventId && (() => {
                      const selectedEv = events.find(e => e.id === selectedTabletEventId);
                      const eventComps = getEventCompetitors(selectedEv);
                      return (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={handlePullAllEventCompetitors}
                            style={{ background: 'rgba(212,175,55,0.2)', border: '1px solid rgba(212,175,55,0.4)', color: '#d4af37', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                          >
                            ⚡ Puxar Todos ({eventComps.length})
                          </button>
                          {tabletAberturaCompetidoresDestaque.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setTabletAberturaCompetidoresDestaque([])}
                              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                            >
                              🗑️ Limpar
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Quick Selection List from Event Competitors */}
                  {selectedTabletEventId && (() => {
                    const selectedEv = events.find(e => e.id === selectedTabletEventId);
                    const eventComps = getEventCompetitors(selectedEv);
                    if (eventComps.length === 0) return null;

                    return (
                      <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                          Competidores Cadastrados neste Evento ({eventComps.length}):
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '140px', overflowY: 'auto' }}>
                          {eventComps.map((comp, idx) => {
                            const isSelected = tabletAberturaCompetidoresDestaque.includes(comp);
                            return (
                              <button
                                type="button"
                                key={idx}
                                onClick={() => handleToggleEventCompetidor(comp)}
                                style={{
                                  padding: '0.3rem 0.7rem',
                                  borderRadius: '8px',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  cursor: 'pointer',
                                  border: isSelected ? '1px solid #d4af37' : '1px solid rgba(255,255,255,0.1)',
                                  background: isSelected ? '#d4af37' : 'rgba(255,255,255,0.05)',
                                  color: isSelected ? '#000' : 'rgba(255,255,255,0.7)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.3rem'
                                }}
                              >
                                <span>{isSelected ? '✓' : '+'}</span>
                                <span>{comp}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Active Selected List */}
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                      Nomes Selecionados para a Tela de Abertura ({tabletAberturaCompetidoresDestaque.length}):
                    </span>
                    {tabletAberturaCompetidoresDestaque.length === 0 ? (
                      <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', margin: 0, padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                        Nenhum competidor em destaque selecionado. Clique nos nomes acima ou adicione manualmente abaixo.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {tabletAberturaCompetidoresDestaque.map((comp, idx) => (
                          <div
                            key={idx}
                            style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, color: '#f0d060', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'uppercase' }}
                          >
                            <span>⭐ {comp}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTabletCompetidor(idx)}
                              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontWeight: 900, padding: 0 }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Manual Input */}
                  <div style={{ paddingTop: '0.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem' }}>
                      ➕ Adicionar Pessoa Específica (Salva-Vidas, Locutor, Convidado):
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        value={newTabletCompetidorInput}
                        onChange={e => setNewTabletCompetidorInput(e.target.value)}
                        placeholder="Nome da pessoa ou salva-vidas (ex: Salva-Vidas Pirangueiro)..."
                        onKeyDown={e => { if (e.key === 'Enter') handleAddTabletCompetidor(); }}
                        style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem' }}
                      />
                      <button
                        type="button"
                        onClick={handleAddTabletCompetidor}
                        style={{ background: 'rgba(212,175,55,0.2)', border: '1px solid rgba(212,175,55,0.4)', color: '#d4af37', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', textTransform: 'uppercase' }}
                      >
                        + Adicionar Manual
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>
                    Texto / Discurso Oficial de Abertura:
                  </label>
                  <textarea
                    rows={3}
                    value={tabletAberturaTexto}
                    onChange={e => setTabletAberturaTexto(e.target.value)}
                    placeholder="Texto de abertura lido pela locução..."
                    style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem', resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* Bottom Action Save */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                <button
                  onClick={handleSaveTabletConfig}
                  disabled={isSavingTabletConfig}
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #d4af37 0%, #c8941c 100%)', color: '#000', fontWeight: 900, padding: '0.85rem 2.5rem', fontSize: '1rem' }}
                >
                  {isSavingTabletConfig ? 'Salvando...' : '💾 Salvar Configurações no Tablet ao Vivo'}
                </button>
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
}
