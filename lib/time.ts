export function formatISTTimestamp(date: Date): string {
  const istString = date.toLocaleString('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  // 'en-CA' locale returns "yyyy-mm-dd, hh:mm:ss" — strip the comma to match the spec
  return istString.replace(',', '');
}
