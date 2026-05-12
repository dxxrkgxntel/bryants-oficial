const {

    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder

} = require("discord.js");

const reactionRolesSchema =
    require("../../Models/reactionRolesSchema");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("rr-edit")

            .setDescription(
                "Editar un panel de reaction roles"
            )

            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            )

            //////////////////////////////////////////////////
            // PANEL ID
            //////////////////////////////////////////////////

            .addStringOption(option =>

                option

                    .setName("panelid")

                    .setDescription(
                        "ID del panel"
                    )

                    .setRequired(true)
            )

            //////////////////////////////////////////////////
            // CAMPOS
            //////////////////////////////////////////////////

            .addStringOption(option =>

                option

                    .setName("titulo")

                    .setDescription(
                        "Nuevo título"
                    )
            )

            .addStringOption(option =>

                option

                    .setName("descripcion")

                    .setDescription(
                        "Nueva descripción"
                    )
            )

            .addStringOption(option =>

                option

                    .setName("placeholder")

                    .setDescription(
                        "Nuevo placeholder"
                    )
            )

            .addStringOption(option =>

                option

                    .setName("color")

                    .setDescription(
                        "Nuevo color HEX"
                    )
            )

            //////////////////////////////////////////////////
            // IMÁGENES
            //////////////////////////////////////////////////

            .addAttachmentOption(option =>

                option

                    .setName("imagen")

                    .setDescription(
                        "Nueva imagen del embed"
                    )
            )

            .addAttachmentOption(option =>

                option

                    .setName("thumbnail")

                    .setDescription(
                        "Nuevo thumbnail del embed"
                    )
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // PANEL ID
        //////////////////////////////////////////////////

        const panelId =
            interaction.options.getString(
                "panelid"
            );

        //////////////////////////////////////////////////
        // BUSCAR PANEL
        //////////////////////////////////////////////////

        const data =
            await reactionRolesSchema.findOne({

                guildId:
                    interaction.guild.id,

                panelId
            });

        //////////////////////////////////////////////////

        if (!data) {

            return interaction.reply({

                content:
                    "❌ No encontré ese panel.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // NUEVOS DATOS
        //////////////////////////////////////////////////

        const title =
            interaction.options.getString(
                "titulo"
            ) ||

            data.title;

        //////////////////////////////////////////////////

        const description =
            interaction.options

                .getString("descripcion")

                ?.replace(/\\n/g, "\n")

            ||

            data.description;

        //////////////////////////////////////////////////

        const placeholder =
            interaction.options.getString(
                "placeholder"
            ) ||

            data.placeholder;

        //////////////////////////////////////////////////

        const color =
            interaction.options.getString(
                "color"
            ) ||

            data.color;

        //////////////////////////////////////////////////
        // IMÁGENES
        //////////////////////////////////////////////////

        const imagen =
            interaction.options.getAttachment(
                "imagen"
            );

        //////////////////////////////////////////////////

        const thumbnail =
            interaction.options.getAttachment(
                "thumbnail"
            );

        //////////////////////////////////////////////////
        // VALIDAR IMÁGENES
        //////////////////////////////////////////////////

        if (
            imagen &&
            !imagen.contentType?.startsWith(
                "image"
            )
        ) {

            return interaction.reply({

                content:
                    "❌ El archivo imagen debe ser una imagen.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////

        if (
            thumbnail &&
            !thumbnail.contentType?.startsWith(
                "image"
            )
        ) {

            return interaction.reply({

                content:
                    "❌ El thumbnail debe ser una imagen.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////

        const imageURL =
            imagen?.url ||

            data.image ||

            null;

        //////////////////////////////////////////////////

        const thumbnailURL =
            thumbnail?.url ||

            data.thumbnail ||

            null;

        //////////////////////////////////////////////////
        // GUARDAR DB
        //////////////////////////////////////////////////

        data.title =
            title;

        data.description =
            description;

        data.placeholder =
            placeholder;

        data.color =
            color;

        data.image =
            imageURL;

        data.thumbnail =
            thumbnailURL;

        //////////////////////////////////////////////////

        await data.save();

        //////////////////////////////////////////////////
        // OBTENER MENSAJE
        //////////////////////////////////////////////////

        const channel =
            interaction.guild.channels.cache.get(
                data.channelId
            );

        //////////////////////////////////////////////////

        if (!channel) {

            return interaction.reply({

                content:
                    "❌ No encontré el canal del panel.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////

        const msg =
            await channel.messages.fetch(
                data.messageId
            ).catch(() => null);

        //////////////////////////////////////////////////

        if (!msg) {

            return interaction.reply({

                content:
                    "❌ No encontré el mensaje del panel.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // RECONSTRUIR MENU
        //////////////////////////////////////////////////

        const menu =
            new StringSelectMenuBuilder()

                .setCustomId(
                    data.customId
                )

                .setPlaceholder(
                    placeholder
                )

                .setMinValues(0)

                .setMaxValues(1)

                .addOptions(

                    data.roles.map(role => ({

                        label:
                            role.label,

                        value:
                            role.roleId,

                        description:
                            role.description ||

                            `Obtener ${role.label}`
                    }))
                );

        //////////////////////////////////////////////////
        // ROW
        //////////////////////////////////////////////////

        const row =
            new ActionRowBuilder()

                .addComponents(menu);

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =
            new EmbedBuilder()

                .setColor(color)

                .setTitle(title)

                .setDescription(description)

                .setImage(imageURL)

                .setThumbnail(thumbnailURL)

        //////////////////////////////////////////////////
        // EDITAR MENSAJE
        //////////////////////////////////////////////////

        await msg.edit({

            embeds: [embed],

            components: [row]
        });

        //////////////////////////////////////////////////

        await interaction.reply({

            content:
                `✅ Panel \`${panelId}\` actualizado correctamente.`,

            flags: 64
        });
    }
};