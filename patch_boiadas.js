const fs = require('fs');

const file = 'client_app/index.html';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    '<h2 class="text-3xl font-black italic mb-8 uppercase text-yellow-500 text-left">Cadastrar Boiada (CIA)</h2>',
    `<div class="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <h2 class="text-3xl font-black italic uppercase text-yellow-500 text-left">Cadastrar Boiada (CIA)</h2>
        <button type="button" onclick="openCloudBoiadas()" class="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Baixar do Banco Oficial
        </button>
    </div>`
);

const modalCloud = `
      <!-- Cloud Boiadas Modal -->
      <div id="modal-cloud-boiadas" class="fixed inset-0 z-[170] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 hidden text-left">
          <div class="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] max-w-4xl w-full h-[80vh] flex flex-col shadow-2xl relative">
              <button onclick="document.getElementById('modal-cloud-boiadas').classList.add('hidden')" class="absolute top-8 right-8 text-slate-500 hover:text-white"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
              <h2 class="text-3xl font-black italic uppercase text-indigo-500 mb-2">Boiadas Oficiais</h2>
              <p class="text-slate-400 font-bold text-xs mb-8 uppercase tracking-widest">Clique em uma CIA para baixar todos os seus touros automaticamente.</p>
              
              <div id="cloud-boiadas-list" class="flex-1 overflow-y-auto pr-4 space-y-3 custom-scroll">
                  <div class="text-white/30 text-center py-10 font-black uppercase tracking-widest text-xs">Carregando...</div>
              </div>
          </div>
      </div>
`;

content = content.replace(
    `                  <button type="submit" class="w-full bg-yellow-500 hover:bg-yellow-400 py-5 rounded-2xl font-black text-black uppercase tracking-widest shadow-xl">SALVAR CIA E TOUROS</button>
              </form>
          </div>
      </div>`,
    `                  <button type="submit" class="w-full bg-yellow-500 hover:bg-yellow-400 py-5 rounded-2xl font-black text-black uppercase tracking-widest shadow-xl">SALVAR CIA E TOUROS</button>
              </form>
          </div>
      </div>
${modalCloud}`
);

fs.writeFileSync(file, content);
console.log('Done');
