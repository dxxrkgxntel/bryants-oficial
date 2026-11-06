const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildCommunityPanelPayload } = require("../Functions/communityPanelMessage");

const root = path.join(__dirname, "..");
const server = fs.readFileSync(path.join(root, "dashboard/server.js"), "utf8");
const modules = fs.readFileSync(path.join(root, "dashboard/modules.js"), "utf8");
const client = fs.readFileSync(path.join(root, "dashboard/public/server.js"), "utf8");
const panelModel = fs.readFileSync(path.join(root, "Models/CommunityPanel.js"), "utf8");
const requestModel = fs.readFileSync(path.join(root, "Models/VerificationRequest.js"), "utf8");
const interactions = fs.readFileSync(path.join(root, "Events/Interaction/communityPanelInteractions.js"), "utf8");

assert.match(modules, /communityPanels\s*:\s*\{[\s\S]*?custom:\s*true/, "Community panels must appear as a dashboard module.");
assert.match(server, /\/api\/guilds\/:guildId\/community-panels/);
assert.match(server, /buildCommunityPanelPayload/);
assert.match(client, /async function renderCommunityPanels/);
assert.match(client, /data-panel-publish/);
assert.match(client, /data-panel-edit/);
assert.match(client, /verificationMethods/);
assert.match(client, /verificationAnswer/);
assert.match(client, /reviewChannelId/);
assert.match(panelModel, /verificationMethods/);
assert.match(panelModel, /verificationAnswerHash/);
assert.match(requestModel, /expireAfterSeconds:\s*0/);
assert.match(interactions, /community-verify:/);
assert.match(interactions, /community-review:/);
assert.match(interactions, /timingSafeEqual/);
assert.match(interactions, /ManageGuild/);
assert.match(server, /verificationAnswerHash/);
assert.match(server, /reviewerRoleIds/);

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
const multiMethodPayload = buildCommunityPanelPayload({
    guildId: guild.id, panelId: "multi", kind: "verification", messageType: "embed",
    title: "Verificación", description: "Elige un método.", color: "#8A2BE2",
    verificationMethods: ["button", "captcha", "question", "manual_approval"]
}, guild);
assert.deepEqual(
    multiMethodPayload.components[0].components.map(component => component.custom_id),
    ["community-panel:multi:verify", "community-panel:multi:verify:captcha", "community-panel:multi:verify:question", "community-panel:multi:verify:manual_approval"]
);

console.log("Community panel dashboard integration checks passed.");
