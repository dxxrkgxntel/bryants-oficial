const {

    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ChannelType

} = require("discord.js");

const reactionRolesSchema =
require("../../Models/reactionRolesSchema");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("reactionrole")

            .setDescription(
                "Sistema de reaction roles"
            )

            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            )

            //////////////////////////////////////////////////
            // SETUP
            //////////////////////////////////////////////////

            .addSubcommand(sub => {

                sub

                    .setName("setup")

                    .setDescription(
                        "Crear panel de reaction roles"
                    )

                    //////////////////////////////////////////////////
                    // PANEL ID
                    //////////////////////////////////////////////////

                    .addStringOption(option =>

                        option

                            .setName("panelid")

                            .setDescription(
                                "ID único del panel"
                            )

                            .setRequired(true)
                    )

                    //////////////////////////////////////////////////
                    // PERSONALIZACIÓN
                    //////////////////////////////////////////////////

                    .addStringOption(option =>

                        option

                            .setName("titulo")

                            .setDescription(
                                "Título del embed"
                            )
                    )

                    .addStringOption(option =>

                        option

                            .setName("descripcion")

                            .setDescription(
                                "Descripción del embed"
                            )
                    )

                    .addStringOption(option =>

                        option

                            .setName("placeholder")

                            .setDescription(
                                "Texto del menú"
                            )
                    )

                    .addStringOption(option =>

                        option

                            .setName("color")

                            .setDescription(
                                "Color HEX del embed"
                            )
                    )

                    //////////////////////////////////////////////////
                    // IMÁGENES
                    //////////////////////////////////////////////////

                    .addAttachmentOption(option =>

                        option

                            .setName("imagen")

                            .setDescription(
                                "Imagen principal del embed"
                            )
                    )

                    .addAttachmentOption(option =>

                        option

                            .setName("thumbnail")

                            .setDescription(
                                "Thumbnail del embed"
                            )
                    );

                //////////////////////////////////////////////////
                // 18 ROLES
                //////////////////////////////////////////////////

                for (let i = 1; i <= 18; i++) {

                    sub.addRoleOption(option =>

                        option

                            .setName(`role${i}`)

                            .setDescription(
                                `Rol ${i}`
                            )

                    );

                }

                //////////////////////////////////////////////////

                return sub;

            })

            //////////////////////////////////////////////////
            // SEND
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("send")

                    .setDescription(
                        "Reenviar un panel"
                    )

                    .addStringOption(option =>

                        option

                            .setName("panelid")

                            .setDescription(
                                "ID del panel"
                            )

                            .setRequired(true)

                    )

                    .addChannelOption(option =>

                        option

                            .setName("channel")

                            .setDescription(
                                "Canal donde enviar"
                            )

                            .addChannelTypes(
                                ChannelType.GuildText
                            )

                    )

            )

            //////////////////////////////////////////////////
            // EDIT
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("edit")

                    .setDescription(
                        "Editar un panel"
                    )

                    .addStringOption(option =>

                        option

                            .setName("panelid")

                            .setDescription(
                                "ID del panel"
                            )

                            .setRequired(true)

                    )

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

                    .addAttachmentOption(option =>

                        option

                            .setName("imagen")

                            .setDescription(
                                "Nueva imagen"
                            )

                    )

                    .addAttachmentOption(option =>

                        option

                            .setName("thumbnail")

                            .setDescription(
                                "Nuevo thumbnail"
                            )

                    )

            )

            //////////////////////////////////////////////////
            // DELETE
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("delete")

                    .setDescription(
                        "Eliminar un panel"
                    )

                    .addStringOption(option =>

                        option

                            .setName("panelid")

                            .setDescription(
                                "ID del panel"
                            )

                            .setRequired(true)

                    )

            )

            //////////////////////////////////////////////////
            // LIST
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("list")

                    .setDescription(
                        "Ver todos los panels"
                    )

            ),

    //////////////////////////////////////////////////
    // EXECUTE
    //////////////////////////////////////////////////

    async execute(interaction) {

        const subcommand =
            interaction.options.getSubcommand();

        //////////////////////////////////////////////////
        // SETUP
        //////////////////////////////////////////////////

        if (subcommand === "setup") {

            const panelId =
                interaction.options.getString(
                    "panelid"
                );

            //////////////////////////////////////////////////

            const existingPanel =
                await reactionRolesSchema.findOne({

                    guildId:
                        interaction.guild.id,

                    panelId
                });

            //////////////////////////////////////////////////

            if (existingPanel) {

                return interaction.reply({

                    content:
                        "❌ Ya existe un panel con ese ID.",

                    flags: 64
                });
            }

            //////////////////////////////////////////////////

            const title =
                interaction.options.getString(
                    "titulo"
                ) ||

                "✨ Reaction Roles";

            //////////////////////////////////////////////////

            const description =
                interaction.options

                    .getString("descripcion")

                    ?.replace(/\\n/g, "\n")

                ||

                "Selecciona los roles que deseas obtener.";

            //////////////////////////////////////////////////

            const placeholder =
                interaction.options.getString(
                    "placeholder"
                ) ||

                "✨ Selecciona tus roles";

            //////////////////////////////////////////////////

            const color =
                interaction.options.getString(
                    "color"
                ) ||

                "#8A2BE2";

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
                imagen?.url || null;

            //////////////////////////////////////////////////

            const thumbnailURL =
                thumbnail?.url || null;

            //////////////////////////////////////////////////

            const roles = [];

            //////////////////////////////////////////////////

            for (let i = 1; i <= 18; i++) {

                const role =
                    interaction.options.getRole(
                        `role${i}`
                    );

                //////////////////////////////////////////////////

                if (role) {

                    roles.push(role);
                }
            }

            //////////////////////////////////////////////////

            if (roles.length < 2) {

                return interaction.reply({

                    content:
                        "❌ Debes añadir mínimo 2 roles.",

                    flags: 64
                });
            }

            //////////////////////////////////////////////////

            const customId =
                `rr_${Date.now()}`;

            //////////////////////////////////////////////////

            const menu =
                new StringSelectMenuBuilder()

                    .setCustomId(customId)

                    .setPlaceholder(
                        placeholder
                    )

                    .setMinValues(0)

                    .setMaxValues(1)

                    .addOptions(

                        roles.map(role => ({

                            label:
                                role.name
                                    .slice(0, 100),

                            value:
                                role.id,

                            description:
                                `Obtener ${role.name}`
                                    .slice(0, 100)
                        }))
                    );

            //////////////////////////////////////////////////

            const row =
                new ActionRowBuilder()

                    .addComponents(menu);

            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor(color)

                    .setTitle(title)

                    .setDescription(description)

                    .setImage(imageURL)

                    .setThumbnail(thumbnailURL);

            //////////////////////////////////////////////////

            const msg =
                await interaction.channel.send({

                    embeds: [embed],

                    components: [row]
                });

            //////////////////////////////////////////////////

            await reactionRolesSchema.create({

                guildId:
                    interaction.guild.id,

                panelId,

                channelId:
                    interaction.channel.id,

                messageId:
                    msg.id,

                customId,

                title,

                description,

                placeholder,

                color,

                image:
                    imageURL,

                thumbnail:
                    thumbnailURL,

                roles: roles.map(role => ({

                    roleId:
                        role.id,

                    label:
                        role.name
                }))
            });

            //////////////////////////////////////////////////

            return interaction.reply({

                content:
                    `✅ Panel \`${panelId}\` creado correctamente.`,

                flags: 64
            });

        }

        //////////////////////////////////////////////////
        // SEND
        //////////////////////////////////////////////////

        if (subcommand === "send") {

            const panelId =
                interaction.options.getString(
                    "panelid"
                );

            const channel =
                interaction.options.getChannel(
                    "channel"
                ) ||

                interaction.channel;

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

            const menu =
                new StringSelectMenuBuilder()

                    .setCustomId(
                        data.customId
                    )

                    .setPlaceholder(
                        data.placeholder
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

            const row =
                new ActionRowBuilder()

                    .addComponents(menu);

            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor(
                        data.color
                    )

                    .setTitle(
                        data.title
                    )

                    .setDescription(
                        data.description
                    );

            //////////////////////////////////////////////////

            if (data.image) {

                embed.setImage(
                    data.image
                );

            }

            //////////////////////////////////////////////////

            if (data.thumbnail) {

                embed.setThumbnail(
                    data.thumbnail
                );

            }

            //////////////////////////////////////////////////

            const msg =
                await channel.send({

                    embeds: [embed],

                    components: [row]

                });

            //////////////////////////////////////////////////

            data.messageId =
                msg.id;

            data.channelId =
                channel.id;

            //////////////////////////////////////////////////

            await data.save();

            //////////////////////////////////////////////////

            return interaction.reply({

                content:
                    `✅ Panel \`${panelId}\` enviado correctamente.`,

                flags: 64

            });

        }

        //////////////////////////////////////////////////
        // EDIT
        //////////////////////////////////////////////////

        if (subcommand === "edit") {

            const panelId =
                interaction.options.getString(
                    "panelid"
                );

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

            const channel =
                interaction.guild.channels.cache.get(
                    data.channelId
                );

            //////////////////////////////////////////////////

            if (!channel) {

                return interaction.reply({

                    content:
                        "❌ No encontré el canal.",

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
                        "❌ No encontré el mensaje.",

                    flags: 64

                });

            }

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

            const row =
                new ActionRowBuilder()

                    .addComponents(menu);

            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor(color)

                    .setTitle(title)

                    .setDescription(description);

            //////////////////////////////////////////////////

            if (imageURL) {

                embed.setImage(
                    imageURL
                );

            }

            //////////////////////////////////////////////////

            if (thumbnailURL) {

                embed.setThumbnail(
                    thumbnailURL
                );

            }

            //////////////////////////////////////////////////

            await msg.edit({

                embeds: [embed],

                components: [row]

            });

            //////////////////////////////////////////////////

            return interaction.reply({

                content:
                    `✅ Panel \`${panelId}\` actualizado correctamente.`,

                flags: 64

            });

        }

        //////////////////////////////////////////////////
        // DELETE
        //////////////////////////////////////////////////

        if (subcommand === "delete") {

            const panelId =
                interaction.options.getString(
                    "panelid"
                );

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

            try {

                const channel =
                    interaction.guild.channels.cache.get(
                        data.channelId
                    );

                //////////////////////////////////////////////////

                if (channel) {

                    const msg =
                        await channel.messages.fetch(
                            data.messageId
                        ).catch(() => null);

                    //////////////////////////////////////////////////

                    if (msg) {

                        await msg.delete()
                            .catch(() => {});

                    }

                }

            } catch {}

            //////////////////////////////////////////////////

            await reactionRolesSchema.deleteOne({

                guildId:
                    interaction.guild.id,

                panelId

            });

            //////////////////////////////////////////////////

            return interaction.reply({

                content:
                    `✅ Panel \`${panelId}\` eliminado correctamente.`,

                flags: 64

            });

        }

        //////////////////////////////////////////////////
        // LIST
        //////////////////////////////////////////////////

        if (subcommand === "list") {

            const panels =
                await reactionRolesSchema.find({

                    guildId:
                        interaction.guild.id

                });

            //////////////////////////////////////////////////

            if (!panels.length) {

                return interaction.reply({

                    content:
                        "❌ No hay panels guardados.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////

            const embed =
                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setTitle(
                        "✨ Panels de Reaction Roles"
                    )

                    .setDescription(

                        panels.map(panel =>

                            `📌 **Panel ID:** \`${panel.panelId}\`\n` +

                            `🎭 Roles: **${panel.roles.length}**\n` +

                            `📍 Canal: <#${panel.channelId}>\n` +

                            `🆔 Message ID: \`${panel.messageId}\``

                        ).join("\n\n━━━━━━━━━━━━━━\n\n")

                    )

                    .setTimestamp();

            //////////////////////////////////////////////////

            return interaction.reply({

                embeds: [embed],

                flags: 64

            });

        }

    }

};