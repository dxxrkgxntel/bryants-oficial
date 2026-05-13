const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const Birthday =
    require("../../Models/Birthday");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("birthday")

            .setDescription(
                "Sistema de cumpleaños"
            )

            //////////////////////////////////////////////////
            // SET
            //////////////////////////////////////////////////

            .addSubcommand(sub =>

                sub

                    .setName("set")

                    .setDescription(
                        "Registrar tu cumpleaños"
                    )

                    //////////////////////////////////////////////////
                    // DAY
                    //////////////////////////////////////////////////

                    .addIntegerOption(option =>

                        option

                            .setName("dia")

                            .setDescription(
                                "Día de cumpleaños"
                            )

                            .setRequired(true)

                            .setMinValue(1)

                            .setMaxValue(31)
                    )

                    //////////////////////////////////////////////////
                    // MONTH
                    //////////////////////////////////////////////////

                    .addIntegerOption(option =>

                        option

                            .setName("mes")

                            .setDescription(
                                "Mes de cumpleaños"
                            )

                            .setRequired(true)

                            .setMinValue(1)

                            .setMaxValue(12)
                    )
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // SUBCOMMAND
        //////////////////////////////////////////////////

        const subcommand =
            interaction.options.getSubcommand();

        //////////////////////////////////////////////////
        // SET
        //////////////////////////////////////////////////

        if (subcommand === "set") {

            //////////////////////////////////////////////////
            // OPTIONS
            //////////////////////////////////////////////////

            const day =
                interaction.options.getInteger(
                    "dia"
                );

            //////////////////////////////////////////////////

            const month =
                interaction.options.getInteger(
                    "mes"
                );

            //////////////////////////////////////////////////
            // VALIDAR FECHA
            //////////////////////////////////////////////////

            const testDate =
                new Date(

                    2025,
                    month - 1,
                    day
                );

            //////////////////////////////////////////////////

            if (

                testDate.getDate() !== day ||

                testDate.getMonth() !== month - 1

            ) {

                return interaction.reply({

                    content:
                        "❌ Fecha inválida.",

                    flags: 64
                });
            }

            //////////////////////////////////////////////////
            // BUSCAR EXISTENTE
            //////////////////////////////////////////////////

            let data =
                await Birthday.findOne({

                    guildId:
                        interaction.guild.id,

                    userId:
                        interaction.user.id
                });

            //////////////////////////////////////////////////
            // CREAR O EDITAR
            //////////////////////////////////////////////////

            if (!data) {

                data =
                    new Birthday({

                        guildId:
                            interaction.guild.id,

                        userId:
                            interaction.user.id,

                        day,

                        month
                    });

            } else {

                data.day =
                    day;

                data.month =
                    month;
            }

            //////////////////////////////////////////////////
            // SAVE
            //////////////////////////////////////////////////

            await data.save();

            //////////////////////////////////////////////////
            // EMBED
            //////////////////////////////////////////////////

            const embed =

                new EmbedBuilder()

                    .setColor("#8A2BE2")

                    .setTitle(
                        "🎂 Cumpleaños registrado"
                    )

                    .setDescription(

                        `🎉 Tu cumpleaños fue guardado correctamente.\n\n` +

                        `📅 Fecha: **${day}/${month}**`
                    )

                    .setThumbnail(

                        interaction.user.displayAvatarURL({

                            dynamic: true
                        })
                    )

                    .setFooter({

                        text:
                            interaction.guild.name
                    })

                    .setTimestamp();

            //////////////////////////////////////////////////

            return interaction.reply({

                embeds: [embed]
            });
        }
    }
};