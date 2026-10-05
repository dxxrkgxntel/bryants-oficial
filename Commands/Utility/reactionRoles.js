const {

    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ChannelType,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    SeparatorSpacingSize

} = require("discord.js");

const reactionRolesSchema =
require("../../Models/reactionRolesSchema");

function getRoleVisual(name = "") {
    const normalized = name.trim();

    // Formato recomendado del rol: "🇩🇴 DO · Dominicano".
    // El emoji se usa en el select; el resto del nombre se usa como label.
    const flag = normalized.match(/^[\u{1F1E6}-\u{1F1FF}]{2}/u)?.[0] || null;
    const pictographic = normalized.match(/^\p{Extended_Pictographic}/u)?.[0] || null;
    const emoji = flag || pictographic;
    const label = emoji ? normalized.slice(emoji.length).trim() : normalized;

    return {
        emoji,
        label: (label || normalized).slice(0, 100)
    };
}

function buildRoleOptions(interaction, roles) {
    return roles
        .map(savedRole => {
            const roleId = savedRole.roleId || savedRole.id;
            const discordRole = interaction.guild.roles.cache.get(roleId);
            if (!discordRole) return null;

            const visual = getRoleVisual(discordRole.name);

            return {
                label: visual.label,
                value: discordRole.id,
                ...(visual.emoji ? { emoji: visual.emoji } : {})
            };
        })
        .filter(Boolean);
}

function buildPanelDescription(interaction, roles, title) {
    const roleLines = roles
        .map(savedRole => {
            const roleId = savedRole.roleId || savedRole.id;
            const discordRole = interaction.guild.roles.cache.get(roleId);
            if (!discordRole) return null;

            const visual = getRoleVisual(discordRole.name);
            const suffix = visual.label.includes("·")
                ? visual.label.split("·").slice(1).join("·").trim()
                : "";

            return `${visual.emoji ? `${visual.emoji} ➜ ` : "➜ "}<@&${discordRole.id}>${suffix ? `  **${suffix}**` : ""}`;
        })
        .filter(Boolean)
        .join("\n");

    return `${roleLines}\n\nSelecciona del menú siguiente para gestionar tus roles en · **${title}**`;
}


function getPanelCategory(title = "") {
    const cleaned = title
        .replace(/[👀✨🎭🌎🌍🌏]/gu, "")
        .replace(/[*_~`>|#]/g, "")
        .replace(/[¿?]/g, "")
        .replace(/^[·・\-–—:\s]+|[·・\-–—:\s]+$/g, "")
        .trim();

    const match = cleaned.match(/(?:rol(?:es)?\s+de(?:l|\s+la)?|de(?:l|\s+la)?)\s+(.+)$/i);
    const category = (match?.[1] || cleaned || "Roles").trim();

    return category.charAt(0).toUpperCase() + category.slice(1);
}

function hexToInt(color = "#8A2BE2") {
    const parsed = Number.parseInt(String(color).replace("#", ""), 16);
    return Number.isFinite(parsed) ? parsed : 0x8A2BE2;
}

function buildPanelContainer(interaction, roles, title, placeholder, customId, color, imageURL) {
    const panel = new ContainerBuilder()
        .setAccentColor(hexToInt(color));

    if (imageURL) {
        panel.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(imageURL)
            )
        );
    }

    panel.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## ${title}`)
    );

    panel.addSeparatorComponents(
        new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small)
    );

    const roleLines = roles
        .map(savedRole => {
            const roleId = savedRole.roleId || savedRole.id;
            const discordRole = interaction.guild.roles.cache.get(roleId);
            if (!discordRole) return null;

            const visual = getRoleVisual(discordRole.name);
            const suffix = visual.label.includes("·")
                ? visual.label.split("·").slice(1).join("·").trim()
                : "";

            return `${visual.emoji ? `${visual.emoji} ➜ ` : "➜ "}<@&${discordRole.id}>${suffix ? `  **${suffix}**` : ""}`;
        })
        .filter(Boolean)
        .join("\n");

    panel.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(roleLines || "No hay roles disponibles.")
    );

    panel.addSeparatorComponents(
        new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small)
    );

    const category = getPanelCategory(title);

    panel.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `Selecciona del menú siguiente para gestionar tus roles en · **¿ ${category} ?**`
        )
    );

    const menu = new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(placeholder)
        .setMinValues(0)
        .setMaxValues(1)
        .addOptions(buildRoleOptions(interaction, roles));

    panel.addActionRowComponents(
        new ActionRowBuilder().addComponents(menu)
    );

    return panel;
}



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

                    .addStringOption(option =>

                        option

                            .setName("imagen")

                            .setDescription(
                                "URL del banner"
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

                    .addStringOption(option =>

                        option

                            .setName("imagen")

                            .setDescription(
                                "Nueva URL del banner"
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
                interaction.options.getString(
                    "imagen"
                );

            //////////////////////////////////////////////////

            const thumbnail =
                interaction.options.getAttachment(
                    "thumbnail"
                );

            //////////////////////////////////////////////////

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
                imagen || null;

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

            const panel =
                buildPanelContainer(
                    interaction,
                    roles,
                    title,
                    placeholder,
                    customId,
                    color,
                    imageURL
                );

            //////////////////////////////////////////////////

            const msg =
                await interaction.channel.send({
                    components: [panel],
                    flags: MessageFlags.IsComponentsV2
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

            const panel =
                buildPanelContainer(
                    interaction,
                    data.roles,
                    data.title,
                    data.placeholder,
                    data.customId,
                    data.color,
                    data.image
                );

            //////////////////////////////////////////////////

            const msg =
                await channel.send({
                    components: [panel],
                    flags: MessageFlags.IsComponentsV2
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
                interaction.options.getString(
                    "imagen"
                );

            //////////////////////////////////////////////////

            const thumbnail =
                interaction.options.getAttachment(
                    "thumbnail"
                );

            //////////////////////////////////////////////////

            const imageURL =
                imagen ||

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

            const panel =
                buildPanelContainer(
                    interaction,
                    data.roles,
                    title,
                    placeholder,
                    data.customId,
                    color,
                    imageURL
                );

            //////////////////////////////////////////////////

            await msg.edit({
                components: [panel],
                flags: MessageFlags.IsComponentsV2
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