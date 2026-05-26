import { useState, useEffect, useMemo } from 'react';

export default function EventosVisualEditor({ initialDetalhes, onChange }: { initialDetalhes: any, onChange: (newDetalhes: any) => void }) {
  const [notas, setNotas] = useState<any[]>([]);
  const [activeDia, setActiveDia] = useState<string>('Geral');

  useEffect(() => {
    setNotas(initialDetalhes?.notas || []);
  }, [initialDetalhes]);

  const notifyChange = (newNotas: any[]) => {
    const newDetalhes = { ...initialDetalhes, notas: newNotas };
    onChange(newDetalhes);
  };

  const diasDisponiveis = useMemo(() => {
    const dias = new Set<string>();
    notas.forEach(n => {
      if (n.dia) dias.add(n.dia);
    });
    return Array.from(dias);
  }, [notas]);

  useEffect(() => {
    if (activeDia !== 'Geral' && !diasDisponiveis.includes(activeDia)) {
      setActiveDia('Geral');
    }
  }, [diasDisponiveis, activeDia]);

  const notasFiltradas = activeDia === 'Geral' ? notas : notas.filter(n => n.dia === activeDia);

  const handleChange = (indexGlobal: number, field: string, value: any) => {
    const newNotas = [...notas];
    if (field === 'tempo' || field === 'totalPeao' || field === 'totalTouro') {
      value = parseFloat(value) || 0;
    }
    newNotas[indexGlobal][field] = value;
    setNotas(newNotas);
    notifyChange(newNotas);
  };

  const handleAdd = () => {
    const diaPadrao = activeDia !== 'Geral' ? activeDia : (diasDisponiveis[0] || 'Quinta');
    const newNotas = [...notas, { peao: '', dia: diaPadrao, touro: '', tempo: 0, totalPeao: 0, totalTouro: 0, status: 'ativa' }];
    setNotas(newNotas);
    notifyChange(newNotas);
  };

  const handleRemove = (indexGlobal: number) => {
    const newNotas = notas.filter((_, i) => i !== indexGlobal);
    setNotas(newNotas);
    notifyChange(newNotas);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Notas do Evento</h3>
        <button type="button" className="btn btn-primary" onClick={handleAdd} style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>+ Nova Nota</button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <button 
          type="button"
          onClick={() => setActiveDia('Geral')}
          style={{ padding: '0.4rem 1rem', borderRadius: '20px', border: '1px solid var(--primary)', background: activeDia === 'Geral' ? 'var(--primary)' : 'transparent', color: activeDia === 'Geral' ? '#000' : 'var(--primary)', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Todas as Notas
        </button>
        {diasDisponiveis.map(dia => (
          <button 
            key={dia}
            type="button"
            onClick={() => setActiveDia(dia)}
            style={{ padding: '0.4rem 1rem', borderRadius: '20px', border: '1px solid var(--primary)', background: activeDia === dia ? 'var(--primary)' : 'transparent', color: activeDia === dia ? '#000' : 'var(--primary)', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {dia}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
        {notasFiltradas.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Nenhuma nota encontrada.</p> : null}
        
        {notasFiltradas.map((n) => {
          // Find global index to update correctly
          const globalIdx = notas.findIndex(x => x === n);

          return (
            <div key={globalIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Peão</label>
                  <input className="form-input" style={{ padding: '0.4rem' }} value={n.peao} onChange={e => handleChange(globalIdx, 'peao', e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dia</label>
                  <input className="form-input" style={{ padding: '0.4rem' }} value={n.dia} onChange={e => handleChange(globalIdx, 'dia', e.target.value)} />
                </div>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Touro</label>
                  <input className="form-input" style={{ padding: '0.4rem' }} value={n.touro} onChange={e => handleChange(globalIdx, 'touro', e.target.value)} />
                </div>
                <button type="button" onClick={() => handleRemove(globalIdx)} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', marginTop: '1.2rem', padding: '0.5rem' }} title="Remover Nota">✖</button>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tempo (s)</label>
                  <input className="form-input" type="number" step="0.01" style={{ padding: '0.4rem' }} value={n.tempo} onChange={e => handleChange(globalIdx, 'tempo', e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nota Peão</label>
                  <input className="form-input" type="number" step="0.25" style={{ padding: '0.4rem' }} value={n.totalPeao} onChange={e => handleChange(globalIdx, 'totalPeao', e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nota Touro</label>
                  <input className="form-input" type="number" step="0.25" style={{ padding: '0.4rem' }} value={n.totalTouro} onChange={e => handleChange(globalIdx, 'totalTouro', e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status</label>
                  <select className="form-input" style={{ padding: '0.4rem' }} value={n.status} onChange={e => handleChange(globalIdx, 'status', e.target.value)}>
                    <option value="ativa">Ativa</option>
                    <option value="nota_baixa">Nota Baixa</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
