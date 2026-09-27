const {
    EmbedBuilder
} = require("discord.js");

const Poll =
require("../../Models/Poll");

const progressBar =
require("../../Functions/progressBar");

module.exports = {

    id: [
        "poll_0",
        "poll_1",
        "poll_2",
        "poll_3"
    ],

    //////////////////////////////////////////////////

    async execute(interaction, client) {

        try {

            //////////////////////////////////////////////////
            // EVITAR INTERACTION FAILED
            //////////////////////////////////////////////////

            await interaction.deferUpdate();

            //////////////////////////////////////////////////
            // OBTENER ID OPCIÓN
            //////////////////////////////////////////////////

            const optionId =
                interaction.customId.split("_")[1];

            //////////////////////////////////////////////////
            // BUSCAR POLL
            //////////////////////////////////////////////////

            const poll =
                await Poll.findOne({

                    messageId:
                        interaction.message.id

                });

            //////////////////////////////////////////////////

            if (!poll) return;

            //////////////////////////////////////////////////
            // POLL TERMINADA
            //////////////////////////////////////////////////

            if (poll.ended) {

                return interaction.followUp({

                    content:
                        "❌ Esta encuesta ya terminó.",

                    flags: 64

                });

            }

            //////////////////////////////////////////////////
            // REMOVER VOTOS ANTERIORES
            //////////////////////////////////////////////////

            for (const option of poll.options) {

                option.votes =
                    option.votes.filter(

                        id =>
                            id !== interaction.user.id

                    );

            }

            //////////////////////////////////////////////////
            // OPCIÓN SELECCIONADA
            //////////////////////////////////////////////////

            const selectedOption =
                poll.options.find(

                    option =>
                        option.id === optionId

                );

            //////////////////////////////////////////////////

            if (!selectedOption) return;

            //////////////////////////////////////////////////
            // AGREGAR VOTO
            //////////////////////////////////////////////////

            selectedOption.votes.push(
                interaction.user.id
            );

            //////////////////////////////////////////////////
            // GUARDAR
            //////////////////////////////////////////////////

            await poll.save();

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
            // OPCIÓN GANADORA
            //////////////////////////////////////////////////

            const highestVotes =
                Math.max(

                    ...poll.options.map(
                        o => o.votes.length
                    )

                );

            //////////////////////////////////////////////////
            // TIEMPO RESTANTE
            //////////////////////////////////////////////////

            const remainingMinutes =
                poll.endAt

                    ? Math.max(

                        0,

                        Math.ceil(
                            (poll.endAt - Date.now())
                            / 60000
                        )

                    )

                    : 0;

            //////////////////////////////////////////////////
            // EMBED
            //////////////////////////////////////////////////

            const embed = new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle("📊 Encuesta")

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

                        const winner =

                            option.votes.length === highestVotes

                            &&

                            highestVotes > 0;

                        //////////////////////////////////////////////////

                        return `

${winner ? "🏆" : ""}
${index + 1}️⃣ ${option.text}

${bar} ${percentage}%
👥 ${option.votes.length} votos

`;

                    }).join("\n")

                )

                .setFooter({

                    text:
                    `Termina en ${remainingMinutes} minutos`

                });

            //////////////////////////////////////////////////
            // ACTUALIZAR MENSAJE
            //////////////////////////////////////////////////

            await interaction.message.edit({

                embeds: [embed]

            });

        } catch (error) {

            console.log(error);

        }
    }
};