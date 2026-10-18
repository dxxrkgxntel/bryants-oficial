const isLogIgnored = require("../../Utils/logsIgnored");
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

            if (!data || data.Enabled === false) return;

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
            if (await isLogIgnored(data, newMember.guild, null, log?.executor?.id)) return;

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
                        .setThumbnail('https://i.imgur.com/joAe57D.png')
                        .setImage('https://i.imgur.com/joAe57D.png')

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
                if (await isLogIgnored(data, newMember.guild, null, log?.executor?.id)) return;

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
                        .setThumbnail('https://i.imgur.com/joAe57D.png')
                        .setImage('https://i.imgur.com/joAe57D.png')

                await channel.send({embeds: [embed]});
            }

        } catch (error) {

            console.log(error);

        }
    }
};
