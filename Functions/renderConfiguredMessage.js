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
    ["rol", "rol"], ["role", "rol"], ["boosts", "boosts"]
]);

function renderConfiguredMessage(template, values = {}) {
    if (typeof template !== "string" || !template.trim()) return "";
    return template.replace(/\{([a-zA-Z_]+)\}/g, (token, key) => {
        if (Object.prototype.hasOwnProperty.call(values, key)) return String(values[key] ?? "");
        const canonicalKey = variableAliases.get(key.toLowerCase());
        if (!canonicalKey) return token;
        if (Object.prototype.hasOwnProperty.call(values, canonicalKey)) return String(values[canonicalKey] ?? "");
        return token;
    }).trim();
}

function parseConfiguredColor(value) {
    if (typeof value !== "string" || !/^#[\da-f]{6}$/i.test(value)) return null;
    return Number.parseInt(value.slice(1), 16);
}

module.exports = { renderConfiguredMessage, parseConfiguredColor };
