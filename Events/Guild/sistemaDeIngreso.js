const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    SeparatorSpacingSize
} = require("discord.js");

const welcomeSchema =
    require("../../Models/welcomeSchema");

function hexToInt(color = "#8A2BE2") {
    const parsed = Number.parseInt(String(color).replace("#", ""), 16);
    return Number.isFinite(parsed) ? parsed : 0x8A2BE2;
}

module.exports = {

    name: "guildMemberAdd",

    async execute(member) {

        try {

            const data =
                await welcomeSchema.findOne({
                    Guild: member.guild.id
                });

            if (!data) return;

            const channel =
                member.guild.channels.cache.get(
                    data.Channel
                );

            if (!channel) {
                console.log(
                    `❌ Canal de bienvenida no encontrado en ${member.guild.name}`
                );
                return;
            }

            const botMember =
                member.guild.members.me;

            if (
                !channel.permissionsFor(botMember)
                    .has(PermissionFlagsBits.SendMessages)
            ) {
                return console.log(
                    `❌ Sin permisos en ${channel.name}`
                );
            }

            const created =
                Math.floor(
                    member.user.createdTimestamp / 1000
                );

            const memberCount =
                member.guild.memberCount;

            const panel =
                new ContainerBuilder()
                    .setAccentColor(
                        hexToInt(data.Color || "#8A2BE2")
                    );

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
                        `## ✨・Bienvenido/a a ${member.guild.name}`
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
                        `${data.MessageDes || "Esperamos que disfrutes tu estadía en el servidor."}\n\n` +
                        `👤 **Usuario:** ${member}\n` +
                        `🆔 **ID:** \`${member.id}\`\n` +
                        `📅 **Cuenta creada:** <t:${created}:R>\n` +
                        `👥 **Miembro número:** **#${memberCount}**`
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
                        "💜 Esperamos que disfrutes tu estadía, participes en los chats y formes parte de esta increíble comunidad."
                    )
            );

            if (data.ImagenDesc) {
                panel.addSeparatorComponents(
                    new SeparatorBuilder()
                        .setDivider(true)
                        .setSpacing(SeparatorSpacingSize.Small)
                );

                panel.addMediaGalleryComponents(
                    new MediaGalleryBuilder()
                        .addItems(
                            new MediaGalleryItemBuilder()
                                .setURL(data.ImagenDesc)
                        )
                );
            }

            const row =
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel("Invitar Bot")
                            .setEmoji("🚀")
                            .setStyle(ButtonStyle.Link)
                            .setURL(
                                "https://discord.com/oauth2/authorize?client_id=1497973126569656540&permissions=8&scope=bot%20applications.commands"
                            )
                    );

            panel.addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Small)
            );

            panel.addActionRowComponents(row);

            await channel.send({
                content:
                    `🎉 ¡Bienvenido ${member}, llegaste al mejor server ${member.guild.name}!`,
                components: [panel],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {

            console.log(
                "❌ Error en sistemaDeIngreso:",
                error
            );
        }
    }
};