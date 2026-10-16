const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require("discord.js");

module.exports = {
    async execute(interaction) {
        const channel = interaction.options.getChannel("channel", true);
        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("# Centro de soporte de Bryant's Oficial\n¿Necesitas ayuda con **Bryvex Bot** o con la **página web de Bryant's Oficial**? Abre un ticket privado para hablar con el equipo de soporte.\n\n• Tus conversaciones son privadas.\n• Puedes responder desde Discord o desde la web.\n• El historial se comparte entre ambas plataformas.\n• Utiliza este sistema únicamente para dudas o problemas relacionados con el bot y la web."))
            .addSeparatorComponents(new SeparatorBuilder())
            .addActionRowComponents(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("support_ticket_open:bot").setLabel("Soporte de Bryvex Bot").setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId("support_ticket_open:website").setLabel("Soporte de la página web").setStyle(ButtonStyle.Secondary)));
        await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
        return interaction.reply({ content: `Panel de soporte publicado en ${channel}.`, flags: MessageFlags.Ephemeral });
    }
};
