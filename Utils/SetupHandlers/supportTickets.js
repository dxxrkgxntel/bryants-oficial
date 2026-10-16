const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require("discord.js");
const SupportTicketConfig = require("../../Models/SupportTicketConfig");

module.exports = {
    async execute(interaction) {
        if (!interaction.guildId || !interaction.guild) {
            return interaction.reply({ content: "Este comando solo puede usarse dentro de un servidor.", flags: MessageFlags.Ephemeral });
        }
        const channel = interaction.options.getChannel("channel", true);
        const category = interaction.options.getChannel("category");
        const staffRole = interaction.options.getRole("staff-role");
        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("# Centro de soporte de Bryant's Oficial\n¿Necesitas ayuda con **Bryvex Bot** o con la **página web de Bryant's Oficial**? Abre un ticket privado para hablar con el equipo de soporte.\n\n• Cada servidor gestiona sus propios tickets y permisos.\n• Puedes responder desde Discord o desde la web.\n• El historial se comparte entre ambas plataformas.\n• Utiliza este sistema únicamente para dudas o problemas relacionados con el bot y la web."))
            .addSeparatorComponents(new SeparatorBuilder())
            .addActionRowComponents(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("support_ticket_open:bot").setLabel("Soporte de Bryvex Bot").setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId("support_ticket_open:website").setLabel("Soporte de la página web").setStyle(ButtonStyle.Secondary)));
        try {
            await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
            const configUpdate = { enabled: true, panelChannelId: channel.id };
            if (category) configUpdate.categoryId = category.id;
            if (staffRole) configUpdate.staffRoleId = staffRole.id;
            await SupportTicketConfig.findOneAndUpdate(
                { guildId: interaction.guildId },
                { $set: configUpdate },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            return interaction.reply({ content: `Panel publicado en ${channel}. Los tickets y permisos se configuraron para **${interaction.guild.name}**.`, flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error("[Support Tickets] No se pudo configurar este servidor:", error);
            return interaction.reply({ content: "No pude configurar el sistema de soporte. Comprueba los permisos del bot e inténtalo de nuevo.", flags: MessageFlags.Ephemeral }).catch(() => {});
        }
    }
};
