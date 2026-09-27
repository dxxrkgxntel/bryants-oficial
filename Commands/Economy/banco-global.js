const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const GlobalBank =
    require("../../Models/GlobalBank");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("banco-global")

            .setDescription(
                "Muestra el banco global del servidor"
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // GLOBAL BANK
        //////////////////////////////////////////////////

        let globalBank =

            await GlobalBank.findOne({

                guildId:
                    interaction.guild.id
            });

        //////////////////////////////////////////////////
        // CREAR SI NO EXISTE
        //////////////////////////////////////////////////

        if (!globalBank) {

            globalBank =
                new GlobalBank({

                    guildId:
                        interaction.guild.id
                });

            await globalBank.save();
        }

        //////////////////////////////////////////////////
        // FORMATOS
        //////////////////////////////////////////////////

        const balance =

            globalBank.balance
                .toLocaleString();

        //////////////////////////////////////////////////

        const collected =

            globalBank.totalCollected
                .toLocaleString();

        //////////////////////////////////////////////////

        const distributed =

            globalBank.totalDistributed
                .toLocaleString();

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#FFD700")

                .setTitle(
                    "🏦 Banco Global del Servidor"
                )

                .setDescription(

                    `💰 Aquí se almacena el dinero recolectado mediante intereses, comisiones y futuros sistemas económicos del servidor.\n\n` +

                    `🏦 **Balance actual**\n` +

                    `> ${balance} monedas\n\n` +

                    `📈 **Total recolectado**\n` +

                    `> ${collected} monedas\n\n` +

                    `📉 **Total distribuido**\n` +

                    `> ${distributed} monedas`
                )

                .addFields({

                    name: "🌍 Servidor",
                    value: `${interaction.guild.name}`,
                    inline: true

                }, {

                    name: "👥 Miembros",
                    value: `${interaction.guild.memberCount}`,
                    inline: true
                })

                .setThumbnail(

                    interaction.guild.iconURL({

                        dynamic: true,
                        size: 1024
                    })
                )

                .setImage(
                    "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png"
                )

                .setFooter({

                    text:
                        "Bryant's Economy System"
                })

                .setTimestamp();

        //////////////////////////////////////////////////

        await interaction.reply({

            embeds: [embed]
        });
    }
};