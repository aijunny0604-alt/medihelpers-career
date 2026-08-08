export function imageFilesFromTransfer(transfer) {
  if (!transfer) return [];
  const itemFiles = Array.from(transfer.items || [])
    .filter((item) => item.kind === 'file' && String(item.type || '').startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter(Boolean);
  if (itemFiles.length) return itemFiles;
  return Array.from(transfer.files || []).filter((file) => String(file.type || '').startsWith('image/'));
}

export function pasteImageFiles(event, onFiles) {
  const files = imageFilesFromTransfer(event.clipboardData);
  if (!files.length) return false;
  event.preventDefault();
  onFiles(files);
  return true;
}

export function dropImageFiles(event, onFiles) {
  event.preventDefault();
  const files = imageFilesFromTransfer(event.dataTransfer);
  if (files.length) onFiles(files);
  return files.length > 0;
}
