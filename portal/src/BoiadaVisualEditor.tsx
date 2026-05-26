import { useState, useEffect } from 'react';

export default function BoiadaVisualEditor({ initialLados, onChange }: { initialLados: any, onChange: (newLados: any) => void }) {
  const [touros, setTouros] = useState<any[]>([]);

  useEffect(() => {
    // Parse the initial lados structure to an array of touros
    const tList: any[] = [];
    const meta = initialLados?.__meta || {};
    const tInfo = meta.touros_info || {};

    Object.keys(initialLados || {}).forEach(key => {
      if (key !== '__meta') {
        tList.push({
          originalName: key,
          nome: key,
          lado: initialLados[key],
          foto: tInfo[key]?.foto || '',
          video_url: tInfo[key]?.video_url || ''
        });
      }
    });
    setTouros(tList);
  }, [initialLados]);

  const notifyChange = (newTouros: any[]) => {
    const meta = initialLados?.__meta || {};
    const tInfo: any = {};
    const newLados: any = { __meta: { ...meta, touros_info: tInfo } };

    newTouros.forEach(t => {
      if (t.nome.trim()) {
        newLados[t.nome] = t.lado;
        tInfo[t.nome] = { foto: t.foto, video_url: t.video_url };
      }
    });

    onChange(newLados);
  };

  const handleChange = (index: number, field: string, value: string) => {
    const newT = [...touros];
    newT[index][field] = value;
    setTouros(newT);
    notifyChange(newT);
  };

  const handleAdd = () => {
    const newT = [...touros, { originalName: '', nome: '', lado: 'Direito', foto: '', video_url: '' }];
    setTouros(newT);
    notifyChange(newT);
  };

  const handleRemove = (index: number) => {
    const newT = touros.filter((_, i) => i !== index);
    setTouros(newT);
    notifyChange(newT);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Touros da Companhia</h3>
        <button type="button" className="btn btn-primary" onClick={handleAdd} style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>+ Novo Touro</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
        {touros.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Nenhum touro cadastrado.</p> : null}
        
        {touros.map((t, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nome do Touro</label>
                <input className="form-input" style={{ padding: '0.4rem' }} value={t.nome} onChange={e => handleChange(idx, 'nome', e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lado</label>
                <select className="form-input" style={{ padding: '0.4rem' }} value={t.lado} onChange={e => handleChange(idx, 'lado', e.target.value)}>
                  <option value="Direito">Certo (D)</option>
                  <option value="Esquerdo">Errado (E)</option>
                </select>
              </div>
              <button type="button" onClick={() => handleRemove(idx)} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', marginTop: '1.2rem', padding: '0.5rem' }} title="Remover Touro">✖</button>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Link da Foto</label>
                <input className="form-input" style={{ padding: '0.4rem' }} placeholder="https://..." value={t.foto} onChange={e => handleChange(idx, 'foto', e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Link do Vídeo (Youtube)</label>
                <input className="form-input" style={{ padding: '0.4rem' }} placeholder="https://youtube.com/..." value={t.video_url} onChange={e => handleChange(idx, 'video_url', e.target.value)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
