const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

const cooldown = new Set();

module.exports = {
    name: 'interactionCreate',

    async execute(interaction, client) {

        try {

            //////////////////////////////////////////////////
            // BOTONES
            //////////////////////////////////////////////////

            if (interaction.isButton()) {

                const btn =
                    client.buttons.get(
                        interaction.customId
                    );

                if (btn) {

                    return await btn.execute(
                        interaction,
                        client
                    );
                }
            }

            //////////////////////////////////////////////////
            // SELECT MENUS
            //////////////////////////////////////////////////

            if (interaction.isStringSelectMenu()) {

                const select =
                    client.selects.get(
                        interaction.customId
                    );

                if (select) {

                    return await select.execute(
                        interaction,
                        client
                    );
                }
            }

            //////////////////////////////////////////////////
            // MODALS
            //////////////////////////////////////////////////

            if (interaction.isModalSubmit()) {

                const modal =
                    client.modals.get(
                        interaction.customId
                    );

                if (modal) {

                    return await modal.execute(
                        interaction,
                        client
                    );
                }
            }

            //////////////////////////////////////////////////
            // SLASH COMMANDS
            //////////////////////////////////////////////////

            if (!interaction.isChatInputCommand())
                return;

            const command =
                client.commands.get(
                    interaction.commandName
                );

            //////////////////////////////////////////////////

            if (!command) {

                if (
                    !interaction.replied &&
                    !interaction.deferred
                ) {

                    return interaction.reply({

                        content:
                            '❌ Comando deshabilitado.',

                        flags: 64

                    }).catch(() => {});
                }

                return;
            }

            //////////////////////////////////////////////////
            // SOLO DEVELOPERS
            //////////////////////////////////////////////////

            if (
                command.developer &&
                interaction.user.id !== config.developer
            ) {

                return interaction.reply({

                    content:
                        '❌ Comando solo para developers.',

                    flags: 64

                }).catch(() => {});
            }

            //////////////////////////////////////////////////
            // COOLDOWN
            //////////////////////////////////////////////////

            const cooldownTime =
                command.Cooldown || 0;

            //////////////////////////////////////////////////

            if (
                cooldownTime > 0 &&
                cooldown.has(
                    `${interaction.user.id}-${command.data.name}`
                )
            ) {

                const embed =
                    new EmbedBuilder()

                        .setColor('Red')

                        .setDescription(

                            `⏳ Debes esperar **${cooldownTime / 1000}s** para usar este comando nuevamente.`
                        );

                return interaction.reply({

                    embeds: [embed],

                    flags: 64

                }).catch(() => {});
            }

            //////////////////////////////////////////////////

            if (cooldownTime > 0) {

                cooldown.add(
                    `${interaction.user.id}-${command.data.name}`
                );

                setTimeout(() => {

                    cooldown.delete(
                        `${interaction.user.id}-${command.data.name}`
                    );

                }, cooldownTime);
            }

            //////////////////////////////////////////////////
            // EJECUTAR COMANDO
            //////////////////////////////////////////////////

            await command.execute(
                interaction,
                client
            );

        } catch (error) {

            console.log(
                '❌ Error en interactionCreate:',
                error
            );

            //////////////////////////////////////////////////

            try {

                if (
                    interaction.deferred
                ) {

                    await interaction.editReply({

                        content:
                            '❌ Ocurrió un error ejecutando este comando.'

                    }).catch(() => {});

                } else if (
                    !interaction.replied
                ) {

                    await interaction.reply({

                        content:
                            '❌ Ocurrió un error ejecutando este comando.',

                        flags: 64

                    }).catch(() => {});
                }

            } catch {}
        }
    }
};