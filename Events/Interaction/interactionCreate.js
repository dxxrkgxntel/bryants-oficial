const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

const cooldown = new Set();

module.exports = {
    name: 'interactionCreate',

    async execute(interaction, client) {

        try {

            // ===============================
            // 🔘 BOTONES
            // ===============================
            if (interaction.isButton()) {
                const btn = client.buttons.get(interaction.customId);
                if (btn) return btn.execute(interaction, client);
            }

            // ===============================
            // 📜 SELECT MENUS
            // ===============================
            if (interaction.isStringSelectMenu()) {
                const select = client.selects.get(interaction.customId);
                if (select) return select.execute(interaction, client);
            }

            // ===============================
            // 🧾 MODALES
            // ===============================
            if (interaction.isModalSubmit()) {
                const modal = client.modals.get(interaction.customId);
                if (modal) return modal.execute(interaction, client);
            }

            // ===============================
            // 💬 COMANDOS
            // ===============================
            if (!interaction.isChatInputCommand()) return;

            const command = client.commands.get(interaction.commandName);

            if (!command) {
                return interaction.reply({
                    content: "Comando deshabilitado",
                    flags: 64
                });
            }

            // 🔐 SOLO DEVELOPERS
            if (command.developer && interaction.user.id !== config.developer) {
                return interaction.reply({
                    content: "Comando solamente para developers",
                    flags: 64
                });
            }

            const cooldownTime = command.Cooldown || 0;

            // ⏳ COOLDOWN
            if (cooldownTime > 0 && cooldown.has(interaction.user.id)) {

                const embed = new EmbedBuilder()
                    .setDescription(
                        `Este comando tiene cooldown, espera ${cooldownTime / 1000}s`
                    );

                return interaction.reply({
                    embeds: [embed],
                    flags: 64
                });
            }

            if (cooldownTime > 0) {
                cooldown.add(interaction.user.id);

                setTimeout(() => {
                    cooldown.delete(interaction.user.id);
                }, cooldownTime);
            }

            //////////////////////////////////////////////////
// AUTO DEFER
//////////////////////////////////////////////////

if (
    !interaction.deferred &&
    !interaction.replied
) {

    await interaction.deferReply()
        .catch(() => {});
}

//////////////////////////////////////////////////

await command.execute(
    interaction,
    client
);

        } catch (error) {
            console.log('❌ Error en interactionCreate:', error);

            if (interaction.replied || interaction.deferred) {
                interaction.followUp({
                    content: "Ocurrió un error ejecutando este comando.",
                    flags: 64
                }).catch(() => {});
            } else {
                interaction.reply({
                    content: "Ocurrió un error ejecutando este comando.",
                    flags: 64
                }).catch(() => {});
            }
        }
    }
};