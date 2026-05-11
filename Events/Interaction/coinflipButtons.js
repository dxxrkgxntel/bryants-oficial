const {
    EmbedBuilder
} = require("discord.js");

const EconomyUser =
    require("../../Models/EconomyUser");

module.exports = {

    name:
        "interactionCreate",

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // BUTTON
        //////////////////////////////////////////////////

        if (
            !interaction.isButton()
        ) return;

        //////////////////////////////////////////////////
        // COINFLIP
        //////////////////////////////////////////////////

        if (
            !interaction.customId.startsWith(
                "coinflip_"
            )
        ) return;

        //////////////////////////////////////////////////
        // DATA
        //////////////////////////////////////////////////

        const args =

            interaction.customId.split("_");

        //////////////////////////////////////////////////

        const authorId =
            args[1];

        const targetId =
            args[2];

        const amount =
            parseInt(args[3]);

        //////////////////////////////////////////////////
        // SOLO TARGET
        //////////////////////////////////////////////////

        if (
            interaction.user.id !== targetId
        ) {

            return interaction.reply({

                content:
                    "❌ No puedes aceptar esta apuesta.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // USERS
        //////////////////////////////////////////////////

        const authorData =

            await EconomyUser.findOne({

                guildId:
                    interaction.guild.id,

                userId:
                    authorId
            });

        //////////////////////////////////////////////////

        const targetData =

            await EconomyUser.findOne({

                guildId:
                    interaction.guild.id,

                userId:
                    targetId
            });

        //////////////////////////////////////////////////
        // VERIFICAR DINERO
        //////////////////////////////////////////////////

        if (
            authorData.wallet < amount
        ) {

            return interaction.reply({

                content:
                    "❌ El creador ya no tiene suficiente dinero.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////

        if (
            targetData.wallet < amount
        ) {

            return interaction.reply({

                content:
                    "❌ No tienes suficiente dinero.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // ANIMACION
        //////////////////////////////////////////////////

        await interaction.update({

            content:

                `🪙 Lanzando moneda...\n\n` +

                `💰 Apuesta: **${amount.toLocaleString()} monedas**`,

            embeds: [],

            components: []
        });

        //////////////////////////////////////////////////
        // DELAY
        //////////////////////////////////////////////////

        await new Promise(resolve =>

            setTimeout(resolve, 3000)
        );

        //////////////////////////////////////////////////
        // RANDOM WINNER
        //////////////////////////////////////////////////

        const winnerId =

            Math.random() < 0.5

                ?

                authorId

                :

                targetId;

        //////////////////////////////////////////////////

        const loserId =

            winnerId === authorId

                ?

                targetId

                :

                authorId;

        //////////////////////////////////////////////////
        // WINNER DATA
        //////////////////////////////////////////////////

        const winnerData =

            winnerId === authorId

                ?

                authorData

                :

                targetData;

        //////////////////////////////////////////////////

        const loserData =

            loserId === authorId

                ?

                authorData

                :

                targetData;

        //////////////////////////////////////////////////
// QUITAR APUESTAS
//////////////////////////////////////////////////

authorData.wallet -= amount;

targetData.wallet -= amount;

//////////////////////////////////////////////////
// PREMIO TOTAL
//////////////////////////////////////////////////

const totalPrize =
    amount * 2;

//////////////////////////////////////////////////
// DAR PREMIO
//////////////////////////////////////////////////

winnerData.wallet += totalPrize;

        //////////////////////////////////////////////////

        await winnerData.save();

        await loserData.save();

        //////////////////////////////////////////////////
        // WINNER USER
        //////////////////////////////////////////////////

        const winnerUser =

            await interaction.client.users.fetch(
                winnerId
            );

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "🪙 Resultado Coinflip"
                )

                .setDescription(

                    `🎉 ${winnerUser} ganó la apuesta.\n\n` +

                    `💰 Premio obtenido: **${totalPrize.toLocaleString()} monedas**`
                )

                .setThumbnail(

                    winnerUser.displayAvatarURL({

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

            content: null,

            embeds: [embed]
        });
    }
};