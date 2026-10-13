const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require("discord.js");
const AntiLinksConfig = require("../../Models/AntiLinksConfig");

const BANNER = "https://i.imgur.com/IPpC16h.png";

function panel(title, text, color = 0x8A2BE2) {
    return new ContainerBuilder()
        .setAccentColor(color)
        .addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(BANNER))
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
        .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

function reply(interaction, title, text, color = 0x8A2BE2) {
    return interaction.editReply({
        components: [panel(title, text, color)],
        flags: MessageFlags.IsComponentsV2
    });
}

async function getConfig(guildId) {
    let data = await AntiLinksConfig.findOne({ guildId });
    if (!data) data = await AntiLinksConfig.create({ guildId, enabled: false, allowedChannels: [], logsChannel: null });
    if (!Array.isArray(data.allowedChannels)) data.allowedChannels = [];
    return data;
}

module.exports = {
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const subcommand = interaction.options.getSubcommand();
        const data = await getConfig(interaction.guild.id);

        if (subcommand === "toggle") {
            data.enabled = !data.enabled;
            await data.save();
            return reply(
                interaction,
                data.enabled ? "✅ AntiLinks activado" : "❌ AntiLinks desactivado",
                data.enabled ? "El filtro de enlaces está **activo** en el servidor." : "El filtro de enlaces está **desactivado** en el servidor.",
                data.enabled ? 0x00FF99 : 0xFF0000
            );
        }

        if (subcommand === "whitelist") {
            const channel = interaction.options.getChannel("canal");
            if (data.allowedChannels.includes(channel.id)) {
                return reply(interaction, "⚠️ Canal ya permitido", `${channel} ya forma parte de la whitelist.`, 0xFFD700);
            }
            data.allowedChannels.push(channel.id);
            await data.save();
            return reply(interaction, "✅ Canal permitido", `${channel} fue agregado correctamente a la whitelist de AntiLinks.`, 0x00FF99);
        }

        if (subcommand === "remove") {
            const channel = interaction.options.getChannel("canal");
            if (!data.allowedChannels.includes(channel.id)) {
                return reply(interaction, "⚠️ Canal no encontrado", `${channel} no forma parte de la whitelist.`, 0xFFD700);
            }
            data.allowedChannels = data.allowedChannels.filter(id => id !== channel.id);
            await data.save();
            return reply(interaction, "✅ Canal eliminado", `${channel} fue eliminado de la whitelist de AntiLinks.`, 0x00FF99);
        }

        if (subcommand === "list") {
            const channels = data.allowedChannels.length
                ? data.allowedChannels.map(id => interaction.guild.channels.cache.has(id) ? `<#${id}>` : `⚠️ Canal eliminado (${id})`).join("\n")
                : "Ninguno";
            const logs = data.logsChannel
                ? (interaction.guild.channels.cache.has(data.logsChannel) ? `<#${data.logsChannel}>` : `⚠️ Canal eliminado (${data.logsChannel})`)
                : "No configurado";
            return reply(
                interaction,
                "🔗 Configuración AntiLinks",
                `**Estado:** ${data.enabled ? "✅ Activado" : "❌ Desactivado"}\n**Logs:** ${logs}\n\n### Canales permitidos\n${channels}`
            );
        }

        if (subcommand === "logs") {
            const channel = interaction.options.getChannel("canal");
            data.logsChannel = channel.id;
            await data.save();
            return reply(interaction, "📝 Logs configurados", `Los registros de AntiLinks se enviarán a ${channel}.`, 0x00FF99);
        }
    }
};
