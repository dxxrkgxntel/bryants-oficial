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

    [...client.buttons.values()]

        .find(button =>

            Array.isArray(button.id)

                ? button.id.includes(
                    interaction.customId
                )

                : button.id ===
                  interaction.customId
        );

//////////////////////////////////////////////////

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
            // REACTION ROLES
            //////////////////////////////////////////////////

            if (
            interaction.isStringSelectMenu() &&
            interaction.customId.startsWith("rr_")
            ) {

            //////////////////////////////////////////////////

            const member =
                interaction.member;

            //////////////////////////////////////////////////

            const roles = {

                rd:"1502711022748958780",
                usa:"1502710053935775915",
                spain:"1502711543853223997",
                mexico:"1502711751404158977",
                arg:"1502712088735252631",
                pnm:"1502712227432501268",
                prc:"1502712375709532290",
                chl:"1502712547118157955",
                vnzl:"1502712716165382366",
                per:"1502712897942454312",
                cba:"1502713049520410686",
                clba:"1502713178327617708",
                hdr:"1502713300893565160",

                menor:"1502716877733105965",
                intermedio:"1502717691281149972",
                mayor:"1502718131213172876",

                hm:"1502719430868733953",
                mj:"1502719554789441537",
                homo:"1502719752508805362"
            };

            //////////////////////////////////////////////////
            // COUNTRY
            //////////////////////////////////////////////////

            if (
                interaction.customId ===
                "rr_country"
            ) {

                await member.roles.remove([

                roles.rd,
                roles.usa,
                roles.spain,
                roles.mexico,
                roles.arg,
                roles.pnm,
                roles.prc,
                roles.chl,
                roles.vnzl,
                roles.per,
                roles.cba,
                roles.clba,
                roles.hdr

            ]).catch(() => {});
            }

            //////////////////////////////////////////////////
            // AGE
            //////////////////////////////////////////////////

            if (
                interaction.customId ===
                "rr_age"
            ) {

                await member.roles.remove([

                roles.menor,
                roles.intermedio,
                roles.mayor

            ]).catch(() => {});
            }

            //////////////////////////////////////////////////
            // SEX
            //////////////////////////////////////////////////

            if (
                interaction.customId ===
                "rr_sex"
            ) {

                await member.roles.remove([

                roles.hm,
                roles.mj,
                roles.homo

            ]).catch(() => {});
            }

            //////////////////////////////////////////////////
            // ADD ROLES
            //////////////////////////////////////////////////

            for (const value of interaction.values) {

                const roleId =
                    roles[value];

            //////////////////////////////////////////////////

            if (!roleId)
                continue;

            //////////////////////////////////////////////////

                await member.roles.add(
                    roleId
                ).catch(() => {});
            }

            //////////////////////////////////////////////////

            return interaction.reply({

                content:"✅ Tus roles fueron actualizados.",
                flags: 64
            });
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