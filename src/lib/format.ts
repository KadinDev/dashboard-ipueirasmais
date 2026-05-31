export function centsToBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value / 100);
}

export function dateInputValue(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 16);
}

export function toIsoOrNull(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
