// CoreTTWP.js с Lazy Loading, индикатором загрузки и модальным окном для статей (без кэширования)

// Настройка marked.js с подсветкой синтаксиса через highlight.js (если загружены)
if (typeof marked !== 'undefined' && typeof hljs !== 'undefined') {
    marked.setOptions({
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, { language: lang }).value;
            }
            return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true
    });
} else if (typeof marked !== 'undefined') {
    marked.setOptions({ breaks: true, gfm: true });
}

// Полноценный Markdown-парсер на базе marked.js (с фолбэком на linkify)
function renderMarkdown(text) {
    if (typeof marked !== 'undefined') {
        return marked.parse(text);
    }
    return linkify(text);
}

document.addEventListener("DOMContentLoaded", async () => {
    const postsListFile = "posts/list.txt";
    const postsPerPage = 9;
    let currentPage = 1;
    let allPosts = [];
    let filteredPosts = [];
    let fuseInstance;

    const blogContainer = document.getElementById("blog");
    const prevButton = document.getElementById("prevPage");
    const nextButton = document.getElementById("nextPage");
    const pageNumber = document.getElementById("pageNumber");
    const searchInput = document.getElementById("searchInput");
    const loadingIndicator = document.getElementById("loadingIndicator");

    // Экранирование HTML для предотвращения XSS
    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Транслитерация для формирования URL
    function transliterate(text) {
        const ruToEn = {
            "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo", "ж": "zh",
            "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o",
            "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "h", "ц": "ts",
            "ч": "ch", "ш": "sh", "щ": "sch", "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya"
        };
        return text.toLowerCase()
            .replace(/[а-яё]/g, char => ruToEn[char] || char)
            .replace(/[^a-z0-9-]/g, "-")
            .replace(/-+/g, "-")
            .trim("-");
    }

    // Показать индикатор загрузки со скелетонами
    function showLoading() {
        loadingIndicator.style.display = "block";
        blogContainer.innerHTML = Array(postsPerPage).fill(0).map(() => `
            <div class="post-card skeleton-card" aria-hidden="true">
                <div class="skeleton-line" style="width:60%;height:20px;"></div>
                <div class="skeleton-line" style="width:30%;height:13px;margin-bottom:16px;"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line" style="width:70%;"></div>
            </div>
        `).join('');
    }

    // Скрыть индикатор загрузки
    function hideLoading() {
        loadingIndicator.style.display = "none";
    }

    // Загрузка списка файлов
    async function loadPostList() {
        showLoading();
        try {
            const response = await fetch(postsListFile);
            if (!response.ok) throw new Error("Ошибка загрузки списка статей");

            const text = await response.text();
            const postFiles = text.split("\n").map(line => line.trim()).filter(line => line !== "" && !line.startsWith("-"));

            await loadAllPosts(postFiles);
        } catch (error) {
            console.error(error);
        } finally {
            hideLoading();
        }
    }

    // Загрузка статей без кэширования
    async function loadAllPosts(postFiles) {
        allPosts = [];

        for (const file of postFiles) {
            try {
                const response = await fetch(file);
                if (!response.ok) throw new Error(`Ошибка загрузки: ${file}`);
                const text = await response.text();

                const lines = text.split("\n");
                const title = lines[0].trim();
                const date = lines[1].trim();
                const content = lines.slice(2).join("\n");

                const post = { title, date, content, file };

                allPosts.push(post);
            } catch (error) {
                console.error(error);
            }
        }

        filteredPosts = [...allPosts];

        // Создаём индекс Fuse.js для нечёткого поиска (если библиотека загружена)
        if (typeof Fuse !== 'undefined') {
            fuseInstance = new Fuse(allPosts, {
                keys: [
                    { name: 'title', weight: 3 },
                    { name: 'content', weight: 1 },
                    { name: 'date', weight: 2 }
                ],
                threshold: 0.3,
                includeScore: true,
                includeMatches: true
            });
        }

        checkURLForArticle();
        displayPosts();
    }

    // Извлекает первое изображение из текста поста
    function extractFirstImage(content) {
        // Markdown: ![alt](url)
        const mdImg = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
        if (mdImg) return mdImg[1];
        // Прямой URL изображения
        const directImg = content.match(/(https?:\/\/[^\s]+?\.(jpg|jpeg|png|gif|webp)(\?[^\s]*)?)/i);
        if (directImg) return directImg[1];
        return null;
    }

    function generateMetaTags(post) {
    const head = document.getElementsByTagName('head')[0];

    // Удаляем старые OG метатеги
    const existingMeta = head.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]');
    existingMeta.forEach(meta => meta.remove());

    // Определяем превью (изображение или видео)
    let previewImage = '';
    let previewVideo = '';

    const imageRegex = /(https?:\/\/[^\s]+?\.(jpg|jpeg|png|gif|webp))/i;
    const videoRegex = /(https?:\/\/[^\s]+?\.(mp4|webm|ogg))/i;

    const imageMatch = post.content.match(imageRegex);
    const videoMatch = post.content.match(videoRegex);

    if (imageMatch) {
        previewImage = imageMatch[1];
    }

    if (videoMatch) {
        previewVideo = videoMatch[1];
    }

    // Open Graph метатеги
    const ogTags = [
        { property: 'og:title', content: post.title },
        { property: 'og:description', content: post.content.substring(0, 150) + '...' },
        { property: 'og:url', content: window.location.href },
        { property: 'og:type', content: previewVideo ? 'video.other' : 'article' },
    ];

    if (previewImage) {
        ogTags.push({ property: 'og:image', content: previewImage });
    }

    if (previewVideo) {
        ogTags.push({ property: 'og:video', content: previewVideo });
        ogTags.push({ property: 'og:video:type', content: `video/${previewVideo.split('.').pop()}` });
        ogTags.push({ property: 'og:video:width', content: '640' });
        ogTags.push({ property: 'og:video:height', content: '360' });
    }

    // Twitter Card метатеги
    const twitterTags = [
        { name: 'twitter:card', content: previewImage ? 'summary_large_image' : 'summary' },
        { name: 'twitter:title', content: post.title },
        { name: 'twitter:description', content: post.content.substring(0, 150) + '...' },
        { name: 'twitter:url', content: window.location.href },
    ];

    if (previewImage) {
        twitterTags.push({ name: 'twitter:image', content: previewImage });
    }

    // Добавляем метатеги в head
    [...ogTags, ...twitterTags].forEach(tagData => {
        const meta = document.createElement('meta');
        if (tagData.property) {
            meta.setAttribute('property', tagData.property);
        } else {
            meta.setAttribute('name', tagData.name);
        }
        meta.setAttribute('content', tagData.content);
        head.appendChild(meta);
    });
}

    // Открывает модальное окно с полной статьёй
    // Показать прогресс-бар загрузки статьи
    function showArticleLoading() {
        const loadingBar = document.getElementById('articleLoadingBar');
        if (loadingBar) loadingBar.classList.add('active');
    }

    // Скрыть прогресс-бар загрузки статьи
    function hideArticleLoading() {
        const loadingBar = document.getElementById('articleLoadingBar');
        if (loadingBar) {
            // Небольшая задержка для плавного скрытия после завершения загрузки
            setTimeout(() => loadingBar.classList.remove('active'), 300);
        }
    }

    function openArticleModal(postIndex) {
        const post = filteredPosts[postIndex];
        if (!post) return;

        const modal = document.getElementById("articleModal");
        const articleContent = document.getElementById("articleContent");

        // Показываем модальное окно и прогресс-бар
        modal.style.display = "block";
        document.body.style.overflow = 'hidden';
        setTimeout(() => modal.classList.add('modal-visible'), 10);
        showArticleLoading();

        const postSlug = transliterate(post.title);
        const articleURL = `${window.location.origin}${window.location.pathname}?article=${postIndex}&title=${postSlug}`;
        const processedContent = renderMarkdown(post.content);
        const shortContent = post.content.length > 555
            ? post.content.substring(0, 555) + "..."
            : post.content;

        articleContent.innerHTML = `
            <nav class="breadcrumbs" aria-label="Навигация">
                <a href="#" class="breadcrumb-home">Главная</a>
                <span class="breadcrumb-sep"> / </span>
                <span class="breadcrumb-current">${escapeHtml(post.title)}</span>
            </nav>
            <h2>${escapeHtml(post.title)}</h2>
            <p><small>${escapeHtml(post.date)}</small></p>
            <div class="article-body">${processedContent}</div>
            <p>
                <button class="copy-link" data-link="${escapeHtml(articleURL)}">🔗 Скопировать ссылку</button>
                <button class="share-link" data-title="${escapeHtml(post.title)}" data-content="${escapeHtml(shortContent)}" data-url="${escapeHtml(articleURL)}">📤 Поделиться!</button>
            </p>
            <div id="utterances-container"></div>
        `;

        // Хлебная крошка "Главная" закрывает модальное окно
        const breadcrumbHome = articleContent.querySelector('.breadcrumb-home');
        if (breadcrumbHome) {
            breadcrumbHome.addEventListener('click', (e) => {
                e.preventDefault();
                closeArticleModal();
            });
        }

        // Добавляем виджет комментариев Utterances
        const utterancesScript = document.createElement('script');
        utterancesScript.src = 'https://utteranc.es/client.js';
        utterancesScript.setAttribute('repo', 'berlandbors/TechnoBlog');
        utterancesScript.setAttribute('issue-term', 'pathname');
        utterancesScript.setAttribute('theme', 'github-dark');
        utterancesScript.setAttribute('crossorigin', 'anonymous');
        utterancesScript.async = true;
        document.getElementById('utterances-container').appendChild(utterancesScript);

        // Сбросить прогресс-бар чтения и прокрутку модального окна
        const modalContentEl = modal.querySelector('.modal-content');
        const progressBar = document.getElementById('modalReadingProgress');
        if (progressBar) progressBar.style.width = '0%';
        if (modalContentEl) modalContentEl.scrollTop = 0;

        // Настраиваем кнопки навигации между статьями
        const prevBtn = document.getElementById('prevArticle');
        const nextBtn = document.getElementById('nextArticle');
        if (prevBtn && nextBtn) {
            prevBtn.disabled = postIndex === 0;
            nextBtn.disabled = postIndex === filteredPosts.length - 1;
            prevBtn.onclick = () => {
                if (postIndex > 0) openArticleModal(postIndex - 1);
            };
            nextBtn.onclick = () => {
                if (postIndex < filteredPosts.length - 1) openArticleModal(postIndex + 1);
            };
        }

        hideArticleLoading();
        generateMetaTags(post);
        setupCopyAndShare();
    }

    // Закрытие модального окна статьи с анимацией
    function closeArticleModal() {
        const modal = document.getElementById("articleModal");
        modal.classList.remove('modal-visible');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }

    // Отображение постов — карточки с превью и метаданными
    function displayPosts() {
        blogContainer.innerHTML = "";

        const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
        const startIndex = (currentPage - 1) * postsPerPage;
        const endIndex = startIndex + postsPerPage;
        const pagePosts = filteredPosts.slice(startIndex, endIndex);

        pagePosts.forEach((post, i) => {
            const postIndex = startIndex + i;

            const postCard = document.createElement("article");
            postCard.className = "post-card";
            postCard.style.animationDelay = `${i * 100}ms`;

            // Рассчитать время чтения (200 слов в минуту)
            const wordCount = post.content.split(/\s+/).filter(w => w.length > 0).length;
            const readTime = Math.max(1, Math.ceil(wordCount / 200));

            // Получить превью (первые 200 символов текста без Markdown-разметки)
            const previewText = post.content.replace(/[#*`\[\]!>]/g, '').substring(0, 200).trim() + '...';

            // Извлечь первое изображение из поста
            const imageUrl = extractFirstImage(post.content);
            const safeTitle = escapeHtml(post.title);
            const safeDate = escapeHtml(post.date);
            const imageHtml = imageUrl
                ? `<div class="post-card-image-wrap"><img class="post-card-image" src="${escapeHtml(imageUrl)}" alt="${safeTitle}" loading="lazy"></div>`
                : '';

            postCard.innerHTML = `
                ${imageHtml}
                <div class="post-card-body">
                    <div class="post-card-header">
                        <h2 class="post-card-title">${safeTitle}</h2>
                        <span class="post-card-date">${safeDate}</span>
                    </div>
                    <p class="post-card-preview">${previewText}</p>
                    <div class="post-card-meta">
                        <span class="post-card-meta-item">⏱ ${readTime} мин</span>
                    </div>
                    <span class="post-card-read-more">Читать далее →</span>
                </div>
            `;

            postCard.addEventListener("click", () => openArticleModal(postIndex));
            blogContainer.appendChild(postCard);
        });

        pageNumber.textContent = `Страница ${currentPage}`;
        prevButton.disabled = currentPage === 1;
        nextButton.disabled = currentPage >= totalPages;

        // Обновить счётчик результатов поиска
        const resultsCountEl = document.getElementById('searchResultsCount');
        if (resultsCountEl) {
            const query = searchInput ? searchInput.value.trim() : '';
            resultsCountEl.textContent = query
                ? `Найдено: ${filteredPosts.length} из ${allPosts.length} статей`
                : `Всего: ${allPosts.length} статей`;
        }

        scrollToTop();
    }

    // События для кнопок копирования и поделиться
    function setupCopyAndShare() {
        document.querySelectorAll(".copy-link").forEach(button => {
            button.addEventListener("click", (event) => {
                const url = event.target.getAttribute("data-link");
                navigator.clipboard.writeText(url).then(() => {
                    alert("Ссылка на статью скопирована!");
                }).catch(err => console.error("Ошибка при копировании", err));
            });
        });

        document.querySelectorAll(".share-link").forEach(button => {
            button.addEventListener("click", (event) => {
                const title = event.target.getAttribute("data-title");
                const content = event.target.getAttribute("data-content");
                const pageUrl = event.target.getAttribute("data-url");
                const shareText = `📝 ${title}\n\n${content}\n\n🔗 Читать полностью:`;//${pageUrl}`;

                if (navigator.share) {
                    navigator.share({
                        title: title,
                        text: shareText,
                        url: pageUrl
                    }).catch(err => console.error("Ошибка при отправке", err));
                } else {
                    navigator.clipboard.writeText(shareText).then(() => {
                        alert("Текст с ссылкой скопирован!");
                    });
                }
            });
        });

        document.querySelectorAll(".speak-text").forEach(button => {
            button.addEventListener("click", (event) => {
                const text = event.target.getAttribute("data-text");
                openSpeechModal(text);
            });
        });
    }

    // Прокрутка вверх
    function scrollToTop() {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Поиск по статьям с использованием Fuse.js (нечёткий поиск)
    function searchPosts() {
        const query = searchInput.value.trim();

        if (!query) {
            filteredPosts = allPosts;
            currentPage = 1;
            displayPosts();
            return;
        }

        const startTime = performance.now();

        if (fuseInstance) {
            const results = fuseInstance.search(query);
            filteredPosts = results.map(result => result.item);
        } else {
            // Фолбэк на простой поиск если Fuse не загружен
            filteredPosts = allPosts.filter(post =>
                post.title.toLowerCase().includes(query.toLowerCase()) ||
                post.content.toLowerCase().includes(query.toLowerCase())
            );
        }

        const endTime = performance.now();
        console.log(`Поиск завершен за ${(endTime - startTime).toFixed(2)}мс`);

        currentPage = 1;
        displayPosts();
    }

    // Проверка URL для прямой ссылки — автоматически открывает модальное окно
    function checkURLForArticle() {
        const params = new URLSearchParams(window.location.search);
        if (params.has("article")) {
            const articleIndex = parseInt(params.get("article"));
            if (!isNaN(articleIndex) && articleIndex >= 0 && articleIndex < allPosts.length) {
                currentPage = articleIndex + 1;
                displayPosts();
                document.title = params.get("title").replace(/-/g, " ");
                // Автоматически открываем модальное окно для прямой ссылки
                openArticleModal(articleIndex);
            }
        }
    }

    // Закрытие модального окна статьи
    const articleModal = document.getElementById("articleModal");
    document.getElementById("closeArticleModal").addEventListener("click", () => {
        closeArticleModal();
    });

    // Прогресс-бар чтения внутри модального окна
    const modalContentEl = document.querySelector('#articleModal .modal-content');
    const modalProgressBar = document.getElementById('modalReadingProgress');
    if (modalContentEl && modalProgressBar) {
        modalContentEl.addEventListener('scroll', () => {
            const scrollHeight = modalContentEl.scrollHeight - modalContentEl.clientHeight;
            const scrolled = scrollHeight > 0 ? (modalContentEl.scrollTop / scrollHeight) * 100 : 0;
            modalProgressBar.style.width = scrolled + '%';
        });
    }

    // Закрытие по клику вне области модального окна
    window.addEventListener("click", (event) => {
        if (event.target === articleModal) {
            closeArticleModal();
        }
    });

    // Закрытие по клавише Escape и навигация стрелками
    document.addEventListener("keydown", (event) => {
        if (articleModal.style.display === "block") {
            if (event.key === "Escape") {
                closeArticleModal();
            } else if (event.key === "ArrowLeft") {
                document.getElementById('prevArticle')?.click();
            } else if (event.key === "ArrowRight") {
                document.getElementById('nextArticle')?.click();
            }
        }
    });

    // Навешиваем события
    searchInput.addEventListener("input", searchPosts);
    prevButton.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            displayPosts();
        }
    });
    nextButton.addEventListener("click", () => {
        if (currentPage < Math.ceil(filteredPosts.length / postsPerPage)) {
            currentPage++;
            displayPosts();
        }
    });

    // Загружаем статьи
    await loadPostList();

});

