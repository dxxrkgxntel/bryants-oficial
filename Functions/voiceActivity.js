const PersonalVoiceActivity = require("../Models/PersonalVoiceActivity");
const { addDuration } = require("./personalStats");
const { trackAchievementProgress } = require("./achievementTracker");
const { minutesProgress } = require("./voiceActivityMath");
const { extractVoiceAchievementMetrics } = require("./voiceAchievementMetrics");

async function closeDuration(activity, member, guild, startField, totalField, reportedField, metric, statsField, mapKey, now) {
    const startedAt = activity[startField];
    if (!startedAt) return;
    const seconds = Math.max(0, Math.floor((now.getTime() - new Date(startedAt).getTime()) / 1000));
    activity[startField] = null;
    if (!seconds) return;

    const previousTotal = Number(activity[totalField] || 0);
    const previousReported = Number(activity[reportedField] || 0);
    const nextTotal = previousTotal + seconds;
    const delta = minutesProgress(nextTotal, previousReported);

    await addDuration(member.id, guild.id, statsField, seconds, new Date(startedAt), now, mapKey);
    activity[totalField] = nextTotal;
    if (delta > 0) {
        activity[reportedField] = previousReported + delta;
        await trackAchievementProgress(guild, member.user, metric, delta).catch(error => console.warn(`[Achievements] No se pudo registrar ${metric}:`, error.message));
    }
}

async function processVoiceStateUpdateInternal(oldState, newState) {
    const member = newState.member || oldState.member;
    const guild = newState.guild || oldState.guild;
    if (!member || member.user?.bot || !guild) return;

    const now = new Date();
    const oldChannelId = oldState.channelId || null;
    const newChannelId = newState.channelId || null;
    let activity = await PersonalVoiceActivity.findOne({ userId: member.id, guildId: guild.id });
    if (!activity) activity = new PersonalVoiceActivity({ userId: member.id, guildId: guild.id });

    const wasInVoice = Boolean(oldChannelId);
    const isInVoice = Boolean(newChannelId);
    const voiceMetrics = extractVoiceAchievementMetrics(oldState, newState);
    const duplicateJoin = !wasInVoice && isInVoice
        && activity.voiceStartedAt
        && activity.channelId === newChannelId;

    if (!duplicateJoin && !wasInVoice && isInVoice && activity.voiceStartedAt) {
        await closeDuration(activity, member, guild, "voiceStartedAt", "totalVoiceSeconds", "voiceMinutesReported", "voice_minutes", "voiceSeconds", null, now);
        await closeDuration(activity, member, guild, "streamingStartedAt", "totalStreamingSeconds", "streamingMinutesReported", "streaming_minutes", "activitySeconds", "streaming", now);
        await closeDuration(activity, member, guild, "videoStartedAt", "totalVideoSeconds", "videoMinutesReported", "voice_video_minutes", "activitySeconds", "camera", now);
    }

    if (isInVoice && !activity.voiceStartedAt) {
        activity.voiceStartedAt = now;
        activity.channelId = newChannelId;
        if (voiceMetrics.voice_joins) await trackAchievementProgress(guild, member.user, "voice_joins", 1);
    } else if (isInVoice) {
        activity.channelId = newChannelId;
    } else if (!isInVoice && activity.voiceStartedAt) {
        await closeDuration(activity, member, guild, "voiceStartedAt", "totalVoiceSeconds", "voiceMinutesReported", "voice_minutes", "voiceSeconds", null, now);
        activity.channelId = null;
    }

    const isStreaming = Boolean(newState.streaming) && isInVoice;
    if (isStreaming && !activity.streamingStartedAt) activity.streamingStartedAt = now;
    if (!isStreaming && activity.streamingStartedAt) {
        await closeDuration(activity, member, guild, "streamingStartedAt", "totalStreamingSeconds", "streamingMinutesReported", "streaming_minutes", "activitySeconds", "streaming", now);
    }

    const hadVideo = Boolean(oldState.selfVideo);
    const hasVideo = Boolean(newState.selfVideo) && isInVoice;
    if (hasVideo && !activity.videoStartedAt) activity.videoStartedAt = now;
    if (!hasVideo && activity.videoStartedAt) {
        await closeDuration(activity, member, guild, "videoStartedAt", "totalVideoSeconds", "videoMinutesReported", "voice_video_minutes", "activitySeconds", "camera", now);
    }

    await activity.save();
}

const voiceUpdateQueues = new Map();

function processVoiceStateUpdate(oldState, newState) {
    const member = newState.member || oldState.member;
    const guild = newState.guild || oldState.guild;
    if (!member || !guild) return Promise.resolve();
    const key = `${guild.id}:${member.id}`;
    const previous = voiceUpdateQueues.get(key) || Promise.resolve();
    const current = previous
        .catch(() => {})
        .then(() => processVoiceStateUpdateInternal(oldState, newState));
    voiceUpdateQueues.set(key, current);
    return current.finally(() => {
        if (voiceUpdateQueues.get(key) === current) voiceUpdateQueues.delete(key);
    });
}

module.exports = { processVoiceStateUpdate, processVoiceStateUpdateInternal };
