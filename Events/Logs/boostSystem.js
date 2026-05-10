const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

module.exports = {

    name: "guildMemberUpdate",

    async execute(oldMember, newMember) {

        try {

            //////////////////////////////////////////////////
            // DETECTAR BOOST
            //////////////////////////////////////////////////

            if (
                !oldMember.premiumSince &&
                newMember.premiumSince
            ) {

                //////////////////////////////////////////////////
                // CHANNEL
                //////////////////////////////////////////////////

                const BOOST_CHANNEL = "1503115593744646235";

                const channel = newMember.guild.channels.cache.get(BOOST_CHANNEL);

                if (!channel) return;

                //////////////////////////////////////////////////
                // BOOSTS
                //////////////////////////////////////////////////

                const boosts =
                    newMember.guild.members.cache.filter(

                        m => m.premiumSince
                    ).size;

                //////////////////////////////////////////////////
                // EMBED
                //////////////////////////////////////////////////

                const embed =
                    new EmbedBuilder()

                        .setColor("#8A2BE2")
                        .setTitle("🚀 - Nuevo Boost")
                        .setDescription(

                            `> ${newMember} acaba de mejorar el servidor.\n\n` +

                            `💜 Gracias por apoyar nuestra comunidad.\n\n` +

                            `✨ Ya puedes reclamar tus recompensas\n` +

                            `utilizando los botones de abajo.\n\n` +

                            `🚀 Boosts actuales: **${boosts}**`
                        )
                        .setThumbnail('https://media.discordapp.net/attachments/1499375657103392839/1503096335472132166/logo_bot_sin_fondo.png?ex=6a021b0c&is=6a00c98c&hm=d9a140dae4d311978f50fd6c99bc89c296cd49d412dea2c8c8e94184f392657e&=&format=webp&quality=lossless&width=798&height=798')
                        .setImage('https://media.discordapp.net/attachments/1499375657103392839/1503095821095403560/ChatGPT_Image_10_may_2026_20_03_07.png?ex=6a021a91&is=6a00c911&hm=98c35394bef966a8dc9d7f581632954c3f78b5882670a05f49132f56cdfcb752&=&format=webp&quality=lossless&width=1392&height=468')

                //////////////////////////////////////////////////
                // BOTONES
                //////////////////////////////////////////////////

                const row =
                    new ActionRowBuilder()

                        .addComponents(

                            new ButtonBuilder()

                                .setCustomId("claim_booster")
                                .setLabel("BOOSTER")
                                .setEmoji("💜")
                                .setStyle(ButtonStyle.Secondary),

                            new ButtonBuilder()

                                .setCustomId("claim_booster_vip")
                                .setLabel("BOOSTER VIP")
                                .setEmoji("🚀")
                                .setStyle(ButtonStyle.Secondary),

                            new ButtonBuilder()

                                .setCustomId("claim_booster_legend")
                                .setLabel("BOOSTER LEGEND")
                                .setEmoji("👑")
                                .setStyle(ButtonStyle.Secondary)
                        );

                //////////////////////////////////////////////////
                // SEND
                //////////////////////////////////////////////////

                await channel.send({content:`💜 ¡Gracias por boostear ${newMember}!`, embeds: [embed], components: [row]});
            }

        } catch (error) {

            console.log(error);

        }
    }
};