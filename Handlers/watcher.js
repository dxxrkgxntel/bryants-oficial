const path = require('path');
const { reloadCommand } = require('./commandHandler');
const { reloadEvent } = require('./eventHandler');
const { loadInteractions } = require('./interactionHandler');

console.log('👀 Watcher iniciado...');

async function startWatcher(client) {
    console.log('📡 Observando cambios...');

    const chokidar = (await import('chokidar')).default;

    const commandsPath = path.join(__dirname, '..', 'Commands');
    const eventsPath = path.join(__dirname, '..', 'Events');
    const interactionsPath = path.join(__dirname, '..', 'Interactions');

    const watcher = chokidar.watch(
        [commandsPath, eventsPath, interactionsPath],
        { ignoreInitial: true }
    );

    let timeout;

    watcher.on('all', (event, filePath) => {

        if (!filePath.endsWith('.js')) return;

        clearTimeout(timeout);

        timeout = setTimeout(() => {

            console.log(`📁 Cambio detectado: ${event} -> ${filePath}`);

            try {

                // ===============================
                // 🔥 COMANDOS
                // ===============================
                if (filePath.includes('Commands')) {
                    reloadCommand(client, filePath);
                }

                // ===============================
                // 🔥 EVENTOS
                // ===============================
                if (filePath.includes('Events')) {
                    reloadEvent(client, filePath);
                }

                // ===============================
                // 🔥 INTERACCIONES (GLOBAL)
                // ===============================
                if (filePath.includes('Interactions')) {
                    console.log('♻️ Recargando TODAS las interacciones...');
                    loadInteractions(client);
                }

                console.log('✅ Hot-reload completado\n');

            } catch (err) {
                console.error('❌ Error en hot-reload:', err);
            }

        }, 200);

    });
}

module.exports = { startWatcher };