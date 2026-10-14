export function formatTimeAgo(isoDate: string | undefined): string {
  if (!isoDate) return '';
  
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'updated today';
  if (diffDays === 1) return 'updated yesterday';
  if (diffDays < 30) return `updated ${diffDays} days ago`;
  
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return 'updated 1 month ago';
  if (diffMonths < 12) return `updated ${diffMonths} months ago`;
  
  const diffYears = Math.floor(diffMonths / 12);
  if (diffYears === 1) return 'updated 1 year ago';
  return `updated ${diffYears} years ago`;
}

export function formatDownloads(downloads: number | undefined): string {
  if (!downloads) return '';
  
  if (downloads >= 1000000) {
    const millions = (downloads / 1000000).toFixed(1);
    return `${millions}M downloads/week`;
  }
  if (downloads >= 1000) {
    const thousands = (downloads / 1000).toFixed(0);
    return `${thousands}K downloads/week`;
  }
  return `${downloads} downloads/week`;
}
