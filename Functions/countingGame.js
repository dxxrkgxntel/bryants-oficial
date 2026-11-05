function parseCountMessage(content) {
  const value = String(content ?? "").trim();
  if (!/^\\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}
function evaluateCountingMessage({ content, currentNumber = 0, currentStreak = 0, lastUserId = null, authorId }) {
  const submitted = parseCountMessage(content);
  if (submitted === null) return { type: "ignore" };
  const expected = currentNumber + 1;
  if (submitted !== expected || (lastUserId && lastUserId === authorId)) return { type: "reset", submitted, expected };
  return { type: "correct", number: submitted, streak: currentStreak + 1 };
}
module.exports = { parseCountMessage, evaluateCountingMessage };
