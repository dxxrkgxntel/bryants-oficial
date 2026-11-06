#!/usr/bin/env node
"use strict";

// Read-only audit. This script never writes to MongoDB.
const mongoose = require("mongoose");
const Achievement = require("../Models/Achievement");
const TrophySettings = require("../Models/TrophySettings");
const UserAchievement = require("../Models/UserAchievement");
const catalog = require("../data/locales/notoq-achievements.es.json");
const { CATALOG_LOCALE_VERSION } = require("../Functions/achievementCatalogMigration");

const EXPECTED_COUNT = 397;
const DETAIL_LIMIT = 50;

function maskGuildId(guildId) {
    const value = String(guildId || "");
    return value.length > 4 ? `…${value.slice(-4)}` : "…";
}

function compareDefinition(definition, localized) {
    return ["name", "description", "category"].filter(field =>
        String(definition[field] ?? "") !== String(localized[field] ?? "")
    );
}

async function auditDatabase() {
    if (catalog?.locale !== "es" || !Array.isArray(catalog.achievements) || catalog.achievements.length !== EXPECTED_COUNT) {
        throw new Error("El catálogo local no contiene los 397 logros españoles esperados.");
    }

    const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
    if (!uri) {
        throw new Error("Define MONGODB_URI (o DATABASE_URL) en el entorno. No se lee config.json.");
    }

    await mongoose.connect(uri, { readPreference: "secondaryPreferred" });
    try {
        const [settings, achievementGuildIds, progressGuildIds, progressStats] = await Promise.all([
            TrophySettings.find({}).select("guildId notoqCatalogLocaleVersion notoqCatalogSeeded").lean(),
            Achievement.distinct("guildId", { source: "notoq" }),
            UserAchievement.distinct("guildId"),
            UserAchievement.aggregate([
                { $group: {
                    _id: "$guildId",
                    records: { $sum: 1 },
                    unlocked: { $sum: { $cond: [{ $ne: ["$unlockedAt", null] }, 1, 0] } },
                    pointsEarned: { $sum: { $ifNull: ["$pointsEarned", 0] } },
                    progressTotal: { $sum: { $ifNull: ["$progress", 0] } },
                    unlockedLevels: { $sum: { $size: { $ifNull: ["$unlockedLevels", []] } } }
                } }
            ])
        ]);

        const guildIds = [...new Set([
            ...settings.map(item => String(item.guildId)),
            ...achievementGuildIds.map(String),
            ...progressGuildIds.map(String)
        ])];
        const settingsByGuild = new Map(settings.map(item => [String(item.guildId), item]));
        const progressByGuild = new Map(progressStats.map(item => [String(item._id), item]));
        const expectedById = new Map(catalog.achievements.map(item => [item.id, item]));
        const results = [];

        for (const guildId of guildIds) {
            const [definitions, duplicateGroups] = await Promise.all([
                Achievement.find({ guildId, source: "notoq" })
                    .select("achievementId name description category")
                    .lean(),
                Achievement.aggregate([
                    { $match: { guildId, source: "notoq" } },
                    { $group: { _id: "$achievementId", count: { $sum: 1 } } },
                    { $match: { count: { $gt: 1 } } },
                    { $count: "total" }
                ])
            ]);

            const actualIds = new Set(definitions.map(item => item.achievementId));
            const missingIds = [...expectedById.keys()].filter(id => !actualIds.has(id));
            const unexpectedIds = [...actualIds].filter(id => !expectedById.has(id));
            const metadataDifferences = [];
            for (const definition of definitions) {
                const expected = expectedById.get(definition.achievementId);
                if (!expected) continue;
                const fields = compareDefinition(definition, expected);
                if (fields.length) metadataDifferences.push({ achievementId: definition.achievementId, fields });
            }

            const setting = settingsByGuild.get(guildId);
            const progress = progressByGuild.get(guildId) || {};
            const duplicateCount = Number(duplicateGroups[0]?.total || 0);
            const checks = {
                definitionCount: definitions.length,
                expectedDefinitionCount: EXPECTED_COUNT,
                missingCount: missingIds.length,
                unexpectedCount: unexpectedIds.length,
                duplicateAchievementIds: duplicateCount,
                metadataDifferenceCount: metadataDifferences.length,
                localeVersion: Number(setting?.notoqCatalogLocaleVersion || 0),
                expectedLocaleVersion: CATALOG_LOCALE_VERSION,
                seeded: Boolean(setting?.notoqCatalogSeeded),
                progress: {
                    records: Number(progress.records || 0),
                    unlockedRecords: Number(progress.unlocked || 0),
                    pointsEarned: Number(progress.pointsEarned || 0),
                    progressTotal: Number(progress.progressTotal || 0),
                    unlockedLevels: Number(progress.unlockedLevels || 0)
                },
                missingIds: missingIds.slice(0, DETAIL_LIMIT),
                unexpectedIds: unexpectedIds.slice(0, DETAIL_LIMIT),
                metadataDifferences: metadataDifferences.slice(0, DETAIL_LIMIT)
            };
            checks.status = checks.definitionCount === EXPECTED_COUNT &&
                checks.missingCount === 0 && checks.unexpectedCount === 0 &&
                checks.duplicateAchievementIds === 0 && checks.metadataDifferenceCount === 0 &&
                checks.localeVersion >= CATALOG_LOCALE_VERSION ? "ready" : "review";
            results.push({ guild: maskGuildId(guildId), ...checks });
        }

        const report = {
            audit: "achievement-catalog-es",
            mode: "READ_ONLY",
            generatedAt: new Date().toISOString(),
            catalog: { locale: catalog.locale, definitions: catalog.achievements.length, localeVersion: CATALOG_LOCALE_VERSION },
            guildCount: results.length,
            readyGuilds: results.filter(item => item.status === "ready").length,
            reviewGuilds: results.filter(item => item.status !== "ready").length,
            guilds: results
        };
        console.log(JSON.stringify(report, null, 2));
        return report;
    } finally {
        await mongoose.disconnect();
    }
}

if (require.main === module) {
    auditDatabase().then(report => {
        if (report.reviewGuilds > 0) process.exitCode = 2;
    }).catch(error => {
        console.error("[Achievement catalog audit]", error.message);
        process.exitCode = 1;
    });
}

module.exports = { auditDatabase, maskGuildId, compareDefinition };
