const {
    EmbedBuilder,
    PermissionFlagsBits
} = require("discord.js");

const boostSchema =
    require("../../Models/boostSchema");

module.exports = {

    name: "interactionCreate",

    async execute(interaction) {

        try {

            //////////////////////////////////////////////////
            // VALIDAR BOTON
            //////////////////////////////////////////////////

            if (!interaction.isButton()) return;

            //////////////////////////////////////////////////
            // IDS VALIDOS
            //////////////////////////////////////////////////

            const validButtons = [

                "claim_booster",
                "claim_booster_vip",
                "claim_booster_legend"
            ];

            //////////////////////////////////////////////////

            if (
                !validButtons.includes(
                    interaction.customId
                )
            ) return;

            //////////////////////////////////////////////////
            // MEMBER
            //////////////////////////////////////////////////

            const member =
                interaction.member;

            //////////////////////////////////////////////////
            // VERIFICAR BOOST
            //////////////////////////////////////////////////

            if (!member.premiumSince) {

                return interaction.reply({

                    content:
                        "❌ Debes boostear el servidor para reclamar recompensas.",

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // DATA
            //////////////////////////////////////////////////

            const data =
                await boostSchema.findOne({

                    guildId:
                        interaction.guild.id
                });

            //////////////////////////////////////////////////

            if (!data) {

                return interaction.reply({

                    content:
                        "❌ El sistema Booster no está configurado.",

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // ROLE ID
            //////////////////////////////////////////////////

            let roleId;

            //////////////////////////////////////////////////

            if (
                interaction.customId ===
                "claim_booster"
            ) {

                roleId =
                    data.boosterRole;
            }

            //////////////////////////////////////////////////

            if (
                interaction.customId ===
                "claim_booster_vip"
            ) {

                if (
                    interaction.guild.premiumTier < 2
                ) {

                    return interaction.reply({

                        content:
                            "❌ El servidor necesita Nivel 2.",

                        flags: 64
                    });
                }

                roleId =
                    data.boosterVipRole;
            }

            //////////////////////////////////////////////////

            if (
                interaction.customId ===
                "claim_booster_legend"
            ) {

                if (
                    interaction.guild.premiumTier < 3
                ) {

                    return interaction.reply({

                        content:
                            "❌ El servidor necesita Nivel 3.",

                        flags: 64
                    });
                }

                roleId =
                    data.boosterLegendRole;
            }

            //////////////////////////////////////////////////
            // ROLE
            //////////////////////////////////////////////////

            const role =
                interaction.guild.roles.cache.get(
                    roleId
                );

            //////////////////////////////////////////////////

            if (!role) {

                return interaction.reply({

                    content:
                        "❌ El rol configurado no existe.",

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // JERARQUIA
            //////////////////////////////////////////////////

            const botMember =
                interaction.guild.members.me;

            if (
                role.position >=
                botMember.roles.highest.position
            ) {

                return interaction.reply({

                    content:
                        "❌ El rol está por encima del bot.",

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // DUPLICADO
            //////////////////////////////////////////////////

            if (
                member.roles.cache.has(role.id)
            ) {

                return interaction.reply({

                    content:
                        `❌ Ya tienes el rol ${role}.`,

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // AÑADIR ROL
            //////////////////////////////////////////////////

            await member.roles.add(role);

            //////////////////////////////////////////////////
            // RESPUESTA
            //////////////////////////////////////////////////

            return interaction.reply({

                embeds: [

                    new EmbedBuilder()

                        .setColor("#8A2BE2")

                        .setDescription(
                            `✅ ${member} reclamó el rol ${role}`
                        )
                ],

                flags: 64
            });

        } catch (error) {

            console.log(
                "❌ Error en boostButtons:",
                error
            );
        }
    }
};