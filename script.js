// Full updated script with swipe support and faded navigation buttons
const grid = document.getElementById("cardGrid");
const bonusGrid = document.getElementById("bonusGrid");
const toggleBtn = document.getElementById("toggleRevealed");
const loadingIndicator = document.getElementById("loading");
const overlay = document.getElementById("overlay");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

let showMissing = false;
let zoomedClone = null;
let cacheBuster = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
let revealedCards = [];
let currentZoomIndex = -1;
let lastZoomTime = 0;
const zoomCooldown = 200;

let manifest = { revealed: [], bonus: [] };
const totalCards = 204;
let touchStartX = 0;
let touchEndX = 0;

const refreshBtn = document.createElement("button");
refreshBtn.textContent = "Refresh Card Images";
refreshBtn.id = "refreshImagesBtn";
refreshBtn.title = "Force all card images to reload in case any were updated";
refreshBtn.style.cssText = "background-color:#771517;color:#fff;border:2px solid #d3ba84;padding:0.5rem 1rem;margin:1rem auto;display:block;border-radius:8px;cursor:pointer;";
refreshBtn.addEventListener("click", () => {
  cacheBuster = Date.now();
  loadFromManifest();
});
document.querySelector("main").insertBefore(refreshBtn, grid);



function preventTouchScroll(e) {
  e.preventDefault();
}

function handleTouchStart(e) {
  touchStartX = e.changedTouches[0].screenX;
}

function handleTouchEnd(e) {
  touchEndX = e.changedTouches[0].screenX;
  const diff = touchEndX - touchStartX;
  if (Math.abs(diff) > 50) {
    if (diff < 0) {
      zoomToCard(currentZoomIndex + 1);
    } else {
      zoomToCard(currentZoomIndex - 1);
    }
  }
}

function showZoomNavigation() {
  prevBtn.style.display = "flex";
  nextBtn.style.display = "flex";

  prevBtn.style.opacity = currentZoomIndex > 0 ? "1" : "0.3";
  nextBtn.style.opacity = currentZoomIndex < revealedCards.length - 1 ? "1" : "0.3";
}

function hideZoomNavigation() {
  prevBtn.style.display = "none";
  nextBtn.style.display = "none";
}

let savedScrollY = 0;

function zoomToCard(index) {
  const now = Date.now();
  if (now - lastZoomTime < zoomCooldown) return;
  lastZoomTime = now;
  if (index < 0 || index >= revealedCards.length) return;

  // Prevent zooming the same card twice
  if (zoomedClone && currentZoomIndex === index) return;

  savedScrollY = window.scrollY;
  closeZoom();

  const img = revealedCards[index].querySelector(".card");
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

  // Swipe support for both overlay and zoomed image
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

  // Restore scroll position (make sure savedScrollY is declared globally)
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
  container.appendChild(img);

  const label = document.createElement("div");
  label.classList.add("card-label");
  label.textContent = cardNum;
  container.appendChild(label);

  const quality = manifest.revealed[cardNum]; // "high", "low", or undefined
  const isRevealed = quality === "high" || quality === "low";

  if (!isRevealed && !showMissing) {
    container.style.display = "none";
  }

  if (isRevealed) {
    revealedCards.push(container);
    const path = quality === "low"
      ? `cards/Set_8/lowres/${cardNum}.png?v=${cacheBuster}`
      : `cards/Set_8/${cardNum}.png?v=${cacheBuster}`;
    img.src = path;
  } else {
    img.src = "LorcanaCardBack.png";
    container.dataset.missing = "true";
  }

  img.addEventListener("click", (e) => {
    e.stopPropagation();
    const index = revealedCards.findIndex(c => c.contains(img));
    if (index !== -1) {
      zoomToCard(index);
    }
  });

  return container;
}




function createBonusCard(bonusNum) {
  const filename = `bonus_${bonusNum}.png`;
  const img = document.createElement("img");
  img.loading = "lazy";
  img.src = `cards/Set_8/bonus/${filename}?v=${cacheBuster}`;
  img.alt = `Bonus Card ${bonusNum}`;
  img.classList.add("card");

  const container = document.createElement("div");
  container.classList.add("card-container");
  container.appendChild(img);

  const label = document.createElement("div");
  label.classList.add("card-label");
  label.textContent = `Bonus ${bonusNum}`;
  container.appendChild(label);

  img.onerror = () => {
    container.remove(); // Remove if the image doesn't load
  };

  img.addEventListener("click", (e) => {
    e.stopPropagation();
    const index = revealedCards.findIndex(c => c.contains(img));
    if (index !== -1) {
      zoomToCard(index);
    }
  });

  return container;
}



function loadFromManifest() {
  grid.innerHTML = "";
  revealedCards = [];
  loadingIndicator.classList.remove("hidden");

  const frag = document.createDocumentFragment();

  for (let i = 1; i <= totalCards; i++) {
    const cardNum = i.toString().padStart(3, "0");
    const container = createCard(cardNum);
    frag.appendChild(container);
  }

  grid.appendChild(frag);
  loadingIndicator.classList.add("hidden");
}


function loadBonusCards() {
  bonusGrid.innerHTML = "";

  manifest.bonus.forEach(bonusNum => {
    const container = createBonusCard(bonusNum);
    bonusGrid.appendChild(container);
    revealedCards.push(container); // include in zoom navigation
  });
}


function toggleMissing() {
  showMissing = !showMissing;
  toggleBtn.textContent = showMissing ? "Hide Missing Card Slots" : "Show Missing Card Slots";
  document.querySelectorAll(".card-container").forEach(container => {
    const isMissing = container.dataset.missing === "true";
    container.style.display = (!showMissing && isMissing) ? "none" : "flex";
  });
}

toggleBtn.textContent = "Show Missing Card Slots";
toggleBtn.addEventListener("click", toggleMissing);

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
  if (e.key === "ArrowLeft") {
    zoomToCard(currentZoomIndex - 1);
  } else if (e.key === "ArrowRight") {
    zoomToCard(currentZoomIndex + 1);
  } else if (e.key === "Escape") {
    closeZoom();
  }
});

document.addEventListener("click", (e) => {
  if (zoomedClone && !zoomedClone.contains(e.target)) {
    closeZoom();
  }
});


fetch("cards/Set_8/manifest.json")
  .then(res => res.json())
  .then(data => {
    manifest = data;
    loadFromManifest();
    loadBonusCards();
    toggleBtn.click();
  });
