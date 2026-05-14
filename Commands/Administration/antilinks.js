const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ChannelType
} = require("discord.js");

const AntiLinksConfig =
require("../../Models/AntiLinksConfig");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("antilinks")

            .setDescription(
                "Sistema Anti Links"
            )

            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            )

            //////////////////////////////////////////////////
            // TOGGLE
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("toggle")

                    .setDescription(
                        "Activar o desactivar AntiLinks"
                    )

            )

            //////////////////////////////////////////////////
            // WHITELIST
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("whitelist")

                    .setDescription(
                        "Agregar canal permitido"
                    )

                    .addChannelOption(option =>

                        option

                            .setName("canal")

                            .setDescription(
                                "Canal permitido"
                            )

                            .setRequired(true)

                            .addChannelTypes(
                                ChannelType.GuildText
                            )

                    )

            )

            //////////////////////////////////////////////////
            // REMOVE
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("remove")

                    .setDescription(
                        "Quitar canal permitido"
                    )

                    .addChannelOption(option =>

                        option

                            .setName("canal")

                            .setDescription(
                                "Canal a quitar"
                            )

                            .setRequired(true)

                            .addChannelTypes(
                                ChannelType.GuildText
                            )

                    )

            )

            //////////////////////////////////////////////////
            // LIST
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("list")

                    .setDescription(
                        "Ver configuración AntiLinks"
                    )

            )

            //////////////////////////////////////////////////
            // LOGS
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("logs")

                    .setDescription(
                        "Configurar canal de logs"
                    )

                    .addChannelOption(option =>

                        option

                            .setName("canal")

                            .setDescription(
                                "Canal de logs"
                            )

                            .setRequired(true)

                            .addChannelTypes(
                                ChannelType.GuildText
                            )

                    )

            ),

    //////////////////////////////////////////////////
    // EXECUTE
    //////////////////////////////////////////////////

    async execute(interaction) {

        const subcommand =
            interaction.options.getSubcommand();

        //////////////////////////////////////////////////
        // BUSCAR CONFIG
        //////////////////////////////////////////////////

        let data =
            await AntiLinksConfig.findOne({

                guildId:
                    interaction.guild.id

            });

        //////////////////////////////////////////////////

        if (!data) {

            data =
                new AntiLinksConfig({

                    guildId:
                        interaction.guild.id,

                    enabled: false,

                    allowedChannels: [],

                    logsChannel: null

                });

            await data.save();

        }

        //////////////////////////////////////////////////
        // TOGGLE
        //////////////////////////////////////////////////

        if (subcommand === "toggle") {

            data.enabled =
                !data.enabled;

            //////////////////////////////////////////////////

            await data.save();

            //////////////////////////////////////////////////

            return interaction.reply({

                content:

                    data.enabled

                        ? "✅ AntiLinks activado."

                        : "❌ AntiLinks desactivado.",

                flags: 64

            });

        }

        //////////////////////////////////////////////////
        // WHITELIST
        //////////////////////////////////////////////////

        if (subcommand === "whitelist") {

            const channel =
                interaction.options.getChannel(
                    "canal"
                );

            //////////////////////////////////////////////////

            if (

                data.allowedChannels.includes(
                    channel.id
                )

            ) {

                return interaction.reply({

                    content:
                        "❌ Ese canal ya está permitido.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            data.allowedChannels.push(
                channel.id
            );

            //////////////////////////////////////////////////

            await data.save();

            //////////////////////////////////////////////////

            return interaction.reply({

                content:

                    `✅ ${channel} agregado a canales permitidos.`,

                flags: 64

            });

        }

        //////////////////////////////////////////////////
        // REMOVE
        //////////////////////////////////////////////////

        if (subcommand === "remove") {

            const channel =
                interaction.options.getChannel(
                    "canal"
                );

            //////////////////////////////////////////////////

            if (

                !data.allowedChannels.includes(
                    channel.id
                )

            ) {

                return interaction.reply({

                    content:
                        "❌ Ese canal no está permitido.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            data.allowedChannels =
                data.allowedChannels.filter(

                    id =>
                        id !== channel.id

                );

            //////////////////////////////////////////////////

            await data.save();

            //////////////////////////////////////////////////

            return interaction.reply({

                content:

                    `✅ ${channel} removido de canales permitidos.`,

                flags: 64

            });

        }

        //////////////////////////////////////////////////
        // LIST
        //////////////////////////////////////////////////

        if (subcommand === "list") {

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setTitle(
                        "🔗 Configuración AntiLinks"
                    )

                    .addFields(

                        {

                            name: "Estado",

                            value:

                                data.enabled

                                    ? "✅ Activado"

                                    : "❌ Desactivado",

                            inline: true

                        },

                        {

                            name: "Logs",

                            value:

                                data.logsChannel

                                    ? `<#${data.logsChannel}>`

                                    : "No configurado",

                            inline: true

                        },

                        {

                            name:
                                "Canales Permitidos",

                            value:

                                data.allowedChannels.length

                                    ?

                                    data.allowedChannels

                                        .map(id => `<#${id}>`)
                                        .join("\n")

                                    :

                                    "Ninguno"

                        }

                    )

                    .setTimestamp();

            //////////////////////////////////////////////////

            return interaction.reply({

                embeds: [embed],

                flags: 64

            });

        }

        //////////////////////////////////////////////////
        // LOGS
        //////////////////////////////////////////////////

        if (subcommand === "logs") {

            const channel =
                interaction.options.getChannel(
                    "canal"
                );

            //////////////////////////////////////////////////

            data.logsChannel =
                channel.id;

            //////////////////////////////////////////////////

            await data.save();

            //////////////////////////////////////////////////

            return interaction.reply({

                content:

                    `✅ Canal de logs configurado en ${channel}.`,

                flags: 64

            });

        }

    }

};