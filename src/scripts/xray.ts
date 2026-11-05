// X-ray lens: desktop follows the pointer; touch reveals on press and hold; keyboard reveals on focus.
export function initXray(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-xray]').forEach((card) => {
    const media = card.querySelector<HTMLElement>('.pc__media, [data-xray-media]');
    if (!media) return;
    let hold: number | undefined;
    const set = (e: PointerEvent) => {
      const r = media.getBoundingClientRect();
      media.style.setProperty('--x', `${((e.clientX - r.left) / r.width) * 100}%`);
      media.style.setProperty('--y', `${((e.clientY - r.top) / r.height) * 100}%`);
    };
    media.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { set(e); media.style.setProperty('--r', '110px'); } });
    media.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') media.style.setProperty('--r', '0px'); card.classList.remove('is-xray'); clearTimeout(hold); });
    media.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      set(e);
      hold = window.setTimeout(() => { card.classList.add('is-xray'); navigator.vibrate?.(8); }, 220);
    });
    const end = () => { clearTimeout(hold); setTimeout(() => card.classList.remove('is-xray'), 60); };
    media.addEventListener('pointerup', end); media.addEventListener('pointercancel', end);
    // A completed hold should not also open the link
    card.addEventListener('click', (e) => { if (card.classList.contains('is-xray')) e.preventDefault(); }, true);
    media.addEventListener('contextmenu', (e) => e.preventDefault());
    card.addEventListener('focusin', () => card.classList.add('is-xray'));
    card.addEventListener('focusout', () => card.classList.remove('is-xray'));
  });
}
