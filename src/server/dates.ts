export function getCurrentMonthRange(referenceDate = new Date()) {
  const start = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1)
  );
  const end = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1, 1)
  );

  return { start, end };
}

export function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}
