const TrophySettings = require("../Models/TrophySettings");
const Achievement = require("../Models/Achievement");

const CATALOG_LOCALE_VERSION = 1;
const LOCALIZED_FIELDS = ["name", "description", "category"];

function validateLocalizedCatalog(catalog) {
    const achievements = catalog?.achievements;
    if (catalog?.locale !== "es") throw new Error("El catálogo no está marcado como español.");
    if (!Array.isArray(achievements) || achievements.length !== 397) {
        throw new Error("El catálogo localizado debe contener exactamente 397 logros.");
    }
    const ids = new Set();
    for (const item of achievements) {
        if (!item?.id || ids.has(item.id)) throw new Error("El catálogo contiene un identificador vacío o duplicado.");
        ids.add(item.id);
        for (const field of LOCALIZED_FIELDS) {
            if (typeof item[field] !== "string" || !item[field].trim()) {
                throw new Error(`El logro ${item.id} no tiene un campo ${field} válido.`);
            }
        }
    }
}

async function migrateAchievementCatalog(guildId, catalog) {
    if (!guildId) return { migrated: false, reason: "missing-guild" };
    validateLocalizedCatalog(catalog);
    const achievements = catalog.achievements;

    const settings = await TrophySettings.findOne({ guildId }).select("notoqCatalogLocaleVersion").lean();
    if (Number(settings?.notoqCatalogLocaleVersion || 0) >= CATALOG_LOCALE_VERSION) {
        return { migrated: false, reason: "already-current" };
    }

    const operations = achievements.map(item => ({
        updateOne: {
            filter: { guildId, achievementId: item.id, source: "notoq" },
            update: {
                $set: {
                    name: item.name,
                    description: item.description,
                    category: item.category
                }
            },
            upsert: false
        }
    }));

    if (operations.length) {
        const writeResult = await Achievement.bulkWrite(operations, { ordered: false });
        const matchedCount = Number(writeResult?.matchedCount ?? writeResult?.nMatched ?? 0);
        if (matchedCount !== achievements.length) {
            throw new Error(
                `Migración incompleta del catálogo Notoq: se encontraron ${matchedCount} de ${achievements.length} definiciones.`
            );
        }
    }

    await TrophySettings.updateOne(
        { guildId },
        {
            $set: { notoqCatalogLocaleVersion: CATALOG_LOCALE_VERSION },
            $setOnInsert: { guildId }
        },
        { upsert: true }
    );

    return { migrated: true, updatedDefinitions: achievements.length, localeVersion: CATALOG_LOCALE_VERSION };
}

module.exports = { migrateAchievementCatalog, validateLocalizedCatalog, CATALOG_LOCALE_VERSION };
