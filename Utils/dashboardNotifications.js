const DashboardNotification = require("../Models/DashboardNotification");

const CATEGORIES = new Set(["configuration", "security", "community", "system"]);
const SEVERITIES = new Set(["info", "success", "warning", "critical"]);
const SNOWFLAKE = /^\d{17,20}$/;

function isValidSnowflake(value) {
    return typeof value === "string" && SNOWFLAKE.test(value);
}

function cleanText(value, maxLength) {
    if (typeof value !== "string") return "";
    return value.trim().slice(0, maxLength);
}

/**
 * Publishes a bot-originated event to the same notification collection used by
 * the dashboard. Per-user visibility and category preferences are applied by
 * the existing notification API when each member opens the center.
 */
async function publishDashboardNotification({
    guildId,
    title,
    message,
    category = "system",
    severity = "info",
    targetUserIds = []
} = {}) {
    const normalizedGuildId = String(guildId || "");
    const normalizedTitle = cleanText(title, 120);
    const normalizedMessage = cleanText(message, 1000);

    if (!isValidSnowflake(normalizedGuildId) || !normalizedTitle || !normalizedMessage) {
        return null;
    }
    if (!CATEGORIES.has(category) || !SEVERITIES.has(severity)) return null;

    const recipients = Array.isArray(targetUserIds)
        ? [...new Set(targetUserIds.filter(isValidSnowflake))].slice(0, 100)
        : [];

    try {
        return await DashboardNotification.create({
            guildId: normalizedGuildId,
            title: normalizedTitle,
            message: normalizedMessage,
            category,
            severity,
            targetUserIds: recipients,
            createdBy: null
        });
    } catch (error) {
        // Notification persistence must never interrupt the original bot event.
        console.warn("[Dashboard Notifications] No se pudo registrar un evento del bot:", error.message);
        return null;
    }
}

module.exports = { publishDashboardNotification, isValidSnowflake };
