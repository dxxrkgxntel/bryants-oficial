const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require("discord.js");

const Poll =
require("../../Models/Poll");

const progressBar =
require("../../Functions/progressBar");

module.exports = {

    data: new SlashCommandBuilder()

        .setName("terminar-encuesta")

        .setDescription("Termina una encuesta.")

        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageMessages
        )

        .addStringOption(option =>

            option

                .setName("message_id")

                .setDescription(
                    "ID del mensaje de la encuesta"
                )

                .setRequired(true)

        ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        try {

            //////////////////////////////////////////////////
            // MESSAGE ID
            //////////////////////////////////////////////////

            const messageId =
                interaction.options.getString(
                    "message_id"
                );

            //////////////////////////////////////////////////
            // BUSCAR POLL
            //////////////////////////////////////////////////

            const poll =
                await Poll.findOne({

                    guildId:
                        interaction.guild.id,

                    messageId

                });

            //////////////////////////////////////////////////

            if (!poll) {

                return interaction.reply({

                    content:
                        "❌ Encuesta no encontrada.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////
            // YA TERMINÓ
            //////////////////////////////////////////////////

            if (poll.ended) {

                return interaction.reply({

                    content:
                        "❌ Esta encuesta ya terminó.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////
            // TERMINAR POLL
            //////////////////////////////////////////////////

            poll.ended = true;

            await poll.save();

            //////////////////////////////////////////////////
            // BUSCAR CANAL
            //////////////////////////////////////////////////

            const channel =
                interaction.guild.channels.cache.get(
                    poll.channelId
                );

            //////////////////////////////////////////////////

            if (!channel) {

                return interaction.reply({

                    content:
                        "❌ Canal no encontrado.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////
            // FETCH MENSAJE
            //////////////////////////////////////////////////

            const message =
                await channel.messages.fetch(
                    poll.messageId
                );

            //////////////////////////////////////////////////
            // TOTAL VOTOS
            //////////////////////////////////////////////////

            const totalVotes =
                poll.options.reduce(

                    (acc, option) =>

                        acc + option.votes.length,

                    0

                );

            //////////////////////////////////////////////////
            // GANADOR
            //////////////////////////////////////////////////

            const winner =
                poll.options.reduce(

                    (prev, current) =>

                        current.votes.length >
                        prev.votes.length

                            ? current

                            : prev

                );

            //////////////////////////////////////////////////
            // MAYOR CANTIDAD DE VOTOS
            //////////////////////////////////////////////////

            const highestVotes =
                Math.max(

                    ...poll.options.map(
                        o => o.votes.length
                    )

                );

            //////////////////////////////////////////////////
            // EMBED FINAL
            //////////////////////////////////////////////////

            const embed = new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "📊 Encuesta Terminada"
                )

                .setDescription(

                    `## ${poll.question}\n\n` +

                    poll.options.map((option, index) => {

                        //////////////////////////////////////////////////
                        // PORCENTAJE
                        //////////////////////////////////////////////////

                        const percentage =

                            totalVotes > 0

                                ? Math.round(
                                    (option.votes.length / totalVotes) * 100
                                )

                                : 0;

                        //////////////////////////////////////////////////
                        // BARRA
                        //////////////////////////////////////////////////

                        const bar =
                            progressBar(

                                option.votes.length,

                                totalVotes,

                                10

                            );

                        //////////////////////////////////////////////////
                        // WINNER
                        //////////////////////////////////////////////////

                        const isWinner =

                            option.votes.length === highestVotes

                            &&

                            highestVotes > 0;

                        //////////////////////////////////////////////////

                        return `

${isWinner ? "🏆" : ""}
${index + 1}️⃣ ${option.text}

${bar} ${percentage}%
👥 ${option.votes.length} votos

`;

                    }).join("\n")

                )

                .addFields({

                    name: "🏆 Ganador",

                    value:
`${winner.text} (${winner.votes.length} votos)`

                })

                .setFooter({

                    text:
                    `Total de votos: ${totalVotes}`

                });

            //////////////////////////////////////////////////
            // DESACTIVAR BOTONES
            //////////////////////////////////////////////////

            const rows =
                message.components.map(row => {

                    row.components.forEach(button => {

                        button.data.disabled = true;

                    });

                    return row;

                });

            //////////////////////////////////////////////////
            // EDITAR MENSAJE
            //////////////////////////////////////////////////

            await message.edit({

                embeds: [embed],

                components: rows

            });

            //////////////////////////////////////////////////
            // RESPUESTA
            //////////////////////////////////////////////////

            await interaction.reply({

                content:
                    "✅ Encuesta terminada correctamente.",

                flags: 64

            });

        } catch (error) {

            console.log(error);

        }
    }
};