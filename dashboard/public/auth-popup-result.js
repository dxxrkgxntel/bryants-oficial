(() => {
    const copy = {
        en: { loading: "Checking your sign-in…", success: "Successfully logged in", failed: "Sign-in couldn't be completed", user: name => `You are logged in as @${name}.`, closing: "This window will close shortly…", close: "Close window", retry: "Close this window and try again from the dashboard." },
        es: { loading: "Comprobando tu sesión…", success: "Sesión iniciada correctamente", failed: "No se pudo completar el inicio de sesión", user: name => `Has iniciado sesión como @${name}.`, closing: "Esta ventana se cerrará en unos segundos…", close: "Cerrar ventana", retry: "Cierra esta ventana e inténtalo de nuevo desde la dashboard." },
        de: { loading: "Anmeldung wird überprüft…", success: "Erfolgreich angemeldet", failed: "Anmeldung konnte nicht abgeschlossen werden", user: name => `Du bist als @${name} angemeldet.`, closing: "Dieses Fenster wird gleich geschlossen…", close: "Fenster schließen", retry: "Schließe dieses Fenster und versuche es erneut über das Dashboard." },
        pt: { loading: "Verificando seu login…", success: "Login realizado com sucesso", failed: "Não foi possível concluir o login", user: name => `Você entrou como @${name}.`, closing: "Esta janela será fechada em instantes…", close: "Fechar janela", retry: "Feche esta janela e tente novamente pelo painel." },
        fr: { loading: "Vérification de votre connexion…", success: "Connexion réussie", failed: "La connexion n'a pas pu aboutir", user: name => `Vous êtes connecté en tant que @${name}.`, closing: "Cette fenêtre va se fermer…", close: "Fermer la fenêtre", retry: "Fermez cette fenêtre et réessayez depuis le tableau de bord." },
        pl: { loading: "Sprawdzanie logowania…", success: "Logowanie powiodło się", failed: "Nie udało się dokończyć logowania", user: name => `Zalogowano jako @${name}.`, closing: "To okno zaraz się zamknie…", close: "Zamknij okno", retry: "Zamknij to okno i spróbuj ponownie z panelu." },
        tr: { loading: "Girişiniz kontrol ediliyor…", success: "Giriş başarılı", failed: "Giriş tamamlanamadı", user: name => `@${name} olarak giriş yaptınız.`, closing: "Bu pencere birazdan kapanacak…", close: "Pencereyi kapat", retry: "Bu pencereyi kapatıp panelden tekrar deneyin." },
        ru: { loading: "Проверяем вход…", success: "Вход выполнен успешно", failed: "Не удалось завершить вход", user: name => `Вы вошли как @${name}.`, closing: "Это окно скоро закроется…", close: "Закрыть окно", retry: "Закройте это окно и повторите попытку на панели." },
        it: { loading: "Verifica dell'accesso…", success: "Accesso effettuato con successo", failed: "Impossibile completare l'accesso", user: name => `Hai effettuato l'accesso come @${name}.`, closing: "Questa finestra si chiuderà a breve…", close: "Chiudi finestra", retry: "Chiudi questa finestra e riprova dalla dashboard." },
        nl: { loading: "Je aanmelding controleren…", success: "Inloggen is gelukt", failed: "Inloggen kon niet worden voltooid", user: name => `Je bent ingelogd als @${name}.`, closing: "Dit venster wordt zo gesloten…", close: "Venster sluiten", retry: "Sluit dit venster en probeer het opnieuw via het dashboard." }
    };
    const params = new URLSearchParams(window.location.search);
    const strings = copy[params.get("locale")] || copy.es;
    const success = params.get("status") === "success";
    const title = document.querySelector("#result-title");
    const userLine = document.querySelector("#result-user");
    const note = document.querySelector("#result-note");
    const mark = document.querySelector("#result-mark");
    const closeButton = document.querySelector("#close-window");
    document.documentElement.lang = params.get("locale") || "es";

    async function render() {
        if (!success) {
            title.textContent = strings.failed;
            note.textContent = strings.retry;
            mark.textContent = "!";
            mark.classList.add("failed");
            closeButton.textContent = strings.close;
            closeButton.hidden = false;
            return;
        }

        let localeStrings = strings;
        let username = "Discord";
        try {
            const meResponse = await fetch("/api/me", { credentials: "same-origin", cache: "no-store" });
            const me = await meResponse.json();
            username = me.user?.username || username;
            const settingsResponse = await fetch("/api/account/settings", { credentials: "same-origin", cache: "no-store" });
            if (settingsResponse.ok) {
                const settings = await settingsResponse.json();
                localeStrings = copy[settings.locale] || strings;
            }
        } catch {
            // Keep the requested page language if the optional profile lookup is unavailable.
        }

        title.textContent = localeStrings.success;
        userLine.textContent = localeStrings.user(username);
        note.textContent = localeStrings.closing;
        if ("BroadcastChannel" in window) {
            const loginChannel = new BroadcastChannel("bryants-discord-login");
            loginChannel.postMessage({ type: "bryants-discord-login-complete" });
            loginChannel.close();
        }
        try {
            localStorage.setItem("bryants-discord-login-complete", `${Date.now()}-${Math.random()}`);
        } catch {
            // postMessage and BroadcastChannel still cover browsers that block storage.
        }
        if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: "bryants-discord-login-complete" }, window.location.origin);
        }
        window.setTimeout(() => window.close(), 1800);
        window.setTimeout(() => {
            if (!window.closed) {
                note.textContent = localeStrings.closing;
                closeButton.textContent = localeStrings.close;
                closeButton.hidden = false;
            }
        }, 2200);
    }

    closeButton.addEventListener("click", () => window.close());
    render();
})();
