import React, { useState } from 'react';
import { parseRodeoPdf } from '../utils/pdfParser';
import type { ParsePdfResult, ParsedItem } from '../utils/pdfParser';
import { supabase } from '../supabaseClient';

interface PdfImportModalProps {
  evento: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function PdfImportModal({ evento, onClose, onSuccess }: PdfImportModalProps) {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [parseResult, setParseResult] = useState<ParsePdfResult | null>(null);

  // Checkboxes state
  const [importPeoes, setImportPeoes] = useState(true);
  const [importTouros, setImportTouros] = useState(true);
  const [importCias, setImportCias] = useState(true);
  const [importNotas, setImportNotas] = useState(true);

  // Summary state (step 3)
  const [summaryData, setSummaryData] = useState<{
    newPeoes: string[];
    newTouros: string[];
    newCias: string[];
  }>({ newPeoes: [], newTouros: [], newCias: [] });

  // Target day state (step 4)
  const [selectedDay, setSelectedDay] = useState<string>('DIA 1');

  // Editable items state (step 5)
  const [editableItems, setEditableItems] = useState<ParsedItem[]>([]);

  // Step 1: File selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const res = await parseRodeoPdf(file);
      setParseResult(res);
      setEditableItems(res.items);
      setSelectedDay(res.suggestedDay || 'DIA 1');
      setStep(2);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao ler o arquivo PDF: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Toggle all checkboxes
  const handleToggleAll = (val: boolean) => {
    setImportPeoes(val);
    setImportTouros(val);
    setImportCias(val);
    setImportNotas(val);
  };

  const allChecked = importPeoes && importTouros && importCias && importNotas;

  // Step 2 -> Step 3: Run deduplication engine
  const handleProcessDeduplication = async () => {
    if (!parseResult) return;
    setLoading(true);

    const addedPeoes: string[] = [];
    const addedTouros: string[] = [];
    const addedCias: string[] = [];

    try {
      // 1. Process CIAs
      if (importCias && parseResult.detectedCias.length > 0) {
        const { data: existingCias } = await supabase.from('rel_cias').select('nome');
        const existingNames = new Set((existingCias || []).map(c => c.nome.trim().toUpperCase()));

        for (const cia of parseResult.detectedCias) {
          if (!existingNames.has(cia.toUpperCase())) {
            await supabase.from('rel_cias').insert([{ nome: cia.toUpperCase() }]);
            addedCias.push(cia.toUpperCase());
          }
        }
      }

      // 2. Process Touros
      if (importTouros && parseResult.detectedTouros.length > 0) {
        const { data: existingTouros } = await supabase.from('rel_touros').select('nome');
        const existingNames = new Set((existingTouros || []).map(t => t.nome.trim().toUpperCase()));

        for (const t of parseResult.detectedTouros) {
          if (!existingNames.has(t.nome.toUpperCase())) {
            await supabase.from('rel_touros').insert([{
              nome: t.nome.toUpperCase(),
              cia: t.cia ? t.cia.toUpperCase() : 'CIA OUTRAS'
            }]);
            addedTouros.push(`${t.nome.toUpperCase()} (${t.cia.toUpperCase()})`);
          }
        }
      }

      // 3. Process Competidores
      if (importPeoes && parseResult.detectedPeoes.length > 0) {
        const { data: existingPeoes } = await supabase.from('rel_competidores').select('nome');
        const existingNames = new Set((existingPeoes || []).map(p => p.nome.trim().toUpperCase()));

        for (const p of parseResult.detectedPeoes) {
          if (!existingNames.has(p.toUpperCase())) {
            await supabase.from('rel_competidores').insert([{
              nome: p.toUpperCase()
            }]);
            addedPeoes.push(p.toUpperCase());
          }
        }
      }

      setSummaryData({
        newPeoes: addedPeoes,
        newTouros: addedTouros,
        newCias: addedCias,
      });

      setStep(3);
    } catch (err: any) {
      console.error('Erro na desduplicação:', err);
      alert('Erro ao sincronizar cadastros: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 5 -> Final Save
  const handleFinalSave = async () => {
    setLoading(true);
    try {
      const det = typeof evento.detalhes === 'string' ? JSON.parse(evento.detalhes || '{}') : (evento.detalhes || {});
      const currentSorteios = det.sorteios || [];

      // Format current day's riders & bulls
      const riders = editableItems.map(item => ({
        nome: item.peao,
        cidade: item.cidade || '',
        status: item.status || 'ativa',
        tempo: item.tempo || 8.0,
        totalPeao: item.totalPeao || 0,
        totalTouro: item.totalTouro || 0,
        total: item.total || 0,
      }));

      const bulls = editableItems.map(item => ({
        nome: item.touro,
        cia: item.cia,
      }));

      const assignments: Record<string, number> = {};
      editableItems.forEach((_, idx) => {
        assignments[idx.toString()] = idx;
      });

      const dayObject = {
        day: selectedDay,
        riders,
        bulls,
        assignments,
      };

      // Filter out existing same day object if exists, then replace
      const updatedSorteios = currentSorteios.filter((s: any) => s.day !== selectedDay);
      updatedSorteios.push(dayObject);

      // Also merge into det.notas for backward compatibility
      const currentNotas = det.notas || [];
      const newNotas = editableItems.map((item, i) => ({
        id: `pdf-${selectedDay}-${i}`,
        dia: selectedDay,
        peao: item.peao,
        touro: item.touro,
        cia: item.cia,
        cidade: item.cidade || '',
        status: item.status || 'ativa',
        tempo: item.tempo || 8.0,
        totalPeao: item.totalPeao || 0,
        totalTouro: item.totalTouro || 0,
      }));

      const updatedNotas = [...currentNotas.filter((n: any) => n.dia !== selectedDay), ...newNotas];

      const updatedDetalhes = {
        ...det,
        sorteios: updatedSorteios,
        notas: updatedNotas,
      };

      const { error } = await supabase
        .from('eventos_oficiais')
        .update({ detalhes: updatedDetalhes })
        .eq('id', evento.id);

      if (error) throw error;

      alert('🎉 Importação concluída e salva com sucesso!');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar importação:', err);
      alert('Erro ao salvar no banco de dados: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const dayOptions = ['DIA 1', 'DIA 2', 'DIA 3', 'DIA 4', 'SEMI-FINAL', 'FINAL'];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1.5rem',
      fontFamily: 'Inter, sans-serif',
      color: '#fff',
    }}>
      <div style={{
        background: '#0d0d0d',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '850px',
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.4rem' }}>📄</span>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Importador Inteligente de PDF
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                Etapa {step} de 5
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '1.5rem', cursor: 'pointer', outline: 'none' }}
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '2rem', flex: 1 }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem' }}>
              <div style={{ width: '36px', height: '36px', border: '3px solid rgba(212,175,55,0.2)', borderTopColor: '#d4af37', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Processando dados do PDF...</span>
            </div>
          )}

          {/* ── STEP 1: UPLOAD FILE ── */}
          {!loading && step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '2rem 1rem', textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', background: 'rgba(212,175,55,0.08)', border: '1px dashed #d4af37', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                📤
              </div>
              <div>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Selecione o PDF do Sorteio ou Súmula</h4>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', maxWidth: '450px' }}>
                  Escolha o arquivo PDF do evento no seu PC ou Mac. A IA irá ler automaticamente os peões, touros, companhias e notas.
                </p>
              </div>

              <label style={{
                background: 'linear-gradient(135deg, #d4af37 0%, #c8941c 100%)',
                color: '#000',
                fontWeight: 800,
                fontSize: '0.9rem',
                padding: '0.85rem 2rem',
                borderRadius: '99px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(212,175,55,0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                Procurar PDF no Computador
                <input type="file" accept=".pdf" onChange={handleFileChange} style={{ display: 'none' }} />
              </label>
            </div>
          )}

          {/* ── STEP 2: CHECKBOXES SELECTION ── */}
          {!loading && step === 2 && parseResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.3rem' }}>O que você deseja importar deste PDF?</h4>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
                  Marque o que o sistema deve sincronizar e cadastrar automaticamente.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '0.85rem 1.25rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Selecionar TUDO</span>
                <button
                  type="button"
                  onClick={() => handleToggleAll(!allChecked)}
                  style={{
                    background: allChecked ? '#d4af37' : 'rgba(255,255,255,0.1)',
                    color: allChecked ? '#000' : '#fff',
                    border: 'none',
                    padding: '4px 14px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  {allChecked ? 'Desmarcar Todos' : 'Marcar Todos'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={importPeoes} onChange={e => setImportPeoes(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#d4af37' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>🤠 Competidores (Peões)</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{parseResult.detectedPeoes.length} detectados</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={importTouros} onChange={e => setImportTouros(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#d4af37' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>🐂 Touros</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{parseResult.detectedTouros.length} detectados</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={importCias} onChange={e => setImportCias(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#d4af37' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>🚩 Companhias / Boiadas</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{parseResult.detectedCias.length} detectadas</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={importNotas} onChange={e => setImportNotas(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#d4af37' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>📝 Sorteio e Notas</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{parseResult.items.length} montarias</div>
                  </div>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={handleProcessDeduplication}
                  style={{
                    background: '#d4af37',
                    color: '#000',
                    border: 'none',
                    padding: '0.75rem 1.75rem',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  Processar e Verificar Banco de Dados →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: DEDUPLICATION POPUP SUMMARY ── */}
          {!loading && step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.4rem' }}>✅</span>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#22c55e', margin: 0 }}>Sincronização com Banco de Dados Concluída!</h4>
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>O sistema verificou os cadastros e não duplicou nada que já existia.</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                {/* Novos Competidores */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#d4af37', marginBottom: '0.5rem' }}>
                    🆕 NOVOS COMPETIDORES CADASTRADOS ({summaryData.newPeoes.length}):
                  </div>
                  {summaryData.newPeoes.length > 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {summaryData.newPeoes.map((p, i) => (
                        <span key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>{p}</span>
                      ))}
                    </div>
                  ) : <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>Todos os competidores já estavam no banco de dados.</span>}
                </div>

                {/* Novos Touros & CIAs */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#d4af37', marginBottom: '0.5rem' }}>
                    🐂 NOVOS TOUROS / CIAS CADASTRADOS ({summaryData.newTouros.length + summaryData.newCias.length}):
                  </div>
                  {(summaryData.newTouros.length > 0 || summaryData.newCias.length > 0) ? (
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {summaryData.newCias.map((c, i) => (
                        <span key={'c-' + i} style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37', padding: '2px 8px', borderRadius: '4px' }}>CIA: {c}</span>
                      ))}
                      {summaryData.newTouros.map((t, i) => (
                        <span key={'t-' + i} style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>{t}</span>
                      ))}
                    </div>
                  ) : <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>Todos os touros e companhias já estavam no banco de dados.</span>}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  style={{
                    background: '#d4af37',
                    color: '#000',
                    border: 'none',
                    padding: '0.75rem 1.75rem',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  OK (Ir para escolha do Dia) →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: SELECT TARGET DAY ── */}
          {!loading && step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.3rem' }}>Para qual dia/rodada estas notas pertencem?</h4>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
                  Selecione a rodada do evento que será gravada no RodeoApp.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
                {dayOptions.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      border: selectedDay === day ? '2px solid #d4af37' : '1px solid rgba(255,255,255,0.08)',
                      background: selectedDay === day ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.02)',
                      color: selectedDay === day ? '#d4af37' : '#fff',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'all 0.15s',
                    }}
                  >
                    {day}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  style={{
                    background: '#d4af37',
                    color: '#000',
                    border: 'none',
                    padding: '0.75rem 1.75rem',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  Conferir e Editar Notas →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 5: EDITABLE VERIFICATION TABLE ── */}
          {!loading && step === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Conferência das Notas ({selectedDay})</h4>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', margin: 0 }}>
                    Você pode alterar qualquer nome, nota ou status diretamente na tabela antes de finalizar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditableItems([...editableItems, {
                      peao: 'NOVO COMPETIDOR',
                      touro: 'NOVO TOURO',
                      cia: 'CIA OUTRAS',
                      status: 'ativa',
                      tempo: 8.0,
                      totalPeao: 0,
                      totalTouro: 0,
                      total: 0,
                    }]);
                  }}
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.2)', padding: '4px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  + Adicionar Linha
                </button>
              </div>

              {/* Editable Table */}
              <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden', maxHeight: '350px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                  <thead style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.1em' }}>
                    <tr>
                      <th style={{ padding: '8px 12px' }}>#</th>
                      <th style={{ padding: '8px 12px' }}>Peão</th>
                      <th style={{ padding: '8px 12px' }}>Touro</th>
                      <th style={{ padding: '8px 12px' }}>CIA</th>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                      <th style={{ padding: '8px 12px', width: '70px' }}>Total</th>
                      <th style={{ padding: '8px 12px', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {editableItems.map((item, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                        <td style={{ padding: '6px 12px', color: 'rgba(255,255,255,0.3)' }}>{idx + 1}</td>
                        <td style={{ padding: '6px 12px' }}>
                          <input
                            type="text"
                            value={item.peao}
                            onChange={e => {
                              const copy = [...editableItems];
                              copy[idx].peao = e.target.value;
                              setEditableItems(copy);
                            }}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '4px 8px', borderRadius: '4px', width: '100%', fontSize: '0.8rem', outline: 'none' }}
                          />
                        </td>
                        <td style={{ padding: '6px 12px' }}>
                          <input
                            type="text"
                            value={item.touro}
                            onChange={e => {
                              const copy = [...editableItems];
                              copy[idx].touro = e.target.value;
                              setEditableItems(copy);
                            }}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#d4af37', fontWeight: 700, padding: '4px 8px', borderRadius: '4px', width: '100%', fontSize: '0.8rem', outline: 'none' }}
                          />
                        </td>
                        <td style={{ padding: '6px 12px' }}>
                          <input
                            type="text"
                            value={item.cia}
                            onChange={e => {
                              const copy = [...editableItems];
                              copy[idx].cia = e.target.value;
                              setEditableItems(copy);
                            }}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '4px 8px', borderRadius: '4px', width: '100%', fontSize: '0.8rem', outline: 'none' }}
                          />
                        </td>
                        <td style={{ padding: '6px 12px' }}>
                          <select
                            value={item.status}
                            onChange={e => {
                              const copy = [...editableItems];
                              copy[idx].status = e.target.value;
                              if (e.target.value === 'queda') {
                                copy[idx].total = 0;
                                copy[idx].totalPeao = 0;
                                copy[idx].totalTouro = 0;
                              }
                              setEditableItems(copy);
                            }}
                            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', color: item.status === 'queda' ? '#ef4444' : (item.status === 'reride' ? '#a78bfa' : '#22c55e'), padding: '4px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700, outline: 'none' }}
                          >
                            <option value="ativa">Válida (Ativa)</option>
                            <option value="queda">Queda (Zero)</option>
                            <option value="reride">Re-ride</option>
                          </select>
                        </td>
                        <td style={{ padding: '6px 12px' }}>
                          <input
                            type="number"
                            step="0.25"
                            value={item.total || 0}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              const copy = [...editableItems];
                              copy[idx].total = val;
                              copy[idx].totalPeao = Math.round(val / 2);
                              copy[idx].totalTouro = Math.round(val / 2);
                              setEditableItems(copy);
                            }}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '4px 8px', borderRadius: '4px', width: '100%', fontSize: '0.8rem', outline: 'none' }}
                          />
                        </td>
                        <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditableItems(editableItems.filter((_, i) => i !== idx));
                            }}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  ← Voltar
                </button>
                <button
                  type="button"
                  onClick={handleFinalSave}
                  style={{
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '0.75rem 1.75rem',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(34,197,94,0.3)',
                  }}
                >
                  💾 Concluir e Salvar no Evento
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
