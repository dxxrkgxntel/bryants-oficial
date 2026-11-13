const assert = require("node:assert/strict");
const { validateMessageDraft, buildMessagePayload, COMPONENTS_V2_FLAG } = require("../Functions/dashboardMessageBuilder");

const channels = [{ id: "12345678901234567", type: 0 }];
const embed = validateMessageDraft({
    name: "Aviso", channelId: channels[0].id, format: "embed",
    payload: { title: "Hola", description: "Mensaje", color: "#8A2BE2", fields: [{ name: "Regla", value: "Respeta" }] }
}, channels);
assert.equal(embed.payload.embed.title, "Hola");
assert.equal(buildMessagePayload(embed).embeds[0].fields.length, 1);

const v2 = validateMessageDraft({
    name: "Panel", channelId: channels[0].id, format: "components_v2",
    payload: { blocks: [{ type: "text", content: "## Hola" }, { type: "separator" }, { type: "button", label: "Abrir", url: "https://example.com" }] }
}, channels);
const payload = buildMessagePayload(v2);
assert.equal(payload.flags, COMPONENTS_V2_FLAG);
assert.equal(payload.components[0].accent_color, 0x8A2BE2);
assert.equal(payload.components[0].components[0].type, 10);
assert.equal(payload.components[0].components[2].components[0].style, 5);
assert.throws(() => validateMessageDraft({ name: "X", channelId: "bad", format: "embed", payload: { title: "x" } }, channels));
assert.throws(() => validateMessageDraft({ name: "X", channelId: channels[0].id, format: "components_v2", payload: { blocks: [{ type: "image", url: "javascript:alert(1)" }] } }, channels));
console.log("Dashboard message builder checks passed.");
