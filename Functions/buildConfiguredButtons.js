const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

function parseEmoji(value) {
    const emoji = String(value || "").trim();
    if (!emoji) return null;
    const custom = emoji.match(/^<(a?):([^:>]+):(\d{17,20})>$/);
    if (custom) return { id: custom[3], name: custom[2], animated: Boolean(custom[1]) };
    return { name: emoji };
}

function buildConfiguredButtonRows(buttons, guild, scope) {
    const valid = (Array.isArray(buttons) ? buttons : []).filter(button => {
        if (!button?.label) return false;
        if (button.action === "link") {
            try { return new URL(button.url).protocol === "https:"; } catch { return false; }
        }
        return button.action === "role" && Boolean(guild.roles.cache.get(button.roleId));
    });
    const rows = [];
    for (let start = 0; start < valid.length; start += 5) {
        const row = new ActionRowBuilder();
        for (const [index, button] of valid.slice(start, start + 5).entries()) {
            const builder = new ButtonBuilder().setLabel(button.label.slice(0, 80));
            if (button.emoji) builder.setEmoji(parseEmoji(button.emoji));
            if (button.action === "link") {
                builder.setStyle(ButtonStyle.Link).setURL(button.url);
            } else {
                builder.setStyle(ButtonStyle.Secondary).setCustomId(`claim_${scope}_role_${button.roleId}`);
            }
            row.addComponents(builder);
        }
        rows.push(row.toJSON());
    }
    return rows;
}

module.exports = { buildConfiguredButtonRows };
