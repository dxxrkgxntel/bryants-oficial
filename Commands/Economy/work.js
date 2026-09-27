const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const getUser =
    require("../../utils/getUser");

const getConfig =
    require("../../utils/getConfig");

//////////////////////////////////////////////////
// TRABAJOS
//////////////////////////////////////////////////

const jobs = [

    "💻 Programador",
    "🍕 Repartidor",
    "🚕 Taxista",
    "🎨 Diseñador",
    "🎵 Productor musical",
    "🛠️ Mecánico",
    "🎮 Streamer",
    "📦 Empaquetador",
    "🏪 Cajero",
    "☕ Barista",
    "🎬 Editor de video",
    "📸 Fotógrafo",
    "🧹 Conserje",
    "🍔 Cocinero",
    "🚚 Transportista"
];

//////////////////////////////////////////////////

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("trabajar")

            .setDescription(
                "Trabaja para ganar dinero"
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
            config.workCooldown;

        //////////////////////////////////////////////////
        // COOLDOWN
        //////////////////////////////////////////////////

        if (
            now - user.lastWork < cooldown
        ) {

            const remaining =
                cooldown -
                (now - user.lastWork);

            const minutes =
                Math.ceil(
                    remaining / 60000
                );

            return interaction.reply({

                embeds: [

                    new EmbedBuilder()

                        .setColor("#ff0000")

                        .setTitle(
                            "😴 Estás cansado"
                        )

                        .setDescription(

                            `Has trabajado demasiado por hoy.\n\n` +

                            `⏳ Podrás volver a trabajar en ` +

                            `**${minutes} minutos**.`
                        )
                ],

                flags: 64
            });
        }

        //////////////////////////////////////////////////
        // DINERO
        //////////////////////////////////////////////////

        const amount =

            Math.floor(

                Math.random() *

                (
                    config.workMax -
                    config.workMin + 1
                )

            ) +

            config.workMin;

        //////////////////////////////////////////////////
        // TRABAJO RANDOM
        //////////////////////////////////////////////////

        const randomJob =

            jobs[
                Math.floor(
                    Math.random() *
                    jobs.length
                )
            ];

        //////////////////////////////////////////////////
        // SUMAR
        //////////////////////////////////////////////////

        user.wallet += amount;

        user.lastWork = now;

        //////////////////////////////////////////////////

        await user.save();

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    "💼 Jornada completada"
                )

                .setDescription(

                    `✨ ${interaction.user} trabajó como:\n` +

                    `> ${randomJob}\n\n` +

                    `💰 **Ganancias obtenidas**\n` +

                    `> +${amount.toLocaleString()} monedas\n\n` +

                    `🏦 **Balance actual**\n` +

                    `> ${user.wallet.toLocaleString()} monedas\n\n` +

                    `📈 Continúa trabajando para aumentar tu fortuna dentro del servidor.`
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
                        "Bryant's Economy System"
                })

                .setTimestamp();

        //////////////////////////////////////////////////

        await interaction.reply({

            embeds: [embed]
        });
    }
};