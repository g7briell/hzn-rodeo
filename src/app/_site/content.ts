// Conteúdo do site público (rodeoapp.pro).
// Os prints são do próprio app rodando com um evento de demonstração: nomes de peões,
// touros e companhias são fictícios.

export const WHATSAPP_NUMERO = "5518981226665";
export const WHATSAPP_EXIBICAO = "(18) 98122-6665";

export const whatsapp = (mensagem: string) =>
  `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;

export const LINKS = {
  download: "https://github.com/g7briell/hzn-rodeo/releases/latest",
  web: "https://web.rodeoapp.pro",
  juiz: "https://juiz.rodeoapp.pro",
  portal: "https://portal.rodeoapp.pro",
};

export const PLATAFORMAS = [
  "Windows",
  "macOS",
  "Navegador",
  "Celular do juiz",
  "OBS Studio",
  "vMix",
  "Wirecast",
  "PDF",
  "Excel",
  "Funciona offline",
];

export type Tela = {
  id: string;
  nome: string;
  titulo: string;
  texto: string;
  img: string;
  alt: string;
};

// A ordem segue a noite de rodeio, por isso as telas são numeradas.
export const TELAS: Tela[] = [
  {
    id: "eventos",
    nome: "Eventos",
    titulo: "Todos os rodeios do ano num lugar só",
    texto:
      "Cada rodeio tem dias, juízes, cidade e circuito próprios. Você abre o evento da noite e o resto do sistema já sabe com o que está lidando.",
    img: "/site/app-eventos.jpg",
    alt: "Tela de eventos do RodeoApp com três rodeios cadastrados",
  },
  {
    id: "painel",
    nome: "Painel do evento",
    titulo: "A mesa de controle inteira numa tela",
    texto:
      "Cadastro de peões e boiadas, sorteios, notas, rankings e relatórios ficam a um clique. Quem senta na mesa pela primeira vez acha tudo sem treinamento.",
    img: "/site/app-controle.jpg",
    alt: "Painel de controle de um evento com os atalhos de cadastro, listas, sorteios, notas e rankings",
  },
  {
    id: "notas",
    nome: "Notas",
    titulo: "Peão e touro do sorteio, prontos para a nota",
    texto:
      "O dia aparece com cada competidor já ligado ao touro e à companhia que o sorteio definiu. A mesa toca no nome e lança a montaria.",
    img: "/site/app-notas.jpg",
    alt: "Lançamento de notas do primeiro dia com os competidores e seus touros sorteados",
  },
  {
    id: "ranking",
    nome: "Ranking",
    titulo: "A classificação muda a cada nota",
    texto:
      "Geral ou por round, o ranking se reorganiza sozinho, com desempate pelo tempo. É o que vai para o locutor e para o telão.",
    img: "/site/app-ranking.jpg",
    alt: "Ranking atualizado com posições e pontos dos competidores",
  },
  {
    id: "relatorio",
    nome: "Relatório",
    titulo: "Papel oficial para assinar e entregar",
    texto:
      "Ranking, súmula, sorteio e ordem de embretamento saem em A4 com o nome do evento, prontos para imprimir ou mandar em PDF.",
    img: "/site/app-relatorio.jpg",
    alt: "Relatório oficial do ranking geral em formato A4 com notas por dia e total",
  },
];

export type Recurso = { titulo: string; texto: string };

export const RECURSOS: Recurso[] = [
  {
    titulo: "Não para quando a internet cai",
    texto:
      "Tudo fica salvo no computador da mesa. Quando o sinal volta, o evento sincroniza entre PC, Mac e a versão web.",
  },
  {
    titulo: "Juiz lança a nota no celular",
    texto:
      "Cada juiz abre juiz.rodeoapp.pro, lança touro e peão, e a soma chega na mesa na hora. Re-ride fica separado da montaria original.",
  },
  {
    titulo: "Nota no telão e na transmissão",
    texto:
      "Tela verde para chroma key e links por evento para OBS Studio, vMix e Wirecast, na cabine ou pela nuvem.",
  },
  {
    titulo: "Sorteio que respeita o regulamento",
    texto:
      "O sorteio sai por dia, evita repetir touro e companhia para o mesmo peão e já gera a ordem de embretamento.",
  },
];

export type Plano = { id: string; nome: string; preco: string; periodo: string; nota?: string; destaque?: boolean };

export const PLANOS: Plano[] = [
  { id: "semanal", nome: "Semanal", preco: "79,90", periodo: "por semana", nota: "Para um rodeio avulso" },
  { id: "mensal", nome: "Mensal", preco: "179,90", periodo: "por mês", nota: "Para a temporada", destaque: true },
  { id: "anual", nome: "Anual", preco: "719,90", periodo: "por ano", nota: "Sai a R$ 59,99 por mês" },
];

export const INCLUSO = [
  "Programa para Windows e Mac, e versão web",
  "Portal do juiz no celular",
  "Telão, tela verde e overlays para transmissão",
  "Relatórios em PDF e Excel",
  "Atualizações automáticas",
  "Suporte pelo WhatsApp",
];

export type Duvida = { pergunta: string; resposta: string };

export const DUVIDAS: Duvida[] = [
  {
    pergunta: "Preciso de internet na arena?",
    resposta:
      "Não. O RodeoApp roda no computador da mesa sem internet. Com conexão, os eventos sincronizam entre PC, Mac e a versão web.",
  },
  {
    pergunta: "Como os juízes lançam as notas?",
    resposta:
      "Pelo celular ou tablet, em juiz.rodeoapp.pro. Cada juiz lança a nota do touro e a do peão, e a soma aparece na mesa na hora.",
  },
  {
    pergunta: "Funciona no Mac?",
    resposta:
      "Sim. Há versão para Windows e para Mac, e as duas se atualizam sozinhas quando sai versão nova. Também dá para usar pelo navegador em web.rodeoapp.pro.",
  },
  {
    pergunta: "Dá para mostrar as notas na transmissão?",
    resposta:
      "Sim. A tela verde funciona como chroma key e cada evento tem links próprios para OBS Studio, vMix e Wirecast.",
  },
  {
    pergunta: "Quais modalidades o sistema atende?",
    resposta: "Rodeio em touros e cutiano. Três tambores está em desenvolvimento.",
  },
  {
    pergunta: "Como recebo a licença?",
    resposta: `Depois da contratação, o acesso chega por e-mail com a chave da licença. Qualquer dúvida, o suporte atende no WhatsApp ${WHATSAPP_EXIBICAO}.`,
  },
];
