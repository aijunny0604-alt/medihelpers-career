// Native dialog provides focus trapping, Escape handling and a separate top layer.
export function confirmAction(message, { title = '삭제하시겠습니까?', confirmLabel = '삭제하기' } = {}) {
  return new Promise(resolve => {
    const previousFocus = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'action-confirm-dialog';
    const heading = document.createElement('h2');
    heading.id = 'action-confirm-title'; heading.textContent = title;
    dialog.setAttribute('aria-labelledby', heading.id);
    const copy = document.createElement('p'); copy.textContent = message;
    const actions = document.createElement('div'); actions.className = 'action-confirm-buttons';
    const cancel = document.createElement('button'); cancel.className = 'button outline'; cancel.textContent = '취소';
    const confirm = document.createElement('button'); confirm.className = 'button danger'; confirm.textContent = confirmLabel;
    let completed = false;
    const finish = value => { if (completed) return; completed = true; dialog.close(); dialog.remove(); previousFocus?.focus(); resolve(value); };
    cancel.onclick = () => finish(false); confirm.onclick = () => finish(true);
    dialog.oncancel = event => { event.preventDefault(); finish(false); };
    dialog.onclick = event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) finish(false); } };
    actions.append(cancel, confirm); dialog.append(heading, copy, actions); document.body.append(dialog); dialog.showModal(); cancel.focus();
  });
}
