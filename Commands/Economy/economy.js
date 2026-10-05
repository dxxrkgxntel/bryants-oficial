const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const getUser = require("../../Utils/getUser");
const applyBankBonus = require("../../Utils/applyBankBonus");
const updateDebt = require("../../Utils/updateDebt");
const getConfig = require("../../Utils/getConfig");

const jobs = [
"💻 Programador","🍕 Repartidor","🚕 Taxista","🎨 Diseñador","🎵 Productor musical","🛠️ Mecánico","🎮 Streamer","📦 Empaquetador","🏪 Cajero","☕ Barista","🎬 Editor de video","📸 Fotógrafo","🧹 Conserje","🍔 Cocinero","🚚 Transportista"
];

async function runBalance(interaction) {

        //////////////////////////////////////////////////
        // USER
        //////////////////////////////////////////////////

        const target =
            interaction.user;

        //////////////////////////////////////////////////
        // DATA
        //////////////////////////////////////////////////

        const userData =

            await getUser(

                interaction.guild.id,
                target.id
            );

        //////////////////////////////////////////////////
        // BONUS BANCARIO
        //////////////////////////////////////////////////

        const bonus =

            await applyBankBonus(
                userData
            );

        //////////////////////////////////////////////////

        await userData.save();

        //////////////////////////////////////////////////
        // ACTUALIZAR DEUDA
        //////////////////////////////////////////////////

        const addedDebt =
            await updateDebt(
                userData
            );

        //////////////////////////////////////////////////
        // TOTAL
        //////////////////////////////////////////////////

        const total =

            userData.wallet +
            userData.bank;

        //////////////////////////////////////////////////
        // MEMBER
        //////////////////////////////////////////////////

        const member =
            await interaction.guild.members

                .fetch(target.id)

                .catch(() => null);

        //////////////////////////////////////////////////
        // DISPLAY NAME
        //////////////////////////////////////////////////

        const displayName =

            member?.displayName ||

            target.username;

        //////////////////////////////////////////////////
        // ESTADO FINANCIERO
        //////////////////////////////////////////////////

        let financialStatus =
            "🟢 Estable";

        //////////////////////////////////////////////////

        if (userData.debt > 0) {

            financialStatus =
                "🔴 Endeudado";
        }

        //////////////////////////////////////////////////

        if (userData.debt >= 100000) {

            financialStatus =
                "⚠️ Deuda elevada";
        }

        //////////////////////////////////////////////////
        // EMBED
        //////////////////////////////////////////////////

        const embed =

            new EmbedBuilder()

                .setColor("#8A2BE2")

                .setTitle(
                    `💰 Balance de ${displayName}`
                )

                .addFields(

                    {
                        name: "💵 Wallet",

                        value:
                            `${userData.wallet.toLocaleString()} monedas`,

                        inline: true
                    },

                    {
                        name: "🏦 Banco",

                        value:
                            `${userData.bank.toLocaleString()} monedas`,

                        inline: true
                    },

                    {
                        name: "📊 Total",

                        value:
                            `${total.toLocaleString()} monedas`,

                        inline: true
                    },

                    {
                        name: "📉 Deuda",

                        value:
                            `${userData.debt.toLocaleString()} monedas`,

                        inline: true
                    },

                    {
                        name: "🏛️ Estado financiero",

                        value:
                            financialStatus,

                        inline: true
                    }
                );

        //////////////////////////////////////////////////
        // INTERESES ACUMULADOS
        //////////////////////////////////////////////////

        if (addedDebt > 0) {

            embed.addFields({

                name:
                    "📈 Intereses acumulados",

                value:
                    `+${addedDebt.toLocaleString()} monedas añadidas a tu deuda`,

                inline: false
            });
        }

        //////////////////////////////////////////////////
        // BONUS BANCARIO
        //////////////////////////////////////////////////

        if (bonus > 0) {

            embed.addFields({

                name:
                    "🏦 Bonus Bancario",

                value:
                    `+${bonus.toLocaleString()} monedas generadas`,

                inline: false
            });
        }

        //////////////////////////////////////////////////
        // THUMBNAIL
        //////////////////////////////////////////////////

        embed.setThumbnail(

            target.displayAvatarURL({

                dynamic: true,
                size: 1024
            })
        );

        //////////////////////////////////////////////////
        // IMAGE
        //////////////////////////////////////////////////

        embed.setImage(
            "https://media.discordapp.net/attachments/1499375657103392839/1501666280174915584/banner_bot.png"
        );

        //////////////////////////////////////////////////

        embed.setFooter({

            text:
                interaction.guild.name
        });

        //////////////////////////////////////////////////

        embed.setTimestamp();

        //////////////////////////////////////////////////

        await interaction.reply({

            embeds: [embed]
        });
    
}
async function runDaily(interaction) {

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
async function runWork(interaction) {

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

module.exports = {
 data: new SlashCommandBuilder()
  .setName("economy")
  .setDescription("Sistema de economía")
  .addSubcommand(s=>s.setName("balance").setDescription("Muestra tu balance"))
  .addSubcommand(s=>s.setName("daily").setDescription("Reclama tu recompensa diaria"))
  .addSubcommand(s=>s.setName("work").setDescription("Trabaja para ganar dinero")),
 async execute(interaction) {
  const sub=interaction.options.getSubcommand();
  if(sub==="balance") return runBalance(interaction);
  if(sub==="daily") return runDaily(interaction);
  if(sub==="work") return runWork(interaction);
 }
};
