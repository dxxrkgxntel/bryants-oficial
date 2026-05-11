const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const getUser =
    require("../../utils/getUser");

const getConfig =
    require("../../utils/getConfig");

//////////////////////////////////////////////////

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("diario")

            .setDescription(
                "Reclama tu recompensa diaria"
            ),

    //////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////
        // USER
        //////////////////////////////////////////////////

        const user =
            await getUser(

                interaction.guild.id,
                interaction.user.id
            );

        //////////////////////////////////////////////////
        // CONFIG
        //////////////////////////////////////////////////

        const config =
            await getConfig(

                interaction.guild.id
            );

        //////////////////////////////////////////////////
        // TIME
        //////////////////////////////////////////////////

        const now = Date.now();

        const cooldown =
            config.dailyCooldown;

        //////////////////////////////////////////////////
        // COOLDOWN
        //////////////////////////////////////////////////

        if (
            now - user.lastDaily < cooldown
        ) {

            const remaining =
                cooldown -
                (now - user.lastDaily);

            const hours =
                Math.ceil(
                    remaining / 3600000
                );

            return interaction.reply({

                embeds: [

                    new EmbedBuilder()

                        .setColor("#ff0000")

                        .setTitle(
                            "⏳ Daily ya reclamado"
                        )

                        .setDescription(

                            `Ya reclamaste tu recompensa diaria.\n\n` +

                            `🕒 Vuelve en ` +

                            `**${hours} horas**.`
                        )
                ],

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // STREAK
        //////////////////////////////////////////////////

        const today =

            new Date()
                .toDateString();

        //////////////////////////////////////////////////

        const yesterday =

            new Date(
                Date.now() - 86400000
            ).toDateString();

        //////////////////////////////////////////////////

        if (
            user.lastDailyDate === yesterday
        ) {

            user.dailyStreak += 1;

        } else if (
            user.lastDailyDate !== today
        ) {

            user.dailyStreak = 1;
        }

        //////////////////////////////////////////////////
        // BONUS
        //////////////////////////////////////////////////

        const streakBonus =

            user.dailyStreak * 100;

        //////////////////////////////////////////////////

        const totalReward =

            config.dailyAmount +
            streakBonus;

        //////////////////////////////////////////////////
        // SUMAR
        //////////////////////////////////////////////////

        user.wallet += totalReward;

        user.lastDaily = now;

        user.lastDailyDate = today;

        //////////////////////////////////////////////////

        await user.save();

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#FFD700")

                .setTitle(
                    "🎁 Recompensa diaria reclamada"
                )

                .setDescription(

                    `✨ Has reclamado tu recompensa diaria correctamente.\n\n` +

                    `💰 **Recompensa base**\n` +
                    `> +${config.dailyAmount.toLocaleString()} monedas\n\n` +

                    `🔥 **Bonus por streak**\n` +
                    `> +${streakBonus.toLocaleString()} monedas\n\n` +

                    `📆 **Racha actual**\n` +
                    `> ${user.dailyStreak} días\n\n` +

                    `🏦 **Total recibido**\n` +
                    `> +${totalReward.toLocaleString()} monedas`
                )

                .setThumbnail(

                    interaction.user.displayAvatarURL({

                        dynamic: true,
                        size: 1024
                    })
                )

                .setImage(
                    "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png"
                )

                .setFooter({

                    text:
                        "No pierdas tu streak diario 🔥"
                })

                .setTimestamp();

        //////////////////////////////////////////////////

        await interaction.reply({

            embeds: [embed]
        });
    }
};