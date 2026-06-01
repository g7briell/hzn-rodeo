"use client";

import Link from "next/link";
import { 
  Trophy, 
  Shield, 
  Zap, 
  Users, 
  Download, 
  ArrowRight, 
  Monitor, 
  Smartphone,
  Star,
  PlayCircle,
  Menu,
  ChevronRight,
  FileSpreadsheet,
  Tv,
  ListOrdered,
  Calendar
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchFeatured = async () => {
      const { data } = await supabase.from('eventos_oficiais').select('*');
      if (data) {
        const featured = data.filter((e: any) => e.detalhes?.destaque === true);
        setFeaturedEvents(featured);
      }
    };
    fetchFeatured();
  }, []);

  return (
    <div className="min-h-screen bg-[#000000] text-white font-sans selection:bg-yellow-500 selection:text-black overflow-x-hidden">
      
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-[100] transition-all duration-300 px-6 py-4 ${isScrolled ? 'bg-black/90 backdrop-blur-xl border-b border-yellow-500/20' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/header_logo.png" alt="RODEOAPP Logo" className="h-14 md:h-20 object-contain hover:scale-105 transition-transform" />
          </div>

          <div className="hidden md:flex items-center gap-10 text-[10px] font-black uppercase tracking-[0.3em] text-white/50">
            <a href="#features" className="hover:text-yellow-500 transition-colors">Funcionalidades</a>
            <a href="#about" className="hover:text-yellow-500 transition-colors">Tecnologia</a>
            <a href="#plans" className="hover:text-yellow-500 transition-colors">Planos</a>
          </div>

          <div className="md:hidden flex items-center">
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 pb-20 overflow-hidden">
        {/* Background Image Overlay */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/95 to-[#050505] z-10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-500/10 via-transparent to-transparent z-10 opacity-50" />
        </div>

        <div className="relative z-20 max-w-7xl mx-auto px-6 text-center mt-10">

          
          <div className="mb-12 flex justify-center">
            <img src="/splash_logo.png" alt="RODEOAPP Logo Grande" className="h-40 md:h-64 object-contain drop-shadow-[0_0_30px_rgba(234,179,8,0.3)] animate-pulse-slow" />
          </div>

          <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter leading-[0.9] mb-8 text-white uppercase">
            O CONTROLE ABSOLUTO <br />
            DA SUA <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-600 to-yellow-400 bg-[length:200%_auto] animate-shine">ARENA</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-white/60 text-base md:text-xl font-bold mb-12 leading-relaxed uppercase tracking-tight">
            Gestão total de competidores, animais, rankings instantâneos e integração com o telão. O sistema definitivo para profissionais do rodeio.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-6 py-4 rounded-xl font-black text-sm md:text-base text-center uppercase tracking-widest shadow-lg">
                Rodeio Touros / Cutiano
              </div>
              <div className="bg-white/5 border border-white/10 text-white/50 px-6 py-4 rounded-xl font-bold text-sm md:text-base text-center uppercase tracking-widest flex items-center justify-center gap-2">
                3 Tambores <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded-md font-black">FUTURAMENTE</span>
              </div>
            </div>
            <a href="#features" className="w-full sm:w-auto bg-white/5 backdrop-blur-md border border-white/10 px-10 py-5 rounded-xl font-black text-sm md:text-base flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-95 uppercase tracking-widest">
              RECURSOS <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* Featured Event Section */}
      {featuredEvents.length > 0 && (
        <section className="py-20 px-6 relative bg-gradient-to-b from-black to-[#050505] border-t border-yellow-500/20 z-30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-6 py-3 rounded-full font-black text-sm uppercase tracking-widest shadow-lg mb-6">
                <Star className="w-5 h-5 fill-current" /> DESTAQUE DA SEMANA
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredEvents.map((evt) => (
                <div key={evt.id} className="group bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden hover:border-yellow-500/50 hover:bg-white/10 transition-all duration-500 shadow-2xl relative">
                  <div className="absolute top-4 right-4 z-10 bg-yellow-500 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    EM DESTAQUE
                  </div>
                  {evt.detalhes?.foto_evento ? (
                    <div className="h-48 w-full overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                      <img src={evt.detalhes.foto_evento} alt={evt.nome} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    </div>
                  ) : (
                    <div className="h-48 w-full bg-black/50 border-b border-white/5 flex items-center justify-center relative overflow-hidden">
                      <Trophy className="w-16 h-16 text-white/10" />
                    </div>
                  )}
                  
                  <div className="p-8">
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-2 text-white group-hover:text-yellow-500 transition-colors">
                      {evt.nome}
                    </h3>
                    <p className="text-white/40 font-bold text-sm uppercase tracking-widest mb-6">
                      {evt.local} • {evt.data_inicio}
                    </p>
                    
                    <Link href={`/eventos/${evt.id}`} className="w-full flex items-center justify-center gap-2 bg-yellow-500 text-black py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-yellow-400 transition-colors">
                      Acompanhar Evento <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features Grid */}
      <section id="features" className="py-32 px-6 relative bg-[#050505] border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-5xl md:text-6xl font-black italic tracking-tighter mb-4 uppercase">TECNOLOGIA DE PONTA</h2>
            <div className="w-24 h-2 bg-yellow-500 mx-auto rounded-full shadow-[0_0_20px_rgba(234,179,8,0.5)]" />
            <p className="text-white/40 mt-6 font-bold uppercase tracking-widest text-sm">Tudo o que seu evento precisa em um só lugar</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Shield className="w-8 h-8 text-yellow-500" />}
              title="SORTEIOS BLINDADOS"
              description="Algoritmo avançado para cruzamento de competidores e animais, com regras rigorosas para evitar repetições indesejadas."
            />
            <FeatureCard 
              icon={<Trophy className="w-8 h-8 text-yellow-500" />}
              title="RANKINGS INSTANTÂNEOS"
              description="Classificação em tempo real de Competidores e Animais, gerando rankings com médias precisas a cada montaria."
            />
            <FeatureCard 
              icon={<ListOrdered className="w-8 h-8 text-yellow-500" />}
              title="ORDEM DE EMBRETAMENTO"
              description="Organização impecável dos currais. Crie as ordens de saída e distribua para a equipe de brete num clique."
            />
            <FeatureCard 
              icon={<FileSpreadsheet className="w-8 h-8 text-yellow-500" />}
              title="EXPORTAÇÃO PROFISSIONAL"
              description="Gere relatórios de Melhor Animal, Melhor Cia e Resultados em PDF de altíssima resolução e planilhas de Excel."
            />
            <FeatureCard 
              icon={<Zap className="w-8 h-8 text-yellow-500" />}
              title="SISTEMA OFFLINE"
              description="O sistema funciona 100% sem internet, salvando todos os dados da competição diretamente no seu computador com segurança."
            />
          </div>
        </div>
      </section>

      {/* Pricing/Plans Section */}
      <section id="plans" className="py-32 px-6 relative bg-black">
        <div className="max-w-7xl mx-auto">
           <div className="text-center mb-24">
            <h2 className="text-5xl md:text-6xl font-black italic tracking-tighter mb-4 uppercase">PLANOS E LICENÇAS</h2>
            <div className="w-24 h-2 bg-yellow-500 mx-auto rounded-full shadow-[0_0_20px_rgba(234,179,8,0.5)] mb-6" />
            <p className="text-white/40 font-bold uppercase tracking-widest text-sm">Escolha a potência do seu evento</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PlanCard title="SEMANAL" price="R$ 79,90" period="POR SEMANA" color="bg-white/5" />
            <PlanCard title="MENSAL" price="R$ 179,90" period="POR MÊS" color="bg-gradient-to-br from-yellow-500 to-yellow-600 text-black" highlighted />
            <PlanCard title="ANUAL" price="R$ 719,90" period="POR ANO" color="bg-white/5" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 bg-[#050505]">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-[3rem] md:rounded-[4rem] p-10 md:p-16 text-center relative overflow-hidden shadow-2xl shadow-yellow-500/20">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-sm z-0"></div>
          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter mb-8 leading-none uppercase text-black">PROFISSIONALIZE<br />SUA ARENA AGORA</h2>
            <p className="text-black/80 text-lg md:text-xl mb-12 max-w-xl mx-auto font-black uppercase">
              Entre em contato e junte-se aos maiores rodeios do país.
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <button className="bg-black text-white w-full md:w-auto px-14 py-6 rounded-2xl font-black text-xl hover:scale-105 transition-transform active:scale-95 shadow-2xl uppercase tracking-tighter">
                FALAR NO WHATSAPP
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 px-6 bg-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
            <img src="/splash_logo.png" alt="RODEOAPP Logo" className="h-8 object-contain opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all" />
          </div>
          <div className="text-white/20 font-black text-[10px] tracking-[0.3em] text-center md:text-right uppercase">
            © 2026 RODEOAPP.PRO - TECNOLOGIA PARA PERFORMANCE<br/>
            TODOS OS DIREITOS RESERVADOS
          </div>
        </div>
      </footer>

      {/* Styles */}
      <style jsx global>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes shine {
          to { background-position: 200% center; }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(0.98); }
        }
        .animate-bounce-subtle { animation: bounce-subtle 4s ease-in-out infinite; }
        .animate-shine { animation: shine 3s linear infinite; }
        .animate-pulse-slow { animation: pulse-slow 6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function FeatureCard({ icon, title, description }: any) {
  return (
    <div className="group bg-white/5 border border-white/5 p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] hover:bg-white/10 hover:border-yellow-500/30 transition-all duration-500 hover:-translate-y-2">
      <div className="w-16 h-16 md:w-20 md:h-20 bg-black rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center mb-6 md:mb-8 border border-white/10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-2xl">
        {icon}
      </div>
      <h3 className="text-xl md:text-2xl font-black italic mb-4 uppercase tracking-tighter text-yellow-500">{title}</h3>
      <p className="text-white/40 font-bold leading-relaxed group-hover:text-white/80 transition-colors uppercase text-xs md:text-sm">
        {description}
      </p>
    </div>
  );
}

function PlanCard({ title, price, period, color, highlighted = false }: any) {
  return (
    <div className={`${color} border border-white/10 p-10 md:p-12 rounded-[3rem] md:rounded-[3.5rem] text-center transition-transform hover:scale-105 ${highlighted ? 'shadow-2xl shadow-yellow-500/20' : ''}`}>
      <h3 className="text-[10px] md:text-xs font-black tracking-[0.4em] mb-6 opacity-50 uppercase">{title}</h3>
      <div className="text-4xl md:text-5xl font-black italic mb-2 tracking-tighter uppercase">{price}</div>
      <div className="text-[9px] md:text-[10px] font-black tracking-widest opacity-50 uppercase mb-8">{period}</div>
      <button className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest border ${highlighted ? 'bg-black text-white border-black' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
        SOLICITAR
      </button>
    </div>
  );
}
