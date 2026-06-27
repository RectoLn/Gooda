// 谷搭排版编辑器：纯数据 / 类型 / 常量 / 无副作用工具函数
// 从 index.vue 抽出，便于后续维护；不含任何响应式状态。
import bagFront from '../../assets/bag-front.png'
import boardStar from '../../assets/board-star.png'
import boardBow from '../../assets/board-bow.png'
import boardTorn from '../../assets/board-torn.png'

export type Shape = 'rect' | 'circle'
export type Mat = { type: string; label: string; color: string; w: number; h: number; shape: Shape; src?: string }
export interface Layer extends Mat {
  id: string
  x: number
  y: number
  scale: number
  rotation: number
  opacity: number
  locked: boolean
  flipX: boolean
}
export type Snapshot = { layers: Layer[]; curBoard: number; curBag: number; showGrid: boolean }
export type RowItem =
  | { kind: 'mat'; label: string; color: string; shape: Shape; mat: Mat }
  | { kind: 'board'; label: string; img: string; idx: number }
  | { kind: 'bag'; label: string; img: string; idx: number }
  | { kind: 'none'; label: string }
  | { kind: 'plus'; label: string }

// 常量
export const STORAGE_KEY = 'gooda-editor-current-work'
export const STORAGE_VERSION = 2
export const EXPORT_SIZE = 1280
export const BAG_RATIO = 1280 / 1280
export const WIN = { l: 0.2094, t: 0.4984, r: 0.7961, b: 0.7836 }
export const ROW_PITCH = 42

// 静态素材数据
export const boards = [
  { label: '蝴蝶结', src: boardBow },
  { label: '撕纸格', src: boardTorn },
  { label: '星空', src: boardStar },
]
export const bags = [{ label: '丹宁包', front: bagFront }]
export const cats = ['谷子', '痛包', '底板', '装饰'] as const
export type CatName = (typeof cats)[number]

export const guzi: Mat[] = [
  { type: '谷子', label: '吧唧', color: '#ff9aa2', w: 56, h: 56, shape: 'circle' },
  { type: '谷子', label: '立牌', color: '#a0e7e5', w: 48, h: 70, shape: 'rect' },
  { type: '谷子', label: '小卡', color: '#ffd6a5', w: 48, h: 66, shape: 'rect' },
  { type: '谷子', label: '色纸', color: '#b5ead7', w: 60, h: 60, shape: 'rect' },
]
export const decor: Mat[] = [
  { type: '装饰', label: '挂件', color: '#caffbf', w: 40, h: 40, shape: 'circle' },
  { type: '吧唧托', label: '吧唧托', color: '#bdb2ff', w: 66, h: 66, shape: 'circle' },
  { type: '贴纸', label: '贴纸', color: '#fdffb6', w: 44, h: 44, shape: 'rect' },
]

// 无副作用工具函数
export function clamp(v: number, a: number, b: number) { return Math.min(b, Math.max(a, v)) }
export function dist(a: any, b: any) { return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY) }
export function ang(a: any, b: any) { return (Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * 180) / Math.PI }
export function roundRectPath(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}
export function drawRoundedImage(ctx: any, img: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.save()
  roundRectPath(ctx, x, y, w, h, r)
  ctx.clip()
  ctx.drawImage(img, x, y, w, h)
  ctx.restore()
}
export function loadImg(node: any, src: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const img = node && node.createImage ? node.createImage() : new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
