const {
    EmbedBuilder,
    AuditLogEvent
} = require("discord.js");

const logsSchema =
    require("../../Models/logsSchema");

module.exports = {

    name: "guildMemberUpdate",

    async execute(oldMember, newMember) {

        try {

            //////////////////////////////////////////////////
            // DATA
            //////////////////////////////////////////////////

            const data =
                await logsSchema.findOne({
                    Guild: newMember.guild.id
                });

            if (!data) return;

            //////////////////////////////////////////////////
            // CHANNEL
            //////////////////////////////////////////////////

            const channel =
                newMember.guild.channels.cache.get(data.Channel);

            if (!channel) return;

            //////////////////////////////////////////////////
            // ROLES
            //////////////////////////////////////////////////

            const oldRoles =
                oldMember.roles.cache;

            const newRoles =
                newMember.roles.cache;

            //////////////////////////////////////////////////
            // ROL AÑADIDO
            //////////////////////////////////////////////////

            const addedRole =
                newRoles.find(
                    role => !oldRoles.has(role.id)
                );

            if (addedRole) {

                const fetchedLogs =
                    await newMember.guild.fetchAuditLogs({
                        limit: 1,
                        type: AuditLogEvent.MemberRoleUpdate
                    });

                const log =
                    fetchedLogs.entries.first();

                const embed =
                    new EmbedBuilder()

                        .setColor("#8A2BE2")
                        .setTitle("🎭 - Rol Añadido")
                        .addFields(

                            {
                                name: "👤 Usuario",
                                value: `${newMember}`,
                                inline: true
                            },

                            {
                                name: "🎭 Rol",
                                value: `${addedRole}`,
                                inline: true
                            },

                            {
                                name: "🛡️ Moderador",
                                value:
                                    `${log?.executor || "Desconocido"}`
                            }

                        )
                        .setThumbnail('https://media.discordapp.net/attachments/1499375657103392839/1503096335472132166/logo_bot_sin_fondo.png?ex=6a021b0c&is=6a00c98c&hm=d9a140dae4d311978f50fd6c99bc89c296cd49d412dea2c8c8e94184f392657e&=&format=webp&quality=lossless&width=798&height=798')
                        .setImage('https://media.discordapp.net/attachments/1499375657103392839/1503095821095403560/ChatGPT_Image_10_may_2026_20_03_07.png?ex=6a021a91&is=6a00c911&hm=98c35394bef966a8dc9d7f581632954c3f78b5882670a05f49132f56cdfcb752&=&format=webp&quality=lossless&width=1392&height=468')

                await channel.send({
                    embeds: [embed]
                });
            }

            //////////////////////////////////////////////////
            // ROL REMOVIDO
            //////////////////////////////////////////////////

            const removedRole =
                oldRoles.find(
                    role => !newRoles.has(role.id)
                );

            if (removedRole) {

                const fetchedLogs =
                    await newMember.guild.fetchAuditLogs({
                        limit: 1,
                        type: AuditLogEvent.MemberRoleUpdate
                    });

                const log =
                    fetchedLogs.entries.first();

                const embed =
                    new EmbedBuilder()

                        .setColor("#8A2BE2")
                        .setTitle("🗑️ - Rol Removido")
                        .addFields(

                            {
                                name: "👤 Usuario",
                                value: `${newMember}`,
                                inline: true
                            },

                            {
                                name: "🎭 Rol",
                                value: `${removedRole}`,
                                inline: true
                            },

                            {
                                name: "🛡️ Moderador",
                                value:
                                    `${log?.executor || "Desconocido"}`
                            }

                        )
                        .setThumbnail('https://media.discordapp.net/attachments/1499375657103392839/1503096335472132166/logo_bot_sin_fondo.png?ex=6a021b0c&is=6a00c98c&hm=d9a140dae4d311978f50fd6c99bc89c296cd49d412dea2c8c8e94184f392657e&=&format=webp&quality=lossless&width=798&height=798')
                        .setImage('https://media.discordapp.net/attachments/1499375657103392839/1503095821095403560/ChatGPT_Image_10_may_2026_20_03_07.png?ex=6a021a91&is=6a00c911&hm=98c35394bef966a8dc9d7f581632954c3f78b5882670a05f49132f56cdfcb752&=&format=webp&quality=lossless&width=1392&height=468')

                await channel.send({embeds: [embed]});
            }

        } catch (error) {

            console.log(error);

        }
    }
};