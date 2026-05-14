const {
    EmbedBuilder
} = require("discord.js");

const Poll =
require("../Models/Poll");

const progressBar =
require("./progressBar");

module.exports = async (client) => {

    setInterval(async () => {

        try {

            //////////////////////////////////////////////////
            // BUSCAR POLLS VENCIDAS
            //////////////////////////////////////////////////

            const polls =
                await Poll.find({

                    ended: false,

                    endAt: {
                        $lte: new Date()
                    }

                });

            //////////////////////////////////////////////////

            if (!polls.length) return;

            //////////////////////////////////////////////////

            for (const poll of polls) {

                try {

                    //////////////////////////////////////////////////
                    // TERMINAR POLL
                    //////////////////////////////////////////////////

                    poll.ended = true;

                    await poll.save();

                    //////////////////////////////////////////////////
                    // GUILD
                    //////////////////////////////////////////////////

                    const guild =
                        client.guilds.cache.get(
                            poll.guildId
                        );

                    //////////////////////////////////////////////////

                    if (!guild) continue;

                    //////////////////////////////////////////////////
                    // CHANNEL
                    //////////////////////////////////////////////////

                    const channel =
                        guild.channels.cache.get(
                            poll.channelId
                        );

                    //////////////////////////////////////////////////

                    if (!channel) continue;

                    //////////////////////////////////////////////////
                    // MESSAGE
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

                                acc +
                                option.votes.length,

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

                    const embed =
                        new EmbedBuilder()

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

                } catch (err) {

                    console.log(
                        "Error terminando poll:",
                        err
                    );

                }

            }

        } catch (error) {

            console.log(error);

        }

    }, 10000);

};