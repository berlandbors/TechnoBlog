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
    const postsPerPage = 1;
    let currentPage = 1;
    let allPosts = [];
    let filteredPosts = [];
    let fuseInstance;

    const blogContainer = document.getElementById("blog");
    const tocContainer = document.getElementById("toc");
    const prevButton = document.getElementById("prevPage");
    const nextButton = document.getElementById("nextPage");
    const pageNumber = document.getElementById("pageNumber");
    const searchInput = document.getElementById("searchInput");
    const loadingIndicator = document.getElementById("loadingIndicator");

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

    // Показать индикатор загрузки
    function showLoading() {
        loadingIndicator.style.display = "block";
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
            const postFiles = text.split("\n").map(line => line.trim()).filter(line => line !== "");

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

        generateTOC();
        checkURLForArticle();
        displayPosts();
    }

    // Эффект печати символ за символом (typing effect)
    function typeWriter(element, text, speed, callback) {
        let i = 0;
        element.textContent = '';
        // Добавляем класс мигающего курсора во время печати
        element.classList.add('typing-active');
        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            } else {
                // Убираем курсор после завершения печати
                element.classList.remove('typing-active');
                if (callback) callback();
            }
        }
        type();
    }

    // Генерация оглавления с эффектом печати
    function generateTOC() {
        tocContainer.innerHTML = "";
        const ul = document.createElement("ul");

        // Создаём элементы списка и собираем их для последовательного эффекта печати
        const items = filteredPosts.map((post, index) => {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.href = "#";
            // Клик по ссылке показывает только заголовок в основной области
            a.addEventListener("click", (e) => {
                e.preventDefault();
                displayPostTitles(index);
            });
            li.appendChild(a);
            ul.appendChild(li);
            return { element: a, text: post.title };
        });

        tocContainer.appendChild(ul);

        // Запускаем эффект печати последовательно для каждого элемента (30-50 мс на символ)
        function typeNext(i) {
            if (i >= items.length) return;
            typeWriter(items[i].element, items[i].text, 40, () => typeNext(i + 1));
        }
        typeNext(0);
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

    // Показывает только заголовок статьи в основной области (первый уровень навигации)
    function displayPostTitles(postIndex) {
        blogContainer.innerHTML = "";
        const post = filteredPosts[postIndex];
        if (!post) return;

        const article = document.createElement("div");
        article.classList.add("post");

        const titleEl = document.createElement("h2");
        titleEl.classList.add("post-title-link");
        titleEl.textContent = post.title;
        // Клик по заголовку открывает полную статью в модальном окне
        titleEl.addEventListener("click", () => openArticleModal(postIndex));

        article.appendChild(titleEl);
        blogContainer.appendChild(article);
        scrollToTop();
    }

    // Открывает модальное окно с полной статьёй (второй уровень навигации)
    function openArticleModal(postIndex) {
        const post = filteredPosts[postIndex];
        if (!post) return;

        const modal = document.getElementById("articleModal");
        const articleContent = document.getElementById("articleContent");

        const postSlug = transliterate(post.title);
        const articleURL = `${window.location.origin}${window.location.pathname}?article=${postIndex}&title=${postSlug}`;
        const processedContent = renderMarkdown(post.content);
        const shortContent = post.content.length > 555
            ? post.content.substring(0, 555) + "..."
            : post.content;

        articleContent.innerHTML = `
            <h2>${post.title}</h2>
            <p><small>${post.date}</small></p>
            <div class="article-body">${processedContent}</div>
            <p>
                <button class="copy-link" data-link="${articleURL}">🔗 Скопировать ссылку</button>
                <button class="share-link" data-title="${post.title}" data-content="${shortContent}" data-url="${articleURL}">📤 Поделиться!</button>
            </p>
            <div id="utterances-container"></div>
        `;

        // Добавляем виджет комментариев Utterances
        const utterancesScript = document.createElement('script');
        utterancesScript.src = 'https://utteranc.es/client.js';
        utterancesScript.setAttribute('repo', 'berlandbors/TechnoBlog');
        utterancesScript.setAttribute('issue-term', 'pathname');
        utterancesScript.setAttribute('theme', 'github-dark');
        utterancesScript.setAttribute('crossorigin', 'anonymous');
        utterancesScript.async = true;
        document.getElementById('utterances-container').appendChild(utterancesScript);

        modal.style.display = "block";
        generateMetaTags(post);
        setupCopyAndShare();
    }

    // Отображение постов — показывает только заголовки (кликабельны для открытия модального окна)
    function displayPosts() {
        blogContainer.innerHTML = "";

        const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
        const startIndex = (currentPage - 1) * postsPerPage;
        const endIndex = startIndex + postsPerPage;
        const pagePosts = filteredPosts.slice(startIndex, endIndex);

        pagePosts.forEach((post, i) => {
            const postIndex = startIndex + i;

            const article = document.createElement("div");
            article.classList.add("post");

            // Только заголовок — клик открывает полную статью в модальном окне
            const titleEl = document.createElement("h2");
            titleEl.classList.add("post-title-link");
            titleEl.textContent = post.title;
            titleEl.addEventListener("click", () => openArticleModal(postIndex));

            article.appendChild(titleEl);
            blogContainer.appendChild(article);
        });

        pageNumber.textContent = `Страница ${currentPage}`;
        prevButton.disabled = currentPage === 1;
        nextButton.disabled = currentPage >= totalPages;

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
            generateTOC();
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
        generateTOC();
        displayPosts();

        // Показать количество результатов
        const resultsInfo = document.createElement('p');
        resultsInfo.textContent = `Найдено: ${filteredPosts.length} (${(endTime - startTime).toFixed(2)}мс)`;
        resultsInfo.style.color = '#00ff99';
        resultsInfo.style.fontSize = '12px';
        resultsInfo.style.margin = '4px 0 0 0';
        document.querySelector('.search-container').appendChild(resultsInfo);
        setTimeout(() => resultsInfo.remove(), 3000);
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
        articleModal.style.display = "none";
    });

    // Закрытие по клику вне области модального окна
    window.addEventListener("click", (event) => {
        if (event.target === articleModal) {
            articleModal.style.display = "none";
        }
    });

    // Закрытие по клавише Escape
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && articleModal.style.display === "block") {
            articleModal.style.display = "none";
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

