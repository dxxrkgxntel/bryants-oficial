function achievementComparatorReached(value, goal, comparator = "gte") {
    const current = Number(value);
    const target = Number(goal);
    if (!Number.isFinite(current) || !Number.isFinite(target)) return false;
    switch (comparator) {
        case "gt": return current > target;
        case "eq": return current === target;
        case "lte": return current <= target;
        case "lt": return current < target;
        case "gte":
        default: return current >= target;
    }
}

function achievementProgressUpdate(amount, absolute = false) {
    return absolute ? { $max: { progress: amount } } : { $inc: { progress: amount } };
}

module.exports = { achievementComparatorReached, achievementProgressUpdate };
