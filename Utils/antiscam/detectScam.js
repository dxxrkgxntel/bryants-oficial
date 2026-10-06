const {
    isScamDomain
} = require("./scamCache");

const suspiciousWords = [

    "free nitro",
    "steam gift",
    "claim reward",
    "free gift",
    "discord reward",
    "verify account",
    "free steam"

];

function extractUrls(content) {

    const regex =
        /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;

    return content.match(regex) || [];

}

function normalizeDomain(url) {

    try {

        url = url
            .replace(/^https?:\/\//, "")
            .replace(/^www\./, "");

        return url
            .split("/")[0]
            .toLowerCase();

    } catch {

        return null;

    }

}

function detectScam(content, whitelist = []) {

    const lower =
        content.toLowerCase();

    for (const word of suspiciousWords) {

        if (lower.includes(word)) {

            return {

                detected: true,
                reason:
                `Palabra sospechosa: ${word}`

            };

        }

    }

    const urls =
        extractUrls(content);

    for (const url of urls) {

        const domain =
            normalizeDomain(url);

        if (!domain)
            continue;

        if (
    whitelist.includes(domain)
) continue;

if (
    isScamDomain(domain)
) {

            return {

                detected: true,
                domain,
                reason:
                "Dominio malicioso"

            };

        }

    }

    return {
        detected: false
    };

}

module.exports = {
    detectScam
};