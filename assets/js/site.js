const root = document.documentElement;
const header = document.querySelector('.header');
const menu = document.querySelector('#main-menu');
const menuToggle = document.querySelector('.menu-toggle');
const categoryMenu = document.querySelector('#category-menu');
const categoryToggle = document.querySelector('.category-toggle');
const languageButtons = [...document.querySelectorAll('[data-lang]')];
const mobile = matchMedia('(max-width: 990px)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const dialog = document.querySelector('#catalog-dialog');
const dialogContent = dialog.querySelector('.dialog-content');
const hero = document.querySelector('.hero');
const slides = [...hero.querySelectorAll('.slide')];
const controls = hero.querySelector('.slider-controls');
const dots = [...controls.querySelectorAll('[data-slide]')];
const rotation = controls.querySelector('.slider-rotation');
const status = controls.querySelector('.slide-status');
let language = 'tr';
let slideIndex = 0;
let paused = reducedMotion.matches;
let rotationTimer;
let touch;
let selectedLink;

function translate(key) {
  return translations[language][key] ?? translations.tr[key];
}

function localizedText(record, field) {
  return record[field + language.toUpperCase()] || record[field + 'TR'] || record[field + 'EN'];
}

function makeElement(tag, value) {
  const node = document.createElement(tag);
  if (value) node.textContent = value;
  return node;
}

function createProductCard(product) {
  const article = makeElement('article');
  if (product.id) article.dataset.productId = product.id;
  const name = localizedText(product, 'name');
  article.append(makeElement('h4', name));
  const description = localizedText(product, 'description');
  if (description) article.append(makeElement('p', description));
  if (product.images?.length) {
    const images = makeElement('div');
    images.className = 'product-images';
    for (const source of product.images) {
      const image = makeElement('img');
      image.src = source;
      image.alt = name ?? '';
      image.loading = 'lazy';
      images.append(image);
    }
    article.append(images);
  }
  if (product.specifications?.length) {
    const specifications = makeElement('dl');
    for (const specification of product.specifications) {
      const label = localizedText(specification, 'label');
      const value = localizedText(specification, 'value');
      if (label && value) specifications.append(makeElement('dt', label), makeElement('dd', value));
    }
    if (specifications.childElementCount) article.append(makeElement('h5', translate('specs')), specifications);
  }
  if (product.videoUrl) {
    const video = makeElement('a', translate('watch'));
    video.href = product.videoUrl;
    video.className = 'detail-back';
    article.append(video);
  }
  return article;
}

function setLanguage(next) {
  language = translations[next] ? next : 'tr';
  root.lang = language;
  document.title = translate('title');
  document.querySelector('meta[name="description"]').content = translate('description');
  document.querySelector('meta[property="og:title"]').content = translate('title');
  document.querySelector('meta[property="og:description"]').content = translate('description');
  document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = translate(node.dataset.i18n); });
  document.querySelectorAll('[data-label]').forEach(node => node.setAttribute('aria-label', translate(node.dataset.label)));
  document.querySelectorAll('[data-country]').forEach(node => { node.textContent = language === 'tr' ? 'Türkiye' : 'Turkey'; });
  languageButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lang === language)));
  document.querySelectorAll('[data-products]').forEach(container => {
    container.replaceChildren(...products.filter(record => record.category === container.dataset.products).map(createProductCard));
  });
  status.textContent = translate(dots[slideIndex].dataset.label);
  try { localStorage.setItem('kayabas-language', language); } catch { /* Storage is optional. */ }
}

function setCategoryMenu(open) {
  categoryMenu.hidden = !open;
  categoryToggle.setAttribute('aria-expanded', String(open));
}

function setMenu(open) {
  menu.classList.toggle('open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.dataset.label = open ? 'closeMenu' : 'menu';
  menuToggle.setAttribute('aria-label', translate(menuToggle.dataset.label));
  if (!open) setCategoryMenu(false);
}

function updateNavigation() {
  const links = [...menu.querySelectorAll(':scope > a:not(.quote), .nav-group > a')];
  const hash = location.hash;
  const active = links.find(link => link.hash === hash)
    ?? (hash.startsWith('#kategori-') ? links.find(link => link.hash === '#makineler') : links[0]);
  links.forEach(link => link.removeAttribute('aria-current'));
  active?.setAttribute('aria-current', 'location');
}

function openCategory(link) {
  const detail = document.querySelector(link.hash);
  if (!detail || typeof dialog.showModal !== 'function') return false;
  selectedLink = link.closest('#category-menu') ? (mobile.matches ? menuToggle : categoryToggle) : link;
  dialogContent.replaceChildren(...[...detail.children].map(child => child.cloneNode(true)));
  dialogContent.querySelector('h3').id = 'dialog-title';
  dialogContent.querySelector('.detail-copy > .detail-back').remove();
  dialog.showModal();
  dialog.querySelector('.dialog-close').focus();
  return true;
}

function closeCategory() {
  dialog.close();
  selectedLink?.focus({preventScroll:true});
}


menuToggle.hidden = false;
categoryToggle.hidden = false;
document.querySelector('.language').hidden = false;
menuToggle.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
categoryToggle.addEventListener('click', () => setCategoryMenu(categoryMenu.hidden));
mobile.addEventListener('change', () => setMenu(false));
window.addEventListener('hashchange', updateNavigation);
updateNavigation();
header.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (!categoryMenu.hidden) {
    setCategoryMenu(false);
    categoryToggle.focus();
  } else if (menu.classList.contains('open')) {
    setMenu(false);
    menuToggle.focus();
  }
});
document.addEventListener('click', event => {
  if (!categoryMenu.hidden && !event.target.closest('.nav-group')) setCategoryMenu(false);
  const link = event.target.closest('a');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  if (link.closest('#main-menu')) setMenu(false);
  if (link.hash.startsWith('#kategori-') && openCategory(link)) {
    event.preventDefault();
  } else if (link.closest('#main-menu') && mobile.matches && link.hash) {
    const destination = document.querySelector(link.hash);
    destination?.setAttribute('tabindex','-1');
    destination?.focus({preventScroll:true});
  }
});
dialog.querySelector('.dialog-close').addEventListener('click', closeCategory);
dialog.addEventListener('cancel', event => { event.preventDefault(); closeCategory(); });
dialog.addEventListener('click', event => { if (event.target === dialog) closeCategory(); });
languageButtons.forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.lang)));

function showSlide(next) {
  slideIndex = (next + slides.length) % slides.length;
  slides.forEach((slide, index) => slide.classList.toggle('active', index === slideIndex));
  dots.forEach((dot, index) => {
    if (index === slideIndex) dot.setAttribute('aria-current','true');
    else dot.removeAttribute('aria-current');
  });
  status.textContent = translate(dots[slideIndex].dataset.label);
}

function scheduleRotation() {
  clearInterval(rotationTimer);
  if (!paused && !document.hidden) rotationTimer = setInterval(() => showSlide(slideIndex + 1), 6000);
}

function setPaused(value) {
  paused = value;
  rotation.textContent = paused ? '▶' : 'Ⅱ';
  rotation.dataset.label = paused ? 'play' : 'pause';
  rotation.setAttribute('aria-label', translate(rotation.dataset.label));
  status.setAttribute('aria-live', paused ? 'polite' : 'off');
  scheduleRotation();
}

function moveSlide(next) {
  setPaused(true);
  showSlide(next);
}

controls.hidden = false;
showSlide(0);
setPaused(paused);
controls.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button === rotation) setPaused(!paused);
  else if (button.hasAttribute('data-slide')) moveSlide(Number(button.dataset.slide));
  else moveSlide(slideIndex + Number(button.dataset.step));
});
controls.addEventListener('keydown', event => {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
  event.preventDefault();
  moveSlide(slideIndex + (event.key === 'ArrowRight' ? 1 : -1));
});
hero.addEventListener('touchstart', event => {
  const point = event.touches[0];
  touch = {x:point.clientX,y:point.clientY};
}, {passive:true});
hero.addEventListener('touchcancel', () => { touch = undefined; });
hero.addEventListener('touchend', event => {
  if (!touch) return;
  const point = event.changedTouches[0];
  const x = point.clientX - touch.x;
  const y = point.clientY - touch.y;
  if (Math.abs(x)>48 && Math.abs(x)>Math.abs(y)*1.5) moveSlide(slideIndex + (x<0 ? 1 : -1));
  touch = undefined;
}, {passive:true});
document.addEventListener('visibilitychange', scheduleRotation);
reducedMotion.addEventListener('change', event => { if (event.matches) setPaused(true); });

const gallery = [...document.querySelectorAll('.gallery-media figure')];
for (const video of galleryVideos) {
  const slot = gallery[video.slot - 1];
  if (!slot || !video.url) continue;
  const link = makeElement('a');
  link.href = video.url;
  link.className = 'button';
  link.dataset.i18n = 'watch';
  slot.append(link);
}
let initialLanguage = 'tr';
try { initialLanguage = localStorage.getItem('kayabas-language') || 'tr'; } catch { /* Storage is optional. */ }
setLanguage(initialLanguage);

if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('entering');
      observer.unobserve(entry.target);
    }
  }, {threshold:.15});
  document.querySelectorAll('.card').forEach(card => observer.observe(card));
}
