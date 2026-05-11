const {
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const ticketSchema = require('../../Models/ticketGuildSchema');
const ticketSupport = require('../../Models/ticketSupportSchema');
const ticketCompras = require('../../Models/ticketBuySchema');

const errReply = require('../../Functions/interactionErrorReply');
const correReply = require('../../Functions/interactionReply');

module.exports = {
    id: 'tickets', // 🔥 customId del select

    async execute(interaction, client) {

        try {
            const valor = interaction.values[0];

            const ticketData = await ticketSchema.findOne({
                guildId: interaction.guild.id
            });

            if (!ticketData) {
                return errReply(interaction, "No se ha creado el sistema de tickets", true);
            }

            switch (valor) {

                // ================== SOPORTE ==================
                case 'soporte': {

                    const soporteData = await ticketSupport.findOne({
                        guildId: interaction.guild.id,
                        openBy: interaction.user.id,
                        open: true
                    });

                    if (soporteData) {
                        return errReply(interaction, "Ya tienes un ticket abierto", true);
                    }

                    const channel = await interaction.guild.channels.create({
                        name: `${interaction.user.username}-ticket`,
                        type: ChannelType.GuildText,
                        parent: ticketData.categorySoporte,
                        permissionOverwrites: [
                            {
                                id: ticketData.everyoneRol,
                                deny: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory
                                ]
                            },
                            {
                                id: interaction.member.id,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory
                                ]
                            }
                        ]
                    });

                    await ticketSupport.create({
                        guildId: interaction.guild.id,
                        membersId: interaction.member.id,
                        channelId: channel.id,
                        closed: true,
                        open: true,
                        openBy: interaction.user.id
                    });

                    const embed = new EmbedBuilder()
                        .setColor('#8A2BE2')
                        .setDescription(
                            `${interaction.guild.name} SOPORTE\nBienvenido <@${interaction.user.id}>`
                        )
                        .setTimestamp();

                    const button = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('closesupport')
                            .setLabel('Cerrar')
                            .setStyle(ButtonStyle.Secondary)
                    );

                    await channel.send({
                        embeds: [embed],
                        components: [button]
                    });

                    return correReply(interaction, "Ticket de soporte creado", true);
                }

                // ================== COMPRA ==================
                case 'compra': {

                    const compraData = await ticketCompras.findOne({
                        guildId: interaction.guild.id,
                        openBy: interaction.user.id,
                        open: true
                    });

                    if (compraData) {
                        return errReply(interaction, "Ya tienes un ticket abierto", true);
                    }

                    const channel = await interaction.guild.channels.create({
                        name: `${interaction.user.username}-ticket`,
                        type: ChannelType.GuildText,
                        parent: ticketData.categoryBuy,
                        permissionOverwrites: [
                            {
                                id: ticketData.everyoneRol,
                                deny: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory
                                ]
                            },
                            {
                                id: interaction.member.id,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory
                                ]
                            }
                        ]
                    });

                    await ticketCompras.create({
                        guildId: interaction.guild.id,
                        membersId: interaction.member.id,
                        channelId: channel.id,
                        closed: true,
                        open: true,
                        openBy: interaction.user.id
                    });

                    const embed = new EmbedBuilder()
                        .setColor('#8A2BE2')
                        .setDescription(
                            `${interaction.guild.name} COMPRAS\nBienvenido <@${interaction.user.id}>`
                        )
                        .setTimestamp();

                    const button = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('closecompras')
                            .setLabel('Cerrar')
                            .setStyle(ButtonStyle.Secondary)
                    );

                    await channel.send({
                        embeds: [embed],
                        components: [button]
                    });

                    return correReply(interaction, "Ticket de compra creado", true);
                }
            }

        } catch (error) {
            console.log(error);
        }
    }
};