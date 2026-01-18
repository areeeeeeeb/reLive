import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getTailwindColorValue = (colorClass: string): string => {
  if (typeof window === 'undefined') {
    return '#f8fafc' // fallback for SSR
  }

  // Create a temporary element to get the computed color
  const el = document.createElement('div')
  el.className = `bg-${colorClass}`
  document.body.appendChild(el)
  const color = window.getComputedStyle(el).backgroundColor
  document.body.removeChild(el)

  // Convert rgb/rgba to hex
  const rgbMatch = color.match(/\d+/g)
  if (rgbMatch) {
    const [r, g, b] = rgbMatch.map(Number)
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
  }

  return '#f8fafc' // fallback
}