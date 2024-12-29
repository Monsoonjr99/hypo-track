function applyTheme(theme) {
    document.body.dataset.theme = theme;

    // removing the existing theme stylesheet - if it exists
    const existingLink = document.getElementById('theme-stylesheet');
    if (existingLink) {
        existingLink.remove();
    }

    // loading a theme if user selects a theme other than default (vaporwave)
    if (theme !== 'vaporwave') {
        const link = document.createElement('link');
        link.id = 'theme-stylesheet';
        link.rel = 'stylesheet';
        link.href = `css/${theme}.css`;
        document.head.appendChild(link);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const savedTheme = localStorage.getItem('theme') || 'vaporwave';
    const themeSelect = document.getElementById('theme-select');
    themeSelect.value = savedTheme;
    applyTheme(savedTheme);

    themeSelect.addEventListener('change', function () {
        const theme = this.value;
        localStorage.setItem('theme', theme);
        applyTheme(theme);
    });

    const downloadBtn = document.createElement('button');
    downloadBtn.id = 'download-btn';
    downloadBtn.title = 'Download map';
    downloadBtn.textContent = '💾';
    document.body.appendChild(downloadBtn);
});