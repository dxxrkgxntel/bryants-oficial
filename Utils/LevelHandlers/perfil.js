const {
    SlashCommandBuilder,
    AttachmentBuilder
} = require("discord.js");

const {
    createCanvas,
    loadImage,
    GlobalFonts
} = require("@napi-rs/canvas");

const path = require("path");

const Level =
    require("../../Models/Level");

const EconomyUser =
    require("../../Models/EconomyUser");

//////////////////////////////////////////////////////
// FONT
//////////////////////////////////////////////////////

try {

    GlobalFonts.registerFromPath(

        path.join(
            __dirname,
            "../../Assets/Fonts/Audiowide-Regular.ttf"
        ),

        "Audiowide"
    );

} catch (err) {

    console.log(
        "⚠️ Fuente Audiowide no encontrada."
    );
}

//////////////////////////////////////////////////////

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName("perfil-ranking")

            .setDescription(
                "Muestra el perfil del usuario"
            )

            .addUserOption(option =>

                option

                    .setName("usuario")

                    .setDescription(
                        "Usuario a consultar"
                    )

                    .setRequired(false)
            ),

    //////////////////////////////////////////////////////

    async execute(interaction) {

        //////////////////////////////////////////////////////
        // USER
        //////////////////////////////////////////////////////

        const user =

            interaction.options.getUser(
                "usuario"
            ) ||

            interaction.user;

        //////////////////////////////////////////////////////
        // MEMBER
        //////////////////////////////////////////////////////

        const member =

            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        //////////////////////////////////////////////////////
        // LEVEL DATA
        //////////////////////////////////////////////////////

        const data =

            await Level.findOne({

                userId:
                    user.id,

                guildId:
                    interaction.guild.id
            });

        //////////////////////////////////////////////////////

        if (!data) {

            return interaction.reply({

                content:
                    "❌ Este usuario no tiene datos.",

                flags: 64
            });
        }

        //////////////////////////////////////////////////////
        // ECONOMY
        //////////////////////////////////////////////////////

        let economy =

            await EconomyUser.findOne({

                guildId:
                    interaction.guild.id,

                userId:
                    user.id
            });

        //////////////////////////////////////////////////////

        if (!economy) {

            economy = {

                wallet: 0,
                bank: 0
            };
        }

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
        // XP
        //////////////////////////////////////////////////////

        const xpNeeded =

            5 * (data.level ** 2) +
            50 * data.level +
            100;

        //////////////////////////////////////////////////////

        const progress =

            Math.min(
                data.xp / xpNeeded,
                1
            );

        //////////////////////////////////////////////////////
        // BADGES
        //////////////////////////////////////////////////////

        let badges = "";

        if (
            interaction.guild.ownerId ===
            user.id
        ) {

            badges += "👑 ";
        }

        if (
            member?.permissions.has(
                "Administrator"
            )
        ) {

            badges += "🛠️ ";
        }

        if (
            member?.premiumSince
        ) {

            badges += "🚀 ";
        }

        if (position === 1)
            badges += "🥇 ";

        else if (position === 2)
            badges += "🥈 ";

        else if (position === 3)
            badges += "🥉 ";

        if (
            economy.wallet >= 100000
        ) {

            badges += "💰 ";
        }

        if (
            data.level >= 25
        ) {

            badges += "🔥 ";
        }

        //////////////////////////////////////////////////////
        // STATUS
        //////////////////////////////////////////////////////

        let statusColor =
            "#747f8d";

        if (
            member?.presence?.status ===
            "online"
        ) {

            statusColor =
                "#43b581";
        }

        else if (
            member?.presence?.status ===
            "idle"
        ) {

            statusColor =
                "#faa61a";
        }

        else if (
            member?.presence?.status ===
            "dnd"
        ) {

            statusColor =
                "#f04747";
        }

        //////////////////////////////////////////////////////
        // CANVAS
        //////////////////////////////////////////////////////

        const canvas =
            createCanvas(1400, 550);

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

        ctx.fillStyle =
            gradient;

        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        //////////////////////////////////////////////////////
        // PANELS
        //////////////////////////////////////////////////////

        ctx.fillStyle =
            "rgba(255,255,255,0.05)";

        ctx.roundRect(
            40,
            40,
            1320,
            470,
            30
        );

        ctx.fill();

        //////////////////////////////////////////////////////
        // AVATAR
        //////////////////////////////////////////////////////

        const avatarURL =
            user.displayAvatarURL({

                forceStatic: true,
                extension: "png",
                size: 1024
            });

        const avatar =
            await loadImage(
                avatarURL
            );

        //////////////////////////////////////////////////////
        // AVATAR GLOW
        //////////////////////////////////////////////////////

        ctx.save();

        ctx.beginPath();

        ctx.arc(
            190,
            190,
            100,
            0,
            Math.PI * 2
        );

        ctx.closePath();

        ctx.shadowColor =
            "#8A2BE2";

        ctx.shadowBlur =
            40;

        ctx.fillStyle =
            "#8A2BE2";

        ctx.fill();

        ctx.restore();

        //////////////////////////////////////////////////////
        // AVATAR
        //////////////////////////////////////////////////////

        ctx.save();

        ctx.beginPath();

        ctx.arc(
            190,
            190,
            90,
            0,
            Math.PI * 2
        );

        ctx.closePath();

        ctx.clip();

        ctx.drawImage(
            avatar,
            100,
            100,
            180,
            180
        );

        ctx.restore();

        //////////////////////////////////////////////////////
        // STATUS
        //////////////////////////////////////////////////////

        ctx.beginPath();

        ctx.arc(
            260,
            260,
            22,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            statusColor;

        ctx.fill();

        //////////////////////////////////////////////////////
        // USERNAME
        //////////////////////////////////////////////////////

        ctx.font =
            "bold 52px Audiowide";

        ctx.fillStyle =
            "#ffffff";

        ctx.fillText(
            member?.displayName ||
            user.username,

            340,
            150
        );

        //////////////////////////////////////////////////////
        // TAG
        //////////////////////////////////////////////////////

        ctx.font =
            "30px Audiowide";

        ctx.fillStyle =
            "#b9bbbe";

        ctx.fillText(
            `@${user.username}`,
            340,
            200
        );

        //////////////////////////////////////////////////////
        // BADGES
        //////////////////////////////////////////////////////

        ctx.font =
            "40px Audiowide";

        ctx.fillText(
            badges || "Sin badges",
            340,
            260
        );

        //////////////////////////////////////////////////////
        // LEVEL
        //////////////////////////////////////////////////////

        ctx.font =
            "bold 40px Audiowide";

        ctx.fillStyle =
            "#8A2BE2";

        ctx.fillText(
            `LEVEL ${data.level}`,
            340,
            340
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
            600,
            340
        );

        //////////////////////////////////////////////////////
        // ECONOMY
        //////////////////////////////////////////////////////

        ctx.font =
            "28px Audiowide";

        ctx.fillStyle =
            "#43b581";

        ctx.fillText(
            `💰 Wallet: ${economy.wallet.toLocaleString()}`,
            340,
            410
        );

        ctx.fillText(
            `🏦 Banco: ${economy.bank.toLocaleString()}`,
            340,
            455
        );

        //////////////////////////////////////////////////////
        // XP BAR BG
        //////////////////////////////////////////////////////

        const barX = 340;
        const barY = 490;
        const barWidth = 850;
        const barHeight = 35;

        ctx.beginPath();

        ctx.roundRect(
            barX,
            barY,
            barWidth,
            barHeight,
            30
        );

        ctx.fillStyle =
            "#2a2a3d";

        ctx.fill();

        //////////////////////////////////////////////////////
        // XP BAR
        //////////////////////////////////////////////////////

        ctx.beginPath();

        ctx.roundRect(
            barX,
            barY,
            barWidth * progress,
            barHeight,
            30
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
            "#8A2BE2"
        );

        barGradient.addColorStop(
            1,
            "#c084fc"
        );

        ctx.fillStyle =
            barGradient;

        ctx.fill();

        //////////////////////////////////////////////////////
        // XP TEXT
        //////////////////////////////////////////////////////

        ctx.font =
            "15px Audiowide";

        ctx.fillStyle =
            "#ffffff";

        ctx.fillText(
            `${data.xp} / ${xpNeeded} XP`,
            1220,
            515
        );

        //////////////////////////////////////////////////////
        // FOOTER
        //////////////////////////////////////////////////////

        ctx.font =
            "12px Audiowide";

        ctx.fillStyle =
            "#777";

        ctx.fillText(
            "Bryant's Oficial • Advanced Profile System",
            45,
            535
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
                        "profile.png"
                }
            );

        //////////////////////////////////////////////////////

        await interaction.reply({

            files: [attachment]
        });
    }
};