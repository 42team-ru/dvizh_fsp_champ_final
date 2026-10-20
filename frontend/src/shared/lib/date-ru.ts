export const monthLabel = (date: string) =>
  new Date(date)
    .toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
    .replace(" г.", "");
