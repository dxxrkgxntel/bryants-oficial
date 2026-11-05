const assert = require("node:assert/strict");
const { extractMessageAchievementMetrics } = require("../Functions/achievementMessageMetrics");

function message(overrides = {}) {
    return {
        content: "",
        author: { id: "10000000000000001" },
        attachments: { values: () => [] },
        stickers: { size: 0 },
        mentions: { users: { size: 0, values: () => [] } },
        ...overrides
    };
}

const metrics = extractMessageAchievementMetrics(message({
    content: "Hola mundo 😀 https://example.com ||secreto|| ```js\nconst x = 1;\n```",
    reference: { messageId: "20000000000000002" },
    mentions: { users: { size: 2, values: () => [{ id: "10000000000000001" }, { id: "30000000000000003" }] } },
    attachments: { values: () => [{ name: "foto.png", contentType: "image/png" }, { name: "clip.gif", contentType: "image/gif" }, { name: "document.pdf", contentType: "application/pdf" }] },
    stickers: { size: 2 }
}));
assert.equal(metrics.words_typed, 11);
assert.equal(metrics.characters_typed, [..."Hola mundo 😀 https://example.com ||secreto|| ```js\nconst x = 1;\n```"].length);
assert.equal(metrics.images_sent, 1);
assert.equal(metrics.gifs_sent, 1);
assert.equal(metrics.links_sent, 1);
assert.equal(metrics.stickers_sent, 2);
assert.equal(metrics.attachments_sent, 3);
assert.equal(metrics.replies_sent, 1);
assert.equal(metrics.mentions_made, 1);
assert.equal(metrics.spoilers_sent, 1);
assert.equal(metrics.code_blocks_sent, 1);

assert.deepEqual(extractMessageAchievementMetrics(message({ content: "   " })), { characters_typed: 3 });
assert.deepEqual(extractMessageAchievementMetrics(message({ content: "" })), {});
assert.equal(extractMessageAchievementMetrics(message({ content: "https://example.com/a.gif" })).gifs_sent, 1);
assert.equal(extractMessageAchievementMetrics(message({ content: "https://example.com/a.png" })).links_sent, 1);

console.log("Achievement message metric tests passed: 14 assertions.");
