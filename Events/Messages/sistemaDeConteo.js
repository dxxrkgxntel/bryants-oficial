const countingSchema = require('../../Models/countingSchema');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        const countingData = await countingSchema.findOne({ guildId: message.guild.id });
        if (!countingData || message.channel.id !== countingData.channelId) return;

        const numero = Number(message.content);

        // ❌ Si no es un número válido
        if (isNaN(numero)) {
            await reiniciarConteo(message, countingData);
            return;
        }

        // ❌ Si la misma persona escribe dos veces
        if (message.author.id === countingData.lastPerson) {
            await reiniciarConteo(message, countingData);
            return;
        }

        // ❌ Si el número no es el esperado
        if (numero !== countingData.count + 1) {
            await reiniciarConteo(message, countingData);
            return;
        }

        // ✅ CONTEO CORRECTO
        countingData.count = numero;
        countingData.lastPerson = message.author.id;
        await countingData.save();

        if (numero === 100) {
            await message.react('💯');
        } else {
            await message.react('✅');
        }
    }
};

async function reiniciarConteo(message, countingData) {
    const mensajes = [
        `Arruinaste el conteo, íbamos en ${countingData.count}. El nuevo número es 1`,
        `El conteo se rompió en ${countingData.count}. Volvemos a 1`
    ];

    const random = mensajes[Math.floor(Math.random() * mensajes.length)];

    countingData.count = 0;
    countingData.lastPerson = null;
    await countingData.save();

    await message.channel.send({
        embeds: [
            new EmbedBuilder()
                .setTitle('❌ Conteo reiniciado')
                .setDescription(`${message.author} ${random}`)
        ]
    });

    await message.react('❌');
}