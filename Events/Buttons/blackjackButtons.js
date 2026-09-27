const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const EconomyUser =
    require("../../Models/EconomyUser");

const CasinoStats =
    require("../../Models/CasinoStats");

//////////////////////////////////////////////////
// CARTAS
//////////////////////////////////////////////////

const cards = [

    "A","2","3","4","5",
    "6","7","8","9","10",
    "J","Q","K"
];

//////////////////////////////////////////////////
// SACAR CARTA
//////////////////////////////////////////////////

function drawCard() {

    return cards[
        Math.floor(
            Math.random() * cards.length
        )
    ];
}

//////////////////////////////////////////////////
// CALCULAR MANO
//////////////////////////////////////////////////

function calculateHand(hand) {

    let total = 0;

    let aces = 0;

    //////////////////////////////////////////////////

    for (const card of hand) {

        if (

            ["J","Q","K"].includes(card)

        ) {

            total += 10;

        }

        else if (card === "A") {

            total += 11;

            aces++;
        }

        else {

            total += parseInt(card);
        }
    }

    //////////////////////////////////////////////////

    while (

        total > 21 &&
        aces > 0

    ) {

        total -= 10;

        aces--;
    }

    //////////////////////////////////////////////////

    return total;
}

//////////////////////////////////////////////////

module.exports = {

    name: "interactionCreate",

    async execute(interaction) {

        //////////////////////////////////////////////////
        // BUTTON
        //////////////////////////////////////////////////

        if (
            !interaction.isButton()
        ) return;

        //////////////////////////////////////////////////
        // BLACKJACK
        //////////////////////////////////////////////////

        if (

            !interaction.customId.startsWith(
                "blackjack_"
            )

        ) return;

        //////////////////////////////////////////////////
        // SPLIT
        //////////////////////////////////////////////////

        const parts =
            interaction.customId.split("_");

        //////////////////////////////////////////////////

        const action =
            parts[1];

        const userId =
            parts[2];

        const amount =
            parseInt(parts[3]);

        //////////////////////////////////////////////////
        // HANDS
        //////////////////////////////////////////////////

        let playerHand =
            parts[4].split("-");

        let dealerHand =
            parts[5].split("-");

        //////////////////////////////////////////////////
        // USER CHECK
        //////////////////////////////////////////////////

        if (

            interaction.user.id !== userId

        ) {

            return interaction.reply({

                content:
                    "❌ Esta partida no es tuya.",

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

        if (!userData) return;

        //////////////////////////////////////////////////
        // STATS
        //////////////////////////////////////////////////

        let stats =
            await CasinoStats.findOne({

                guildId:
                    interaction.guild.id,

                userId:
                    interaction.user.id
            });

        //////////////////////////////////////////////////

        if (!stats) {

            stats =
                new CasinoStats({

                    guildId:
                        interaction.guild.id,

                    userId:
                        interaction.user.id
                });
        }

        //////////////////////////////////////////////////
        // PEDIR
        //////////////////////////////////////////////////

        if (action === "hit") {

            //////////////////////////////////////////////////
            // NUEVA CARTA
            //////////////////////////////////////////////////

            playerHand.push(
                drawCard()
            );

            //////////////////////////////////////////////////
            // TOTAL
            //////////////////////////////////////////////////

            const total =
                calculateHand(
                    playerHand
                );

            //////////////////////////////////////////////////
            // BUST
            //////////////////////////////////////////////////

            if (total > 21) {

                //////////////////////////////////////////////////
                // PERDER
                //////////////////////////////////////////////////

                userData.wallet -= amount;

                //////////////////////////////////////////////////
                // STATS
                //////////////////////////////////////////////////

                stats.totalGames += 1;

                stats.totalLosses += 1;

                stats.moneyLost += amount;

                stats.currentStreak = 0;

                //////////////////////////////////////////////////

                await userData.save();

                await stats.save();

                //////////////////////////////////////////////////

                return interaction.update({

                    embeds: [

                        new EmbedBuilder()

                            .setColor("#ff0000")

                            .setTitle(
                                "🃏 Blackjack"
                            )

                            .setDescription(

                                `## ❌ Te pasaste\n\n` +

                                `🎴 Dealer\n\n` +

                                `${dealerHand.join("  ")}\n\n` +

                                `💯 Total: **${calculateHand(dealerHand)}**\n\n` +

                                `## 👤 ${interaction.user.username}\n\n` +

                                `${playerHand.join("  ")}\n\n` +

                                `💯 Total: **${total}**\n\n` +

                                `💸 Perdiste **${amount.toLocaleString()} monedas**`
                            )

                    ],

                    components: []
                });
            }

            //////////////////////////////////////////////////
            // CONTINUAR
            //////////////////////////////////////////////////

            const row =

                new ActionRowBuilder()

                    .addComponents(

                        new ButtonBuilder()

                            .setCustomId(

                                `blackjack_hit_${interaction.user.id}_${amount}_${playerHand.join("-")}_${dealerHand.join("-")}`

                            )

                            .setLabel(
                                "Pedir"
                            )

                            .setEmoji("➕")

                            .setStyle(
                                ButtonStyle.Secondary
                            ),

                        new ButtonBuilder()

                            .setCustomId(

                                `blackjack_stand_${interaction.user.id}_${amount}_${playerHand.join("-")}_${dealerHand.join("-")}`

                            )

                            .setLabel(
                                "Plantarse"
                            )

                            .setEmoji("🛑")

                            .setStyle(
                                ButtonStyle.Secondary
                            )
                    );

            //////////////////////////////////////////////////

            return interaction.update({

                embeds: [

                    new EmbedBuilder()

                        .setColor("#8A2BE2")

                        .setTitle(
                            "🃏 Blackjack"
                        )

                        .setDescription(

                            `## 🎴 Dealer\n\n` +

                            `❓ ${dealerHand[1]}\n\n` +

                            `## 👤 ${interaction.user.username}\n\n` +

                            `${playerHand.join("  ")}\n\n` +

                            `💯 Total: **${total}**\n\n` +

                            `💰 Apuesta: **${amount.toLocaleString()} monedas**`
                        )
                ],

                components: [row]
            });
        }

        //////////////////////////////////////////////////
        // PLANTARSE
        //////////////////////////////////////////////////

        if (action === "stand") {

            //////////////////////////////////////////////////
            // DEALER IA
            //////////////////////////////////////////////////

            while (

                calculateHand(dealerHand) < 17

            ) {

                dealerHand.push(
                    drawCard()
                );
            }

            //////////////////////////////////////////////////
            // TOTALS
            //////////////////////////////////////////////////

            const playerTotal =
                calculateHand(playerHand);

            const dealerTotal =
                calculateHand(dealerHand);

            //////////////////////////////////////////////////
            // RESULT
            //////////////////////////////////////////////////

            let result =
                "";

            let color =
                "#8A2BE2";

            //////////////////////////////////////////////////
            // EMPATE
            //////////////////////////////////////////////////

            if (
                playerTotal === dealerTotal
            ) {

                result =
                    "🤝 Empate";

                stats.totalGames += 1;
            }

            //////////////////////////////////////////////////
            // GANAR
            //////////////////////////////////////////////////

            else if (

                dealerTotal > 21 ||

                playerTotal > dealerTotal

            ) {

                const winnings =
                    amount * 2;

                //////////////////////////////////////////////////

                userData.wallet += amount;

                //////////////////////////////////////////////////

                stats.totalGames += 1;

                stats.totalWins += 1;

                stats.moneyWon += winnings;

                stats.currentStreak += 1;

                stats.blackjackWins += 1;

                //////////////////////////////////////////////////

                if (

                    winnings >

                    stats.biggestWin

                ) {

                    stats.biggestWin =
                        winnings;
                }

                //////////////////////////////////////////////////

                result =

                    `🎉 Ganaste **${winnings.toLocaleString()} monedas**`;

                color =
                    "#00ff99";
            }

            //////////////////////////////////////////////////
            // PERDER
            //////////////////////////////////////////////////

            else {

                userData.wallet -= amount;

                //////////////////////////////////////////////////

                stats.totalGames += 1;

                stats.totalLosses += 1;

                stats.moneyLost += amount;

                stats.currentStreak = 0;

                //////////////////////////////////////////////////

                result =

                    `💸 Perdiste **${amount.toLocaleString()} monedas**`;

                color =
                    "#ff0000";
            }

            //////////////////////////////////////////////////

            await userData.save();

            await stats.save();

            //////////////////////////////////////////////////

            return interaction.update({

                embeds: [

                    new EmbedBuilder()

                        .setColor(color)

                        .setTitle(
                            "🃏 Blackjack"
                        )

                        .setDescription(

                            `## 🎴 Dealer\n\n` +

                            `${dealerHand.join("  ")}\n\n` +

                            `💯 Total: **${dealerTotal}**\n\n` +

                            `## 👤 ${interaction.user.username}\n\n` +

                            `${playerHand.join("  ")}\n\n` +

                            `💯 Total: **${playerTotal}**\n\n` +

                            `${result}\n\n` +

                            `👛 Balance: **${userData.wallet.toLocaleString()} monedas**`
                        )
                ],

                components: []
            });
        }
    }
};