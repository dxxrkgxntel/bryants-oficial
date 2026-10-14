const profileAvatar = document.querySelector("#account-profile-avatar");
const profileName = document.querySelector("#account-profile-name");
const profileDisplay = document.querySelector("#account-profile-display");
const profileId = document.querySelector("#account-profile-id");

async function loadAccountSettings() {
    try {
        const response = await fetch("/api/me", { credentials: "same-origin" });
        const session = await response.json();
        if (!session.user) return window.location.assign("/");

        window.mountAccountMenu(document.querySelector("#account-menu-host"), session.user);
        const user = session.user;
        const defaultAvatarIndex = Number((BigInt(user.id) >> 22n) % 6n);
        profileAvatar.src = user.avatar
            ? `https://cdn.discordapp.com/avatars/${encodeURIComponent(user.id)}/${encodeURIComponent(user.avatar)}.${user.avatar.startsWith("a_") ? "gif" : "png"}?size=128`
            : `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
        profileName.textContent = user.username;
        profileDisplay.textContent = user.username;
        profileId.textContent = user.id;
    } catch {
        window.location.assign("/");
    }
}

document.querySelectorAll(".account-settings-nav-item").forEach(link => link.addEventListener("click", () => {
    document.querySelectorAll(".account-settings-nav-item").forEach(item => {
        item.classList.toggle("active", item === link);
        if (item === link) item.setAttribute("aria-current", "page");
        else item.removeAttribute("aria-current");
    });
}));

loadAccountSettings();
