const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const tempVoiceChannels =
    require("../Models/tempVoiceChannels");

module.exports = async (

    panelChannel,
    panelMessageId,
    voiceChannel

) => {

    //////////////////////////////////////////////////
    // DATA
    //////////////////////////////////////////////////

    const data =
        await tempVoiceChannels.findOne({

            channelId:
                voiceChannel.id
        });

    //////////////////////////////////////////////////

    if (!data) return;

    //////////////////////////////////////////////////
    // FETCH MESSAGE
    //////////////////////////////////////////////////

    const message =
        await panelChannel.messages.fetch(

            panelMessageId
        ).catch(() => null);

    //////////////////////////////////////////////////

    if (!message) return;

    //////////////////////////////////////////////////
    // EMBED
    //////////////////////////////////////////////////

    const embed =
        new EmbedBuilder()

            .setColor("#8A2BE2")

            .setTitle(
                "🎛️ Panel TempVoice"
            )

            .setDescription(

                `Controla tu canal temporal desde aquí.\n\n` +

                `🎧 Canal: ${voiceChannel}\n` +

                `👑 Owner: <@${data.ownerId}>\n` +

                `🔒 Locked: ${data.locked ? "Sí" : "No"}\n` +

                `👁️ Hidden: ${data.hidden ? "Sí" : "No"}\n` +

                `👥 Limit: ${data.limit || 0}\n` +

                `🔊 Bitrate: ${Math.floor(
                    voiceChannel.bitrate / 1000
                )}kbps\n` +

                `🌍 Region: ${data.region || "Auto"}`
            );

    //////////////////////////////////////////////////
    // ROW 1
    //////////////////////////////////////////////////

    const row1 =
        new ActionRowBuilder()

            .addComponents(

                new ButtonBuilder()

                    .setCustomId("temp_lock")

                    .setLabel("Lock")

                    .setEmoji("🔒")

                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()

                    .setCustomId("temp_unlock")

                    .setLabel("Unlock")

                    .setEmoji("🔓")

                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()

                    .setCustomId("temp_rename")

                    .setLabel("Rename")

                    .setEmoji("✏️")

                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()

                    .setCustomId("temp_limit")

                    .setLabel("Limit")

                    .setEmoji("👥")

                    .setStyle(
                        ButtonStyle.Secondary
                    )
            );

    //////////////////////////////////////////////////
    // ROW 2
    //////////////////////////////////////////////////

    const row2 =
        new ActionRowBuilder()

            .addComponents(

                new ButtonBuilder()

                    .setCustomId("temp_hide")

                    .setLabel("Hide")

                    .setEmoji("👁️")

                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()

                    .setCustomId("temp_show")

                    .setLabel("Show")

                    .setEmoji("👀")

                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()

                    .setCustomId("temp_claim")

                    .setLabel("Claim")

                    .setEmoji("👑")

                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()

                    .setCustomId("temp_kick")

                    .setLabel("Kick")

                    .setEmoji("👢")

                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()

                    .setCustomId("temp_permit")

                    .setLabel("Permit")

                    .setEmoji("➕")

                    .setStyle(
                        ButtonStyle.Secondary
                    )
            );

    //////////////////////////////////////////////////
    // ROW 3
    //////////////////////////////////////////////////

    const row3 =
        new ActionRowBuilder()

            .addComponents(

                new ButtonBuilder()

                    .setCustomId("temp_deny")

                    .setLabel("Deny")

                    .setEmoji("🚫")

                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()

                    .setCustomId("temp_bitrate")

                    .setLabel("Bitrate")

                    .setEmoji("🔊")

                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()

                    .setCustomId("temp_region")

                    .setLabel("Region")

                    .setEmoji("🌍")

                    .setStyle(
                        ButtonStyle.Secondary
                    )
            );

    //////////////////////////////////////////////////
    // EDIT PANEL
    //////////////////////////////////////////////////

    await message.edit({

        embeds: [embed],

        components: [
            row1,
            row2,
            row3
        ]
    });
};