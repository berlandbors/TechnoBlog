function linkify(text) {
    
    // Сначала обрабатываем ссылки на изображения
    const imageRegex = /(https?:\/\/[^\s]+?\.(jpg|jpeg|png|gif|webp))/gi;

    text = text.replace(imageRegex, (url) => {
        return `<img src="${url}" alt="Image" style="max-width: 100%; height: auto;">`;
    });

    // 1. Захватить URL до первого пробела или <, >, "
    const urlRegex = /((https?:\/\/|www\.)[^\s<>"']+)/g;

    return text.replace(urlRegex, (url) => {
        // 2. Если на конце стоят "хвостовые" символы (не часть URL) — отделить их
        // Список хвостовых символов: . , ; : ! ? ) ] } >
        let cleanUrl = url;
        let tail = '';
        const tailMatch = url.match(/^(.+?)([.,;:!?)}\]>]+)$/);
        if (tailMatch) {
            cleanUrl = tailMatch[1];
            tail = tailMatch[2];
        }
        const hyperlink = cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;
        return `<a href="${hyperlink}" target="_blank" rel="noopener noreferrer">${hyperlink}</a>${tail}`;
    })
    // ... остальные замены markdown и т.д.
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^---$/gm, '<hr>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/(^\s*\d+\.\s+.+(?:\n|$))/gm, (match) => {
        const items = match.trim().split('\n').map(item =>
            item.replace(/^\s*\d+\.\s+(.+)$/, '<li>$1</li>')
        ).join('');
        return `<ul>${items}</ul>`;
    })
    .replace(/(^- .+(?:\n- .+)*)/gm, (match) => {
        const items = match.split('\n').map(item =>
            item.replace(/^- (.+)$/, '<li>$1</li>')
        ).join('');
        return `<ul>${items}</ul>';
    })
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)(?!\s)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\+\+(.+?)\+\+/g, '<u>$1</u>')
    .replace(/~~(.+?)~~/g, '<u>$1</u>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}