// CoreBlog.js с Lazy Loading, индикатором загрузки и модальным окном для озвучки (без кэширования)

document.addEventListener("DOMContentLoaded", async () => {
    const postsListFile = "posts/list.txt";
    const postsPerPage = 1;
    let currentPage = 1;
    let allPosts = [];
    let filteredPosts = [];

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
        generateTOC();
        checkURLForArticle();
        displayPosts();
    }

    // Генерация оглавления
    function generateTOC() {
        tocContainer.innerHTML = "<ul>";
        filteredPosts.forEach((post, index) => {
            const postSlug = transliterate(post.title);
            tocContainer.innerHTML += `<li><a href="?article=${index}&title=${postSlug}">${post.title}</a></li>`;
        });
        tocContainer.innerHTML += "</ul>";
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

    // Отображение постов
    function displayPosts() {
        blogContainer.innerHTML = "";

        const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
        const startIndex = (currentPage - 1) * postsPerPage;
        const endIndex = startIndex + postsPerPage;
        const pagePosts = filteredPosts.slice(startIndex, endIndex);

        pagePosts.forEach((post, i) => {
            const postSlug = transliterate(post.title);
            const articleURL = `${window.location.origin}${window.location.pathname}?article=${startIndex}&title=${postSlug}`;

            const processedContent = linkify(post.content);

            const shortContent = post.content.length > 555
                ? post.content.substring(0, 555) + "..."
                : post.content;

            const article = document.createElement("div");
            article.classList.add("post");
            article.innerHTML = `
                <h2>${post.title}</h2>
                <p><small>${post.date}</small></p>
                <div>${processedContent}</div>
                <p>
                    <button class="copy-link" data-link="${articleURL}">🔗 Скопировать ссылку</button>
                    <button class="share-link" data-title="${post.title}" data-content="${shortContent}" data-url="${articleURL}">📤 Поделиться!</button><hr>
                    <!--button class="speak-text" data-text="${post.content}">🔊 Озвучить</button-->
                </p>
                
            `;
            blogContainer.appendChild(article);
            // Генерация метатегов для соцсетей
             generateMetaTags(post);
        });

        pageNumber.textContent = `Страница ${currentPage}`;
        prevButton.disabled = currentPage === 1;
        nextButton.disabled = currentPage >= totalPages;

        setupCopyAndShare();
        scrollToTop();
    }

    // События для кнопок
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

    // Поиск по статьям
    function searchPosts() {
        const searchQuery = searchInput.value.toLowerCase();
        filteredPosts = allPosts.filter(post =>
            post.title.toLowerCase().includes(searchQuery) ||
            post.content.toLowerCase().includes(searchQuery)
        );
        currentPage = 1;
        generateTOC();
        displayPosts();
    }

    // Проверка URL для прямой ссылки
    function checkURLForArticle() {
        const params = new URLSearchParams(window.location.search);
        if (params.has("article")) {
            const articleIndex = parseInt(params.get("article"));
            if (!isNaN(articleIndex) && articleIndex >= 0 && articleIndex < allPosts.length) {
                currentPage = articleIndex + 1;
                displayPosts();
                document.title = params.get("title").replace(/-/g, " ");
            }
        }
    }

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
