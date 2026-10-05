const {
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    SeparatorSpacingSize
} = require("discord.js");

const leaveSchema =
    require("../../Models/leaveSchema");

module.exports = {

    name: "guildMemberRemove",

    async execute(member) {

        try {

            const data =
                await leaveSchema.findOne({
                    Guild: member.guild.id
                });

            if (!data) return;

            const leaveChannel =
                member.guild.channels.cache.get(
                    data.Channel
                );

            if (!leaveChannel) {
                return console.log(
                    `❌ Canal de salidas no encontrado en ${member.guild.name}`
                );
            }

            const botMember =
                member.guild.members.me;

            if (
                !leaveChannel.permissionsFor(botMember)
                    .has(PermissionFlagsBits.SendMessages)
            ) {
                return console.log(
                    `❌ Sin permisos en ${leaveChannel.name}`
                );
            }

            const leaveDesc =
                data.MessageDes ||
                "Gracias por haber formado parte de nuestra comunidad.";

            const panel =
                new ContainerBuilder()
                    .setAccentColor(0x8A2BE2);

            if (data.Banner) {
                panel.addMediaGalleryComponents(
                    new MediaGalleryBuilder()
                        .addItems(
                            new MediaGalleryItemBuilder()
                                .setURL(data.Banner)
                        )
                );
            }

            panel.addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `## 👋・Un miembro se ha ido de ${member.guild.name}`
                    )
            );

            panel.addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Small)
            );

            panel.addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `${leaveDesc}\n\n` +
                        `👤 **Usuario:** ${member.user.tag}\n` +
                        `🆔 **ID:** \`${member.id}\`\n` +
                        `💔 **Ahora somos:** **${member.guild.memberCount}** miembros`
                    )
            );

            panel.addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Small)
            );

            panel.addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `💨 **${member.user.tag}** ha salido del servidor. Esperamos verte nuevamente algún día.`
                    )
            );

            await leaveChannel.send({
                components: [panel],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {

            console.log(
                "❌ Error en sistemaDeSalidas:",
                error
            );
        }
    }
};