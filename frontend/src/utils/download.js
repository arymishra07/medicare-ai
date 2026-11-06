export const saveBlob = (blob, filename = 'download') => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const filenameFromResponse = (response, fallback = 'download') => {
  const header = response.headers?.['content-disposition'] || '';
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) return decodeURIComponent(utf8Match[1]);
  const match = header.match(/filename="?([^";]+)"?/i);
  return match ? match[1] : fallback;
};
