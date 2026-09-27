const {
    EmbedBuilder
} = require("discord.js");

const {
    createTranscript
} = require("discord-html-transcripts");

const errReply =
    require("../../Functions/interactionErrorReply");

const ticketSchema =
    require("../../Models/ticketGuildSchema");

const ticketBuySchema =
    require("../../Models/ticketBuySchema");

const ticketSupportSchema =
    require("../../Models/ticketSupportSchema");

module.exports = {

    id: [
        "closecompras",
        "closesupport"
    ],

    //////////////////////////////////////////////////

    async execute(interaction, client) {

        try {

            //////////////////////////////////////////////////
            // DATA GUILD
            //////////////////////////////////////////////////

            const ticketData =

                await ticketSchema.findOne({

                    guildId:
                        interaction.guild.id
                });

            //////////////////////////////////////////////////

            if (!ticketData) {

                return errReply(

                    interaction,

                    "No se ha configurado el sistema de tickets.",

                    true
                );
            }

            //////////////////////////////////////////////////
            // PERMISOS
            //////////////////////////////////////////////////

            if (

                !interaction.member.roles.cache.has(
                    ticketData.handlerRol
                )

            ) {

                return errReply(

                    interaction,

                    "No tienes permisos para cerrar tickets.",

                    true
                );
            }

            //////////////////////////////////////////////////
            // CONFIGS
            //////////////////////////////////////////////////

            const configs = {

                closecompras: {

                    schema:
                        ticketBuySchema,

                    type:
                        "🛒 Ticket de Compra"
                },

                //////////////////////////////////////////////////

                closesupport: {

                    schema:
                        ticketSupportSchema,

                    type:
                        "🛠️ Ticket de Soporte"
                }
            };

            //////////////////////////////////////////////////
            // CONFIG ACTUAL
            //////////////////////////////////////////////////

            const current =

                configs[
                    interaction.customId
                ];

            //////////////////////////////////////////////////

            if (!current)
                return;

            //////////////////////////////////////////////////
            // DATA TICKET
            //////////////////////////////////////////////////

            const data =

                await current.schema.findOne({

                    guildId:
                        interaction.guild.id,

                    channelId:
                        interaction.channel.id
                });

            //////////////////////////////////////////////////

            if (!data) {

                return errReply(

                    interaction,

                    "Este ticket ya fue eliminado de la base de datos.",

                    true
                );
            }

            //////////////////////////////////////////////////
            // CANAL LOGS
            //////////////////////////////////////////////////

            const channelLogs =

                interaction.guild.channels.cache.get(

                    ticketData.channelLogs
                );

            //////////////////////////////////////////////////

            if (!channelLogs) {

                return errReply(

                    interaction,

                    "No se encontró el canal de logs.",

                    true
                );
            }

            //////////////////////////////////////////////////
            // EVITAR INTERACTION FAILED
            //////////////////////////////////////////////////

            await interaction.deferUpdate();

            //////////////////////////////////////////////////
            // TRANSCRIPT
            //////////////////////////////////////////////////

            const transcript =

                await createTranscript(

                    interaction.channel,

                    {

                        limit: -1,

                        filename:

                            `${interaction.channel.name}.html`
                    }
                );

            //////////////////////////////////////////////////
            // EMBED LOGS
            //////////////////////////////////////////////////

            const embed =

                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setTitle(
                        "📁 Ticket Cerrado"
                    )

                    .setDescription(

                        `Un ticket fue cerrado correctamente.\n\n` +

                        `📌 Tipo:\n> ${current.type}\n\n` +

                        `👮 Cerrado por:\n> ${interaction.user}\n\n` +

                        `📂 Canal:\n> ${interaction.channel.name}`
                    )

                    .setThumbnail(

                        interaction.guild.iconURL({

                            dynamic: true
                        })
                    )

                    .setTimestamp();

            //////////////////////////////////////////////////
            // ENVIAR LOG
            //////////////////////////////////////////////////

            await channelLogs.send({

                embeds: [embed],

                files: [transcript]
            });

            //////////////////////////////////////////////////
            // ELIMINAR DB
            //////////////////////////////////////////////////

            await current.schema.findOneAndDelete({

                guildId:
                    interaction.guild.id,

                channelId:
                    interaction.channel.id
            });

            //////////////////////////////////////////////////
            // BORRAR CANAL
            //////////////////////////////////////////////////

            await interaction.channel.delete();

        } catch (error) {

            console.log(error);
        }
    }
};