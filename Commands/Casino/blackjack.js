const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const EconomyUser =
    require("../../Models/EconomyUser");

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
// CALCULAR VALOR
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

        } else if (card === "A") {

            total += 11;

            aces++;

        } else {

            total += parseInt(card);
        }
    }

    //////////////////////////////////////////////////
    // AJUSTAR ASES
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

    data:
        new SlashCommandBuilder()

            .setName("blackjack")

            .setDescription(
                "Juega Blackjack"
            )

            .addIntegerOption(option =>

                option

                    .setName("cantidad")

                    .setDescription(
                        "Cantidad a apostar"
                    )

                    .setRequired(true)

                    .setMinValue(1)
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // AMOUNT
        //////////////////////////////////////////////////

        const amount =
            interaction.options.getInteger(
                "cantidad"
            );

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
        // MONEY
        //////////////////////////////////////////////////

        if (
            userData.wallet < amount
        ) {

            return interaction.reply({

                content:
                    "❌ No tienes suficiente dinero.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // PLAYER
        //////////////////////////////////////////////////

        const playerHand = [

            drawCard(),
            drawCard()
        ];

        //////////////////////////////////////////////////
        // DEALER
        //////////////////////////////////////////////////

        const dealerHand = [

            drawCard(),
            drawCard()
        ];

        //////////////////////////////////////////////////
        // TOTAL
        //////////////////////////////////////////////////

        const playerTotal =
            calculateHand(playerHand);

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

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

                    `💯 Total: **${playerTotal}**\n\n` +

                    `💰 Apuesta: **${amount.toLocaleString()} monedas**`
                )

                .setThumbnail(

                    interaction.user.displayAvatarURL({

                        dynamic: true
                    })
                )

                .setFooter({

                    text:
                        "Bryant's Casino"
                })

                .setTimestamp();

        //////////////////////////////////////////////////
        // BUTTONS
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

        await interaction.reply({

            embeds: [embed],

            components: [row]
        });
    }
};