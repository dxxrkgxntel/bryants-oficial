const { processVoiceStateUpdate } = require("../../Functions/voiceActivity");

module.exports = {
    name: "voiceStateUpdate",
    async execute(oldState, newState) {
        try {
            await processVoiceStateUpdate(oldState, newState);
        } catch (error) {
            console.error("[Personal Stats] No se pudo registrar la actividad de voz:", error.message);
        }
    }
};
