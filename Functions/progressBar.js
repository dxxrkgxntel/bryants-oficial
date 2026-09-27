module.exports = (value, max, size = 10) => {

    const percentage = max > 0
        ? value / max
        : 0;

    const progress =
        Math.round(size * percentage);

    const empty =
        size - progress;

    return (
        "█".repeat(progress) +
        "░".repeat(empty)
    );

};