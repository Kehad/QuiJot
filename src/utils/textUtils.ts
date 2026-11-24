export function htmlToPlainText(html: string): string {
  if (!html) return '';
  if (typeof document !== 'undefined') {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.innerText || temp.textContent || '';
  }
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
}

export function htmlToMarkdown(html: string): string {
  if (!html) return '';
  let md = html;
  // Convert list items
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  // Convert bold
  md = md.replace(/<(b|strong)[^>]*>(.*?)<\/\1>/gi, '**$2**');
  // Convert italic
  md = md.replace(/<(i|em)[^>]*>(.*?)<\/\1>/gi, '*$2*');
  // Convert underline
  md = md.replace(/<u[^>]*>(.*?)<\/u>/gi, '<u>$1</u>');
  // Convert line breaks and paragraph ends
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<\/(p|div|ul|ol)>/gi, '\n');
  md = md.replace(/<(p|div|ul|ol)[^>]*>/gi, '');
  // Strip any remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');
  // Decode HTML entities if DOM is available
  if (typeof document !== 'undefined') {
    const temp = document.createElement('div');
    temp.innerHTML = md;
    return temp.innerText || temp.textContent || '';
  }
  return md;
}

export function formatInitialContent(raw: string): string {
  if (!raw) return '';
  // If it already contains HTML tags (like <b>, <div>, <p>, <ul>, <i>, <u>, etc.)
  if (/<[a-z][\s\S]*>/i.test(raw)) {
    return raw;
  }
  // Convert plain text newlines into HTML divs
  return raw
    .split('\n')
    .map((line) => (line ? `<div>${escapeHtml(line)}</div>` : '<div><br></div>'))
    .join('');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function isHtmlEmpty(html: string): boolean {
  if (!html) return true;
  const stripped = html
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  return stripped.length === 0;
}

