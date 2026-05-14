const {
    EmbedBuilder
} = require("discord.js");

const getUser =
    require("../../utils/getUser");

module.exports = {

    id: [

    "dados_cancel",

    "dados_confirm_"
],

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // CANCELAR
        //////////////////////////////////////////////////

        if (
            interaction.customId ===
            "dados_cancel"
        ) {

            //////////////////////////////////////////////////

            return interaction.update({

                embeds: [

                    new EmbedBuilder()

                        .setColor("#ff0000")

                        .setTitle(
                            "❌ Apuesta cancelada"
                        )

                        .setDescription(

                            "La apuesta fue cancelada correctamente."
                        )
                ],

                components: []
            });
        }

        //////////////////////////////////////////////////
        // CONFIRMAR
        //////////////////////////////////////////////////

        if (

            interaction.customId.startsWith(
                "dados_confirm_"
            )

        ) {

            //////////////////////////////////////////////////
            // APUESTA
            //////////////////////////////////////////////////

            const bet =
                Number(

                    interaction.customId
                        .split("_")[2]
                );

            //////////////////////////////////////////////////
            // USER DATA
            //////////////////////////////////////////////////

            const userData =

                await getUser(

                    interaction.guild.id,
                    interaction.user.id
                );

            //////////////////////////////////////////////////
            // VALIDAR DINERO
            //////////////////////////////////////////////////

            if (
                userData.wallet < bet
            ) {

                return interaction.update({

                    embeds: [

                        new EmbedBuilder()

                            .setColor("#ff0000")

                            .setTitle(
                                "❌ Dinero insuficiente"
                            )

                            .setDescription(

                                "Ya no tienes suficiente dinero para esta apuesta."
                            )
                    ],

                    components: []
                });
            }

            //////////////////////////////////////////////////
            // DADOS
            //////////////////////////////////////////////////

            const userDice =
                Math.floor(Math.random() * 6) + 1;

            const botDice =
                Math.floor(Math.random() * 6) + 1;

            //////////////////////////////////////////////////
            // VARIABLES
            //////////////////////////////////////////////////

            let result =
                "";

            let color =
                "#8A2BE2";

            //////////////////////////////////////////////////
            // GANÓ
            //////////////////////////////////////////////////

            if (
                userDice > botDice
            ) {

                //////////////////////////////////////////////////

                const winnings =
                    bet * 2;

                //////////////////////////////////////////////////

                userData.wallet +=
                    winnings;

                //////////////////////////////////////////////////

                userData.wallet -=
                    bet;

                //////////////////////////////////////////////////

                userData.diceWins += 1;

                //////////////////////////////////////////////////

                result =

                    `✅ Ganaste ` +

                    `**${winnings.toLocaleString()} monedas**`;

                //////////////////////////////////////////////////

                color =
                    "#00ff99";
            }

            //////////////////////////////////////////////////
            // PERDIÓ
            //////////////////////////////////////////////////

            else if (
                botDice > userDice
            ) {

                //////////////////////////////////////////////////

                userData.wallet -=
                    bet;

                //////////////////////////////////////////////////

                userData.diceLosses += 1;

                //////////////////////////////////////////////////

                result =

                    `❌ Perdiste ` +

                    `**${bet.toLocaleString()} monedas**`;

                //////////////////////////////////////////////////

                color =
                    "#ff0000";
            }

            //////////////////////////////////////////////////
            // EMPATE
            //////////////////////////////////////////////////

            else {

                //////////////////////////////////////////////////

                result =
                    "🤝 Empate";

                //////////////////////////////////////////////////

                color =
                    "#ffaa00";
            }

            //////////////////////////////////////////////////
            // SAVE
            //////////////////////////////////////////////////

            await userData.save();

            //////////////////////////////////////////////////
            // EMBED
            //////////////////////////////////////////////////

            const embed =

                new EmbedBuilder()

                    .setColor(color)

                    .setTitle(
                        "🎲 Casino - Dados"
                    )

                    .setDescription(

                        `🎲 Tú sacaste:\n` +

                        `**${userDice}**\n\n` +

                        `🤖 El bot sacó:\n` +

                        `**${botDice}**\n\n` +

                        `${result}\n` +

                        `💵 Wallet actual: **${userData.wallet.toLocaleString()} monedas**`
                    )

                    //////////////////////////////////////////////////
                    // THUMBNAIL
                    //////////////////////////////////////////////////

                    .setThumbnail(

                        interaction.user.displayAvatarURL({

                            dynamic: true
                        })
                    )

                    //////////////////////////////////////////////////
                    // IMAGE
                    //////////////////////////////////////////////////

                    .setImage(
                        "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png"
                    )

                    //////////////////////////////////////////////////

                    .setFooter({

                        text:
                            interaction.guild.name
                    })

                    .setTimestamp();

            //////////////////////////////////////////////////

            return interaction.update({

                embeds: [embed],

                components: []
            });
        }
    }
};