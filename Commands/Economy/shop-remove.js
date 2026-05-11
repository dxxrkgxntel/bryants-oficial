const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
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
            )

            .addRoleOption(o =>

                o.setName("rol")

                    .setDescription(
                        "Rol que deseas eliminar de la tienda"
                    )

                    .setRequired(true)
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // ROLE
        //////////////////////////////////////////////////

        const role =
            interaction.options.getRole(
                "rol"
            );

        //////////////////////////////////////////////////
        // BUSCAR ITEM
        //////////////////////////////////////////////////

        const item =
            await ShopItem.findOne({

                guildId:
                    interaction.guild.id,

                roleId:
                    role.id
            });

        //////////////////////////////////////////////////
        // VALIDAR
        //////////////////////////////////////////////////

        if (!item) {

            return interaction.reply({

                embeds: [

                    new EmbedBuilder()

                        .setColor("#ff0000")

                        .setTitle(
                            "❌ Rol no encontrado"
                        )

                        .setDescription(

                            `El rol ${role} no se encuentra registrado dentro de la tienda del servidor.`
                        )
                ],

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // EMBED CONFIRMACION
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor(
                    role.color || "#8A2BE2"
                )

                .setTitle(
                    "🗑️ Confirmar eliminación"
                )

                .setDescription(

                    `¿Deseas eliminar el rol ${role} de la tienda del servidor?\n\n` +

                    `💰 **Precio registrado**\n` +

                    `> ${item.price.toLocaleString()} monedas\n\n` +

                    `⚠️ Los usuarios ya no podrán comprar este rol mediante el sistema económico.`
                )

                .addFields({

                    name: "👮 Administrador",
                    value: `${interaction.user}`,
                    inline: true

                }, {

                    name: "🎭 Rol",
                    value: `${role}`,
                    inline: true
                })

                .setThumbnail(

                    interaction.guild.iconURL({

                        dynamic: true,
                        size: 1024
                    })
                )

                .setImage(
                    "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png"
                )

                .setFooter({

                    text:
                        "Tienes 30 segundos para responder"
                })

                .setTimestamp();

        //////////////////////////////////////////////////
        // BOTONES
        //////////////////////////////////////////////////

        const row =

            new ActionRowBuilder()

                .addComponents(

                    new ButtonBuilder()

                        .setCustomId(
                            "shopremove_confirm"
                        )

                        .setLabel(
                            "Eliminar"
                        )

                        .setEmoji("🗑️")

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
        // SEND
        //////////////////////////////////////////////////

        const msg =
            await interaction.reply({

                embeds: [embed],

                components: [row],

                fetchReply: true
            });

        //////////////////////////////////////////////////
        // COLLECTOR
        //////////////////////////////////////////////////

        const collector =

            msg.createMessageComponentCollector({

                time: 30000
            });

        //////////////////////////////////////////////////

        collector.on(

            "collect",

            async i => {

                ////////////////////////////////////////////////
                // SOLO AUTOR
                ////////////////////////////////////////////////

                if (

                    i.user.id !==
                    interaction.user.id

                ) {

                    return i.reply({

                        content:
                            "❌ No puedes usar estos botones.",

                        flags: 64
                    });
                }

                ////////////////////////////////////////////////
                // CANCELAR
                ////////////////////////////////////////////////

                if (

                    i.customId ===
                    "shopremove_cancel"

                ) {

                    collector.stop();

                    return i.update({

                        content:
                            "❌ Operación cancelada.",

                        embeds: [],

                        components: []
                    });
                }

                ////////////////////////////////////////////////
                // CONFIRMAR
                ////////////////////////////////////////////////

                if (

                    i.customId ===
                    "shopremove_confirm"

                ) {

                    //////////////////////////////////////////////////
                    // ELIMINAR
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
                                "🗑️ Rol eliminado correctamente"
                            )

                            .setDescription(

                                `El rol ${role} fue eliminado exitosamente de la tienda.\n\n` +

                                `🚫 Los usuarios ya no podrán comprar este rol mediante el sistema económico.`
                            )

                            .addFields({

                                name: "👮 Administrador",
                                value: `${interaction.user}`,
                                inline: true

                            }, {

                                name: "🎭 Rol eliminado",
                                value: `${role}`,
                                inline: true
                            })

                            .setThumbnail(

                                interaction.guild.iconURL({

                                    dynamic: true,
                                    size: 1024
                                })
                            )

                            .setImage(
                                "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png"
                            )

                            .setFooter({

                                text:
                                    "Bryant's Economy System"
                            })

                            .setTimestamp();

                    //////////////////////////////////////////////////

                    collector.stop();

                    //////////////////////////////////////////////////

                    return i.update({

                        embeds: [successEmbed],

                        components: []
                    });
                }
            }
        );

        //////////////////////////////////////////////////
        // TIMEOUT
        //////////////////////////////////////////////////

        collector.on(

            "end",

            async (_, reason) => {

                if (
                    reason === "time"
                ) {

                    await msg.edit({

                        content:
                            "⌛ Tiempo agotado.",

                        embeds: [],

                        components: []

                    }).catch(() => {});
                }
            }
        );
    }
};