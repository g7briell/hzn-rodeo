const fs = require('fs');
const path = require('path');

// Mock a browser environment
global.window = global;
global.window.addEventListener = () => {};
global.document = {
    getElementById: (id) => {
        return {
            classList: {
                add: () => {},
                remove: () => {},
                contains: () => false
            },
            addEventListener: () => {},
            setAttribute: () => {},
            value: '',
            style: {},
            querySelector: () => ({ parentElement: { prepend: () => {} }, remove: () => {} }),
            querySelectorAll: () => [],
            remove: () => {}
        };
    },
    querySelector: () => ({ parentElement: { prepend: () => {} }, remove: () => {} }),
    querySelectorAll: () => [],
    createElement: () => ({ remove: () => {} }),
    documentElement: {
        style: {
            setProperty: () => {}
        }
    }
};
global.navigator = {
    clipboard: {
        writeText: () => Promise.resolve()
    }
};

// Mock electron API
global.window.electronAPI = {
    getAuth: () => ({ esportes: 'rodeio,3tambores,transmissao' }),
    saveAuth: () => {},
    getLocalEvents: () => Promise.resolve([
        { id: '123', name: 'Test Event', city: 'Test City', days: 3, judges: 2, peoes: [], boiadas: [], juizes: [] }
    ]),
    updateLocalEvent: () => Promise.resolve(),
    onUpdaterEvent: () => {}
};

global.getCurrentUserEmail = () => 'test@test.com';
global.toggleSupportBtn = () => {};
global.getEventDaysList = () => [];

try {
    const code = fs.readFileSync(path.join(__dirname, '../client_app/renderer.js'), 'utf8');
    // Evaluate the code
    eval(code);
    console.log("Renderer.js loaded successfully with no runtime errors!");

    console.log("Calling openEventControl('123')...");
    global.openEventControl('123').then(() => {
        console.log("Testing openListPeoes()...");
        global.openListPeoes();

        console.log("Testing openListBoiadas()...");
        global.openListBoiadas();

        console.log("Testing openListJuizes()...");
        global.openListJuizes();

        console.log("Testing openSorteiosList()...");
        global.openSorteiosList();

        console.log("Testing openRankingView()...");
        global.openRankingView();

        console.log("All function calls completed successfully!");
    }).catch(err => {
        console.error("Error in openEventControl:", err);
    });

} catch (e) {
    console.error("Runtime error during execution:", e);
}
