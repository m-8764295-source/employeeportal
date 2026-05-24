const categories = [
  { id: "all", label: "All", icon: "grid" },
  { id: "promo", label: "Promo", icon: "tag" },
  { id: "popular", label: "Popular", icon: "flame" },
  { id: "new", label: "New", icon: "badge" },
  { id: "drinks", label: "Drinks", icon: "cup" },
  { id: "asian", label: "Asian", icon: "bowl" },
  { id: "western", label: "Western", icon: "burger" },
  { id: "more", label: "More", icon: "more" },
];

const restaurants = [
  {
    name: "Nasi Ayam Xpress",
    discount: "20% OFF",
    rating: "4.8",
    time: "15-25 min",
    distance: "1.2 km",
    tags: "Malaysian &bull; Rice &bull; Chicken",
    price: "RM4.90",
  },
  {
    name: "Mamak Corner",
    discount: "10% OFF",
    rating: "4.7",
    time: "20-30 min",
    distance: "1.5 km",
    tags: "Malaysian &bull; Noodles &bull; Halal",
    price: "RM3.90",
  },
  {
    name: "Campus Tealive",
    discount: "15% OFF",
    rating: "4.9",
    time: "10-20 min",
    distance: "0.8 km",
    tags: "Drinks &bull; Milk Tea &bull; Beverages",
    price: "RM5.50",
  },
  {
    name: "Burger Lab",
    discount: "20% OFF",
    rating: "4.6",
    time: "20-30 min",
    distance: "2.1 km",
    tags: "Western &bull; Burgers &bull; Fast Food",
    price: "RM6.90",
  },
];

function iconSvg(type) {
  const icons = {
    grid: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />',
    tag: '<path d="M20 12 12 20 4 12l8-8 8 8Z" /><path d="M9 9h.01" />',
    flame: '<path d="M12 22c4 0 7-2.7 7-6.6 0-3.2-2.2-5.1-4.2-7.4-.5 2.4-1.8 3.7-3.2 4.5.2-3-1.1-5.1-3.6-7.5.3 4.1-3 6.2-3 10.3C5 19.2 8 22 12 22Z" />',
    badge: '<path d="m12 2 2.1 4.1 4.6-.7-2.1 4.2 3.4 3.3-4.7.7L13.2 18 11 13.7l-4.7-.7 3.4-3.3-2.1-4.2 4.6.7L12 2Z" />',
    cup: '<path d="M7 8h10l-1 12H8L7 8Z" /><path d="M9 4h6" /><path d="M12 4v4" />',
    bowl: '<path d="M4 13h16a8 8 0 0 1-16 0Z" /><path d="M8 9h8" /><path d="m16 5 4-2" />',
    burger: '<path d="M5 12h14" /><path d="M6 16h12" /><path d="M7 20h10" /><path d="M5 12c0-4 3-7 7-7s7 3 7 7" />',
    more: '<circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />',
  };

  return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[type]}</svg>`;
}

function renderCategories() {
  const categoryStrip = document.getElementById("category-strip");

  categoryStrip.innerHTML = categories
    .map(
      (category, index) => `
        <button class="category-button ${index === 0 ? "active" : ""}" type="button" data-category="${category.id}">
          <span class="category-icon">${iconSvg(category.icon)}</span>
          <span>${category.label}</span>
        </button>
      `
    )
    .join("");
}

function renderRestaurants(items = restaurants) {
  const restaurantList = document.getElementById("restaurant-list");

  restaurantList.innerHTML = items
    .map(
      (restaurant) => `
        <article class="restaurant-card">
          <div class="restaurant-image">
            <img src="assets/food.png" alt="${restaurant.name}" />
            <span class="discount">${restaurant.discount}</span>
          </div>
          <div class="restaurant-info">
            <h3>${restaurant.name}</h3>
            <p><span class="star">&#9733;</span> ${restaurant.rating} <span>&bull;</span> ${restaurant.time} <span>&bull;</span> ${restaurant.distance}</p>
            <div class="restaurant-tags">${restaurant.tags}</div>
            <span class="price-chip">From ${restaurant.price}</span>
          </div>
          <div class="card-actions">
            <button class="heart-button" type="button" aria-label="Save ${restaurant.name}">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
              </svg>
            </button>
            <button class="open-button" type="button" aria-label="Open ${restaurant.name}">&rsaquo;</button>
          </div>
        </article>
      `
    )
    .join("");
}

function bindHomeInteractions() {
  document.getElementById("restaurant-search").addEventListener("input", (event) => {
    const query = event.target.value.trim().toLowerCase();
    const filtered = restaurants.filter((restaurant) => {
      return [restaurant.name, restaurant.tags].some((value) => value.toLowerCase().includes(query));
    });

    renderRestaurants(filtered);
    bindFavoriteButtons();
  });

  document.getElementById("category-strip").addEventListener("click", (event) => {
    const button = event.target.closest(".category-button");
    if (!button) return;

    document.querySelectorAll(".category-button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
  });

  bindFavoriteButtons();
}

function bindFavoriteButtons() {
  document.querySelectorAll(".heart-button").forEach((button) => {
    button.addEventListener("click", () => {
      button.classList.toggle("active");
    });
  });
}

function showScreen(screenName) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("active-screen", screen.dataset.screen === screenName);
  });

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.target === screenName);
  });
}

function scrollToRestaurants() {
  showScreen("landing");
  document.getElementById("restaurants").scrollIntoView({ behavior: "smooth", block: "start" });
}

renderCategories();
renderRestaurants();
bindHomeInteractions();
