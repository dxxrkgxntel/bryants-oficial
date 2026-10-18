const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder } = require("discord.js");
const Level = require("../../Models/Level");
const LevelConfig = require("../../Models/LevelConfig");
const LevelReward = require("../../Models/LevelReward");
const EconomyUser = require("../../Models/EconomyUser");
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const path = require("path");

const PURPLE = 0x8A2BE2;

try {
    GlobalFonts.registerFromPath(path.join(__dirname, "../../Assets/Fonts/Audiowide-Regular.ttf"), "Audiowide");
} catch (_) {}

function panel(body, accent = PURPLE, extra = [], image = null) {
    const [title, ...description] = String(body).split("\n");
    const components = [];
    if (image) components.push({ type: 12, items: [{ media: { url: image } }] });
    components.push({ type: 10, content: title });
    if (description.length) {
        components.push({ type: 14, divider: true, spacing: 1 });
        components.push({ type: 10, content: description.join("\n").trim() || " " });
    }
    components.push(...extra);
    return {
        flags: MessageFlags.IsComponentsV2,
        components: [{
            type: 17,
            accent_color: accent,
            components
        }]
    };
}

async function configuredPanel(interaction, imageField, body, accent = PURPLE, extra = []) {
    const config = await LevelConfig.findOne({ guildId: interaction.guild.id }).select(imageField).lean();
    return panel(body, accent, extra, config?.[imageField] || null);
}

function xpNeeded(level) {
    return 5 * (level ** 2) + 50 * level + 100;
}

async function positionOf(guildId, data) {
    return (await Level.countDocuments({
        guildId,
        $or: [{ level: { $gt: data.level } }, { level: data.level, xp: { $gt: data.xp } }]
    })) + 1;
}

async function rank(interaction) {
    await interaction.deferReply();
    const user = interaction.options.getUser("usuario") || interaction.user;
    const data = await Level.findOne({ guildId: interaction.guild.id, userId: user.id });
    if (!data) return interaction.editReply(await configuredPanel(interaction, "levelRankImage", "## ⭐ Bryvex Levels • Rank\n❌ Ese usuario todavía no tiene datos de nivel.", 0xED4245));
    const needed = xpNeeded(data.level);
    const pos = await positionOf(interaction.guild.id, data);
    const pct = Math.min(100, Math.floor((data.xp / needed) * 100));
    const filled = Math.min(10, Math.floor(pct / 10));
    return interaction.editReply(await configuredPanel(interaction, "levelRankImage",
        `## ⭐ Bryvex Levels • Rank\n### <@${user.id}>\n🏆 **Posición:** #${pos}\n⭐ **Nivel:** ${data.level}\n✨ **XP:** ${data.xp.toLocaleString()} / ${needed.toLocaleString()}\n📈 ${"🟪".repeat(filled)}${"⬛".repeat(10-filled)} **${pct}%**`
    ));
}

async function perfil(interaction) {
    await interaction.deferReply();
    const user = interaction.options.getUser("usuario") || interaction.user;
    const [data, economy, member] = await Promise.all([
        Level.findOne({ guildId: interaction.guild.id, userId: user.id }),
        EconomyUser.findOne({ guildId: interaction.guild.id, userId: user.id }),
        interaction.guild.members.fetch(user.id).catch(() => null)
    ]);
    if (!data) return interaction.editReply(await configuredPanel(interaction, "levelProfileImage", "## 👤 Bryvex Levels • Perfil\n❌ Este usuario todavía no tiene datos de nivel.", 0xED4245));
    const pos = await positionOf(interaction.guild.id, data);
    const needed = xpNeeded(data.level);
    const badges = [];
    if (interaction.guild.ownerId === user.id) badges.push("👑 Owner");
    if (member?.permissions.has(PermissionFlagsBits.Administrator)) badges.push("🛠️ Admin");
    if (member?.premiumSince) badges.push("🚀 Booster");
    if (pos <= 3) badges.push(pos===1?"🥇 Top 1":pos===2?"🥈 Top 2":"🥉 Top 3");
    if ((economy?.wallet || 0) >= 100000) badges.push("💰 Magnate");
    if (data.level >= 25) badges.push("🔥 Nivel 25+");
    return interaction.editReply(await configuredPanel(interaction, "levelProfileImage",
        `## 👤 Bryvex Levels • Perfil\n### <@${user.id}>\n⭐ **Nivel:** ${data.level}\n🏆 **Ranking:** #${pos}\n✨ **XP:** ${data.xp.toLocaleString()} / ${needed.toLocaleString()}\n💰 **Wallet:** ${(economy?.wallet || 0).toLocaleString()}\n🏦 **Banco:** ${(economy?.bank || 0).toLocaleString()}\n🎖️ **Badges:** ${badges.join(" • ") || "Ninguno"}`
    ));
}

async function renderTop(interaction, page, ownerId, config) {
    const pageSize = 10;
    const total = await Level.countDocuments({ guildId: interaction.guild.id });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    page = Math.min(Math.max(0, page), totalPages - 1);
    const data = await Level.find({ guildId: interaction.guild.id })
        .sort({ level: -1, xp: -1, userId: 1 }).skip(page * pageSize).limit(pageSize);
    const color = /^#[\da-f]{6}$/i.test(config?.levelColor || "") ? parseInt(config.levelColor.slice(1), 16) : PURPLE;
    const container = new ContainerBuilder().setAccentColor(color);
    if (config?.levelTopImage) container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(config.levelTopImage)));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🏆 Bryvex Levels • Top de niveles`));
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`Clasificación del servidor · Página **${page + 1}/${totalPages}**`));
    if (!data.length) container.addTextDisplayComponents(new TextDisplayBuilder().setContent("Todavía no hay datos de niveles."));
    else {
        const medals = ["🥇", "🥈", "🥉"];
        const lines = data.map((user, index) => {
            const position = page * pageSize + index + 1;
            return `${medals[position - 1] || "🏅"} **#${position}** · <@${user.userId}>\n> ⭐ Nivel **${user.level}** · ✨ ${user.xp.toLocaleString()} XP`;
        });
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n\n")));
    }
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`leveltop_prev:${ownerId}`).setLabel("Anterior").setStyle(ButtonStyle.Secondary).setDisabled(page <= 0),
        new ButtonBuilder().setCustomId(`leveltop_next:${ownerId}`).setLabel("Siguiente").setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    container.addActionRowComponents(row);
    return { flags: MessageFlags.IsComponentsV2, components: [container], page, totalPages };
}

async function top(interaction) {
    await interaction.deferReply();
    const config = await LevelConfig.findOne({ guildId: interaction.guild.id });
    const initial = await renderTop(interaction, 0, interaction.user.id, config);
    await interaction.editReply({ flags: initial.flags, components: initial.components });
    const message = await interaction.fetchReply();
    const collector = message.createMessageComponentCollector({ time: 15 * 60 * 1000 });
    let page = initial.page;
    collector.on("collect", async button => {
        if (!button.customId.startsWith("leveltop_")) return;
        const [, ownerId] = button.customId.split(":");
        if (button.user.id !== ownerId) return button.reply({ content: "Solo quien abrió este top puede cambiar de página.", flags: MessageFlags.Ephemeral });
        await button.deferUpdate();
        page += button.customId.startsWith("leveltop_next:") ? 1 : -1;
        const updated = await renderTop(interaction, page, ownerId, config);
        page = updated.page;
        await interaction.editReply({ flags: updated.flags, components: updated.components });
    });
    collector.on("end", async () => {
        const final = await renderTop(interaction, page, interaction.user.id, config).catch(() => null);
        if (final) await interaction.editReply({ flags: final.flags, components: final.components.map(component => {
            const json = component.toJSON();
            if (json.components?.[json.components.length - 1]?.type === 1) {
                json.components[json.components.length - 1].components.forEach(button => { button.disabled = true; });
            }
            return json;
        }) }).catch(() => {});
    });
}

async function giveXp(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const user=interaction.options.getUser("usuario"), amount=interaction.options.getInteger("xp");
    let data=await Level.findOne({guildId:interaction.guild.id,userId:user.id});
    if(!data) data=new Level({guildId:interaction.guild.id,userId:user.id,xp:0,level:0});
    data.xp += amount; await data.save();
    return interaction.editReply(await configuredPanel(interaction, "levelGiveXpImage", `## 📈 Bryvex Levels • Añadir XP\n✅ Se añadieron **${amount.toLocaleString()} XP** a <@${user.id}>.\n\n✨ **XP actual:** ${data.xp.toLocaleString()}`,0x57F287));
}

async function removeXp(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const user=interaction.options.getUser("usuario"), amount=interaction.options.getInteger("xp");
    const data=await Level.findOne({guildId:interaction.guild.id,userId:user.id});
    if(!data) return interaction.editReply(await configuredPanel(interaction, "levelRemoveXpImage", "## 📉 Bryvex Levels • Remover XP\n❌ Ese usuario no tiene XP.",0xED4245));
    const removed=Math.min(amount,data.xp); data.xp=Math.max(0,data.xp-amount); await data.save();
    return interaction.editReply(await configuredPanel(interaction, "levelRemoveXpImage", `## 📉 Bryvex Levels • Remover XP\n✅ Se removieron **${removed.toLocaleString()} XP** a <@${user.id}>.\n\n✨ **XP actual:** ${data.xp.toLocaleString()}`,0xED4245));
}

async function channel(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const ch=interaction.options.getChannel("canal");
    const banner=interaction.options.getString("banner");
    const topBanner=interaction.options.getString("top_banner");
    const imageOptions = {
        levelRankImage: interaction.options.getString("rank_image"),
        levelProfileImage: interaction.options.getString("profile_image"),
        levelGiveXpImage: interaction.options.getString("give_xp_image"),
        levelRemoveXpImage: interaction.options.getString("remove_xp_image"),
        levelChannelImage: interaction.options.getString("channel_image"),
        levelRoleImage: interaction.options.getString("role_image")
    };
    if ([banner, topBanner, ...Object.values(imageOptions)].some(url => url && !/^https:\/\//i.test(url))) return interaction.editReply(panel("## ⚙️ Bryvex Levels • Configuración\n❌ Las imágenes deben ser URL HTTPS.",0xED4245));
    const update = { levelChannel: ch.id };
    if (banner !== null) update.levelImage = banner;
    if (topBanner !== null) update.levelTopImage = topBanner;
    for (const [key, value] of Object.entries(imageOptions)) if (value !== null) update[key] = value;
    await LevelConfig.findOneAndUpdate({guildId:interaction.guild.id},update,{upsert:true,new:true,setDefaultsOnInsert:true});
    return interaction.editReply(await configuredPanel(interaction, "levelChannelImage", `## ⚙️ Bryvex Levels • Configuración\n✅ Los mensajes de nivel se enviarán en ${ch}.${banner !== null ? " Banner de avisos actualizado." : ""}${topBanner !== null ? " Banner de /level top actualizado." : ""}${Object.values(imageOptions).some(value => value !== null) ? " Imágenes de subcomandos actualizadas." : ""}`,0x57F287));
}

async function role(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const level=interaction.options.getInteger("nivel"), r=interaction.options.getRole("rol");
    if(r.managed) return interaction.editReply(await configuredPanel(interaction, "levelRoleImage", "## 🎖️ Bryvex Levels • Rol\n❌ Ese rol está administrado por una integración y no puede usarse como recompensa.",0xED4245));
    await LevelReward.findOneAndUpdate({guildId:interaction.guild.id,level},{roleId:r.id},{upsert:true,new:true,setDefaultsOnInsert:true});
    return interaction.editReply(await configuredPanel(interaction, "levelRoleImage", `## 🎖️ Bryvex Levels • Rol por nivel\n✅ ${r} será otorgado al alcanzar el **nivel ${level}**.`,0x57F287));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("level").setDescription("Sistema de niveles de Bryvex Bot")
        .addSubcommand(s=>s.setName("rank").setDescription("Mira tu nivel y XP").addUserOption(o=>o.setName("usuario").setDescription("Usuario").setRequired(false)))
        .addSubcommand(s=>s.setName("perfil").setDescription("Muestra el perfil avanzado de un usuario").addUserOption(o=>o.setName("usuario").setDescription("Usuario").setRequired(false)))
        .addSubcommand(s=>s.setName("top").setDescription("Top de niveles del servidor"))
        .addSubcommand(s=>s.setName("give-xp").setDescription("Dar XP a un usuario").addUserOption(o=>o.setName("usuario").setDescription("Usuario").setRequired(true)).addIntegerOption(o=>o.setName("xp").setDescription("Cantidad de XP").setRequired(true).setMinValue(1)))
        .addSubcommand(s=>s.setName("remove-xp").setDescription("Remover XP a un usuario").addUserOption(o=>o.setName("usuario").setDescription("Usuario").setRequired(true)).addIntegerOption(o=>o.setName("xp").setDescription("Cantidad de XP").setRequired(true).setMinValue(1)))
        .addSubcommand(s=>s.setName("channel").setDescription("Configura el canal y las imágenes de niveles").addChannelOption(o=>o.setName("canal").setDescription("Canal donde se enviarán los niveles").addChannelTypes(ChannelType.GuildText).setRequired(true)).addStringOption(o=>o.setName("banner").setDescription("URL para avisos al subir de nivel").setMaxLength(500)).addStringOption(o=>o.setName("top_banner").setDescription("URL de imagen exclusiva para /level top").setMaxLength(500)).addStringOption(o=>o.setName("rank_image").setDescription("URL de imagen para /level rank").setMaxLength(500)).addStringOption(o=>o.setName("profile_image").setDescription("URL de imagen para /level perfil").setMaxLength(500)).addStringOption(o=>o.setName("give_xp_image").setDescription("URL de imagen para /level give-xp").setMaxLength(500)).addStringOption(o=>o.setName("remove_xp_image").setDescription("URL de imagen para /level remove-xp").setMaxLength(500)).addStringOption(o=>o.setName("channel_image").setDescription("URL de imagen para /level channel").setMaxLength(500)).addStringOption(o=>o.setName("role_image").setDescription("URL de imagen para /level role").setMaxLength(500)))
        .addSubcommand(s=>s.setName("role").setDescription("Configura un rol por nivel").addIntegerOption(o=>o.setName("nivel").setDescription("Nivel requerido").setRequired(true).setMinValue(1)).addRoleOption(o=>o.setName("rol").setDescription("Rol a otorgar").setRequired(true))),
    async execute(interaction) {
        const sub=interaction.options.getSubcommand();
        if(["give-xp","remove-xp","channel","role"].includes(sub) && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator))
            return interaction.reply({content:"❌ Necesitas permisos de administrador.",flags:MessageFlags.Ephemeral});
        return ({rank,perfil,top,"give-xp":giveXp,"remove-xp":removeXp,channel,role})[sub](interaction);
    }
};
