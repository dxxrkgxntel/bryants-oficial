const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");

const AntiScam = require(
    "../../Models/AntiScam"
);

module.exports = {

    data: new SlashCommandBuilder()

        .setName("antiscam")

        .setDescription(
            "Configura el sistema AntiScam."
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

        .addSubcommand(sub =>
            sub
                .setName("enable")
                .setDescription(
                    "Activa el AntiScam."
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("disable")
                .setDescription(
                    "Desactiva el AntiScam."
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("punishment")
                .setDescription(
                    "Configura el castigo."
                )

                .addStringOption(option =>
                    option
                        .setName("tipo")
                        .setDescription(
                            "Tipo de castigo"
                        )
                        .setRequired(true)
                        .addChoices(
                            {
                                name: "Delete",
                                value: "delete"
                            },
                            {
                                name: "Timeout",
                                value: "timeout"
                            },
                            {
                                name: "Kick",
                                value: "kick"
                            },
                            {
                                name: "Ban",
                                value: "ban"
                            }
                        )
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("logs")
                .setDescription(
                    "Canal de logs."
                )

                .addChannelOption(option =>
                    option
                        .setName("canal")
                        .setDescription(
                            "Canal de logs"
                        )
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("status")
                .setDescription(
                    "Ver configuración."
                )
        ),

    async execute(interaction) {

        const sub =
            interaction.options
            .getSubcommand();

        let config =
            await AntiScam.findOne({
                guildId:
                interaction.guild.id
            });

        if (!config) {

            config =
                await AntiScam.create({

                    guildId:
                    interaction.guild.id

                });

        }

        switch (sub) {

            case "enable":

                config.enabled = true;

                await config.save();

                return interaction.reply({

                    embeds: [

                        new EmbedBuilder()

                            .setColor("Green")

                            .setDescription(
                                "✅ AntiScam activado."
                            )

                    ]

                });

            case "disable":

                config.enabled = false;

                await config.save();

                return interaction.reply({

                    embeds: [

                        new EmbedBuilder()

                            .setColor("Red")

                            .setDescription(
                                "❌ AntiScam desactivado."
                            )

                    ]

                });

            case "punishment":

                const tipo =
                    interaction.options
                    .getString("tipo");

                config.punishment =
                    tipo;

                await config.save();

                return interaction.reply({

                    embeds: [

                        new EmbedBuilder()

                            .setColor("Blue")

                            .setDescription(
                                `⚒️ Castigo configurado a \`${tipo}\`.`
                            )

                    ]

                });

            case "logs":

                const canal =
                    interaction.options
                    .getChannel("canal");

                config.logChannelId =
                    canal.id;

                await config.save();

                return interaction.reply({

                    embeds: [

                        new EmbedBuilder()

                            .setColor("Blue")

                            .setDescription(
                                `📜 Logs configurados en ${canal}.`
                            )

                    ]

                });

            case "status":

                return interaction.reply({

                    embeds: [

                        new EmbedBuilder()

                            .setColor("Blurple")

                            .setTitle(
                                "🛡️ Estado AntiScam"
                            )

                            .addFields(
                                {
                                    name: "Estado",
                                    value:
                                    config.enabled
                                    ? "✅ Activado"
                                    : "❌ Desactivado"
                                },
                                {
                                    name: "Castigo",
                                    value:
                                    config.punishment
                                },
                                {
                                    name: "Logs",
                                    value:
                                    config.logChannelId
                                    ? `<#${config.logChannelId}>`
                                    : "No configurado"
                                }
                            )

                    ]

                });

        }

    }

};