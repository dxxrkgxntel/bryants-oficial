const {
    SlashCommandBuilder,
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
// EMOJIS
//////////////////////////////////////////////////

const slots = [

    "🍒",
    "🍋",
    "🍉",
    "💎",
    "👑",
    "⭐"
];

//////////////////////////////////////////////////

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("slots")

            .setDescription(
                "Juega a las tragamonedas"
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
        // USER
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
        // CASINO STATS
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
                await CasinoStats.create({

                    guildId:
                        interaction.guild.id,

                    userId:
                        interaction.user.id
                });
        }

        //////////////////////////////////////////////////
        // DINERO
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
        // CONFIRM EMBED
        //////////////////////////////////////////////////

        const confirmEmbed =

            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "🎰 Confirmar apuesta"
                )

                .setDescription(

                    `💸 Vas a apostar:\n` +
                    `> **${amount.toLocaleString()} monedas**\n\n` +

                    `👛 Tu wallet actual es:\n` +
                    `> **${userData.wallet.toLocaleString()} monedas**\n\n` +

                    `❓ ¿Deseas girar las tragamonedas?`
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
                            "slots_confirm"
                        )

                        .setLabel(
                            "Confirmar"
                        )

                        .setEmoji("✅")

                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()

                        .setCustomId(
                            "slots_cancel"
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

        await interaction.reply({

            embeds: [confirmEmbed],

            components: [row]
        });

        //////////////////////////////////////////////////
        // MESSAGE
        //////////////////////////////////////////////////

        const message =
            await interaction.fetchReply();

        //////////////////////////////////////////////////
        // BUTTON RESPONSE
        //////////////////////////////////////////////////

        const response =

            await message.awaitMessageComponent({

                filter: i =>

                    i.user.id === interaction.user.id,

                time: 30000
            }).catch(() => null);

        //////////////////////////////////////////////////
        // TIMEOUT
        //////////////////////////////////////////////////

        if (!response) {

            return interaction.editReply({

                content:
                    "⌛ La apuesta expiró.",

                embeds: [],

                components: []
            });
        }

        //////////////////////////////////////////////////
        // CANCEL
        //////////////////////////////////////////////////

        if (

            response.customId ===
            "slots_cancel"

        ) {

            return response.update({

                content:
                    "❌ Apuesta cancelada.",

                embeds: [],

                components: []
            });
        }

        //////////////////////////////////////////////////
        // DEFER BUTTON
        //////////////////////////////////////////////////

        await response.deferUpdate();

        //////////////////////////////////////////////////
        // GRID 3x3
        //////////////////////////////////////////////////

        const grid = [];

        for (let row = 0; row < 3; row++) {

            const currentRow = [];

            for (let col = 0; col < 3; col++) {

                currentRow.push(

                    slots[
                        Math.floor(
                            Math.random() * slots.length
                        )
                    ]
                );
            }

            grid.push(currentRow);
        }

        //////////////////////////////////////////////////
        // DISPLAY
        //////////////////////////////////////////////////

        const generateDisplay = (data) => {

            return data.map((row, index) => {

                if (index === 1) {

                    return `${row.join(" │ ")} <`;
                }

                return `${row.join(" │ ")}`;

            }).join("\n");
        };

        //////////////////////////////////////////////////
        // ANIMACION
        //////////////////////////////////////////////////

        await interaction.editReply({

            embeds: [

                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setTitle(
                        "🎰 Bryant's Casino"
                    )

                    .setDescription(

                        `## 🎲 Girando tragamonedas...\n\n` +

                        `❔ │ ❔ │ ❔\n` +
                        `❔ │ ❔ │ ❔ <\n` +
                        `❔ │ ❔ │ ❔`
                    )
            ],

            components: []
        });

        //////////////////////////////////////////////////
        // DELAY
        //////////////////////////////////////////////////

        await new Promise(resolve =>

            setTimeout(resolve, 2500)
        );

        //////////////////////////////////////////////////
        // LINEA VALIDA
        //////////////////////////////////////////////////

        const middleLine = grid[1];

        //////////////////////////////////////////////////
        // RESULTADO
        //////////////////////////////////////////////////

        let multiplier = 0;

        let resultText =
            "💸 Has perdido.";

        //////////////////////////////////////////////////
        // JACKPOT
        //////////////////////////////////////////////////

        if (

            middleLine[0] === "👑" &&
            middleLine[1] === "👑" &&
            middleLine[2] === "👑"

        ) {

            multiplier = 15;

            resultText =
                "👑 JACKPOT x15";

            stats.jackpots += 1;
        }

        //////////////////////////////////////////////////
        // TRIPLE
        //////////////////////////////////////////////////

        else if (

            middleLine[0] === middleLine[1] &&
            middleLine[1] === middleLine[2]

        ) {

            multiplier = 5;

            resultText =
                "💎 Triple combinación x5";
        }

        //////////////////////////////////////////////////
        // DOBLE
        //////////////////////////////////////////////////

        else if (

            middleLine[0] === middleLine[1] ||

            middleLine[1] === middleLine[2] ||

            middleLine[0] === middleLine[2]

        ) {

            multiplier = 2;

            resultText =
                "✨ Doble combinación x2";
        }

        //////////////////////////////////////////////////
        // CALCULAR
        //////////////////////////////////////////////////

        let winnings = 0;

        if (multiplier > 0) {

            winnings =
                amount * multiplier;

            const profit =
                winnings - amount;

            userData.wallet +=
                profit;

            //////////////////////////////////////////////////
            // STATS
            //////////////////////////////////////////////////

            stats.totalGames += 1;

            stats.totalWins += 1;

            stats.moneyWon += winnings;

            stats.currentStreak += 1;

            stats.slotsWins += 1;

            //////////////////////////////////////////////////

            if (winnings > stats.biggestWin) {

                stats.biggestWin =
                    winnings;
            }

        } else {

            userData.wallet -=
                amount;

            //////////////////////////////////////////////////
            // STATS
            //////////////////////////////////////////////////

            stats.totalGames += 1;

            stats.totalLosses += 1;

            stats.moneyLost += amount;

            stats.currentStreak = 0;
        }

        //////////////////////////////////////////////////
        // SAVE
        //////////////////////////////////////////////////

        await userData.save();

        await stats.save();

        //////////////////////////////////////////////////
        // EMBED FINAL
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor(

                    multiplier > 0

                        ?

                        "#00ff99"

                        :

                        "#ff0000"
                )

                .setTitle(
                    "🎰 Bryant's Casino"
                )

                .setDescription(

                    `## 🎰 Resultado\n\n` +

                    `${generateDisplay(grid)}\n\n` +

                    `🎯 Línea válida: **Fila central**\n\n` +

                    `${resultText}\n\n` +

                    (

                        multiplier > 0

                            ?

                            `💰 Ganaste **${winnings.toLocaleString()} monedas**`

                            :

                            `💸 Perdiste **${amount.toLocaleString()} monedas**`
                    ) +

                    `\n\n👛 Balance actual: **${userData.wallet.toLocaleString()} monedas**`
                )

                .setThumbnail(

                    interaction.user.displayAvatarURL({

                        dynamic: true
                    })
                )

                .setImage(
                    "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png"
                )

                .setFooter({

                    text:
                        "Bryant's Casino"
                })

                .setTimestamp();

        //////////////////////////////////////////////////

        await interaction.editReply({

            embeds: [embed],

            components: []
        });
    }
};