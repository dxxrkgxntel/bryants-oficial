const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const getUser = require('../../utils/getUser');
const getConfig = require('../../utils/getConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apostar')
    .setDescription('Apuesta una cantidad de dinero')
    .addIntegerOption(o =>
      o.setName('cantidad')
        .setDescription('Cantidad a apostar')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const amount = interaction.options.getInteger('cantidad');
    const user = await getUser(interaction.guild.id, interaction.user.id);
    const config = await getConfig(interaction.guild.id);

    const now = Date.now();
    const cooldown = 30_000; // 30 segundos (ajustable luego)

    if (now - user.lastGamble < cooldown) {
      const remaining = Math.ceil((cooldown - (now - user.lastGamble)) / 1000);
      return interaction.editReply({
        content: `⏳ Espera **${remaining}s** antes de volver a apostar.`,
        flags: 64
      });
    }

    if (amount > user.wallet) {
      return interaction.editReply({
        content: '❌ No tienes suficiente dinero.',
        flags: 64
      });
    }

    if (amount < config.gambleMin || amount > config.gambleMax) {
      return interaction.editReply({
        content: `❌ La apuesta debe estar entre **${config.gambleMin}** y **${config.gambleMax}**.`,
        flags: 64
      });
    }

    //////////////////////////////////////////////////
// ANIMACION CASINO
//////////////////////////////////////////////////

const loadingMessage =

    await interaction.reply({

        content:

            `🎰 Girando tragamonedas...\n` +

            `💸 Apostando **${amount.toLocaleString()} monedas**`,

        fetchReply: true
    });

    //////////////////////////////////////////////////
// WIN CHANCE
//////////////////////////////////////////////////

const win = Math.random() < 0.5;

//////////////////////////////////////////////////

user.lastGamble = now;

//////////////////////////////////////////////////
// DELAY CASINO
//////////////////////////////////////////////////

await new Promise(resolve =>

    setTimeout(resolve, 2500)
);

//////////////////////////////////////////////////
// GANAR
//////////////////////////////////////////////////

if (win) {

    //////////////////////////////////////////////////
    // MULTIPLICADORES
    //////////////////////////////////////////////////

    //////////////////////////////////////////////////
// MULTIPLICADORES CON RAREZA
//////////////////////////////////////////////////

const rewards = [

    //////////////////////////////////////////////////
    // MUY COMUN
    //////////////////////////////////////////////////

    {
        multiplier: 1.2,
        chance: 40
    },

    //////////////////////////////////////////////////
    // COMUN
    //////////////////////////////////////////////////

    {
        multiplier: 1.5,
        chance: 30
    },

    //////////////////////////////////////////////////
    // RARO
    //////////////////////////////////////////////////

    {
        multiplier: 1.8,
        chance: 18
    },

    //////////////////////////////////////////////////
    // MUY RARO
    //////////////////////////////////////////////////

    {
        multiplier: 2,
        chance: 10
    },

    //////////////////////////////////////////////////
    // LEGENDARIO
    //////////////////////////////////////////////////

    {
        multiplier: 3,
        chance: 2
    }
];

//////////////////////////////////////////////////
// RANDOM CHANCE
//////////////////////////////////////////////////

const random =
    Math.random() * 100;

//////////////////////////////////////////////////

let cumulative =
    0;

//////////////////////////////////////////////////

let multiplier =
    1.2;

//////////////////////////////////////////////////
// CALCULAR MULTIPLIER
//////////////////////////////////////////////////

for (const reward of rewards) {

    cumulative +=
        reward.chance;

    if (random <= cumulative) {

        multiplier =
            reward.multiplier;

        break;
    }
}

   //////////////////////////////////////////////////
// JACKPOT
//////////////////////////////////////////////////

let jackpot =
    false;

//////////////////////////////////////////////////

let jackpotMultiplier =
    multiplier;

//////////////////////////////////////////////////
// JACKPOT CHANCE
//////////////////////////////////////////////////

const jackpotChance =
    Math.random() * 100;

//////////////////////////////////////////////////
// JACKPOT NORMAL
//////////////////////////////////////////////////

if (jackpotChance <= 1) {

    jackpot =
        true;

    jackpotMultiplier =
        10;
}

//////////////////////////////////////////////////
// ULTRA JACKPOT
//////////////////////////////////////////////////

if (jackpotChance <= 0.2) {

    jackpot =
        true;

    jackpotMultiplier =
        20;
}

//////////////////////////////////////////////////
// GANANCIA FINAL
//////////////////////////////////////////////////

const winnings =

    Math.floor(
        amount * jackpotMultiplier
    );

    //////////////////////////////////////////////////

    user.wallet += winnings;

    //////////////////////////////////////////////////
// STATS
//////////////////////////////////////////////////

user.gamblesWon += 1;

//////////////////////////////////////////////////

user.gambleStreak += 1;

//////////////////////////////////////////////////
// BIGGEST WIN
//////////////////////////////////////////////////

if (

    winnings >
    user.biggestWin

) {

    user.biggestWin =
        winnings;
}

//////////////////////////////////////////////////
// JACKPOT
//////////////////////////////////////////////////

if (jackpot) {

    user.jackpots += 1;
}

    //////////////////////////////////////////////////

    await user.save();

    //////////////////////////////////////////////////

    //////////////////////////////////////////////////
// EMBED GANAR
//////////////////////////////////////////////////

const winEmbed =

    new EmbedBuilder()

        .setColor(

            jackpot

                ?

                "#FFD700"

                :

                "#8A2BE2"
        )

        .setTitle(

            jackpot

                ?

                "🌟 JACKPOT"

                :

                "🎰 Apuesta Ganada"
        )

        .setDescription(

            `💸 Apostaste **${amount.toLocaleString()} monedas**\n\n` +

            `🎉 ¡Ganaste la apuesta!\n\n` +

            `💎 Multiplicador: **x${jackpotMultiplier}**\n` +

            `💰 Ganancia: **${winnings.toLocaleString()} monedas**\n\n` +

            `👛 Balance actual: **${user.wallet.toLocaleString()}**`
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

return interaction.editReply({

    content:

        jackpot

            ?

            "🌟 ¡JACKPOT ACTIVADO!"

            :

            null,

    embeds: [winEmbed]
});
}

//////////////////////////////////////////////////
// PERDER
//////////////////////////////////////////////////

else {

    //////////////////////////////////////////////////

    user.wallet -= amount;

    //////////////////////////////////////////////////
// STATS
//////////////////////////////////////////////////

user.gamblesLost += 1;

//////////////////////////////////////////////////
// RESET STREAK
//////////////////////////////////////////////////

user.gambleStreak = 0;

    //////////////////////////////////////////////////

    await user.save();

    //////////////////////////////////////////////////

    //////////////////////////////////////////////////
// EMBED PERDER
//////////////////////////////////////////////////

const loseEmbed =

    new EmbedBuilder()

        .setColor("#ff0000")

        .setTitle("💥 Apuesta Perdida")

        .setDescription(

            `💸 Apostaste **${amount.toLocaleString()} monedas**\n\n` +

            `😢 La suerte no estuvo de tu lado.\n\n` +

            `📉 Dinero perdido: **${amount.toLocaleString()} monedas**\n\n` +

            `👛 Balance actual: **${user.wallet.toLocaleString()}**`
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

return interaction.editReply({

    embeds: [loseEmbed]
});
}
  }
};