import { initScrollReveal } from './modules/scroll.js';
import { initSmoothScroll } from './modules/navigation.js';
import { initMobileMenu } from './modules/mobileMenu.js';
import { initSearch } from './modules/search.js';

document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initSmoothScroll();
    initMobileMenu();
    initSearch();
});