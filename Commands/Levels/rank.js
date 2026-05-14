const {
    SlashCommandBuilder,
    AttachmentBuilder
} = require("discord.js");

const Level = require("../../Models/Level");

const {
    createCanvas,
    loadImage,
    GlobalFonts
} = require("@napi-rs/canvas");

const path = require("path");

//////////////////////////////////////////////////////
// FONT
//////////////////////////////////////////////////////

try {

    GlobalFonts.registerFromPath(
        path.join(__dirname, "../../Assets/Fonts/Audiowide-Regular.ttf"),
        "Audiowide"
    );

} catch (err) {

    console.log("⚠️ Fuente no encontrada.");
}

//////////////////////////////////////////////////////

module.exports = {

    data: new SlashCommandBuilder()

        .setName("rank")

        .setDescription(
            "Mira tu nivel y XP"
        )

        .addUserOption(option =>

            option

                .setName("usuario")

                .setDescription(
                    "Usuario"
                )

                .setRequired(false)
        ),

    //////////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////////
        // USER
        //////////////////////////////////////////////////////

        const user =
            interaction.options.getUser("usuario") ||
            interaction.user;

        //////////////////////////////////////////////////////
        // DATA
        //////////////////////////////////////////////////////

        const data =
            await Level.findOne({

                userId: user.id,

                guildId:
                    interaction.guild.id
            });

        if (!data) {

            return interaction.reply({

                content:
                    "❌ Ese usuario no tiene nivel.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////////
        // XP SYSTEM
        //////////////////////////////////////////////////////

        const xpNeeded =
            5 * (data.level ** 2) +
            50 * data.level +
            100;

        const progress =
            Math.min(
                data.xp / xpNeeded,
                1
            );

        //////////////////////////////////////////////////////
        // POSITION
        //////////////////////////////////////////////////////

        const position =

            await Level.countDocuments({

                guildId:
                    interaction.guild.id,

                $or: [

                    {
                        level: {
                            $gt: data.level
                        }
                    },

                    {
                        level: data.level,

                        xp: {
                            $gt: data.xp
                        }
                    }
                ]
            }) + 1;

        //////////////////////////////////////////////////////
        // BADGE
        //////////////////////////////////////////////////////

        let badge = "🎖️";
        let mainColor = "#7d5eff";

        if (position === 1) {

            badge = "👑";
            mainColor = "#ffd700";
        }

        else if (position === 2) {

            badge = "🥈";
            mainColor = "#c0c0c0";
        }

        else if (position === 3) {

            badge = "🥉";
            mainColor = "#cd7f32";
        }

        //////////////////////////////////////////////////////
        // CANVAS
        //////////////////////////////////////////////////////

        const canvas =
            createCanvas(1200, 350);

        const ctx =
            canvas.getContext("2d");

        //////////////////////////////////////////////////////
        // BACKGROUND
        //////////////////////////////////////////////////////

        const gradient =
            ctx.createLinearGradient(
                0,
                0,
                canvas.width,
                canvas.height
            );

        gradient.addColorStop(
            0,
            "#0f0f0f"
        );

        gradient.addColorStop(
            1,
            "#1e1e2f"
        );

        ctx.fillStyle = gradient;

        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        //////////////////////////////////////////////////////
        // GLOW
        //////////////////////////////////////////////////////

        ctx.shadowColor =
            mainColor;

        ctx.shadowBlur = 30;

        ctx.fillStyle =
            mainColor;

        ctx.fillRect(
            40,
            40,
            10,
            270
        );

        ctx.shadowBlur = 0;

        //////////////////////////////////////////////////////
        // AVATAR
        //////////////////////////////////////////////////////

        const avatarURL =
            user.displayAvatarURL({

            forceStatic: true,
            extension: "png",
            size: 512
        });

const avatar =
    await loadImage(
        avatarURL
    );

        //////////////////////////////////////////////////////
        // AVATAR CIRCLE
        //////////////////////////////////////////////////////

        const avatarSize = 180;

        const avatarX = 60;
        const avatarY = 85;

        //////////////////////////////////////////////////////
        // AVATAR GLOW
        //////////////////////////////////////////////////////

        ctx.save();

        ctx.beginPath();

        ctx.arc(
            avatarX + avatarSize / 2,
            avatarY + avatarSize / 2,
            avatarSize / 2,
            0,
            Math.PI * 2
        );

        ctx.closePath();

        ctx.shadowColor =
            mainColor;

        ctx.shadowBlur = 35;

        ctx.fillStyle =
            mainColor;

        ctx.fill();

        ctx.restore();

        //////////////////////////////////////////////////////
        // AVATAR IMAGE
        //////////////////////////////////////////////////////

        ctx.save();

        ctx.beginPath();

        ctx.arc(
            avatarX + avatarSize / 2,
            avatarY + avatarSize / 2,
            avatarSize / 2,
            0,
            Math.PI * 2
        );

        ctx.closePath();

        ctx.clip();

        ctx.drawImage(
            avatar,
            avatarX,
            avatarY,
            avatarSize,
            avatarSize
        );

        ctx.restore();

        //////////////////////////////////////////////////////
        // USERNAME
        //////////////////////////////////////////////////////

        ctx.fillStyle =
            "#ffffff";

        ctx.font =
            "bold 50px Audiowide";

        ctx.fillText(
            user.username,
            300,
            120
        );

        //////////////////////////////////////////////////////
        // BADGE
        //////////////////////////////////////////////////////

        ctx.font =
            "40px Audiowide";

        ctx.fillText(
            badge,
            300,
            175
        );

        //////////////////////////////////////////////////////
        // LEVEL
        //////////////////////////////////////////////////////

        ctx.font =
            "bold 35px Audiowide";

        ctx.fillStyle =
            mainColor;

        ctx.fillText(
            `LEVEL ${data.level}`,
            380,
            175
        );

        //////////////////////////////////////////////////////
        // RANK
        //////////////////////////////////////////////////////

        ctx.fillStyle =
            "#ffffff";

        ctx.font =
            "30px Audiowide";

        ctx.fillText(
            `#${position} GLOBAL`,
            300,
            230
        );

        //////////////////////////////////////////////////////
        // XP TEXT
        //////////////////////////////////////////////////////

        ctx.font =
            "26px Audiowide";

        ctx.fillStyle =
            "#b9bbbe";

        ctx.fillText(
            `${data.xp} / ${xpNeeded} XP`,
            300,
            280
        );

        //////////////////////////////////////////////////////
        // PROGRESS BAR BG
        //////////////////////////////////////////////////////

        const barX = 300;
        const barY = 300;
        const barWidth = 750;
        const barHeight = 30;

        ctx.beginPath();

        ctx.roundRect(
            barX,
            barY,
            barWidth,
            barHeight,
            20
        );

        ctx.fillStyle =
            "#2a2a3d";

        ctx.fill();

        //////////////////////////////////////////////////////
        // PROGRESS BAR
        //////////////////////////////////////////////////////

        ctx.beginPath();

        ctx.roundRect(
            barX,
            barY,
            barWidth * progress,
            barHeight,
            20
        );

        const barGradient =
            ctx.createLinearGradient(
                barX,
                0,
                barX + barWidth,
                0
            );

        barGradient.addColorStop(
            0,
            mainColor
        );

        barGradient.addColorStop(
            1,
            "#ffffff"
        );

        ctx.fillStyle =
            barGradient;

        ctx.fill();

        //////////////////////////////////////////////////////
        // FOOTER
        //////////////////////////////////////////////////////

        ctx.font =
            "13px Audiowide";

        ctx.fillStyle =
            "#777";

        ctx.fillText(
            "Bryant's Oficial • Level System V2",
            40,
            335
        );

        //////////////////////////////////////////////////////
        // ATTACHMENT
        //////////////////////////////////////////////////////

        const buffer =
            await canvas.encode("png");

        const attachment =
            new AttachmentBuilder(
                buffer,
                {
                    name:
                        "rank.png"
                }
            );

        //////////////////////////////////////////////////////

        await interaction.reply({

            files: [attachment]
        });
    }
};