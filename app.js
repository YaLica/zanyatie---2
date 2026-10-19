'use strict';

const byId = id => document.getElementById(id);
const pages = ['home', 'lesson', 'phonetics', 'gym', 'files'];
const illustrationDialog = byId('illustrationDialog');
const pdfDialog = byId('pdfDialog');
let currentPage = 'home';
let homeScroll = 0;
let modalTrigger = null;
let lockedScroll = 0;
let previousBodyStyle = null;

function pauseAll(except) {
  document.querySelectorAll('audio,video').forEach(media => {
    if (media !== except) media.pause();
  });
}

document.querySelectorAll('audio,video').forEach(media => {
  media.addEventListener('play', () => pauseAll(media));
  const error = media.parentElement.querySelector('.media-error');
  media.addEventListener('error', () => { error.hidden = false; });
  media.addEventListener('loadedmetadata', () => { error.hidden = true; });
});

function openModal(dialog, trigger) {
  pauseAll();
  modalTrigger = trigger;
  lockedScroll = window.scrollY;
  previousBodyStyle = document.body.getAttribute('style');
  document.body.style.position = 'fixed';
  document.body.style.top = -lockedScroll + 'px';
  document.body.style.width = '100%';
  dialog.showModal();
}

function restoreAfterModal() {
  if (!modalTrigger) return;
  if (previousBodyStyle === null) document.body.removeAttribute('style');
  else document.body.setAttribute('style', previousBodyStyle);
  window.scrollTo({top: lockedScroll, behavior: 'instant'});
  if (modalTrigger && modalTrigger.isConnected) modalTrigger.focus({preventScroll: true});
  modalTrigger = null;
}

document.querySelectorAll('[data-zoom]').forEach(button => {
  button.addEventListener('click', () => {
    const sourceImage = button.querySelector('img');
    const image = byId('fullIllustration');
    image.src = button.dataset.zoom;
    image.alt = sourceImage.alt;
    byId('closeIllustration').textContent = currentPage === 'gym'
      ? 'Вернуться к упражнению ✕' : 'Вернуться к заданию ✕';
    openModal(illustrationDialog, button);
  });
});

document.querySelectorAll('[data-preview]').forEach(button => {
  button.addEventListener('click', () => {
    byId('pdfDialogTitle').textContent = button.dataset.title;
    byId('largePdfPreview').src = button.dataset.preview;
    byId('largePdfPreview').alt = button.dataset.title;
    byId('dialogDownload').href = button.dataset.pdf;
    openModal(pdfDialog, button);
  });
});

byId('closeIllustration').addEventListener('click', () => illustrationDialog.close());
byId('closePdfDialog').addEventListener('click', () => pdfDialog.close());
[illustrationDialog, pdfDialog].forEach(dialog => {
  dialog.addEventListener('close', restoreAfterModal);
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
});

function navigate(initial = false) {
  const requested = location.hash.slice(1);
  const target = pages.includes(requested) ? requested : 'home';
  if (currentPage === 'home' && target !== 'home') homeScroll = window.scrollY;
  [illustrationDialog, pdfDialog].forEach(dialog => {
    if (dialog.open) {
      dialog.close();
      restoreAfterModal();
    }
  });
  pauseAll();
  const previous = currentPage;
  pages.forEach(id => { byId(id).hidden = id !== target; });
  currentPage = target;
  if (!initial) {
    window.scrollTo({top: target === 'home' ? homeScroll : 0, behavior: 'instant'});
    if (target === 'home') {
      const link = document.querySelector('a[href="#' + previous + '"]');
      if (link) link.focus({preventScroll: true});
    } else byId(target).querySelector('h1').focus({preventScroll: true});
  }
}

window.addEventListener('hashchange', () => navigate());
window.addEventListener('pagehide', () => pauseAll());
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseAll(); });
document.addEventListener('contextmenu', event => {
  if (event.target.closest('img,audio,video')) event.preventDefault();
});
document.addEventListener('dragstart', event => {
  if (event.target.closest('img,audio,video')) event.preventDefault();
});
navigate(true);
