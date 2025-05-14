document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("navToggle");
  const nav = document.querySelector(".navbar nav");
  const body = document.body;

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      nav.classList.toggle("show");
      body.classList.toggle("no-scroll");
    });
  }

  const grid = document.getElementById("cardGrid");
  const bonusGrid = document.getElementById("bonusGrid");
  const loadingIndicator = document.getElementById("loading");
  const overlay = document.getElementById("overlay");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  let zoomedClone = null;
  let cacheBuster = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  let manifest = { revealed: {}, bonus: [] };
  const totalCards = 204;

  let mainRevealedCards = [];
  let bonusRevealedCards = [];
  let currentZoomList = [];
  let currentZoomIndex = -1;
  let lastZoomTime = 0;
  const zoomCooldown = 200;
  let savedScrollY = 0;

  const CHUNK_SIZE = 20;
  let currentChunkIndex = 0;
  let isLoadingChunk = false;

  function preventTouchScroll(e) { e.preventDefault(); }
  let touchStartX = 0;
  let touchEndX = 0;
  function handleTouchStart(e) { touchStartX = e.changedTouches[0].screenX; }
  function handleTouchEnd(e) {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchEndX - touchStartX;
    if (Math.abs(diff) > 50) {
      if (diff < 0) zoomToCard(currentZoomIndex + 1);
      else zoomToCard(currentZoomIndex - 1);
    }
  }

  function showZoomNavigation() {
    prevBtn.style.display = "flex";
    nextBtn.style.display = "flex";
    prevBtn.style.opacity = currentZoomIndex > 0 ? "1" : "0.3";
    nextBtn.style.opacity = currentZoomIndex < currentZoomList.length - 1 ? "1" : "0.3";
  }

  function hideZoomNavigation() {
    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
  }

  function zoomToCard(index) {
    if (
      currentZoomList === mainRevealedCards &&
      index >= mainRevealedCards.length - 2 &&
      currentChunkIndex * CHUNK_SIZE < totalCards
    ) {
      loadNextChunk();
    }


    if (Date.now() - lastZoomTime < zoomCooldown) return;
    lastZoomTime = Date.now();
    if (index < 0 || index >= currentZoomList.length) return;
    if (zoomedClone && currentZoomIndex === index) return;

    savedScrollY = window.scrollY;
    closeZoom();

    const entry = currentZoomList[index];
    const img = entry.container.querySelector(".card");
    if (!img) return;

    zoomedClone = img.cloneNode(true);
    zoomedClone.classList.add("zoomed");

    zoomedClone.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      closeZoom();
    });

    overlay.appendChild(zoomedClone);
    overlay.style.display = "block";

    document.body.classList.add("no-scroll", "show-controls");

    overlay.addEventListener("touchmove", preventTouchScroll, { passive: false });
    overlay.addEventListener("touchstart", handleTouchStart, { passive: false });
    overlay.addEventListener("touchend", handleTouchEnd, { passive: false });

    zoomedClone.addEventListener("touchstart", handleTouchStart, { passive: false });
    zoomedClone.addEventListener("touchend", handleTouchEnd, { passive: false });

    currentZoomIndex = index;
    showZoomNavigation();
  }

  function closeZoom() {
    if (zoomedClone) {
      zoomedClone.remove();
      zoomedClone = null;
    }
    document.body.classList.remove("no-scroll", "show-controls");
    overlay.style.display = "none";
    overlay.removeEventListener("touchmove", preventTouchScroll);
    overlay.removeEventListener("touchstart", handleTouchStart);
    overlay.removeEventListener("touchend", handleTouchEnd);
    window.scrollTo({ top: savedScrollY });
    hideZoomNavigation();
  }

  function createCard(cardNum) {
    const img = document.createElement("img");
    img.dataset.cardNum = cardNum;
    img.loading = "lazy";
    img.alt = `Card ${cardNum}`;
    img.classList.add("card");

    const container = document.createElement("div");
    container.classList.add("card-container");
    container.dataset.cardId = cardNum;
    container.appendChild(img);

    const label = document.createElement("div");
    label.classList.add("card-label");
    label.textContent = cardNum;
    container.appendChild(label);

    const quality = manifest.revealed[cardNum];
    const isRevealed = quality === "high" || quality === "low";

    if (isRevealed) {
      mainRevealedCards.push({ id: cardNum, container });
      const path = quality === "low"
        ? `cards/Set_8/lowres/${cardNum}.png?v=${cacheBuster}`
        : `cards/Set_8/${cardNum}.png?v=${cacheBuster}`;
      img.src = path;
    } else {
      img.src = "LorcanaCardBack.png";
    }

    img.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = mainRevealedCards.findIndex(entry => entry.container.contains(img));
      if (index !== -1) {
        currentZoomList = mainRevealedCards;
        zoomToCard(index);
      }
    });

    return container;
  }

  function createBonusCard(bonusNum) {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = `cards/Set_8/bonus/bonus_${bonusNum}.png?v=${cacheBuster}`;
    img.alt = `Bonus Card ${bonusNum}`;
    img.classList.add("card");

    const container = document.createElement("div");
    container.classList.add("card-container");
    container.dataset.cardId = `bonus-${bonusNum}`;
    container.appendChild(img);

    const label = document.createElement("div");
    label.classList.add("card-label");
    label.textContent = `Bonus ${bonusNum}`;
    container.appendChild(label);

    img.onerror = () => container.remove();
    img.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = bonusRevealedCards.findIndex(entry => entry.container.contains(img));
      if (index !== -1) {
        currentZoomList = bonusRevealedCards;
        zoomToCard(index);
      }
    });

    return container;
  }

  function loadNextChunk() {
    if (isLoadingChunk) return;
    isLoadingChunk = true;

    const frag = document.createDocumentFragment();

    for (let i = 0; i < CHUNK_SIZE; i++) {
      const cardNum = currentChunkIndex * CHUNK_SIZE + i + 1;
      if (cardNum > totalCards) break;

      const padded = cardNum.toString().padStart(3, "0");
      const container = createCard(padded);
      frag.appendChild(container);
    }

    const sentinel = document.getElementById("scroll-sentinel");
    if (sentinel) sentinel.remove();

    grid.appendChild(frag);

    const newSentinel = document.createElement("div");
    newSentinel.id = "scroll-sentinel";
    newSentinel.style.height = "1px";
    grid.appendChild(newSentinel);

    setupIntersectionObserver();
    currentChunkIndex++;
    isLoadingChunk = false;

    if (currentChunkIndex * CHUNK_SIZE >= totalCards) {
      const finalSentinel = document.getElementById("scroll-sentinel");
      if (finalSentinel) finalSentinel.remove();
      loadingIndicator.classList.add("hidden");
    }
  }

  function setupIntersectionObserver() {
    const sentinel = document.getElementById("scroll-sentinel");
    if (!sentinel) return;

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadNextChunk();
    }, {
      root: null,
      rootMargin: "0px",
      threshold: 1.0
    });

    observer.observe(sentinel);
  }

  function loadFromManifest() {
    grid.innerHTML = "";
    mainRevealedCards = [];
    currentChunkIndex = 0;
    isLoadingChunk = false;
    loadingIndicator.classList.remove("hidden");

    loadNextChunk();
    loadNextChunk();
    const sentinel = document.createElement("div");
    sentinel.id = "scroll-sentinel";
    grid.appendChild(sentinel);
    setupIntersectionObserver();

    window.addEventListener("scroll", handleScrollLoad);
  }

  function handleScrollLoad() {
    const scrollY = window.scrollY || window.pageYOffset;
    const viewportHeight = window.innerHeight;
    const fullHeight = document.documentElement.scrollHeight;
    if (scrollY + viewportHeight >= fullHeight - 300) loadNextChunk();
  }

  function loadBonusCards() {
    bonusGrid.innerHTML = "";
    bonusRevealedCards = [];

    manifest.bonus.forEach(bonusNum => {
      const container = createBonusCard(bonusNum);
      bonusGrid.appendChild(container);
      bonusRevealedCards.push({ id: `bonus-${bonusNum}`, container });
    });
  }

  prevBtn.addEventListener("click", e => {
    e.stopPropagation();
    zoomToCard(currentZoomIndex - 1);
  });

  nextBtn.addEventListener("click", e => {
    e.stopPropagation();
    zoomToCard(currentZoomIndex + 1);
  });

  document.addEventListener("keydown", e => {
    if (!zoomedClone) return;
    if (e.key === "ArrowLeft") zoomToCard(currentZoomIndex - 1);
    else if (e.key === "ArrowRight") zoomToCard(currentZoomIndex + 1);
    else if (e.key === "Escape") closeZoom();
  });

  document.addEventListener("click", e => {
    if (zoomedClone && !zoomedClone.contains(e.target)) closeZoom();
  });

  fetch("cards/Set_8/manifest.json")
    .then(res => res.json())
    .then(data => {
      manifest = data;
      loadFromManifest();
      loadBonusCards();
    });
});