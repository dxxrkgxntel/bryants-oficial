const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const config = require('./config.json');

const { loadEvents } = require('./Handlers/eventHandler');
const { loadCommands } = require('./Handlers/commandHandler');
const { loadInteractions } = require('./Handlers/interactionHandler');
const { startAutomationScheduler } = require("./Handlers/automationScheduler");
const { startWatcher } = require('./Handlers/watcher');
const { loadScamDomains } = require("./Utils/antiscam/scamCache");
const { Shoukaku, Connectors } = require("shoukaku");

function createLavalinkClient(client) {
  const address = String(process.env.LAVALINK_HTTP_URL || "").trim();
  const password = String(process.env.LAVALINK_PASSWORD || "").trim();
  if (!address || !password) {
    console.warn("[LAVALINK] Faltan LAVALINK_HTTP_URL o LAVALINK_PASSWORD. La música quedará desactivada.");
    return null;
  }

  try {
    const parsed = new URL(address.includes("://") ? address : "http://" + address);
    const secure = parsed.protocol === "https:";
    const node = {
      name: "Bryvex-Lavalink",
      url: parsed.hostname + (parsed.port ? ":" + parsed.port : (secure ? ":443" : ":80")),
      auth: password,
      secure
    };
    const manager = new Shoukaku(new Connectors.DiscordJS(client), [node], {
      resume: true,
      resumeTimeout: 60,
      reconnectTries: 10,
      reconnectInterval: 5
    });
    manager.on("ready", (name) => console.log("[LAVALINK] Nodo conectado: " + name));
    manager.on("error", (name, error) => console.error("[LAVALINK] Error en " + name + ":", error?.message || error));
    manager.on("close", (name, code, reason) => console.warn("[LAVALINK] Nodo desconectado: " + name + " (" + code + ") " + reason));
    return manager;
  } catch (error) {
    console.error("[LAVALINK] URL inválida en LAVALINK_HTTP_URL:", error.message);
    return null;
  }
}


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

// Inicializar Shoukaku antes del login para registrar los eventos Gateway de voz.
client.shoukaku = createLavalinkClient(client);

//////////////////////////////////////////////////////

// 🔁 WATCHER
startWatcher(client);
loadScamDomains();

// 🔐 LOGIN
client.login(process.env.DISCORD_TOKEN || config.token).then(() => {

  loadEvents(client);
  loadCommands(client);
  loadInteractions(client);
  startAutomationScheduler(client);

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
