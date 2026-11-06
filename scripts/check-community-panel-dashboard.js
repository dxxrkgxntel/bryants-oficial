const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { configurations } = require("../dashboard/modules");
const { buildCommunityPanelPayload } = require("../Functions/communityPanelMessage");

const root = path.join(__dirname, "..");
const server = fs.readFileSync(path.join(root, "dashboard/server.js"), "utf8");
const client = fs.readFileSync(path.join(root, "dashboard/public/server.js"), "utf8");

assert.equal(configurations.communityPanels?.custom, true, "Community panels must appear as a dashboard module.");
assert.match(server, /\/api\/guilds\/:guildId\/community-panels/);
assert.match(server, /buildCommunityPanelPayload/);
assert.match(client, /async function renderCommunityPanels/);
assert.match(client, /data-panel-publish/);
assert.match(client, /data-panel-edit/);

const roles = new Map([
    ["22222222222222222", { id: "22222222222222222", name: "Miembros", managed: false }],
    ["33333333333333333", { id: "33333333333333333", name: "Avisos", managed: false }]
]);
const guild = { id: "11111111111111111", roles: { cache: { get: id => roles.get(id) } } };
const rolePanel = {
    guildId: guild.id, panelId: "roles", kind: "self_roles", messageType: "embed",
    title: "Elige tus roles", description: "Selecciona los roles que quieras.",
    color: "#8A2BE2", controlType: "buttons",
    roles: [{ roleId: "22222222222222222", label: "Miembros" }, { roleId: "33333333333333333", label: "Avisos" }]
};
const rolePayload = buildCommunityPanelPayload(rolePanel, guild);
assert.equal(rolePayload.embeds[0].title, "Elige tus roles");
assert.equal(rolePayload.components[0].components.length, 2);
assert.equal(rolePayload.components[0].components[0].custom_id, "community-panel:roles:role:22222222222222222");

const verificationPayload = buildCommunityPanelPayload({
    guildId: guild.id, panelId: "verify", kind: "verification", messageType: "components_v2",
    title: "Verificación", description: "Pulsa para verificarte.", color: "#8A2BE2"
}, guild);
assert.equal(verificationPayload.flags, 1 << 15);
assert.equal(verificationPayload.components[0].components.at(-1).components[0].custom_id, "community-panel:verify:verify");

console.log("Community panel dashboard integration checks passed.");
