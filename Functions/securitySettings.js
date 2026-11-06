const DEFAULT_SECURITY_SETTINGS = Object.freeze({
    enabled: true,
    joinThreshold: 7,
    joinWindowSeconds: 10,
    alertCooldownMinutes: 5,
    alertChannelId: null,
    notifyDashboard: true
});

function boundedInteger(value, fallback, min, max) {
    const number = Number(value);
    return Number.isInteger(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function normalizeSecuritySettings(document) {
    return {
        enabled: document?.enabled !== false,
        joinThreshold: boundedInteger(document?.joinThreshold, DEFAULT_SECURITY_SETTINGS.joinThreshold, 3, 50),
        joinWindowSeconds: boundedInteger(document?.joinWindowSeconds, DEFAULT_SECURITY_SETTINGS.joinWindowSeconds, 5, 120),
        alertCooldownMinutes: boundedInteger(document?.alertCooldownMinutes, DEFAULT_SECURITY_SETTINGS.alertCooldownMinutes, 1, 60),
        alertChannelId: /^\\d{17,20}$/.test(String(document?.alertChannelId || "")) ? document.alertChannelId : null,
        notifyDashboard: document?.notifyDashboard !== false
    };
}

module.exports = { DEFAULT_SECURITY_SETTINGS, normalizeSecuritySettings, boundedInteger };
