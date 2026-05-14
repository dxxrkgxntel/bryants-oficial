const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ChannelType
} = require("discord.js");

const ImageConfig =
require("../../Models/ImageConfig");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("img")

            .setDescription(
                "Sistema de imágenes"
            )

            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            )

            //////////////////////////////////////////////////
            // ADD
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("add")

                    .setDescription(
                        "Permitir imágenes en un canal"
                    )

                    .addChannelOption(option =>

                        option

                            .setName("canal")

                            .setDescription(
                                "Canal"
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
                                "Canal"
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
                        "Ver canales permitidos"
                    )

            )

            //////////////////////////////////////////////////
            // LOG
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("log")

                    .setDescription(
                        "Configurar logs"
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

                    .addAttachmentOption(option =>

                        option

                            .setName("thumbnail")

                            .setDescription(
                                "Thumbnail"
                            )

                    )

                    .addAttachmentOption(option =>

                        option

                            .setName("image")

                            .setDescription(
                                "Imagen"
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
        // CONFIG
        //////////////////////////////////////////////////

        let config =
            await ImageConfig.findOne({

                guildId:
                    interaction.guild.id

            });

        //////////////////////////////////////////////////

        if (!config) {

            config =
                new ImageConfig({

                    guildId:
                        interaction.guild.id,

                    allowedChannels: []

                });

            await config.save();

        }

        //////////////////////////////////////////////////
        // ADD
        //////////////////////////////////////////////////

        if (subcommand === "add") {

            const channel =
                interaction.options.getChannel(
                    "canal"
                );

            //////////////////////////////////////////////////

            if (

                config.allowedChannels.includes(
                    channel.id
                )

            ) {

                return interaction.reply({

                    content:
                        "⚠️ Ese canal ya está permitido.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            if (

                config.allowedChannels.length >= 5

            ) {

                return interaction.reply({

                    content:
                        "❌ Límite máximo alcanzado.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            config.allowedChannels.push(
                channel.id
            );

            //////////////////////////////////////////////////

            await config.save();

            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setDescription(

                        `✅ Imágenes permitidas en ${channel}`

                    );

            //////////////////////////////////////////////////

            return interaction.reply({

                embeds: [embed]

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

                !config.allowedChannels.includes(
                    channel.id
                )

            ) {

                return interaction.reply({

                    content:
                        "❌ Ese canal no está configurado.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            config.allowedChannels =
                config.allowedChannels.filter(

                    id =>
                        id !== channel.id

                );

            //////////////////////////////////////////////////

            await config.save();

            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setDescription(

                        `❌ Canal eliminado: ${channel}`

                    );

            //////////////////////////////////////////////////

            return interaction.reply({

                embeds: [embed]

            });

        }

        //////////////////////////////////////////////////
        // LIST
        //////////////////////////////////////////////////

        if (subcommand === "list") {

            const validChannels =

                config.allowedChannels.filter(id =>

                    interaction.guild.channels.cache.has(id)

                );

            //////////////////////////////////////////////////

            if (

                !config ||

                validChannels.length === 0

            ) {

                return interaction.reply({

                    content:
                        "❌ No hay canales configurados.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            const channels =
                validChannels

                    .map(id =>

                        interaction.guild.channels.cache.get(id)

                    )

                    .filter(c => c)

                    .map(c => `${c}`)

                    .join("\n");

            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setTitle(
                        "📸 Canales permitidos"
                    )

                    .setDescription(

`
${channels || "❌ No hay canales válidos"}

━━━━━━━━━━━━━━

📊 Total: ${validChannels.length}
`

                    );

            //////////////////////////////////////////////////

            if (config.thumbnail) {

                embed.setThumbnail(
                    config.thumbnail
                );

            }

            //////////////////////////////////////////////////

            if (config.image) {

                embed.setImage(
                    config.image
                );

            }

            //////////////////////////////////////////////////

            return interaction.reply({

                embeds: [embed],

                flags: 64

            });

        }

        //////////////////////////////////////////////////
        // LOG
        //////////////////////////////////////////////////

        if (subcommand === "log") {

            const channel =
                interaction.options.getChannel(
                    "canal"
                );

            //////////////////////////////////////////////////

            const thumbnail =
                interaction.options.getAttachment(
                    "thumbnail"
                );

            //////////////////////////////////////////////////

            const image =
                interaction.options.getAttachment(
                    "image"
                );

            //////////////////////////////////////////////////

            if (

                thumbnail &&

                !thumbnail.contentType?.startsWith(
                    "image"
                )

            ) {

                return interaction.reply({

                    content:
                        "❌ La thumbnail debe ser una imagen.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            if (

                image &&

                !image.contentType?.startsWith(
                    "image"
                )

            ) {

                return interaction.reply({

                    content:
                        "❌ La imagen debe ser válida.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            config.logChannel =
                channel.id;

            //////////////////////////////////////////////////

            if (thumbnail?.url) {

                config.thumbnail =
                    thumbnail.url;

            }

            //////////////////////////////////////////////////

            if (image?.url) {

                config.image =
                    image.url;

            }

            //////////////////////////////////////////////////

            await config.save();

            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setDescription(

                        `📜 Canal de logs configurado: ${channel}`

                    );

            //////////////////////////////////////////////////

            if (config.thumbnail) {

                embed.setThumbnail(
                    config.thumbnail
                );

            }

            //////////////////////////////////////////////////

            if (config.image) {

                embed.setImage(
                    config.image
                );

            }

            //////////////////////////////////////////////////

            return interaction.reply({

                embeds: [embed],

                flags: 64

            });

        }

    }

};