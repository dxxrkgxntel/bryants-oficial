const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");

const BankDonorRole =
    require("../../Models/BankDonorRoles");

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("bank-role-list")

            .setDescription(
                "Muestra los roles de donadores configurados"
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // DATA
        //////////////////////////////////////////////////

        const roles =
            await BankDonorRole.find({

                guildId:
                    interaction.guild.id
            })

            .sort({

                requiredAmount: 1
            });

        //////////////////////////////////////////////////
        // NO HAY ROLES
        //////////////////////////////////////////////////

        if (!roles.length) {

            return interaction.reply({

                content:
                    "❌ No hay roles de donadores configurados.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // DESCRIPTION
        //////////////////////////////////////////////////

        let description =
            "";

        //////////////////////////////////////////////////

        for (const data of roles) {

            //////////////////////////////////////////////////
            // ROLE
            //////////////////////////////////////////////////

            const role =
                interaction.guild.roles.cache.get(
                    data.roleId
                );

            //////////////////////////////////////////////////

            if (!role)
                continue;

            //////////////////////////////////////////////////

            description +=

                `🎭 Rol: ${role}\n` +

                `💰 Requiere: ` +

                `**${data.requiredAmount.toLocaleString()} monedas**\n\n`;
        }

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#00ff99")

                .setTitle(
                    "🏦 Roles de Donadores"
                )

                .setDescription(description)

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

        await interaction.reply({

            embeds: [embed]
        });
    }
};