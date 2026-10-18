const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require("discord.js");
const AntiScam = require("../../Models/AntiScam");

const BANNER = "https://i.imgur.com/joAe57D.png";
const punishmentNames = {
    delete: "Eliminar mensaje",
    timeout: "Timeout",
    kick: "Expulsar",
    ban: "Banear"
};

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

function respond(interaction, title, text, color = 0x8A2BE2) {
    return interaction.editReply({
        components: [panel(title, text, color)],
        flags: MessageFlags.IsComponentsV2
    });
}

async function getConfig(guildId) {
    let config = await AntiScam.findOne({ guildId });
    if (!config) config = await AntiScam.create({ guildId });
    return config;
}

module.exports = {
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const subcommand = interaction.options.getSubcommand();
        const config = await getConfig(interaction.guild.id);

        if (subcommand === "enable") {
            if (config.enabled) return respond(interaction, "🛡️ AntiScam", "El sistema ya está **activado**.", 0xFFD700);
            config.enabled = true;
            await config.save();
            return respond(interaction, "✅ AntiScam activado", "La protección AntiScam está activa en el servidor.", 0x00FF99);
        }

        if (subcommand === "disable") {
            if (!config.enabled) return respond(interaction, "🛡️ AntiScam", "El sistema ya está **desactivado**.", 0xFFD700);
            config.enabled = false;
            await config.save();
            return respond(interaction, "❌ AntiScam desactivado", "La protección AntiScam fue desactivada.", 0xFF0000);
        }

        if (subcommand === "punishment") {
            const punishment = interaction.options.getString("tipo");
            config.punishment = punishment;
            await config.save();
            return respond(interaction, "⚒️ Castigo configurado", `Las detecciones AntiScam utilizarán **${punishmentNames[punishment] || punishment}**.`, 0x00FF99);
        }

        if (subcommand === "logs") {
            const channel = interaction.options.getChannel("canal");
            config.logChannelId = channel.id;
            await config.save();
            return respond(interaction, "📜 Logs configurados", `Los registros de AntiScam se enviarán a ${channel}.`, 0x00FF99);
        }

        if (subcommand === "status") {
            const logs = config.logChannelId
                ? (interaction.guild.channels.cache.has(config.logChannelId) ? `<#${config.logChannelId}>` : `⚠️ Canal eliminado (${config.logChannelId})`)
                : "No configurado";
            return respond(
                interaction,
                "🛡️ Estado AntiScam",
                `**Estado:** ${config.enabled ? "✅ Activado" : "❌ Desactivado"}\n**Castigo:** ${punishmentNames[config.punishment] || config.punishment || "No configurado"}\n**Logs:** ${logs}`
            );
        }
    }
};
