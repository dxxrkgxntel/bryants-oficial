const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const config = require('./config.json');

const { loadEvents } = require('./Handlers/eventHandler');
const { loadCommands } = require('./Handlers/commandHandler');
const { loadInteractions } = require('./Handlers/interactionHandler');
const { startWatcher } = require('./Handlers/watcher');

const client = new Client({
  intents: Object.values(GatewayIntentBits),
  partials: Object.values(Partials),
});

// 🔥 COLECCIONES
client.commands = new Collection();
client.buttons = new Map();
client.selects = new Map();
client.modals = new Map();

// 🔥 PROTECCIÓN (opcional)
client.setMaxListeners(20);

//////////////////////////////////////////////////////

// 🔁 WATCHER
startWatcher(client);

// 🔐 LOGIN
client.login(config.token).then(() => {

  loadEvents(client);
  loadCommands(client);
  loadInteractions(client);

});

// HANDLERS

require("./Handlers/birthdaySystem")(client);

//////////////////////////////////////////////////////
// 🔥 MANEJO GLOBAL DE ERRORES
//////////////////////////////////////////////////////

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});