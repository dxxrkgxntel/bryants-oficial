function buildV2MessageComponents({ title, description, banner, thumbnail }) {
    const components = [];
    if (banner) components.push({ type: 12, items: [{ media: { url: banner } }] });

    const titleComponent = title ? { type: 10, content: `## ${title}` } : null;
    const descriptionComponent = description ? { type: 10, content: description } : null;

    if (titleComponent && descriptionComponent) {
        components.push(titleComponent);
        components.push({ type: 14, divider: true, spacing: 1 });
        if (thumbnail) {
            components.push({ type: 9, components: [descriptionComponent], accessory: { type: 11, media: { url: thumbnail } } });
        } else {
            components.push(descriptionComponent);
        }
    } else {
        const textComponent = titleComponent || descriptionComponent;
        if (textComponent && thumbnail) {
            components.push({ type: 9, components: [textComponent], accessory: { type: 11, media: { url: thumbnail } } });
        } else if (textComponent) {
            components.push(textComponent);
        }
    }

    if (!title && !description && thumbnail) {
        components.push({ type: 12, items: [{ media: { url: thumbnail } }] });
    }
    return components;
}

module.exports = { buildV2MessageComponents };
