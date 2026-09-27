const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const ShopItem =
    require("../../Models/ShopItem");

const EconomyUser =
    require("../../Models/EconomyUser");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("comprar-rol")

            .setDescription(
                "Compra roles de la tienda"
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

        if (!items.length) {

            return interaction.reply({

                content:
                    "❌ La tienda está vacía.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // USER DATA
        //////////////////////////////////////////////////

        const userData =
            await EconomyUser.findOne({

                guildId:
                    interaction.guild.id,

                userId:
                    interaction.user.id
            });

        //////////////////////////////////////////////////

        if (!userData) {

            return interaction.reply({

                content:
                    "❌ No tienes datos económicos.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "🛒 Tienda de Roles"
                )

                .setDescription(

                    `👛 Tu balance actual:\n` +

                    `> **${userData.wallet.toLocaleString()} monedas**\n\n` +

                    `Selecciona un rol para comprarlo.`
                )

                .setThumbnail(

                    interaction.guild.iconURL({

                        dynamic: true
                    })
                )

                .setFooter({

                    text:
                        "Bryant's Economy"
                })

                .setTimestamp();

        //////////////////////////////////////////////////
        // OPTIONS
        //////////////////////////////////////////////////

        const options =
            items.slice(0, 25).map(item => {

                //////////////////////////////////////////////////
                // ROLE
                //////////////////////////////////////////////////

                const role =
                    interaction.guild.roles.cache.get(
                        item.roleId
                    );

                //////////////////////////////////////////////////

                return {

                    label:
                        role?.name || "Rol eliminado",

                    description:
                        `${item.price.toLocaleString()} monedas • ${item.description}`,

                    value:
                        item.roleId,

                    emoji:
                        item.emoji || "🛒"
                };
            });

        //////////////////////////////////////////////////
        // SELECT MENU
        //////////////////////////////////////////////////

        const menu =

            new StringSelectMenuBuilder()

                .setCustomId(
                    "shop_select"
                )

                .setPlaceholder(
                    "Selecciona un rol"
                )

                .addOptions(options);

        //////////////////////////////////////////////////

        const row =
            new ActionRowBuilder()

                .addComponents(menu);

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

                time: 60000
            });

        //////////////////////////////////////////////////

        collector.on(

            "collect",

            async i => {

                ////////////////////////////////////////////////
                // USER ONLY
                ////////////////////////////////////////////////

                if (

                    i.user.id !==
                    interaction.user.id

                ) {

                    return i.reply({

                        content:
                            "❌ No puedes usar este menú.",

                        flags: 64
                    });
                }

                ////////////////////////////////////////////////
                // SELECT
                ////////////////////////////////////////////////

                if (
                    i.isStringSelectMenu()
                ) {

                    //////////////////////////////////////////////////
                    // ITEM
                    //////////////////////////////////////////////////

                    const item =
                        await ShopItem.findOne({

                            guildId:
                                interaction.guild.id,

                            roleId:
                                i.values[0]
                        });

                    //////////////////////////////////////////////////

                    if (!item)
                        return;

                    //////////////////////////////////////////////////
                    // ROLE
                    //////////////////////////////////////////////////

                    const role =
                        interaction.guild.roles.cache.get(
                            item.roleId
                        );

                    //////////////////////////////////////////////////

                    if (!role) {

                        return i.reply({

                            content:
                                "❌ Ese rol ya no existe.",

                            flags: 64
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
                                "🛒 Confirmar compra"
                            )

                            .setDescription(

                                `¿Deseas comprar ${role}?\n\n` +

                                `${item.emoji} ${item.description}\n\n` +

                                `💰 Precio:\n` +

                                `> ${item.price.toLocaleString()} monedas`
                            )

                            .setTimestamp();

                    //////////////////////////////////////////////////
                    // BUTTONS
                    //////////////////////////////////////////////////

                    const buttons =

                        new ActionRowBuilder()

                            .addComponents(

                                new ButtonBuilder()

                                    .setCustomId(
                                        `buy_${role.id}`
                                    )

                                    .setLabel(
                                        "Comprar"
                                    )

                                    .setEmoji("✅")

                                    .setStyle(
                                        ButtonStyle.Secondary
                                    ),

                                new ButtonBuilder()

                                    .setCustomId(
                                        "cancel_buy"
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

                    await i.update({

                        embeds: [confirmEmbed],

                        components: [buttons]
                    });
                }

                ////////////////////////////////////////////////
                // BUTTONS
                ////////////////////////////////////////////////

                if (
                    i.isButton()
                ) {

                    ////////////////////////////////////////////////
                    // CANCEL
                    ////////////////////////////////////////////////

                    if (

                        i.customId ===
                        "cancel_buy"

                    ) {

                        collector.stop();

                        return i.update({

                            content:
                                "❌ Compra cancelada.",

                            embeds: [],

                            components: []
                        });
                    }

                    ////////////////////////////////////////////////
                    // BUY
                    ////////////////////////////////////////////////

                    if (

                        i.customId.startsWith(
                            "buy_"
                        )

                    ) {

                        //////////////////////////////////////////////////
                        // ROLE ID
                        //////////////////////////////////////////////////

                        const roleId =
                            i.customId.split("_")[1];

                        //////////////////////////////////////////////////
                        // ITEM
                        //////////////////////////////////////////////////

                        const item =
                            await ShopItem.findOne({

                                guildId:
                                    interaction.guild.id,

                                roleId
                            });

                        //////////////////////////////////////////////////

                        if (!item)
                            return;

                        //////////////////////////////////////////////////
                        // ROLE
                        //////////////////////////////////////////////////

                        const role =
                            interaction.guild.roles.cache.get(
                                roleId
                            );

                        //////////////////////////////////////////////////

                        if (!role) {

                            return i.reply({

                                content:
                                    "❌ Rol inexistente.",

                                flags: 64
                            });
                        }

                        //////////////////////////////////////////////////
                        // ALREADY OWNED
                        //////////////////////////////////////////////////

                        if (

                            interaction.member.roles.cache.has(
                                role.id
                            )

                        ) {

                            return i.reply({

                                content:
                                    "❌ Ya tienes este rol.",

                                flags: 64
                            });
                        }

                        //////////////////////////////////////////////////
                        // MONEY
                        //////////////////////////////////////////////////

                        if (

                            userData.wallet <
                            item.price

                        ) {

                            return i.reply({

                                content:
                                    "❌ No tienes suficiente dinero.",

                                flags: 64
                            });
                        }

                        //////////////////////////////////////////////////
                        // REMOVE MONEY
                        //////////////////////////////////////////////////

                        userData.wallet -=
                            item.price;

                        //////////////////////////////////////////////////

                        await userData.save();

                        //////////////////////////////////////////////////
                        // GIVE ROLE
                        //////////////////////////////////////////////////

                        await interaction.member.roles.add(
                            role
                        );

                        //////////////////////////////////////////////////
                        // SUCCESS
                        //////////////////////////////////////////////////

                        const successEmbed =

                            new EmbedBuilder()

                                .setColor("#00ff99")

                                .setTitle(
                                    "✅ Compra completada"
                                )

                                .setDescription(

                                    `Has comprado ${role}\n\n` +

                                    `💰 Precio pagado:\n` +

                                    `> ${item.price.toLocaleString()} monedas\n\n` +

                                    `👛 Balance restante:\n` +

                                    `> ${userData.wallet.toLocaleString()} monedas`
                                )

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
            }
        );

        //////////////////////////////////////////////////
        // END
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