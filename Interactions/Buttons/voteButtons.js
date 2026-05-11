const {
    EmbedBuilder
} = require("discord.js");

const suggestSchema =
    require("../../Models/suggestSchema");

const suggestMessageData =
    require("../../Models/suggestMessage");

module.exports = {

    id: [
        "votosi",
        "votono",
        "votolist"
    ],

    //////////////////////////////////////////////////

    async execute(interaction, client) {

        try {

            //////////////////////////////////////////////////
            // RESPONDER INMEDIATAMENTE
            //////////////////////////////////////////////////

            if (
                interaction.customId !==
                "votolist"
            ) {

                await interaction.deferUpdate();
            }

            //////////////////////////////////////////////////
            // DATA
            //////////////////////////////////////////////////

            const suggestData =
                await suggestSchema.findOne({

                    guildSuggest:
                        interaction.guild.id
                });

            //////////////////////////////////////////////////

            const suggestMessage =
                await suggestMessageData.findOne({

                    guildId:
                        interaction.guild.id,

                    messageId:
                        interaction.message.id
                });

            //////////////////////////////////////////////////

            if (
                !suggestMessage ||
                !suggestData
            ) return;

            //////////////////////////////////////////////////
            // LISTA DE VOTOS
            //////////////////////////////////////////////////

            if (
                interaction.customId ===
                "votolist"
            ) {

                const embedList =

                    new EmbedBuilder()

                        .setColor("#8A2BE2")

                        .setTitle(
                            "📊 Votos de la sugerencia"
                        )

                        .addFields(

                            {

                                name:
                                    "✅ Votos Positivos",

                                value:

                                    suggestMessage.votesSi.length >= 1

                                        ? suggestMessage.votesSi
                                            .map(user => `<@${user}>`)
                                            .join("\n")

                                        : "No hay votos",

                                inline: true
                            },

                            {

                                name:
                                    "❌ Votos Negativos",

                                value:

                                    suggestMessage.votesNo.length >= 1

                                        ? suggestMessage.votesNo
                                            .map(user => `<@${user}>`)
                                            .join("\n")

                                        : "No hay votos",

                                inline: true
                            }
                        );

                //////////////////////////////////////////////////

                return interaction.reply({

                    embeds: [embedList],

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // VOTO POSITIVO
            //////////////////////////////////////////////////

            if (
                interaction.customId ===
                "votosi"
            ) {

                //////////////////////////////////////////////////
                // YA VOTO
                //////////////////////////////////////////////////

                if (

                    suggestMessage.votesSi.includes(
                        interaction.user.id
                    )

                ) {

                    return;
                }

                //////////////////////////////////////////////////
                // REMOVER NO
                //////////////////////////////////////////////////

                suggestMessage.votesNo =

                    suggestMessage.votesNo.filter(

                        id =>
                            id !== interaction.user.id
                    );

                //////////////////////////////////////////////////
                // AGREGAR SI
                //////////////////////////////////////////////////

                suggestMessage.votesSi.push(
                    interaction.user.id
                );
            }

            //////////////////////////////////////////////////
            // VOTO NEGATIVO
            //////////////////////////////////////////////////

            if (
                interaction.customId ===
                "votono"
            ) {

                //////////////////////////////////////////////////
                // YA VOTO
                //////////////////////////////////////////////////

                if (

                    suggestMessage.votesNo.includes(
                        interaction.user.id
                    )

                ) {

                    return;
                }

                //////////////////////////////////////////////////
                // REMOVER SI
                //////////////////////////////////////////////////

                suggestMessage.votesSi =

                    suggestMessage.votesSi.filter(

                        id =>
                            id !== interaction.user.id
                    );

                //////////////////////////////////////////////////
                // AGREGAR NO
                //////////////////////////////////////////////////

                suggestMessage.votesNo.push(
                    interaction.user.id
                );
            }

            //////////////////////////////////////////////////
            // GUARDAR
            //////////////////////////////////////////////////

            await suggestMessage.save();

            //////////////////////////////////////////////////
            // EMBED ACTUAL
            //////////////////////////////////////////////////

            const embed =
                EmbedBuilder.from(
                    interaction.message.embeds[0]
                );

            //////////////////////////////////////////////////
            // ACTUALIZAR CONTADORES
            //////////////////////////////////////////////////

            embed.data.fields[1].value =
                `${suggestMessage.votesSi.length}`;

            //////////////////////////////////////////////////

            embed.data.fields[2].value =
                `${suggestMessage.votesNo.length}`;

            //////////////////////////////////////////////////
            // EDITAR MENSAJE
            //////////////////////////////////////////////////

            await interaction.message.edit({

                embeds: [embed]
            });

        } catch (error) {

            console.log(error);
        }
    }
};