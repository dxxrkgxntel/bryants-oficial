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
// NUMEROS
//////////////////////////////////////////////////

const redNumbers = [

    1,3,5,7,9,
    12,14,16,18,
    19,21,23,25,
    27,30,32,34,36
];

//////////////////////////////////////////////////

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("ruleta")

            .setDescription(
                "Apuesta en la ruleta"
            )

            //////////////////////////////////////////////////
            // TIPO
            //////////////////////////////////////////////////

            .addStringOption(option =>

                option

                    .setName("tipo")

                    .setDescription(
                        "Tipo de apuesta"
                    )

                    .setRequired(true)

                    .addChoices(

                        {
                            name: "Color",
                            value: "color"
                        },

                        {
                            name: "Número",
                            value: "numero"
                        }
                    )
            )

            //////////////////////////////////////////////////
            // APUESTA
            //////////////////////////////////////////////////

            .addStringOption(option =>

                option

                    .setName("apuesta")

                    .setDescription(
                        "rojo, negro, verde o número"
                    )

                    .setRequired(true)
            )

            //////////////////////////////////////////////////
            // CANTIDAD
            //////////////////////////////////////////////////

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
        // OPTIONS
        //////////////////////////////////////////////////

        const type =
            interaction.options.getString(
                "tipo"
            );

        //////////////////////////////////////////////////

        const bet =
            interaction.options
                .getString("apuesta")
                .toLowerCase();

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
        // CONFIRM EMBED
        //////////////////////////////////////////////////

        const confirmEmbed =

            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "🎡 Confirmar apuesta"
                )

                .setDescription(

                    `🎲 Tipo: **${type}**\n` +

                    `📌 Apuesta: **${bet}**\n` +

                    `💰 Cantidad: **${amount.toLocaleString()} monedas**\n\n` +

                    `👛 Wallet actual: **${userData.wallet.toLocaleString()} monedas**\n\n` +

                    `❓ ¿Deseas continuar?`
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
                            "roulette_confirm"
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
                            "roulette_cancel"
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
            "roulette_cancel"

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
        // GIRANDO RULETA
        //////////////////////////////////////////////////

        await interaction.editReply({

            embeds: [

                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setTitle(
                        "🎡 Bryant's Roulette"
                    )

                    .setDescription(

                        `🎲 Girando la ruleta...\n\n` +

                        `💰 Apostando **${amount.toLocaleString()} monedas**`
                    )
            ],

            components: []
        });

        //////////////////////////////////////////////////
        // DELAY
        //////////////////////////////////////////////////

        await new Promise(resolve =>

            setTimeout(resolve, 3000)
        );

        //////////////////////////////////////////////////
        // RANDOM NUMBER
        //////////////////////////////////////////////////

        const rolledNumber =

            Math.floor(
                Math.random() * 37
            );

        //////////////////////////////////////////////////
        // COLOR
        //////////////////////////////////////////////////

        let rolledColor = "negro";

        //////////////////////////////////////////////////

        if (rolledNumber === 0) {

            rolledColor = "verde";

        } else if (

            redNumbers.includes(
                rolledNumber
            )

        ) {

            rolledColor = "rojo";
        }

        //////////////////////////////////////////////////
        // WIN
        //////////////////////////////////////////////////

        let won = false;

        let multiplier = 0;

        //////////////////////////////////////////////////
        // APUESTA COLOR
        //////////////////////////////////////////////////

        if (type === "color") {

            if (bet === rolledColor) {

                won = true;

                //////////////////////////////////////////////////

                if (bet === "verde") {

                    multiplier = 14;

                } else {

                    multiplier = 2;
                }
            }
        }

        //////////////////////////////////////////////////
        // APUESTA NUMERO
        //////////////////////////////////////////////////

        if (type === "numero") {

            if (
                parseInt(bet) === rolledNumber
            ) {

                won = true;

                multiplier = 35;
            }
        }

        //////////////////////////////////////////////////
        // CALCULAR
        //////////////////////////////////////////////////

        let winnings = 0;

        //////////////////////////////////////////////////

        if (won) {

            winnings =
                amount * multiplier;

            //////////////////////////////////////////////////

            const profit =
                winnings - amount;

            //////////////////////////////////////////////////

            userData.wallet += profit;

        } else {

            //////////////////////////////////////////////////

            userData.wallet -= amount;
        }

        //////////////////////////////////////////////////
        // SAVE
        //////////////////////////////////////////////////

        await userData.save();

        //////////////////////////////////////////////////
        // RESULTADO
        //////////////////////////////////////////////////

        const colorEmoji =

            rolledColor === "rojo"

                ?

                "🔴"

                :

                rolledColor === "negro"

                    ?

                    "⚫"

                    :

                    "🟢";

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor(

                    won

                        ?

                        "#00ff99"

                        :

                        "#ff0000"
                )

                .setTitle(
                    "🎡 Bryant's Casino"
                )

                .setDescription(

                    `# ${colorEmoji} ${rolledColor.toUpperCase()} ${rolledNumber}\n\n` +

                    (

                        won

                            ?

                            `🎉 Ganaste **${winnings.toLocaleString()} monedas**`

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

            embeds: [embed]
        });
    }
};