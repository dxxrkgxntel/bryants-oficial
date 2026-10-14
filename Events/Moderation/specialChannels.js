const { PermissionsBitField } = require("discord.js");
const SpecialChannelsConfig = require("../../Models/SpecialChannelsConfig");

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm", "m4v", "mkv", "avi"]);

function extension(value = "") {
    return value.split(/[?#]/, 1)[0].match(/\.([a-z0-9]{1,8})$/i)?.[1]?.toLowerCase() || "";
}

function classifyAttachment(attachment) {
    const type = (attachment.contentType || "").split(";")[0].toLowerCase();
    const ext = extension(attachment.name || attachment.url);
    if (type.startsWith("image/") || IMAGE_EXTENSIONS.has(ext)) return "images";
    if (type.startsWith("video/") || VIDEO_EXTENSIONS.has(ext)) return "videos";
    return "files";
}

function hasLink(content = "") {
    return /(?:https?:\/\/|www\.)[^\s<>]+/i.test(content);
}

function hasCommand(message, client) {
    const prefix = "+";
    if (!message.content.startsWith(prefix)) return false;
    const name = message.content.slice(prefix.length).trim().split(/\s+/, 1)[0]?.toLowerCase();
    return Boolean(name && (client?.pcommands?.has?.(name) || client?.pcommands?.find?.(command => command.aliases?.includes(name))));
}

function memberIsExempt(message, rule) {
    if (!message.member) return false;
    if (message.guild.ownerId === message.author.id) return true;
    if (message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return true;
    return (rule.immuneRoles || []).some(roleId => message.member.roles.cache.has(roleId));
}

module.exports = {
    name: "messageCreate",

    async execute(message, client) {
        if (!message.guild || message.author.bot || message.webhookId) return;

        try {
            const config = await SpecialChannelsConfig.findOne({ guildId: message.guild.id }).lean();
            const rule = config?.channels?.find(item => item.channelId === message.channel.id);
            if (!rule || memberIsExempt(message, rule)) return;

            const detected = new Set();
            for (const attachment of message.attachments.values()) detected.add(classifyAttachment(attachment));
            if (message.stickers?.size) detected.add("stickers");
            if (hasLink(message.content)) detected.add("links");
            if (hasCommand(message, client)) detected.add("commands");
            for (const embed of message.embeds || []) {
                if (embed.video) detected.add("videos");
                else if (embed.image || embed.thumbnail) detected.add("images");
            }

            // El texto normal se permite. Si el mensaje incluye varios tipos de
            // contenido, todos deben estar habilitados para que se conserve.
            if (![...detected].some(type => !rule[type])) return;

            await message.delete().catch(() => {});
        } catch (error) {
            console.error(`[SpecialChannels] No pude revisar un mensaje en ${message.guild.id}:`, error.message);
        }
    }
};
