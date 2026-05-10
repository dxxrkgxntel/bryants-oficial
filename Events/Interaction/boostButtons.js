const {EmbedBuilder} = require("discord.js");

//////////////////////////////////////////////////
// ROLES IDS
//////////////////////////////////////////////////

const BOOSTER_ROLE = "1503117959051346041";
const BOOSTER_VIP_ROLE = "1503118374069342409";
const BOOSTER_LEGEND_ROLE = "1503118662700110109";

module.exports = {

    name: "interactionCreate",

    async execute(interaction) {

        try {

            //////////////////////////////////////////////////
            // VALIDAR BOTONES
            //////////////////////////////////////////////////

            if (!interaction.isButton()) return;

            //////////////////////////////////////////////////
            // MEMBER
            //////////////////////////////////////////////////

            const member =
                interaction.member;

            //////////////////////////////////////////////////
            // BOOST COUNT
            //////////////////////////////////////////////////

            // ⚠️ Discord no permite obtener
            // boosts exactos por usuario.
            // Esto es una simulación básica.

            const boostCount =
                member.premiumSince ? 1 : 0;

            //////////////////////////////////////////////////
            // BOOSTER
            //////////////////////////////////////////////////

            if (
                interaction.customId ===
                "claim_booster"
            ) {

                const role =
                    interaction.guild.roles.cache.get(
                        BOOSTER_ROLE
                    );

                if (!role) {

                    return interaction.reply({

                        content:
                            "❌ No encontré el rol BOOSTER.",

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
                            .setDescription(`💜 ${member} reclamó el rol ${role}`)
                    ],

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // BOOSTER VIP
            //////////////////////////////////////////////////

            if (
                interaction.customId ===
                "claim_booster_vip"
            ) {

                if (interaction.guild.premiumTier < 2) {

                    return interaction.reply({

                        content:
                            "❌ El servidor necesita ser Nivel 2 para reclamar BOOSTER VIP.",

                        flags: 64
                    });
                }

                const role =
                    interaction.guild.roles.cache.get(
                        BOOSTER_VIP_ROLE
                    );

                if (!role) {

                    return interaction.reply({

                        content:
                            "❌ No encontré el rol BOOSTER VIP.",

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
                            .setDescription(`🚀 ${member} reclamó el rol ${role}`)
                    ],

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // BOOSTER LEGEND
            //////////////////////////////////////////////////

            if (
                interaction.customId ===
                "claim_booster_legend"
            ) {

                if (interaction.guild.premiumTier < 3) {

                    return interaction.reply({

                        content:
                            "❌ El servidor necesita ser Nivel 3 para reclamar BOOSTER LEGEND.",

                        flags: 64
                    });
                }

                const role =
                    interaction.guild.roles.cache.get(
                        BOOSTER_LEGEND_ROLE
                    );

                if (!role) {

                    return interaction.reply({

                        content:
                            "❌ No encontré el rol BOOSTER LEGEND.",

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
                            .setDescription(`👑 ${member} reclamó el rol ${role}`)
                    ],

                    flags: 64
                });
            }

        } catch (error) {

            console.log(error);

        }
    }
};