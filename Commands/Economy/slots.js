const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const EconomyUser =
    require("../../Models/EconomyUser");

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
        // SPIN
        //////////////////////////////////////////////////

        const roll = [

            slots[
                Math.floor(
                    Math.random() * slots.length
                )
            ],

            slots[
                Math.floor(
                    Math.random() * slots.length
                )
            ],

            slots[
                Math.floor(
                    Math.random() * slots.length
                )
            ]
        ];

        //////////////////////////////////////////////////
        // ANIMACION
        //////////////////////////////////////////////////

        await interaction.reply({

            embeds: [

                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setTitle(
                        "🎰 Bryant's Casino"
                    )

                    .setDescription(

                        `## 🎲 Girando tragamonedas...\n\n` +

                        `🎰 ❔ ❔ ❔`
                    )
            ]
        });

        //////////////////////////////////////////////////
        // DELAY
        //////////////////////////////////////////////////

        await new Promise(resolve =>

            setTimeout(resolve, 2500)
        );

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
            roll[0] === "👑" &&
            roll[1] === "👑" &&
            roll[2] === "👑"
        ) {

            multiplier = 10;

            resultText =
                "👑 JACKPOT x10";
        }

        //////////////////////////////////////////////////
        // TRIPLE
        //////////////////////////////////////////////////

        else if (

            roll[0] === roll[1] &&
            roll[1] === roll[2]
        ) {

            multiplier = 5;

            resultText =
                "💎 Triple combinación x5";
        }

        //////////////////////////////////////////////////
        // DOBLE
        //////////////////////////////////////////////////

        else if (

            roll[0] === roll[1] ||

            roll[1] === roll[2] ||

            roll[0] === roll[2]
        ) {

            multiplier = 2;

            resultText =
                "✨ Doble combinación x2";
        }

        //////////////////////////////////////////////////
        // CALCULAR
        //////////////////////////////////////////////////

        let winnings = 0;

        //////////////////////////////////////////////////

        if (multiplier > 0) {

            winnings =
                amount * multiplier;

            //////////////////////////////////////////////////

            userData.wallet += winnings;

            //////////////////////////////////////////////////

            userData.wallet -= amount;

        } else {

            //////////////////////////////////////////////////

            userData.wallet -= amount;
        }

        //////////////////////////////////////////////////
        // SAVE
        //////////////////////////////////////////////////

        await userData.save();

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

                    `# ${roll.join(" │ ")}\n\n` +

                    `${resultText}\n\n` +

                    (
                        multiplier > 0

                            ?

                            `💰 Ganaste **${winnings.toLocaleString()} monedas**`

                            :

                            `💸 Perdiste **${amount.toLocaleString()} monedas**`
                    )
                )

                .setThumbnail(

                    interaction.user.displayAvatarURL({

                        dynamic: true
                    })
                )

                .setImage(
                    "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png?ex=6a0032f4&is=69fee174&hm=54a509859dcee24cd6a637b9e0373e1821b6ab3898eccd77a59591b6e6d55e3a&=&format=webp&quality=lossless&width=1288&height=515"
                )

                .setFooter({

                    text:
                        "Bryant's Casino"
                })

                .setTimestamp();

        //////////////////////////////////////////////////

        await interaction.editReply({

            embeds: [embed]
        });
    }
};