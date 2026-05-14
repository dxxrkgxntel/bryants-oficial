const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require("discord.js");

const ShopItem =
    require("../../Models/ShopItem");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("shop-remove")

            .setDescription(
                "Elimina un rol de la tienda"
            )

            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // ITEMS
        //////////////////////////////////////////////////

        const items =
            await ShopItem.find({

                guildId:
                    interaction.guild.id
            });

        //////////////////////////////////////////////////
        // VALIDAR
        //////////////////////////////////////////////////

        if (!items.length) {

            return interaction.reply({

                embeds: [

                    new EmbedBuilder()

                        .setColor("#ff0000")

                        .setTitle(
                            "❌ No hay roles"
                        )

                        .setDescription(

                            "No existen roles registrados dentro de la tienda."
                        )
                ],

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // OPTIONS
        //////////////////////////////////////////////////

        const options = [];

        //////////////////////////////////////////////////

        for (const item of items) {

            const role =
                interaction.guild.roles.cache.get(
                    item.roleId
                );

            //////////////////////////////////////////////////

            if (!role)
                continue;

            //////////////////////////////////////////////////

            options.push({

                label:
                    role.name.substring(0, 100),

                description:
                    `${item.price.toLocaleString()} monedas`,

                value:
                    role.id,

                emoji:
                    item.emoji || "🛒"
            });
        }

        //////////////////////////////////////////////////
        // EMBED SELECT
        //////////////////////////////////////////////////

        const selectEmbed =

            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "🛒 Eliminar rol de la tienda"
                )

                .setDescription(

                    `Selecciona el rol que deseas eliminar de la tienda.\n\n` +

                    `📦 Roles disponibles: **${options.length}**`
                )

                .setThumbnail(

                    interaction.guild.iconURL({

                        dynamic: true
                    })
                )

                .setFooter({

                    text:
                        "Selecciona un rol abajo"
                })

                .setTimestamp();

        //////////////////////////////////////////////////
        // SELECT MENU
        //////////////////////////////////////////////////

        const selectMenu =

            new StringSelectMenuBuilder()

                .setCustomId(
                    "shopremove_select"
                )

                .setPlaceholder(
                    "Selecciona un rol..."
                )

                .addOptions(options);

        //////////////////////////////////////////////////

        const selectRow =

            new ActionRowBuilder()

                .addComponents(
                    selectMenu
                );

        //////////////////////////////////////////////////
        // SEND
        //////////////////////////////////////////////////

        const msg =
            await interaction.reply({

                embeds: [selectEmbed],

                components: [selectRow],

                fetchReply: true
            });

        //////////////////////////////////////////////////
        // SELECT RESPONSE
        //////////////////////////////////////////////////

        const selectInteraction =

            await msg.awaitMessageComponent({

                filter: i =>

                    i.user.id ===
                    interaction.user.id,

                time: 30000
            }).catch(() => null);

        //////////////////////////////////////////////////
        // TIMEOUT
        //////////////////////////////////////////////////

        if (!selectInteraction) {

            return interaction.editReply({

                content:
                    "⌛ Tiempo agotado.",

                embeds: [],

                components: []
            });
        }

        //////////////////////////////////////////////////
        // ROLE
        //////////////////////////////////////////////////

        const roleId =
            selectInteraction.values[0];

        //////////////////////////////////////////////////

        const role =
            interaction.guild.roles.cache.get(
                roleId
            );

        //////////////////////////////////////////////////

        const item =
            await ShopItem.findOne({

                guildId:
                    interaction.guild.id,

                roleId
            });

        //////////////////////////////////////////////////

        if (!role || !item) {

            return selectInteraction.update({

                content:
                    "❌ Ese rol ya no existe.",

                embeds: [],

                components: []
            });
        }

        //////////////////////////////////////////////////
        // CONFIRM EMBED
        //////////////////////////////////////////////////

        const confirmEmbed =

            new EmbedBuilder()

                .setColor(
                    role.color || "#8A2BE2"
                )

                .setTitle(
                    "🗑️ Confirmar eliminación"
                )

                .setDescription(

                    `¿Realmente deseas eliminar el rol ${role} de la tienda?\n\n` +

                    `💰 Precio registrado:\n` +

                    `> ${item.price.toLocaleString()} monedas`
                )

                .addFields({

                    name:
                        "👮 Administrador",

                    value:
                        `${interaction.user}`,

                    inline: true

                }, {

                    name:
                        "🎭 Rol",

                    value:
                        `${role}`,

                    inline: true
                })

                .setThumbnail(

                    interaction.guild.iconURL({

                        dynamic: true
                    })
                )

                .setFooter({

                    text:
                        "Tienes 30 segundos para responder"
                })

                .setTimestamp();

        //////////////////////////////////////////////////
        // BUTTONS
        //////////////////////////////////////////////////

        const buttonRow =

            new ActionRowBuilder()

                .addComponents(

                    new ButtonBuilder()

                        .setCustomId(
                            "shopremove_confirm"
                        )

                        .setLabel(
                            "Aceptar"
                        )

                        .setEmoji("✅")

                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()

                        .setCustomId(
                            "shopremove_cancel"
                        )

                        .setLabel(
                            "Cancelar"
                        )

                        .setEmoji("❌")

                        .setStyle(
                            ButtonStyle.Secondary
                        )
                );

        //////////////////////////////////////////////////

        await selectInteraction.update({

            embeds: [confirmEmbed],

            components: [buttonRow]
        });

        //////////////////////////////////////////////////
        // FETCH MESSAGE
        //////////////////////////////////////////////////

        const updatedMsg =
            await interaction.fetchReply();

        //////////////////////////////////////////////////
        // BUTTON RESPONSE
        //////////////////////////////////////////////////

        const buttonInteraction =

            await updatedMsg.awaitMessageComponent({

                filter: i =>

                    i.user.id ===
                    interaction.user.id,

                time: 30000
            }).catch(() => null);

        //////////////////////////////////////////////////
        // TIMEOUT
        //////////////////////////////////////////////////

        if (!buttonInteraction) {

            return interaction.editReply({

                content:
                    "⌛ Tiempo agotado.",

                embeds: [],

                components: []
            });
        }

        //////////////////////////////////////////////////
        // CANCEL
        //////////////////////////////////////////////////

        if (

            buttonInteraction.customId ===
            "shopremove_cancel"

        ) {

            return buttonInteraction.update({

                content:
                    "❌ Operación cancelada.",

                embeds: [],

                components: []
            });
        }

        //////////////////////////////////////////////////
        // DELETE
        //////////////////////////////////////////////////

        await ShopItem.deleteOne({

            guildId:
                interaction.guild.id,

            roleId:
                role.id
        });

        //////////////////////////////////////////////////
        // SUCCESS EMBED
        //////////////////////////////////////////////////

        const successEmbed =

            new EmbedBuilder()

                .setColor("#ff003c")

                .setTitle(
                    "🗑️ Rol eliminado"
                )

                .setDescription(

                    `El rol ${role} fue eliminado exitosamente de la tienda.`
                )

                .addFields({

                    name:
                        "👮 Administrador",

                    value:
                        `${interaction.user}`,

                    inline: true

                }, {

                    name:
                        "🎭 Rol eliminado",

                    value:
                        `${role}`,

                    inline: true
                })

                .setThumbnail(

                    interaction.guild.iconURL({

                        dynamic: true
                    })
                )

                .setFooter({

                    text:
                        "Bryant's Economy System"
                })

                .setTimestamp();

        //////////////////////////////////////////////////

        await buttonInteraction.update({

            embeds: [successEmbed],

            components: []
        });
    }
};