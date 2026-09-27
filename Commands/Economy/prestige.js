const {

    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder

} = require("discord.js");

const Prestige =
require("../../Models/Prestige");

const PrestigeConfig =
require("../../Models/PrestigeConfig");

const Level =
require("../../Models/Level");

const Economy =
require("../../Models/EconomyUser");

module.exports = {

    data:
    new SlashCommandBuilder()

        .setName("prestige")

        .setDescription(
            "Sistema de prestigios."
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        //////////////////////////////////////////////////
        // SETUP
        //////////////////////////////////////////////////

        .addSubcommand(sub =>

            sub

                .setName("setup")

                .setDescription(
                    "Configura los prestigios."
                )

                //////////////////////////////////////////////////
                // PRESTIGE 1
                //////////////////////////////////////////////////

                .addRoleOption(option =>

                    option

                        .setName("prestige1")

                        .setDescription(
                            "Rol de prestigio 1"
                        )

                        .setRequired(true)
                )

                .addIntegerOption(option =>

                    option

                        .setName("reward1")

                        .setDescription(
                            "Coins prestigio 1"
                        )

                        .setRequired(true)
                )

                //////////////////////////////////////////////////
                // PRESTIGE 2
                //////////////////////////////////////////////////

                .addRoleOption(option =>

                    option

                        .setName("prestige2")

                        .setDescription(
                            "Rol de prestigio 2"
                        )

                        .setRequired(true)
                )

                .addIntegerOption(option =>

                    option

                        .setName("reward2")

                        .setDescription(
                            "Coins prestigio 2"
                        )

                        .setRequired(true)
                )

                //////////////////////////////////////////////////
                // PRESTIGE 3
                //////////////////////////////////////////////////

                .addRoleOption(option =>

                    option

                        .setName("prestige3")

                        .setDescription(
                            "Rol de prestigio 3"
                        )

                        .setRequired(true)
                )

                .addIntegerOption(option =>

                    option

                        .setName("reward3")

                        .setDescription(
                            "Coins prestigio 3"
                        )

                        .setRequired(true)
                )

                //////////////////////////////////////////////////
                // PRESTIGE 4
                //////////////////////////////////////////////////

                .addRoleOption(option =>

                    option

                        .setName("prestige4")

                        .setDescription(
                            "Rol de prestigio 4"
                        )

                        .setRequired(true)
                )

                .addIntegerOption(option =>

                    option

                        .setName("reward4")

                        .setDescription(
                            "Coins prestigio 4"
                        )

                        .setRequired(true)
                )

                //////////////////////////////////////////////////
                // PRESTIGE 5
                //////////////////////////////////////////////////

                .addRoleOption(option =>

                    option

                        .setName("prestige5")

                        .setDescription(
                            "Rol de prestigio 5"
                        )

                        .setRequired(true)
                )

                .addIntegerOption(option =>

                    option

                        .setName("reward5")

                        .setDescription(
                            "Coins prestigio 5"
                        )

                        .setRequired(true)
                )

        )

        //////////////////////////////////////////////////
        // ENABLE
        //////////////////////////////////////////////////

        .addSubcommand(sub =>

            sub

                .setName("enable")

                .setDescription(
                    "Activa el sistema."
                )

        )

        //////////////////////////////////////////////////
        // DISABLE
        //////////////////////////////////////////////////

        .addSubcommand(sub =>

            sub

                .setName("disable")

                .setDescription(
                    "Desactiva el sistema."
                )

        )

        //////////////////////////////////////////////////
        // CLAIM
        //////////////////////////////////////////////////

        .addSubcommand(sub =>

            sub

                .setName("claim")

                .setDescription(
                    "Reclama tu prestigio."
                )

        )

        //////////////////////////////////////////////////
        // INFO
        //////////////////////////////////////////////////

        .addSubcommand(sub =>

            sub

                .setName("info")

                .setDescription(
                    "Mira tu información."
                )

        ),

    //////////////////////////////////////////////////
    // EXECUTE
    //////////////////////////////////////////////////

    async execute(interaction) {

        const sub =
        interaction.options.getSubcommand();

        //////////////////////////////////////////////////
        // BUSCAR CONFIG
        //////////////////////////////////////////////////

        let config =
        await PrestigeConfig.findOne({

            guildId:
            interaction.guild.id

        });

        //////////////////////////////////////////////////

        if (!config) {

            config =
            await PrestigeConfig.create({

                guildId:
                interaction.guild.id,

                enabled: false,

                prestigeRoles: {},

                prestigeRewards: {}

            });

        }

        //////////////////////////////////////////////////
        // SETUP
        //////////////////////////////////////////////////

        if (sub === "setup") {

            config.prestigeRoles = {

                1:
                interaction.options.getRole(
                    "prestige1"
                ).id,

                2:
                interaction.options.getRole(
                    "prestige2"
                ).id,

                3:
                interaction.options.getRole(
                    "prestige3"
                ).id,

                4:
                interaction.options.getRole(
                    "prestige4"
                ).id,

                5:
                interaction.options.getRole(
                    "prestige5"
                ).id

            };

            //////////////////////////////////////////////////

            config.prestigeRewards = {

                1:
                interaction.options.getInteger(
                    "reward1"
                ),

                2:
                interaction.options.getInteger(
                    "reward2"
                ),

                3:
                interaction.options.getInteger(
                    "reward3"
                ),

                4:
                interaction.options.getInteger(
                    "reward4"
                ),

                5:
                interaction.options.getInteger(
                    "reward5"
                )

            };

            //////////////////////////////////////////////////

            await config.save();

            //////////////////////////////////////////////////

            return interaction.reply({

                embeds: [

                    new EmbedBuilder()

                        .setColor("#8A2BE2")

                        .setTitle(
                            "👑 Sistema Prestige Configurado"
                        )

                        .setDescription(
                            "✅ Los 5 prestigios fueron configurados correctamente."
                        )

                ],

                flags: 64

            });

        }

        //////////////////////////////////////////////////
        // ENABLE
        //////////////////////////////////////////////////

        if (sub === "enable") {

            config.enabled = true;

            await config.save();

            return interaction.reply({

                content:
                "✅ Sistema Prestige activado.",

                flags: 64

            });

        }

        //////////////////////////////////////////////////
        // DISABLE
        //////////////////////////////////////////////////

        if (sub === "disable") {

            config.enabled = false;

            await config.save();

            return interaction.reply({

                content:
                "❌ Sistema Prestige desactivado.",

                flags: 64

            });

        }

        //////////////////////////////////////////////////
        // VALIDAR SISTEMA
        //////////////////////////////////////////////////

        if (!config.enabled) {

            return interaction.reply({

                content:
                "❌ El sistema de prestigios está desactivado.",

                flags: 64

            });

        }

        //////////////////////////////////////////////////
        // BUSCAR PRESTIGE USER
        //////////////////////////////////////////////////

        let prestigeData =
        await Prestige.findOne({

            guildId:
            interaction.guild.id,

            userId:
            interaction.user.id

        });

        //////////////////////////////////////////////////

        if (!prestigeData) {

            prestigeData =
            await Prestige.create({

                guildId:
                interaction.guild.id,

                userId:
                interaction.user.id,

                prestige: 0

            });

        }

        //////////////////////////////////////////////////
        // INFO
        //////////////////////////////////////////////////

        if (sub === "info") {

            const embed =
            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "👑 Sistema Prestige"
                )

                .setDescription(

`🏆 Prestigio actual:
**${prestigeData.prestige} / 5**

📈 Nivel requerido:
**50**

🎁 Cada prestigio reinicia tu nivel a 1 y te recompensa con:
• Coins
• Rol exclusivo
• Futuras recompensas de inventario`

                )

                .setTimestamp();

            return interaction.reply({

                embeds: [embed]

            });

        }

        //////////////////////////////////////////////////
        // CLAIM
        //////////////////////////////////////////////////

        if (sub === "claim") {

            //////////////////////////////////////////////////
            // LEVEL DATA
            //////////////////////////////////////////////////

            const levelData =
            await Level.findOne({

                guildId:
                interaction.guild.id,

                userId:
                interaction.user.id

            });

            //////////////////////////////////////////////////

            if (

                !levelData ||

                levelData.level < 50

            ) {

                return interaction.reply({

                    content:
                    "❌ Necesitas llegar a nivel 50.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////
            // MAX PRESTIGE
            //////////////////////////////////////////////////

            if (prestigeData.prestige >= 5) {

                return interaction.reply({

                    content:
                    "❌ Ya alcanzaste el prestigio máximo.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////
            // NUEVO PRESTIGE
            //////////////////////////////////////////////////

            const newPrestige =
            prestigeData.prestige + 1;

            //////////////////////////////////////////////////
            // ROLE
            //////////////////////////////////////////////////

            const roleId =
            config.prestigeRoles[newPrestige];

            //////////////////////////////////////////////////

            const reward =
            config.prestigeRewards[newPrestige];

            //////////////////////////////////////////////////
            // ECONOMY
            //////////////////////////////////////////////////

            let economyData =
            await Economy.findOne({

                guildId:
                interaction.guild.id,

                userId:
                interaction.user.id

            });

            //////////////////////////////////////////////////

            if (!economyData) {

                economyData =
                await Economy.create({

                    guildId:
                    interaction.guild.id,

                    userId:
                    interaction.user.id,

                    wallet: 0,

                    bank: 0

                });

            }

            //////////////////////////////////////////////////
            // DAR COINS
            //////////////////////////////////////////////////

            economyData.wallet += reward;

            await economyData.save();

            //////////////////////////////////////////////////
            // ACTUALIZAR PRESTIGE
            //////////////////////////////////////////////////

            prestigeData.prestige =
            newPrestige;

            await prestigeData.save();

            //////////////////////////////////////////////////
            // RESET LEVEL
            //////////////////////////////////////////////////

            levelData.level = 1;

            levelData.xp = 0;

            await levelData.save();

            //////////////////////////////////////////////////
            // DAR ROL
            //////////////////////////////////////////////////

            const role =
            interaction.guild.roles.cache.get(
                roleId
            );

            //////////////////////////////////////////////////

            if (role) {

                await interaction.member.roles.add(
                    roleId
                ).catch(() => {});

            }

            //////////////////////////////////////////////////
            // RESPUESTA
            //////////////////////////////////////////////////

            return interaction.reply({

                embeds: [

                    new EmbedBuilder()

                        .setColor("#8A2BE2")

                        .setTitle(
                            "👑 Prestigio Reclamado"
                        )

                        .setDescription(

`🎉 ${interaction.user} alcanzó:

🏆 Prestigio:
**${newPrestige}**

💰 Recompensa:
**${reward.toLocaleString()}** coins

🔄 Tu nivel fue reiniciado a nivel 1.`

                        )

                        .setTimestamp()

                ]

            });

        }

    }

};