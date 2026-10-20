// 접힌 선택정보 안의 오류도 사용자가 바로 고칠 수 있도록 펼친 뒤 이동한다.
export function revealAndFocusField(node) {
  if (!node) return;
  for (let parent = node.parentElement; parent; parent = parent.parentElement) {
    if (parent.tagName === 'DETAILS') parent.open = true;
  }
  node.focus?.();
}
