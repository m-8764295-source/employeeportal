const categories = [
  { id: "popular", label: "Popular", icon: "flame" },
  { id: "all", label: "All", icon: "star" },
];

const restaurants = [
  {
    name: "Mori Cafe",
    discount: "",
    rating: "4.9",
    time: "15-25 min",
    distance: "0.8 km",
    tags: "Cafe &bull; Rice &bull; Drinks",
    price: "RM3.90",
    image: "assets/mori.png",
  },
];

const merchantCategories = [
  { id: "recommend", label: "Recommend" },
  { id: "rice", label: "Rice" },
  { id: "chop", label: "Chicken Chop" },
  { id: "fish", label: "Fish" },
  { id: "drinks", label: "Drinks" },
  { id: "coffee", label: "Coffee" },
  { id: "cake", label: "Cake" },
];

const merchantMenu = [
  {
    category: "recommend",
    name: "Chicken Chop Rice",
    chineseName: "鸡扒饭",
    description: "Crispy chicken chop served with rice, coleslaw, and mushroom sauce.",
    price: 13.9,
    popular: true,
  },
  {
    category: "recommend",
    name: "Curry Sauce Chicken Rice",
    chineseName: "咖喱酱鸡饭",
    description: "Tender chicken with creamy curry sauce, served with rice and coleslaw.",
    price: 13.9,
    popular: true,
  },
  {
    category: "recommend",
    name: "Mushroom Chicken Rice",
    chineseName: "蘑菇鸡饭",
    description: "Grilled chicken topped with mushroom sauce, served with rice and coleslaw.",
    price: 13.9,
    popular: true,
  },
  {
    category: "recommend",
    name: "Sweet n Spicy Chicken Rice",
    chineseName: "泰式甜辣鸡饭",
    description: "Crispy chicken with sweet and spicy sauce, served with rice and coleslaw.",
    price: 13.9,
    popular: true,
  },
  { category: "rice", name: "Black Pepper Chicken Rice", chineseName: "黑胡椒鸡饭", price: 13.9 },
  { category: "rice", name: "Mongolia Sauce Chicken Rice", chineseName: "蒙古酱鸡饭", price: 13.9 },
  { category: "rice", name: "Penang Chicken Roll Rice", chineseName: "槟城鸡肉卷饭", price: 13.9 },
  { category: "rice", name: "Dori Fish Rice", chineseName: "鱼扒饭", price: 13.9 },
  { category: "rice", name: "Curry Sauce Fish Rice", chineseName: "咖喱酱鱼饭", price: 13.9 },
  { category: "rice", name: "Black Pepper Fish Rice", chineseName: "黑胡椒鱼饭", price: 13.9 },
  { category: "rice", name: "Mushroom Fish Rice", chineseName: "蘑菇鱼饭", price: 13.9 },
  { category: "chop", name: "Chicken Chop", chineseName: "鸡扒", price: 13.9, popular: true },
  { category: "chop", name: "Curry Sauce Chicken Chop", chineseName: "咖喱酱鸡扒", price: 13.9 },
  { category: "chop", name: "Black Pepper Chicken Chop", chineseName: "黑胡椒鸡扒", price: 13.9 },
  { category: "chop", name: "Mushroom Chicken Chop", chineseName: "蘑菇鸡扒", price: 13.9 },
  { category: "chop", name: "Sweet n Spicy Chicken Chop", chineseName: "泰式甜辣鸡扒", price: 13.9 },
  { category: "chop", name: "Mongolia Sauce Chicken Chop", chineseName: "蒙古酱鸡扒", price: 13.9 },
  { category: "fish", name: "Dori Fish Fillet", chineseName: "鱼扒", price: 13.9 },
  { category: "fish", name: "Curry Sauce Fish Fillet", chineseName: "咖喱酱鱼扒", price: 13.9 },
  { category: "fish", name: "Black Pepper Fish Fillet", chineseName: "黑胡椒鱼扒", price: 13.9 },
  { category: "fish", name: "Mushroom Fish Fillet", chineseName: "蘑菇鱼扒", price: 13.9 },
  { category: "fish", name: "Sweet n Spicy Fish Fillet", chineseName: "泰式甜辣鱼扒", price: 13.9 },
  { category: "drinks", name: "Oolong Tea", chineseName: "乌龙青茶", price: 8.9 },
  { category: "drinks", name: "Oolong Milk Tea", chineseName: "乌龙奶茶", price: 8.9 },
  { category: "drinks", name: "Red Tea", chineseName: "红茶", price: 8.9 },
  { category: "drinks", name: "Milk Tea", chineseName: "奶茶", price: 8.9 },
  { category: "drinks", name: "Green Tea", chineseName: "绿茶", price: 8.9 },
  { category: "drinks", name: "Green Milk Tea", chineseName: "奶绿", price: 8.9 },
  { category: "drinks", name: "Pearl Milk Tea", chineseName: "珍珠奶茶", price: 8.9 },
  { category: "drinks", name: "Pudding Milk Tea", chineseName: "布丁奶茶", price: 8.9 },
  { category: "coffee", name: "Mocha", chineseName: "摩卡", price: 8.9 },
  { category: "coffee", name: "Cappuccino", chineseName: "卡布奇诺", price: 8.9 },
  { category: "coffee", name: "Tiramisu", chineseName: "提拉米苏", price: 8.9 },
  { category: "coffee", name: "Italian Coffee", chineseName: "意大利咖啡", price: 8.9 },
  { category: "cake", name: "Assorted Cake", chineseName: "蛋糕", price: 12.9 },
  { category: "cake", name: "Columbia Chocolate", chineseName: "哥伦比亚巧克力", price: 8.9 },
];

let cartCount = 0;
let cartTotal = 0;

function iconSvg(type) {
  const icons = {
    grid: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />',
    tag: '<path d="M20 12 12 20 4 12l8-8 8 8Z" /><path d="M9 9h.01" />',
    flame: '<path d="M12 22c4 0 7-2.7 7-6.6 0-3.2-2.2-5.1-4.2-7.4-.5 2.4-1.8 3.7-3.2 4.5.2-3-1.1-5.1-3.6-7.5.3 4.1-3 6.2-3 10.3C5 19.2 8 22 12 22Z" />',
    star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />',
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
        <article class="restaurant-card" role="button" tabindex="0" onclick="openMerchant()">
          <div class="restaurant-image">
            <img src="${restaurant.image}" alt="${restaurant.name}" />
            ${restaurant.discount ? `<span class="discount">${restaurant.discount}</span>` : ""}
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

function renderMerchantTabs() {
  const tabs = document.getElementById("merchant-tabs");

  tabs.innerHTML = merchantCategories
    .map(
      (category, index) => `
        <button class="merchant-tab ${index === 0 ? "active" : ""}" type="button" data-category="${category.id}">
          ${category.label}
        </button>
      `
    )
    .join("");
}

function renderMerchantMenu(categoryId = "recommend") {
  const menuList = document.getElementById("merchant-menu-list");
  const title = document.getElementById("merchant-menu-title");
  const category = merchantCategories.find((item) => item.id === categoryId);
  const items = merchantMenu.filter((item) => item.category === categoryId);

  title.textContent = category.label;
  menuList.innerHTML = items
    .map(
      (item) => `
        <article class="menu-item">
          <div>
            <h3>${item.name}</h3>
            <strong>${item.chineseName}</strong>
            <p>${item.description || "Mori Cafe menu item."}</p>
          </div>
          <div class="menu-item-side">
            ${item.popular ? '<span class="popular-badge">&#128293; Popular</span>' : ""}
            <span class="menu-price">RM ${item.price.toFixed(2)}</span>
            <button class="menu-add-button" type="button" aria-label="Add ${item.name}" data-price="${item.price}">+</button>
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

  document.getElementById("restaurant-list").addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest(".restaurant-card");
    if (!card) return;
    event.preventDefault();
    openMerchant();
  });
}

function bindFavoriteButtons() {
  document.querySelectorAll(".heart-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      button.classList.toggle("active");
    });
  });
}

function bindMerchantInteractions() {
  document.getElementById("merchant-tabs").addEventListener("click", (event) => {
    const tab = event.target.closest(".merchant-tab");
    if (!tab) return;

    document.querySelectorAll(".merchant-tab").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    renderMerchantMenu(tab.dataset.category);
  });

  document.getElementById("merchant-menu-list").addEventListener("click", (event) => {
    const button = event.target.closest(".menu-add-button");
    if (!button) return;

    cartCount += 1;
    cartTotal += Number(button.dataset.price);
    updateCartBar();
  });
}

function updateCartBar() {
  document.getElementById("cart-count").textContent = cartCount;
  document.getElementById("cart-total").textContent = `RM${cartTotal.toFixed(2)}`;
  document.querySelector(".view-cart-button").disabled = cartCount === 0;
}

function showScreen(screenName) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("active-screen", screen.dataset.screen === screenName);
  });

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.target === screenName);
  });

  document.querySelector(".bottom-nav").classList.toggle("hidden", screenName === "merchant");
  window.scrollTo({ top: 0, behavior: "auto" });
}

function openMerchant() {
  showScreen("merchant");
}

function scrollToRestaurants() {
  showScreen("landing");
  document.getElementById("restaurants").scrollIntoView({ behavior: "smooth", block: "start" });
}

renderCategories();
renderRestaurants();
renderMerchantTabs();
renderMerchantMenu();
bindHomeInteractions();
bindMerchantInteractions();
