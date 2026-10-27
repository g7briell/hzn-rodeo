import type { Metadata } from "next";
import "./_site/site.css";
import { fonteDisplay, fonteTexto } from "./_site/fonts";
import TourTelas from "./_site/TourTelas";
import FaixaEventos from "./_site/FaixaEventos";
import { DUVIDAS, INCLUSO, LINKS, PLANOS, WHATSAPP_EXIBICAO, whatsapp } from "./_site/content";

export const metadata: Metadata = {
  title: "RodeoApp | Sistema para rodeio: sorteio, notas, ranking e telão",
  description:
    "Programa para a mesa de controle do rodeio: sorteio, nota dos juízes no celular, ranking ao vivo, telão e relatórios oficiais. Funciona sem internet, no Windows, Mac e web.",
  openGraph: {
    title: "RodeoApp",
    description: "Do sorteio ao ranking, a mesa de controle do rodeio num programa só.",
    images: ["/site/app-ranking.jpg"],
    locale: "pt_BR",
  },
};

const CONTATO = whatsapp("Olá! Quero conhecer o RodeoApp para o meu rodeio.");

function Tela({ src, alt, prioridade }: { src: string; alt: string; prioridade?: boolean }) {
  return (
    <div className="tela-moldura">
      <img
        src={src}
        alt={alt}
        width={2160}
        height={1350}
        loading={prioridade ? undefined : "lazy"}
        fetchPriority={prioridade ? "high" : undefined}
      />
    </div>
  );
}

function Celular({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="celular">
      <img src={src} alt={alt} width={975} height={2110} loading="lazy" />
    </div>
  );
}

export default function Site() {
  return (
    <div className={`site ${fonteDisplay.variable} ${fonteTexto.variable}`}>
      <a className="pular" href="#conteudo">
        Pular para o conteúdo
      </a>

      <header className="topo">
        <div className="topo-pilula">
          <a href="/" className="topo-logo" aria-label="RodeoApp, início">
            <img src="/brand/logo-wordmark-720.png" alt="RodeoApp.pro" width={720} height={90} />
          </a>
          <nav className="topo-nav" aria-label="Principal">
            <a href="#recursos">Recursos</a>
            <a href="#telas">Telas</a>
            <a href="#planos">Planos</a>
            <a href="#duvidas">Dúvidas</a>
          </nav>
          <a className="botao botao-ouro botao-pequeno" href={CONTATO} target="_blank" rel="noopener">
            Falar com a gente
          </a>
        </div>
      </header>

      <main id="conteudo">
        <section className="hero">
          <div className="hero-luzes" aria-hidden="true" />
          <div className="largura hero-texto">
            <h1>
              A mesa do rodeio,
              <br />
              do sorteio ao ranking.
            </h1>
            <p className="hero-sub">
              Sorteio, nota dos juízes no celular, ranking ao vivo, telão e relatório oficial num programa só. Roda
              sem internet, no Windows, no Mac e no navegador.
            </p>
            <div className="hero-acoes">
              <a className="botao botao-ouro" href={CONTATO} target="_blank" rel="noopener">
                Quero usar no meu rodeio
              </a>
              <a className="botao botao-linha" href={LINKS.download} target="_blank" rel="noopener">
                Baixar o programa
              </a>
            </div>
          </div>

          <div className="largura palco">
            <div className="palco-tela">
              <Tela
                src="/site/app-ranking.jpg"
                alt="Tela de ranking atualizado do RodeoApp com competidores e pontos"
                prioridade
              />
            </div>
            <div className="palco-celular">
              <Celular
                src="/site/juiz-3.jpg"
                alt="Portal do juiz no celular com o teclado de notas mostrando 22,50 para o touro"
              />
            </div>
          </div>
          <p className="largura palco-legenda">Telas reais do app e do portal do juiz, com um evento de demonstração.</p>
        </section>

        <FaixaEventos />

        <section className="secao" id="recursos" aria-labelledby="recursos-titulo">
          <div className="largura">
            <h2 id="recursos-titulo" className="titulo-secao">
              Tudo o que a mesa precisa na noite do rodeio
            </h2>
            <div className="bento">
              <article className="bloco bloco-juiz">
                <div className="bloco-texto">
                  <h3>O juiz lança a nota no celular</h3>
                  <p>
                    Cada juiz entra em juiz.rodeoapp.pro, vê a ordem das montarias e digita touro e peão de 0,25 em
                    0,25. A soma chega na mesa na hora.
                  </p>
                </div>
                <div className="bloco-celulares">
                  <Celular src="/site/juiz-2.jpg" alt="Lista de montarias do round no celular do juiz" />
                  <Celular src="/site/juiz-3.jpg" alt="Teclado de notas do juiz no celular" />
                </div>
              </article>

              <article className="bloco bloco-painel">
                <div className="bloco-texto">
                  <h3>A mesa inteira numa tela</h3>
                  <p>Cadastro, sorteio, notas, rankings e relatórios a um clique.</p>
                </div>
                <Tela src="/site/app-controle.jpg" alt="Painel de controle de um evento no RodeoApp" />
              </article>

              <article className="bloco bloco-offline">
                <span className="bloco-icone" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0M12 19h.01M3 3l18 18" />
                  </svg>
                </span>
                <h3>Caiu a internet? O rodeio continua.</h3>
                <p>Tudo fica salvo no computador da mesa e sincroniza quando o sinal volta.</p>
              </article>

              <article className="bloco bloco-telao">
                <span className="bloco-icone" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <rect x="2.5" y="4" width="19" height="13" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                  </svg>
                </span>
                <h3>Nota no telão e na live</h3>
                <p>Tela verde para chroma key e links por evento para OBS Studio, vMix e Wirecast.</p>
              </article>

              <article className="bloco bloco-relatorio">
                <div className="bloco-texto">
                  <h3>Papel oficial pronto para assinar</h3>
                  <p>Ranking, súmula, sorteio e ordem de embretamento em A4, PDF ou Excel.</p>
                </div>
                <Tela src="/site/app-relatorio.jpg" alt="Relatório oficial do ranking geral em A4" />
              </article>
            </div>
          </div>
        </section>

        <section className="secao" id="telas" aria-labelledby="telas-titulo">
          <div className="largura">
            <h2 id="telas-titulo" className="titulo-secao">
              A noite inteira, tela por tela
            </h2>
            <p className="intro-secao">Do cadastro à premiação, na ordem em que a mesa usa.</p>
            <TourTelas />
          </div>
        </section>

        <section className="secao" id="planos" aria-labelledby="planos-titulo">
          <div className="largura">
            <h2 id="planos-titulo" className="titulo-secao">
              Planos
            </h2>
            <p className="intro-secao">Todos os planos têm o sistema completo. Muda só o tempo de uso.</p>
            <div className="planos">
              {PLANOS.map((p) => (
                <article key={p.id} className={`plano${p.destaque ? " plano-destaque" : ""}`}>
                  <h3>{p.nome}</h3>
                  <p className="plano-preco">
                    <small>R$</small>
                    {p.preco}
                  </p>
                  <p className="plano-periodo">{p.periodo}</p>
                  {p.nota && <p className="plano-nota">{p.nota}</p>}
                  <a
                    className={`botao ${p.destaque ? "botao-escuro" : "botao-linha"}`}
                    href={whatsapp(`Olá! Quero contratar o plano ${p.nome} do RodeoApp.`)}
                    target="_blank"
                    rel="noopener"
                  >
                    Contratar o {p.nome.toLowerCase()}
                  </a>
                </article>
              ))}
            </div>
            <ul className="incluso" aria-label="Incluído em todos os planos">
              {INCLUSO.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="secao" id="duvidas" aria-labelledby="duvidas-titulo">
          <div className="largura duvidas-grade">
            <h2 id="duvidas-titulo" className="titulo-secao">
              Dúvidas
            </h2>
            <div className="duvidas">
              {DUVIDAS.map((d) => (
                <details key={d.pergunta}>
                  <summary>{d.pergunta}</summary>
                  <p>{d.resposta}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="chamada" aria-labelledby="chamada-titulo">
          <div className="largura chamada-caixa">
            <img src="/brand/selo-cor.png" alt="" width={1000} height={543} className="chamada-selo" />
            <h2 id="chamada-titulo">Tem rodeio chegando?</h2>
            <p>Chama no WhatsApp. A gente mostra o sistema e deixa tudo pronto antes da primeira montaria.</p>
            <a className="botao botao-ouro" href={CONTATO} target="_blank" rel="noopener">
              Chamar no WhatsApp {WHATSAPP_EXIBICAO}
            </a>
          </div>
        </section>
      </main>

      <footer className="rodape">
        <div className="largura rodape-grade">
          <img src="/brand/icone-r.png" alt="RodeoApp" width={64} height={64} className="rodape-icone" />
          <nav aria-label="Acessos">
            <a href={LINKS.download} target="_blank" rel="noopener">
              Baixar o programa
            </a>
            <a href={LINKS.web}>Versão web</a>
            <a href={LINKS.juiz}>Portal do juiz</a>
            <a href={LINKS.portal}>Portal de eventos</a>
          </nav>
          <p>© {new Date().getFullYear()} RodeoApp. Tecnologia para rodeio.</p>
        </div>
      </footer>
    </div>
  );
}
