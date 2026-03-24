// src/lib/utils.ts
// Funções utilitárias usadas em todo o projeto

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Merge de classes Tailwind (usado pelos componentes Shadcn)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formata número como moeda brasileira: 1234.5 → "R$ 1.234,50"
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Formata data ISO para exibição: "2024-06-15T10:00:00Z" → "15/06/2024"
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
}

// Formata data e hora: → "15/06/2024 às 10:00"
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

// Calcula o valor de desconto máximo em R$ a partir do preço e do %
export function calcMaxDiscount(salePrice: number, maxDiscountPct: number): number {
  return (salePrice * maxDiscountPct) / 100
}

// Gera slug a partir de um nome: "Minha Loja" → "minha-loja"
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}