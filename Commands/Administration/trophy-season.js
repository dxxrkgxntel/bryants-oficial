const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require("discord.js");
const TrophySettings = require("../../Models/TrophySettings");
const TrophyScore = require("../../Models/TrophyScore");
const { trackAchievementProgress } = require("../../Functions/achievementTracker");
const {
    normalizeSeasonKey,
    buildSeasonRanking,
    buildSeasonAwardEvents
} = require("../../Functions/trophySeason");

function seasonPanel(title, description, color = 0x8A2BE2) {
    const panel = new ContainerBuilder().setAccentColor(color);
    panel.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`));
    panel.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    panel.addTextDisplayComponents(new TextDisplayBuilder().setContent(description));
    return { components: [panel], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral };
}

async function getSettings(guildId) {
    return TrophySettings.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("trophy-season")
        .setDescription("Administra las temporadas del ranking de trofeos")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => sub
            .setName("start")
            .setDescription("Inicia una temporada nueva")
            .addStringOption(option => option
                .setName("temporada")
                .setDescription("Identificador único, por ejemplo 2026-s1")
                .setRequired(true)
                .setMaxLength(80)))
        .addSubcommand(sub => sub
            .setName("close")
            .setDescription("Cierra la temporada y adjudica los logros del podio"))
        .addSubcommand(sub => sub
            .setName("info")
            .setDescription("Consulta el estado de la temporada actual"))
        .addSubcommand(sub => sub
            .setName("top")
            .setDescription("Consulta los primeros puestos de la temporada activa"))
        .addSubcommand(sub => sub
            .setName("roles")
            .setDescription("Configura los roles que recibirá el podio")
            .addRoleOption(option => option.setName("primero").setDescription("Rol para el primer lugar"))
            .addRoleOption(option => option.setName("segundo").setDescription("Rol para el segundo lugar"))
            .addRoleOption(option => option.setName("tercero").setDescription("Rol para el tercer lugar))),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const settings = await getSettings(interaction.guild.id);
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "start") {
            const seasonKey = normalizeSeasonKey(interaction.options.getString("temporada"));
            if (!seasonKey) {
                return interaction.editReply(seasonPanel(
                    "⚠️ Identificador inválido",
                    "Usa entre 1 y 80 caracteres: letras, números, guion o guion bajo. No uses espacios."
                ));
            }
            if (settings.seasonEnabled === true && settings.seasonKey) {
                return interaction.editReply(seasonPanel(
                    "⚠️ Ya existe una temporada activa",
                    `La temporada **${settings.seasonKey}** sigue abierta. Ciérrala antes de iniciar otra.`,
                    0xFFD700
                ));
            }
            if (settings.usedSeasonKeys?.includes(seasonKey) || settings.lastSeasonKey === seasonKey || await TrophyScore.exists({ guildId: interaction.guild.id, seasonKey })) {
                return interaction.editReply(seasonPanel(
                    "⚠️ Identificador ya utilizado",
                    "Cada temporada debe tener un identificador único para conservar el historial y evitar duplicar premios.",
                    0xFFD700
                ));
            }
            const started = await TrophySettings.findOneAndUpdate(
                {
                    guildId: interaction.guild.id,
                    $or: [{ seasonEnabled: { $ne: true } }, { seasonKey: "" }],
                    usedSeasonKeys: { $ne: seasonKey }
                },
                {
                    $set: { seasonKey, seasonEnabled: true, seasonStartedAt: new Date() },
                    $addToSet: { usedSeasonKeys: seasonKey }
                },
                { new: true }
            );
            if (!started) {
                return interaction.editReply(seasonPanel(
                    "⚠️ No se pudo iniciar",
                    "Otra temporada pudo iniciarse al mismo tiempo. Consulta /trophy-season info e inténtalo de nuevo.",
                    0xFFD700
                ));
            }
            return interaction.editReply(seasonPanel(
                "🏆 Temporada iniciada",
                `El ranking de trofeos ya registra puntos para **${seasonKey}**. Al cerrar la temporada se premiará al top 3.`,
                0x00AA66
            ));
        }

        if (subcommand === "roles") {
            const roles = {
                firstPlaceRoleId: interaction.options.getRole("primero")?.id,
                secondPlaceRoleId: interaction.options.getRole("segundo")?.id,
                thirdPlaceRoleId: interaction.options.getRole("tercero")?.id
            };
            const updates = Object.fromEntries(Object.entries(roles).filter(([, value]) => value));
            if (!Object.keys(updates).length) {
                return interaction.editReply(seasonPanel(
                    "⚠️ Faltan roles",
                    "Selecciona al menos un rol para el primero, segundo o tercer lugar."
                ));
            }
            Object.assign(settings, updates);
            await settings.save();
            return interaction.editReply(seasonPanel(
                "🎭 Roles del podio guardados",
                [
                    settings.firstPlaceRoleId ? "**1.º:** <@" + "&" + settings.firstPlaceRoleId + ">" : "**1.º:** Sin configurar",
                    settings.secondPlaceRoleId ? "**2.º:** <@" + "&" + settings.secondPlaceRoleId + ">" : "**2.º:** Sin configurar",
                    settings.thirdPlaceRoleId ? "**3.º:** <@" + "&" + settings.thirdPlaceRoleId + ">" : "**3.º:** Sin configurar"
                ].join("\n"),
                0x00AA66
            ));
        }

        if (subcommand === "top") {
            if (!settings.seasonEnabled || !settings.seasonKey) {
                return interaction.editReply(seasonPanel(
                    "ℹ️ No hay temporada activa",
                    "Inicia una temporada antes de consultar el ranking.",
                    0xFFD700
                ));
            }
            const scores = await TrophyScore.find({
                guildId: interaction.guild.id,
                seasonKey: settings.seasonKey
            }).lean();
            const ranking = buildSeasonRanking(scores).slice(0, 10);
            const lines = ranking.map(entry =>
                "**#" + entry.rank + "** <@" + entry.userId + "> — " + entry.points.toLocaleString() + " puntos · " + entry.unlocks + " desbloqueos"
            );
            return interaction.editReply(seasonPanel(
                "🏆 Ranking · " + settings.seasonKey,
                lines.length ? lines.join("\n") : "Todavía no hay puntos registrados en esta temporada."
            ));
        }

        if (subcommand === "info") {
            const activeKey = settings.seasonEnabled && settings.seasonKey ? settings.seasonKey : null;
            const displayKey = activeKey || settings.lastSeasonKey || "Ninguna";
            const scoreCount = activeKey
                ? await TrophyScore.countDocuments({ guildId: interaction.guild.id, seasonKey: activeKey })
                : 0;
            const started = activeKey && settings.seasonStartedAt
                ? `\n**Inicio:** <t:${Math.floor(new Date(settings.seasonStartedAt).getTime() / 1000)}:R>`
                : "";
            const closed = !activeKey && settings.lastSeasonClosedAt
                ? `\n**Cierre:** <t:${Math.floor(new Date(settings.lastSeasonClosedAt).getTime() / 1000)}:R>`
                : "";
            return interaction.editReply(seasonPanel(
                "📊 Estado de temporada",
                `**Estado:** ${activeKey ? "🟢 Activa" : "⚪ Sin temporada activa"}\n**Temporada:** ${displayKey}\n**Participantes con puntos:** ${scoreCount}${started}${closed}`
            ));
        }

        if (subcommand === "close") {
            const seasonKey = normalizeSeasonKey(settings.seasonKey);
            if (!settings.seasonEnabled || !seasonKey) {
                return interaction.editReply(seasonPanel(
                    "ℹ️ No hay temporada activa",
                    "Inicia una temporada con `/trophy-season start` antes de intentar cerrarla.",
                    0xFFD700
                ));
            }

            const scores = await TrophyScore.find({ guildId: interaction.guild.id, seasonKey }).lean();
            const ranking = buildSeasonRanking(scores);
            const awardEvents = buildSeasonAwardEvents(ranking, seasonKey);
            const roleFields = {
                1: settings.firstPlaceRoleId,
                2: settings.secondPlaceRoleId,
                3: settings.thirdPlaceRoleId
            };

            // Cada evento usa una clave persistida en UserAchievement para que reintentar
            // el cierre no incremente dos veces los logros si una ejecución se interrumpe.
            for (const event of awardEvents) {
                const user = await interaction.client.users.fetch(event.userId);
                await trackAchievementProgress(
                    interaction.guild,
                    user,
                    event.metric,
                    1,
                    { idempotencyKey: event.idempotencyKey }
                );

                if (event.metric === "season_podiums" && roleFields[event.rank]) {
                    const member = await interaction.guild.members.fetch(event.userId).catch(() => null);
                    if (member) {
                        await member.roles.add(roleFields[event.rank]).catch(error => {
                            console.warn("[Trophy Season] No se pudo asignar el rol del podio:", error.message);
                        });
                    }
                }
            }

            settings.seasonEnabled = false;
            settings.lastSeasonKey = seasonKey;
            settings.lastSeasonClosedAt = new Date();
            settings.seasonKey = "";
            await settings.save();

            const podium = ranking.slice(0, 3).map(entry =>
                `**#${entry.rank}** <@${entry.userId}> — ${entry.points.toLocaleString()} puntos`
            );
            const summary = podium.length
                ? podium.join("\n")
                : "La temporada terminó sin participantes con puntos.";
            return interaction.editReply(seasonPanel(
                "🏁 Temporada cerrada",
                `**Temporada:** ${seasonKey}\n\n**Podio**\n${summary}\n\nLos logros `season_podiums` y `season_wins` fueron procesados. Puedes iniciar la siguiente temporada con un identificador nuevo.`,
                0x00AA66
            ));
        }
    }
};
