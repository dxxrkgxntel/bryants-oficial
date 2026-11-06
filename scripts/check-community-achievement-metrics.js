const assert = require("assert");
const { createSelfRoleAchievementMetricTracker } = require("../Functions/selfRoleAchievementMetrics");
const { createVerificationAchievementMetricTracker } = require("../Functions/verificationAchievementMetrics");
const { achievementProgressUpdate } = require("../Functions/achievementRules");
const { wholeDaysSince, DAY_MS } = require("../Functions/memberAchievementMetrics");
const { completedCalendarMonths, resolvePremiumSince } = require("../Functions/boostAchievementMetrics");
const { buildCommunityPanelPayload } = require("../Functions/communityPanelMessage");
const { COMPONENTS_V2_FLAG } = require("../Functions/communityPanelMessage");

async function run() {
    const roleRecords = new Map();
    const roleCalls = [];
    const roleModel = {
        async findOneAndUpdate(filter, update) {
            const key = filter.guildId + ":" + filter.userId;
            const current = roleRecords.get(key) || { guildId: filter.guildId, userId: filter.userId, roleIds: [] };
            for (const roleId of update.$addToSet.roleIds ? [update.$addToSet.roleIds] : []) {
                if (!current.roleIds.includes(roleId)) current.roleIds.push(roleId);
            }
            roleRecords.set(key, current);
            return { ...current, roleIds: [...current.roleIds] };
        }
    };
    const recordRole = createSelfRoleAchievementMetricTracker({
        model: roleModel,
        trackProgress: async (...args) => roleCalls.push(args)
    });
    const guild = { id: "guild-123" };
    const user = { id: "12345678901234567", bot: false };
    assert.strictEqual(await recordRole(guild, user, "22345678901234567"), 1);
    assert.strictEqual(await recordRole(guild, user, "22345678901234567"), 1);
    assert.strictEqual(await recordRole(guild, user, "32345678901234567"), 2);
    assert.strictEqual(roleCalls.length, 3);
    assert(roleCalls.every(call => call[2] === "self_roles_taken" && call[4].absolute === true));
    assert.strictEqual(await recordRole(guild, { ...user, bot: true }, "42345678901234567"), 0);

    const verified = new Set();
    const verificationCalls = [];
    const verificationModel = {
        async updateOne(filter) { verified.add(filter.guildId + ":" + filter.userId); }
    };
    const recordVerified = createVerificationAchievementMetricTracker({
        model: verificationModel,
        trackProgress: async (...args) => verificationCalls.push(args)
    });
    assert.strictEqual(await recordVerified(guild, user, "verification-config-a"), true);
    assert.strictEqual(await recordVerified(guild, user, "verification-config-a"), true);
    assert.strictEqual(verified.size, 1);
    assert.strictEqual(verificationCalls.length, 2);
    assert(verificationCalls.every(call => call[2] === "verified" && call[3] === 1 && call[4].absolute === true));
    assert.strictEqual(await recordVerified(guild, { ...user, bot: true }), false);

    const now = Date.UTC(2026, 10, 6, 12);
    const joinedAgain = new Date(now - 2 * DAY_MS);
    assert.strictEqual(wholeDaysSince(joinedAgain, now), 2);
    assert.deepStrictEqual(achievementProgressUpdate(2, true), { $max: { progress: 2 } });
    assert.deepStrictEqual(achievementProgressUpdate(365, true), { $max: { progress: 365 } });

    const panelGuild = { id: "guild-123", roles: { cache: new Map([["22345678901234567", { id: "22345678901234567", managed: false }], ["32345678901234567", { id: "32345678901234567", managed: false }]]) } };
    const rolePanel = { guildId: panelGuild.id, panelId: "roles-1", kind: "self_roles", messageType: "text", content: "Elige tus roles", controlType: "buttons", roles: [{ roleId: "22345678901234567", label: "Gaming" }, { roleId: "32345678901234567", label: "Música" }] };
    const textPayload = buildCommunityPanelPayload(rolePanel, panelGuild);
    assert.strictEqual(textPayload.content, "Elige tus roles");
    assert.strictEqual(textPayload.components[0].components.length, 2);
    assert.strictEqual(textPayload.components[0].components[0].custom_id, "community-panel:roles-1:role:22345678901234567");

    const embedPayload = buildCommunityPanelPayload({ ...rolePanel, messageType: "embed", title: "Roles", description: "Escoge uno" }, panelGuild);
    assert.strictEqual(embedPayload.embeds[0].title, "Roles");
    const v2Payload = buildCommunityPanelPayload({ ...rolePanel, messageType: "components_v2", title: "Roles", description: "Escoge uno" }, panelGuild);
    assert.strictEqual(v2Payload.flags, COMPONENTS_V2_FLAG);
    assert.strictEqual(v2Payload.components[0].type, 17);
    const selectPayload = buildCommunityPanelPayload({ ...rolePanel, controlType: "select", maxValues: 2 }, panelGuild);
    assert.strictEqual(selectPayload.components[0].components[0].type, 3);
    assert.strictEqual(selectPayload.components[0].components[0].options.length, 2);
    const verifyPayload = buildCommunityPanelPayload({ panelId: "verify-1", kind: "verification", messageType: "text", content: "Verifica tu cuenta" }, panelGuild);
    assert.strictEqual(verifyPayload.components[0].components[0].custom_id, "community-panel:verify-1:verify");

    const boostStart = new Date(Date.UTC(2026, 0, 31, 12));
    assert.strictEqual(resolvePremiumSince({ premiumSince: boostStart }, { premiumSince: null }), boostStart);
    assert.strictEqual(resolvePremiumSince({ premiumSince: boostStart }, { premiumSince: new Date(Date.UTC(2026, 1, 1)) }).getTime(), Date.UTC(2026, 1, 1));
    assert.strictEqual(completedCalendarMonths(boostStart, Date.UTC(2026, 1, 28, 12)), 1);
    assert.strictEqual(completedCalendarMonths(boostStart, Date.UTC(2026, 1, 28, 11, 59)), 0);

    console.log("Community achievement metric checks passed.");
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
