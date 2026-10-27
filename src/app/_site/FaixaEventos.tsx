"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { LINKS } from "./content";

// Faixa com os eventos em destaque da semana, na mesma regra do bloco
// "Eventos em Destaque da Semana" da tela de login do portal (portal/src/App.tsx).

type Evento = { id: string; nome: string; local?: string; imagem: string };

type Linha = {
  id: string;
  nome: string | null;
  local: string | null;
  logo: string | null;
  foto: string | null;
  destacar: boolean | string | null;
  config: { destaque?: boolean; ocultarDaHome?: boolean; ordem?: number } | null;
};

const slugify = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]/g, "");

export default function FaixaEventos() {
  const [eventos, setEventos] = useState<Evento[] | null>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      // Só os campos usados aqui: detalhes inteiro traz o evento completo (notas, sorteios...)
      const { data } = await supabase
        .from("eventos_oficiais")
        .select(
          "id, nome, local, logo:detalhes->>logo, foto:detalhes->>foto_evento, destacar:detalhes->destacar_home, config:detalhes->portalConfig"
        )
        .eq("status", "aprovado")
        .order("created_at", { ascending: false });
      if (!ativo) return;

      const linhas = ((data as Linha[] | null) || [])
        .filter((ev) => !ev.config?.ocultarDaHome)
        .sort((a, b) => {
          const oa = typeof a.config?.ordem === "number" ? a.config.ordem : 999;
          const ob = typeof b.config?.ordem === "number" ? b.config.ordem : 999;
          return oa - ob;
        });
      const comImagem = linhas.filter((ev) => ev.logo || ev.foto);
      const destaques = comImagem.filter((ev) => ev.config?.destaque || ev.destacar === true || ev.destacar === "true");
      const lista = destaques.length > 0 ? destaques.slice(0, 5) : comImagem.slice(0, 4);

      setEventos(
        lista.map((ev) => ({
          id: ev.id,
          nome: ev.nome || "Evento",
          local: ev.local || undefined,
          imagem: (ev.logo || ev.foto) as string,
        }))
      );
    })().catch(() => ativo && setEventos([]));
    return () => {
      ativo = false;
    };
  }, []);

  if (!eventos || eventos.length === 0) return null;

  // Repete a lista até preencher a faixa; a segunda cópia fecha o loop da animação
  const repeticoes = Math.max(1, Math.ceil(6 / eventos.length));
  const trilho = Array.from({ length: repeticoes }, () => eventos).flat();

  return (
    <section className="faixa faixa-eventos" aria-label="Eventos em destaque da semana">
      <p className="faixa-titulo largura">
        Eventos em <strong>destaque</strong> da semana
      </p>
      <div className="faixa-mascara">
        <div className="faixa-trilho">
          {[0, 1].map((copia) => (
            <ul key={copia} aria-hidden={copia === 1}>
              {trilho.map((ev, i) => (
                <li key={`${ev.id}-${i}`}>
                  <a
                    className="faixa-evento"
                    href={`${LINKS.portal}/evento/${slugify(ev.nome)}`}
                    tabIndex={copia === 1 ? -1 : undefined}
                  >
                    <img src={ev.imagem} alt="" loading="lazy" />
                    <span>
                      <strong>{ev.nome}</strong>
                      {ev.local && <small>{ev.local}</small>}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
