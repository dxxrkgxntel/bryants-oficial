function minutesProgress(totalSeconds, reportedMinutes = 0) {
    const totalMinutes = Math.floor(Math.max(0, Number(totalSeconds) || 0) / 60);
    return Math.max(0, totalMinutes - Math.max(0, Number(reportedMinutes) || 0));
}

function voiceMinutesSnapshot(totalSeconds, reportedMinutes = 0) {
    const totalMinutes = Math.floor(Math.max(0, Number(totalSeconds) || 0) / 60);
    const reported = Math.max(0, Number(reportedMinutes) || 0);
    return {
        totalMinutes,
        shouldReport: totalMinutes > reported
    };
}

module.exports = { minutesProgress, voiceMinutesSnapshot };
