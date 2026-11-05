function minutesProgress(totalSeconds, reportedMinutes = 0) {
    const totalMinutes = Math.floor(Math.max(0, Number(totalSeconds) || 0) / 60);
    return Math.max(0, totalMinutes - Math.max(0, Number(reportedMinutes) || 0));
}

module.exports = { minutesProgress };
