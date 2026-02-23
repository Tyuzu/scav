import { AD_URL } from "../state/state";

(function () {
    const adElements = document.querySelectorAll(".advertisement");

    if (adElements.length === 0) {
        console.warn("No advertisement containers found!");
        return;
    }

    const adCache = {}; 
    const adIntervals = new Map();

    function renderAd(container, ads, index) {
        const ad = ads[index % ads.length];

        // Sanitize ad data and use safe DOM methods
        function sanitizeText(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Create ad elements using safe methods instead of innerHTML
        container.classList.add("fade-out");
        setTimeout(() => {
            container.innerHTML = ""; // Clear container

            const adCard = document.createElement("div");
            adCard.className = "ad-card";

            const img = document.createElement("img");
            img.src = ad.image;
            img.alt = ad.title;
            img.loading = "lazy";

            const adContent = document.createElement("div");
            adContent.className = "ad-content";

            const title = document.createElement("h3");
            title.textContent = ad.title;

            const desc = document.createElement("p");
            desc.textContent = ad.description;

            const link = document.createElement("a");
            link.href = ad.link;
            link.target = "_blank";
            link.rel = "noopener";
            link.textContent = "Learn More";

            const progress = document.createElement("div");
            progress.className = "ad-progress";

            adContent.appendChild(title);
            adContent.appendChild(desc);
            adContent.appendChild(link);

            adCard.appendChild(img);
            adCard.appendChild(adContent);
            adCard.appendChild(progress);

            container.appendChild(adCard);
            container.classList.remove("fade-out");
            container.classList.add("fade-in");

            // Animate progress bar
            if (progress) {
                progress.style.animation = "progressAnim 10s linear forwards";
            }
        }, 300);
    }

    function loadAndDisplayAds(container, category = "default") {
        if (adCache[category]) {
            startRotation(container, adCache[category]);
            return;
        }

        fetch(`${AD_URL}?category=${category}`)
            .then((response) => response.json())
            .then((ads) => {
                if (!ads.length) {
                    const noAdsMsg = document.createElement("p");
                    noAdsMsg.textContent = "No ads available";
                    container.innerHTML = "";
                    container.appendChild(noAdsMsg);
                    return;
                }
                adCache[category] = ads;
                startRotation(container, ads);
            })
            .catch((error) => {
                console.error(`Error fetching ads for category '${category}':`, error);
                const errorMsg = document.createElement("p");
                errorMsg.textContent = "Error loading ads";
                container.innerHTML = "";
                container.appendChild(errorMsg);
            });
    }

    function startRotation(container, ads) {
        let index = 0;
        renderAd(container, ads, index);

        if (adIntervals.has(container)) {
            clearInterval(adIntervals.get(container));
        }

        const intervalId = setInterval(() => {
            index = (index + 1) % ads.length;
            renderAd(container, ads, index);
        }, 10000);

        adIntervals.set(container, intervalId);

        // Pause on hover
        container.addEventListener("mouseenter", () => clearInterval(intervalId));
        container.addEventListener("mouseleave", () => {
            startRotation(container, ads); // restart rotation
        });
    }

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const container = entry.target;
                obs.unobserve(container);
                const category = container.getAttribute("data-category") || "default";
                loadAndDisplayAds(container, category);
            }
        });
    }, {
        rootMargin: "100px",
        threshold: 0.1,
    });

    adElements.forEach((el) => observer.observe(el));
})();
