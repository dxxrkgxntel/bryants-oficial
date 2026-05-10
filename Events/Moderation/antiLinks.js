const {
    PermissionsBitField
} = require("discord.js");

//////////////////////////////////////////////////
// CONFIG
//////////////////////////////////////////////////

const LINK_CHANNEL =
    "1499398585715003432";

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
                message.channel.id ===
                LINK_CHANNEL
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