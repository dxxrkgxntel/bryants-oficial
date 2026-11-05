function extractVoiceAchievementMetrics(oldState = {}, newState = {}) {
    const metrics = {};
    const joinedVoice = !oldState.channelId && Boolean(newState.channelId);
    if (joinedVoice) metrics.voice_joins = 1;
    return metrics;
}

module.exports = { extractVoiceAchievementMetrics };
