import type { Metadata } from "next";
import "./_site/site.css";
import { fonteDisplay, fonteTexto } from "./_site/fonts";
import TourTelas from "./_site/TourTelas";
import { DUVIDAS, INCLUSO, LINKS, PLANOS, RECURSOS, WHATSAPP_EXIBICAO, whatsapp } from "./_site/content";

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

export default function Site() {
  return (
    <div className={`site ${fonteDisplay.variable} ${fonteTexto.variable}`}>
      <a className="pular" href="#conteudo">
        Pular para o conteúdo
      </a>

      <header className="topo">
        <div className="largura topo-linha">
          <a href="/" className="topo-logo" aria-label="RodeoApp, início">
            <img src="/brand/logo-wordmark-720.png" alt="RodeoApp.pro" width={720} height={90} />
          </a>
          <nav className="topo-nav" aria-label="Principal">
            <a href="#telas">O sistema</a>
            <a href="#planos">Planos</a>
            <a href="#duvidas">Dúvidas</a>
            <a href={LINKS.portal}>Portal</a>
          </nav>
          <a className="botao botao-ouro botao-pequeno" href={CONTATO} target="_blank" rel="noopener">
            Falar com a gente
          </a>
        </div>
      </header>

      <main id="conteudo">
        <section className="hero">
          <div className="largura hero-grade">
            <div className="hero-texto">
              <h1>
                Do sorteio ao ranking, <span>a mesa do rodeio</span> num programa só.
              </h1>
              <p className="hero-sub">
                O RodeoApp organiza peões, boiadas e juízes, faz o sorteio, recebe as notas pelo celular e põe o
                ranking no telão. Funciona sem internet, no Windows, no Mac e no navegador.
              </p>
              <div className="hero-acoes">
                <a className="botao botao-ouro" href={CONTATO} target="_blank" rel="noopener">
                  Quero usar no meu rodeio
                </a>
                <a className="botao botao-linha" href={LINKS.download} target="_blank" rel="noopener">
                  Baixar para Windows ou Mac
                </a>
              </div>
            </div>
            <figure className="hero-tela">
              <div className="tela-moldura">
                <img
                  src="/site/app-ranking.jpg"
                  alt="Tela de ranking atualizado do RodeoApp com dez competidores e seus pontos"
                  width={2160}
                  height={1350}
                  fetchPriority="high"
                />
              </div>
              <figcaption>Ranking de um evento de demonstração, direto do app.</figcaption>
            </figure>
          </div>
        </section>

        <section className="secao" id="telas" aria-labelledby="telas-titulo">
          <div className="largura">
            <h2 id="telas-titulo" className="titulo-secao">
              A noite inteira, tela por tela
            </h2>
            <p className="intro-secao">
              Estas são as telas que a mesa usa do cadastro à premiação. Nada de mockup: é o programa rodando.
            </p>
            <TourTelas />
          </div>
        </section>

        <section className="secao secao-couro" aria-labelledby="arena-titulo">
          <div className="largura arena">
            <div className="arena-cabeca">
              <h2 id="arena-titulo" className="titulo-secao">
                Feito para a arena, não para o escritório
              </h2>
              <p className="intro-secao">
                Rodeio acontece de noite, com som alto, gente em volta da mesa e sinal ruim. O sistema foi desenhado
                para isso.
              </p>
              <figure className="arena-tela">
                <div className="tela-moldura">
                  <img
                    src="/site/app-home.jpg"
                    alt="Janela de lançamento de nota mostrando o competidor contra o touro e o tempo de queda"
                    width={2160}
                    height={1350}
                    loading="lazy"
                  />
                </div>
              </figure>
            </div>
            <ul className="arena-lista">
              {RECURSOS.map((r) => (
                <li key={r.titulo}>
                  <h3>{r.titulo}</h3>
                  <p>{r.texto}</p>
                </li>
              ))}
            </ul>
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
          <div className="largura chamada-grade">
            <img src="/brand/selo-cor.png" alt="" width={1000} height={543} className="chamada-selo" />
            <div>
              <h2 id="chamada-titulo">Tem rodeio chegando?</h2>
              <p>Chama no WhatsApp. A gente mostra o sistema e deixa tudo pronto antes da primeira montaria.</p>
              <a className="botao botao-ouro" href={CONTATO} target="_blank" rel="noopener">
                Chamar no WhatsApp {WHATSAPP_EXIBICAO}
              </a>
            </div>
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
