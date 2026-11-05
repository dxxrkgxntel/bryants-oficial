const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags, AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder } = require("discord.js");
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

async function loadRemoteImage(url) {
    if (!url) throw new Error("No hay URL de imagen.");
    const response = await fetch(url, {
        headers: { Accept: "image/png,image/jpeg,image/webp,image/gif,image/*;q=0.8" },
        signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`La imagen respondió ${response.status}.`);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) throw new Error("La URL no devolvió una imagen.");
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > 8 * 1024 * 1024) throw new Error("La imagen supera el límite de 8 MB.");
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > 8 * 1024 * 1024) throw new Error("La imagen está vacía o supera 8 MB.");
    return loadImage(buffer);
}

async function loadUserAvatar(user) {
    const urls = [
        user.displayAvatarURL({ extension: "png", size: 512, forceStatic: true }),
        user.defaultAvatarURL
    ].filter(Boolean);
    let lastError;
    for (const url of [...new Set(urls)]) {
        try { return await loadRemoteImage(url); }
        catch (error) { lastError = error; }
    }
    throw lastError || new Error("No se pudo cargar el avatar de Discord.");
}

async function positionOf(guildId, data) {
    return (await Level.countDocuments({
        guildId,
        $or: [{ level: { $gt: data.level } }, { level: data.level, xp: { $gt: data.xp } }]
    })) + 1;
}



async function renderLevelCard({ user, member, data, position, needed, backgroundUrl, backgroundMode = "blur", accentColor, showAvatar = true, showXPBar = true, showWallet = true, showBank = true, showRanking = true, showBadges = true, profile = false, economy = {}, badges = [] }) {
    const width = profile ? 1500 : 1200, height = profile ? 650 : 390;
    const canvas = createCanvas(width, height), ctx = canvas.getContext("2d");
    const accent = /^#[\\da-f]{6}$/i.test(accentColor || "") ? accentColor : position === 1 ? "#ffd166" : position === 2 ? "#d7e0ed" : position === 3 ? "#d99a68" : "#b56cff";
    const progress = Math.max(0, Math.min(1, data.xp / needed)), pct = Math.floor(progress * 100);
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#090611"); bg.addColorStop(0.52, "#21103d"); bg.addColorStop(1, "#080b1a");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
    if (backgroundUrl) {
        try {
            const image = await loadRemoteImage(backgroundUrl);
            const scale = backgroundMode === "contain"
                ? Math.min(width / image.width, height / image.height)
                : Math.max(width / image.width, height / image.height);
            const drawWidth = image.width * scale, drawHeight = image.height * scale;
            ctx.save();
            ctx.globalAlpha = backgroundMode === "blur" ? 0.32 : 0.24;
            if (backgroundMode === "blur") ctx.filter = "blur(18px)";
            ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
            ctx.restore();
        } catch (error) {
            console.warn("[Bryvex Levels] No pude cargar el fondo personalizado:", error.message);
        }
    }
    const shade = ctx.createLinearGradient(0, 0, width, height);
    shade.addColorStop(0, "rgba(5,3,14,0.48)"); shade.addColorStop(1, "rgba(4,7,18,0.78)");
    ctx.fillStyle = shade; ctx.fillRect(0, 0, width, height);
    for (const g of [{x:width*.78,y:height*.16,r:profile?260:190,c:"rgba(174,75,255,0.24)"},{x:width*.12,y:height*.9,r:profile?220:160,c:"rgba(64,93,255,0.18)"}]) {
        const radial=ctx.createRadialGradient(g.x,g.y,0,g.x,g.y,g.r); radial.addColorStop(0,g.c); radial.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=radial; ctx.fillRect(0,0,width,height);
    }
    ctx.save(); ctx.shadowColor="rgba(164,76,255,0.55)"; ctx.shadowBlur=30; ctx.lineWidth=3; ctx.strokeStyle="rgba(190,125,255,0.88)";
    ctx.roundRect(18,18,width-36,height-36,34); ctx.stroke(); ctx.restore();
    ctx.fillStyle="rgba(13,10,25,0.32)"; ctx.roundRect(22,22,width-44,height-44,30); ctx.fill();

    const avatarSize=profile?250:220, avatarX=profile?78:72, avatarY=(height-avatarSize)/2-(profile?22:0);
    if (showAvatar !== false) {
        ctx.save(); ctx.shadowColor=accent; ctx.shadowBlur=38; ctx.beginPath(); ctx.arc(avatarX+avatarSize/2,avatarY+avatarSize/2,avatarSize/2+8,0,Math.PI*2); ctx.fillStyle=accent; ctx.fill(); ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.arc(avatarX+avatarSize/2,avatarY+avatarSize/2,avatarSize/2,0,Math.PI*2); ctx.clip();
        try { const avatar=await loadUserAvatar(user); ctx.drawImage(avatar,avatarX,avatarY,avatarSize,avatarSize); }
        catch (error) { console.warn("[Bryvex Levels] No pude cargar el avatar de Discord:", error.message); ctx.fillStyle="#302044"; ctx.fillRect(avatarX,avatarY,avatarSize,avatarSize); }
        ctx.restore();
    }

    const x=profile?390:350, right=width-78, displayName=member?.displayName||user.globalName||user.username;
    ctx.textBaseline="alphabetic"; ctx.fillStyle="#fff"; ctx.font="bold "+(profile?58:54)+"px Audiowide, sans-serif";
    let name=displayName; while(ctx.measureText(name).width>(right-x-260)&&name.length>5) name=name.slice(0,-2)+"…";
    ctx.fillText(name,x,profile?142:126);
    const rankLabel="RANGO #"+position; ctx.font="bold 25px Arial";
    const badgeWidth=Math.max(190,ctx.measureText(rankLabel).width+44), badgeX=right-badgeWidth;
    ctx.fillStyle="rgba(153,83,220,0.22)"; ctx.roundRect(badgeX,profile?82:70,badgeWidth,58,18); ctx.fill();
    ctx.strokeStyle="rgba(202,150,255,0.8)"; ctx.lineWidth=2; ctx.stroke(); ctx.fillStyle=accent; ctx.textAlign="center";
    ctx.fillText(rankLabel,badgeX+badgeWidth/2,profile?120:108); ctx.textAlign="left";
    ctx.fillStyle="#cdb7e8"; ctx.font="25px Arial"; ctx.fillText("@"+user.username,x,profile?190:174);

    const levelY=profile?270:238; ctx.fillStyle="#d7b4ff"; ctx.font="bold "+(profile?43:40)+"px Arial"; ctx.fillText("LEVEL "+data.level,x,levelY);
    ctx.fillStyle="#fff"; ctx.font="bold 25px Arial"; ctx.textAlign="right"; ctx.fillText(data.xp.toLocaleString()+" / "+needed.toLocaleString()+" XP",right,levelY); ctx.textAlign="left";
    if (showXPBar !== false) {
        const barX=x,barY=levelY+28,barWidth=right-x,barHeight=34;
        ctx.fillStyle="rgba(3,4,14,0.88)"; ctx.roundRect(barX,barY,barWidth,barHeight,18); ctx.fill();
        if(progress>0){const grad=ctx.createLinearGradient(barX,0,barX+barWidth,0);grad.addColorStop(0,"#9b4dff");grad.addColorStop(.55,"#d16cff");grad.addColorStop(1,"#69a7ff");ctx.save();ctx.shadowColor=accent;ctx.shadowBlur=18;ctx.fillStyle=grad;ctx.roundRect(barX,barY,Math.max(barHeight,barWidth*progress),barHeight,18);ctx.fill();ctx.restore();}
        ctx.fillStyle="#fff";ctx.font="20px Arial";ctx.fillText(pct+"% completado",barX,barY+66);ctx.textAlign="right";
        ctx.fillText(Math.max(0,needed-data.xp).toLocaleString()+" XP para el siguiente nivel",right,barY+66);ctx.textAlign="left";
    }

    if(profile){
        const infoY=465,columns=[
            ...(showWallet !== false ? [{x,label:"WALLET",value:(economy.wallet||0).toLocaleString(),color:"#e8c5ff"}] : []),
            ...(showBank !== false ? [{x:x+360,label:"BANCO",value:(economy.bank||0).toLocaleString(),color:"#a8c8ff"}] : []),
            ...(showRanking !== false ? [{x:x+720,label:"RANKING",value:"#"+position,color:accent}] : [])
        ];
        for(const item of columns){ctx.fillStyle="rgba(255,255,255,0.07)";ctx.roundRect(item.x,infoY-42,310,92,18);ctx.fill();ctx.fillStyle="#a99ab9";ctx.font="bold 18px Arial";ctx.fillText(item.label,item.x+20,infoY-10);ctx.fillStyle=item.color;ctx.font="bold 29px Arial";ctx.fillText(item.value,item.x+20,infoY+28);}
        if (showBadges !== false) {
            ctx.fillStyle="#d9c8ed";ctx.font="bold 20px Arial";ctx.fillText("BADGES",x,585);ctx.font="20px Arial";ctx.fillStyle="#fff";
            const badgeText=badges.length?badges.join("  •  "):"Ninguno";ctx.fillText(badgeText.length>92?badgeText.slice(0,89)+"…":badgeText,x+105,585);
        }
    } else {ctx.fillStyle="rgba(255,255,255,0.58)";ctx.font="bold 18px Arial";ctx.fillText("BRYVEX LEVELS  •  RANK CARD",x,height-42);}
    return await canvas.encode("png");
}


function colorNumber(value) {
    return /^#[\\da-f]{6}$/i.test(value || "") ? parseInt(value.slice(1), 16) : PURPLE;
}

function buildLevelDetails({ user, data, position, needed, profile, economy = {} }) {
    const rows = [
        `**Usuario:** <@${user.id}>`,
        `**Rango:** #${position}`,
        `**Nivel:** ${data.level}`,
        `**Experiencia:** ${data.xp.toLocaleString()} / ${needed.toLocaleString()} XP (${Math.floor(Math.min(1, data.xp / needed) * 100)}%)`
    ];
    return rows.join("\n");
}

async function sendLevelResponse(interaction, options) {
    const { user, member, data, position, needed, profile = false, economy = {}, badges = [], config = {} } = options;
    const prefix = profile ? "levelProfile" : "levelRank";
    const format = config[`${prefix}Format`] || "card";
    const color = colorNumber(config[`${prefix}Color`]);
    const details = buildLevelDetails({ user, data, position, needed, profile, economy });
    const title = profile ? "👤 Bryvex Levels • Perfil" : "⭐ Bryvex Levels • Rank";
    const avatarUrl = user.displayAvatarURL({ extension: "png", size: 512, forceStatic: true });
    const badgeLine = profile && config.levelProfileShowBadges !== false
        ? `\n**Badges:** ${badges.length ? badges.join(" · ") : "Ninguno"}`
        : "";
    const profileLine = profile ? `${config.levelProfileShowWallet === false ? "" : `\n**Cartera:** ${(economy.wallet || 0).toLocaleString()}`}${config.levelProfileShowBank === false ? "" : `\n**Banco:** ${(economy.bank || 0).toLocaleString()}`}${config.levelProfileShowRanking === false ? "" : `\n**Ranking:** #${position}`}${badgeLine}` : "";
    const textContent = `## ${title}\n**Usuario:** ${user}\n**Nivel:** ${data.level}\n**Rango:** #${position}\n**XP:** ${data.xp.toLocaleString()} / ${needed.toLocaleString()} (${Math.floor(Math.min(1, data.xp / needed) * 100)}%)${profileLine}`;

    if (format === "text") return interaction.editReply({ content: textContent });
    if (format === "embed") {
        const embed = new EmbedBuilder().setColor(color).setTitle(title).setDescription(details + profileLine).setFooter({ text: "BRYVEX LEVELS" });
        if (config[`${prefix}ShowAvatar`] !== false) embed.setThumbnail(avatarUrl);
        return interaction.editReply({ embeds: [embed] });
    }
    if (format === "components") {
        const container = new ContainerBuilder().setAccentColor(color);
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}\n${details}${profileLine}`));
        if (config[`${prefix}ShowAvatar`] !== false) {
            container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
            container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(avatarUrl)));
        }
        return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }

    const buffer = await renderLevelCard({
        user, member, data, position, needed,
        backgroundUrl: config[`${prefix === "levelRank" ? "levelRankImage" : "levelProfileImage"}`],
        backgroundMode: config[`${prefix}BackgroundMode`] || "blur",
        accentColor: config[`${prefix}Color`],
        showAvatar: config[`${prefix}ShowAvatar`] !== false,
        showXPBar: profile || config.levelRankShowXPBar !== false,
        showWallet: config.levelProfileShowWallet !== false,
        showBank: config.levelProfileShowBank !== false,
        showRanking: config.levelProfileShowRanking !== false,
        showBadges: config.levelProfileShowBadges !== false,
        profile, economy, badges
    });
    return interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: profile ? "bryvex-perfil.png" : "bryvex-rank.png" })] });
}

async function rank(interaction) {
    await interaction.deferReply();
    const user = interaction.options.getUser("usuario") || interaction.user;
    const [data, member, config] = await Promise.all([
        Level.findOne({ guildId: interaction.guild.id, userId: user.id }),
        interaction.guild.members.fetch(user.id).catch(() => null),
        LevelConfig.findOne({ guildId: interaction.guild.id }).select("levelRankFormat levelRankImage levelRankColor levelRankBackgroundMode levelRankShowAvatar levelRankShowXPBar").lean()
    ]);
    if (!data) return interaction.editReply(await configuredPanel(interaction, "levelRankImage", "## ⭐ Bryvex Levels • Rank\\n❌ Ese usuario todavía no tiene datos de nivel.", 0xED4245));
    const needed = xpNeeded(data.level), pos = await positionOf(interaction.guild.id, data);
    return sendLevelResponse(interaction, { user, member, data, position: pos, needed, config: config || {} });
}

async function perfil(interaction) {
    await interaction.deferReply();
    const user = interaction.options.getUser("usuario") || interaction.user;
    const [data, economy, member, config] = await Promise.all([
        Level.findOne({ guildId: interaction.guild.id, userId: user.id }),
        EconomyUser.findOne({ guildId: interaction.guild.id, userId: user.id }),
        interaction.guild.members.fetch(user.id).catch(() => null),
        LevelConfig.findOne({ guildId: interaction.guild.id }).select("levelProfileFormat levelProfileImage levelProfileColor levelProfileBackgroundMode levelProfileShowAvatar levelProfileShowWallet levelProfileShowBank levelProfileShowRanking levelProfileShowBadges").lean()
    ]);
    if (!data) return interaction.editReply(await configuredPanel(interaction, "levelProfileImage", "## 👤 Bryvex Levels • Perfil\\n❌ Este usuario todavía no tiene datos de nivel.", 0xED4245));
    const pos = await positionOf(interaction.guild.id, data), needed = xpNeeded(data.level), badges = [];
    if (interaction.guild.ownerId === user.id) badges.push("👑 Owner");
    if (member?.permissions.has(PermissionFlagsBits.Administrator)) badges.push("🛠️ Admin");
    if (member?.premiumSince) badges.push("🚀 Booster");
    if (pos <= 3) badges.push(pos === 1 ? "🥇 Top 1" : pos === 2 ? "🥈 Top 2" : "🥉 Top 3");
    if ((economy?.wallet || 0) >= 100000) badges.push("💰 Magnate");
    if (data.level >= 25) badges.push("🔥 Nivel 25+");
    return sendLevelResponse(interaction, { user, member, data, position: pos, needed, profile: true, economy: economy || { wallet: 0, bank: 0 }, badges, config: config || {} });
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
