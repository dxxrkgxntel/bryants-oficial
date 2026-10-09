const { MessageFlags } = require("discord.js");

module.exports = {
    async execute(interaction) {
        const message = interaction.options.getString("texto")
            .replace(/\\n|\/n/gi, "\n")
            .trim();

        if (!message) {
            return interaction.reply({
                content: "❌ Escribe el texto que quieres que envíe el bot.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            await interaction.channel.send({
                content: message,
                allowedMentions: { parse: [] }
            });

            return interaction.editReply("✅ El bot envió el mensaje.");
        } catch (error) {
            console.error("Error al enviar /public mensaje:", error);
            return interaction.editReply("❌ No pude enviar el mensaje en este canal.");
        }
    }
};
