const variableAliases = new Map([
    ["usuario", "usuario"], ["user", "usuario"], ["member", "usuario"], ["miembro", "usuario"], ["mention", "usuario"],
    ["username", "username"], ["user_name", "username"], ["nombreusuario", "username"], ["nombre_usuario", "username"], ["name", "username"],
    ["usertag", "userTag"], ["user_tag", "userTag"], ["tag", "userTag"],
    ["id", "id"], ["userid", "id"], ["user_id", "id"], ["memberid", "id"], ["member_id", "id"],
    ["servidor", "servidor"], ["server", "servidor"], ["servername", "servidor"], ["server_name", "servidor"], ["guild", "servidor"], ["guildname", "servidor"], ["guild_name", "servidor"],
    ["serverid", "serverId"], ["server_id", "serverId"], ["guildid", "serverId"], ["guild_id", "serverId"],
    ["miembros", "miembros"], ["members", "miembros"], ["membercount", "miembros"], ["member_count", "miembros"], ["memberscount", "miembros"], ["members_count", "miembros"],
    ["cuenta", "cuenta"], ["createdat", "cuenta"], ["created_at", "cuenta"], ["accountcreated", "cuenta"], ["account_created", "cuenta"], ["accountage", "cuenta"], ["account_age", "cuenta"],
    ["nivel", "nivel"], ["level", "nivel"], ["xp", "xp"],
    ["recompensa", "recompensa"], ["reward", "recompensa"], ["coins", "recompensa"], ["monedas", "recompensa"],
    ["rol", "rol"], ["role", "rol"], ["boosts", "boosts"], ["boost", "boosts"],
    ["date", "date"], ["fecha", "date"], ["time", "time"], ["hora", "time"]
]);

function renderConfiguredMessage(template, values = {}) {
    if (typeof template !== "string" || !template.trim()) return "";
    const now = new Date();
    const dynamicValues = {
        ...values,
        date: values.date ?? new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(now),
        time: values.time ?? new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(now)
    };
    return template.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}|\{\s*([a-zA-Z_]+)\s*\}/g, (token, doubleKey, singleKey) => {
        const key = doubleKey || singleKey;
        if (Object.prototype.hasOwnProperty.call(dynamicValues, key)) return String(dynamicValues[key] ?? "");
        const canonicalKey = variableAliases.get(key.toLowerCase());
        if (!canonicalKey) return token;
        if (Object.prototype.hasOwnProperty.call(dynamicValues, canonicalKey)) return String(dynamicValues[canonicalKey] ?? "");
        return token;
    }).trim();
}

function parseConfiguredColor(value) {
    if (typeof value !== "string" || !/^#[\da-f]{6}$/i.test(value)) return null;
    return Number.parseInt(value.slice(1), 16);
}

module.exports = { renderConfiguredMessage, parseConfiguredColor };
