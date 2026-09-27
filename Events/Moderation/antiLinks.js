const {
    PermissionsBitField
} = require("discord.js");

//////////////////////////////////////////////////
// CONFIG
//////////////////////////////////////////////////

const AntiLinksConfig =
    require("../../Models/AntiLinksConfig");

//////////////////////////////////////////////////
// REGEX LINKS
//////////////////////////////////////////////////

const linkRegex =
    /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;

module.exports = {

    name: "messageCreate",

    async execute(message) {

        try {

            //////////////////////////////////////////////////
            // IGNORAR BOTS
            //////////////////////////////////////////////////

            if (message.author.bot) return;

            //////////////////////////////////////////////////
            // IGNORAR DMS
            //////////////////////////////////////////////////

            if (!message.guild) return;

            const config =
            await AntiLinksConfig.findOne({

            guildId:
            message.guild.id
            });

            //////////////////////////////////////////////////

            if (
            !config ||
            !config.enabled
            ) return;

            //////////////////////////////////////////////////
            // IGNORAR ADMINS
            //////////////////////////////////////////////////

            if (

                message.member.permissions.has(
                    PermissionsBitField.Flags.Administrator
                )

            ) return;

            //////////////////////////////////////////////////
            // DETECTAR LINKS
            //////////////////////////////////////////////////

            if (
                !linkRegex.test(message.content)
            ) return;

            //////////////////////////////////////////////////
            // CANAL PERMITIDO
            //////////////////////////////////////////////////

            if (
            config.allowedChannels.includes(
            message.channel.id
            )
            ) return;

            //////////////////////////////////////////////////
            // BORRAR MENSAJE
            //////////////////////////////////////////////////

            await message.delete().catch(() => {});

            //////////////////////////////////////////////////
            // AVISO
            //////////////////////////////////////////////////

            const warn =
                await message.channel.send({

                    content:

                        `🚫 ${message.author}, no puedes enviar links en este canal.`
                });

            //////////////////////////////////////////////////
            // AUTO DELETE
            //////////////////////////////////////////////////

            setTimeout(() => {

                warn.delete().catch(() => {});

            }, 5000);

        } catch (error) {

            console.log(error);

        }
    }
};