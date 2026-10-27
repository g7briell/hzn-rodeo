"use client";

import { useState } from "react";
import { TELAS } from "./content";

// Passeio pelas telas reais do app: as abas seguem a ordem da noite de rodeio.
export default function TourTelas() {
  const [ativa, setAtiva] = useState(0);
  const tela = TELAS[ativa];

  return (
    <div className="tour">
      <div className="tour-abas" role="tablist" aria-label="Telas do RodeoApp">
        {TELAS.map((t, i) => (
          <button
            key={t.id}
            role="tab"
            id={`aba-${t.id}`}
            aria-selected={i === ativa}
            aria-controls="tour-painel"
            className="tour-aba"
            onClick={() => setAtiva(i)}
          >
            <span className="tour-num">{i + 1}</span>
            {t.nome}
          </button>
        ))}
      </div>

      <div className="tour-painel" id="tour-painel" role="tabpanel" aria-labelledby={`aba-${tela.id}`}>
        <div className="tour-texto">
          <h3>{tela.titulo}</h3>
          <p>{tela.texto}</p>
        </div>
        <figure className="tela-moldura" key={tela.id}>
          <img src={tela.img} alt={tela.alt} width={2160} height={1350} loading="lazy" decoding="async" />
        </figure>
      </div>
    </div>
  );
}
