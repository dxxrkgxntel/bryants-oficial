const {

    SlashCommandBuilder,
    PermissionFlagsBits,
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

function getPanelCategory(title = "") {
    const cleaned = title
        .replace(/[👀✨🎭🌎🌍🌏]/gu, "")
        .replace(/[¿?]/g, "")
        .trim();

    const match = cleaned.match(/(?:rol(?:es)?\s+de(?:l|\s+la)?|de(?:l|\s+la)?)\s+(.+)$/i);
    const category = (match?.[1] || cleaned || "Roles").trim();

    return category.charAt(0).toUpperCase() + category.slice(1);
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

    const category = getPanelCategory(title);

    return `${roleLines}\n\nSelecciona del menú siguiente para gestionar tus roles en · **¿ ${category} ?**`;
}

function hexToInt(color = "#8A2BE2") {
    const parsed = Number.parseInt(String(color).replace("#", ""), 16);
    return Number.isFinite(parsed) ? parsed : 0x8A2BE2;
}

function buildPanelContainer(interaction, roles, title, placeholder, customId, color, imageURL) {
    const container =
        new ContainerBuilder()
            .setAccentColor(hexToInt(color));

    if (imageURL) {
        const gallery =
            new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(imageURL)
                );

        container.addMediaGalleryComponents(gallery);
    }

    container.addTextDisplayComponents(
        new TextDisplayBuilder()
            .setContent(`## ${title}`)
    );

    container.addSeparatorComponents(
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

    container.addTextDisplayComponents(
        new TextDisplayBuilder()
            .setContent(roleLines || "No hay roles disponibles.")
    );

    container.addSeparatorComponents(
        new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small)
    );

    const category = getPanelCategory(title);

    container.addTextDisplayComponents(
        new TextDisplayBuilder()
            .setContent(`Selecciona del menú siguiente para gestionar tus roles en · **¿ ${category} ?**`)
    );

    const container =
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
                    components: [container],
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

            const container =
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
                    components: [container],
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

            const container =
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
                components: [container],
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