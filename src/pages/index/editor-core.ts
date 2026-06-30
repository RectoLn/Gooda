// 谷搭排版编辑器：纯数据 / 类型 / 常量 / 无副作用工具函数
// 从 index.vue 抽出，便于后续维护；不含任何响应式状态。
import bagFront from '../../assets/bag-front.png'
import bagBack from '../../assets/bag-back.png'
import bagPreview from '../../assets/bag-preview.png'
import bagWhiteBowFront from '../../assets/bag-white-bow-front.png'
import bagWhiteBowBack from '../../assets/bag-white-bow-back.png'
import bagWhiteBowPreview from '../../assets/bag-white-bow-preview.png'
import bagWhiteTrunkFront from '../../assets/bag-white-trunk-front.png'
import bagWhiteTrunkBack from '../../assets/bag-white-trunk-back.png'
import bagWhiteTrunkPreview from '../../assets/bag-white-trunk-preview.png'
import boardStar from '../../assets/board-star.png'
import boardBow from '../../assets/board-bow.png'
import boardTorn from '../../assets/board-torn.png'

export type Shape = 'rect' | 'circle'
// sub: 二级分类（如 谷子→吧唧/立牌…）; spuId: 关联千岛 SPU（仅痛包 & 谷子接入，可选不破坏现有）
export type Mat = { type: string; label: string; color: string; w: number; h: number; shape: Shape; src?: string; assetId?: string; sub?: string; spuId?: string }
export interface Layer extends Mat {
  id: string
  x: number
  y: number
  scale: number
  rotation: number
  opacity: number
  locked: boolean
  flipX: boolean
  fixed?: boolean
}
export type BoardTransform = { x: number; y: number; scale: number; rotation: number; opacity: number; locked: boolean; flipX: boolean }
export type Snapshot = { layers: Layer[]; curBoard: number; curBag: number; showGrid: boolean; boardTransform?: BoardTransform }
export type BagWindow = { l: number; t: number; r: number; b: number }
export type BagCrop = { x: number; y: number; w: number; h: number }
export type Bag = { label: string; front: string; back: string; preview?: string; spuId?: string; win?: BagWindow; backCrop?: BagCrop }
export type RowItem =
  | { kind: 'mat'; label: string; color: string; shape: Shape; img?: string; mat: Mat }
  | { kind: 'board'; label: string; img?: string; color?: string; idx: number }
  | { kind: 'bag'; label: string; img: string; idx: number }
  | { kind: 'none'; label: string }
  | { kind: 'plus'; label: string }

// 常量
export const STORAGE_KEY = 'gooda-editor-current-work'
export const STORAGE_VERSION = 4
export const EXPORT_SIZE = 1280
export const BAG_RATIO = 1280 / 1280
export const BOARD_LAYER_ID = '__board__'
export const WIN = { l: 0.2094, t: 0.4884, r: 0.7961, b: 0.7836 }
export const ROW_PITCH = 42

// 静态素材数据；底板支持图片(src)或纯色占位(color) + 二级分类
export const boards: { label: string; src?: string; color?: string; sub: string; aspect?: number }[] = [
  { label: '蝴蝶结', src: boardBow, sub: '热门', aspect: 426 / 300 },
  { label: '撕纸格', src: boardTorn, sub: '简约', aspect: 426 / 300 },
  { label: '星空', src: boardStar, sub: '热门', aspect: 424 / 300 },
  { label: '波点粉', color: '#F2D5D5', sub: '波点', aspect: 426 / 300 },
  { label: '波点蓝', color: '#d6e8ff', sub: '波点', aspect: 426 / 300 },
  { label: '奶油', color: '#fdf3e3', sub: '简约', aspect: 426 / 300 },
  { label: '纯白', color: '#ffffff', sub: '纯色', aspect: 426 / 300 },
  { label: '薄荷', color: '#C5DDD5', sub: '纯色', aspect: 426 / 300 },
  { label: '丁香紫', color: '#DDD5EE', sub: '纯色', aspect: 426 / 300 },
]
// 痛包：一款可有多色变体（暂仅一个真实素材，结构预留多色 + spuId）
export const BAG_BACK_CROP = { x: 150, y: 539, w: 821, h: 415 }
export const bags: Bag[] = [
  { label: '丹宁包', front: bagFront, back: bagBack, preview: bagPreview, spuId: 'spu_bag_denim_01', win: { l: 0.2031, t: 0.4844, r: 0.8109, b: 0.7844 }, backCrop: BAG_BACK_CROP },
  { label: '蝴蝶结包', front: bagWhiteBowFront, back: bagWhiteBowBack, preview: bagWhiteBowPreview, spuId: 'spu_bag_white_bow_01', win: { l: 0.2687, t: 0.6203, r: 0.7453, b: 0.9203 } },
  { label: '白手提箱', front: bagWhiteTrunkFront, back: bagWhiteTrunkBack, preview: bagWhiteTrunkPreview, spuId: 'spu_bag_white_trunk_01', win: { l: 0.185, t: 0.36, r: 0.815, b: 0.745 } },
]
export const cats = ['痛包', '谷子', '底板', '装饰'] as const
export type CatName = (typeof cats)[number]

// 二级分类（仅 >1 项时显示筛选条）
export const SUBCATS: Record<string, string[]> = {
  痛包: ['全部'],
  谷子: ['全部', '吧唧', '立牌', '小卡', '色纸', '其他'],
  底板: ['全部', '热门', '波点', '简约', '纯色'],
  装饰: ['全部', '蝴蝶结', '吧唧托', '花边', '丝带', '其他'],
}

// 谷子：每个二级分类多变体（接 SPU），占位色块待换真素材
export const guzi: Mat[] = [
  { type: '谷子', label: '吧唧', sub: '吧唧', color: '#F2D5D5', w: 56, h: 56, shape: 'circle', spuId: 'spu_guzi_bj_01' },
  { type: '谷子', label: '吧唧', sub: '吧唧', color: '#EED2DC', w: 56, h: 56, shape: 'circle', spuId: 'spu_guzi_bj_02' },
  { type: '谷子', label: '吧唧', sub: '吧唧', color: '#E7C9D5', w: 56, h: 56, shape: 'circle', spuId: 'spu_guzi_bj_03' },
  { type: '谷子', label: '立牌', sub: '立牌', color: '#C5DDD5', w: 48, h: 70, shape: 'rect', spuId: 'spu_guzi_lp_01' },
  { type: '谷子', label: '立牌', sub: '立牌', color: '#B8D4CC', w: 48, h: 70, shape: 'rect', spuId: 'spu_guzi_lp_02' },
  { type: '谷子', label: '小卡', sub: '小卡', color: '#EAD9BE', w: 48, h: 66, shape: 'rect', spuId: 'spu_guzi_xk_01' },
  { type: '谷子', label: '小卡', sub: '小卡', color: '#E4D0B4', w: 48, h: 66, shape: 'rect', spuId: 'spu_guzi_xk_02' },
  { type: '谷子', label: '色纸', sub: '色纸', color: '#C5DDD5', w: 60, h: 60, shape: 'rect', spuId: 'spu_guzi_sz_01' },
  { type: '谷子', label: '色纸', sub: '色纸', color: '#B8D7CF', w: 60, h: 60, shape: 'rect', spuId: 'spu_guzi_sz_02' },
  { type: '谷子', label: '娃娃', sub: '其他', color: '#DDD5EE', w: 64, h: 64, shape: 'circle', spuId: 'spu_guzi_ot_01' },
  { type: '谷子', label: '挂卡', sub: '其他', color: '#E9D4E0', w: 50, h: 68, shape: 'rect', spuId: 'spu_guzi_ot_02' },
]
// 装饰：不接 SPU；占位色块
export const decor: Mat[] = [
  { type: '装饰', label: '蝴蝶结', sub: '蝴蝶结', color: '#F2D5D5', w: 60, h: 44, shape: 'rect' },
  { type: '装饰', label: '蝴蝶结', sub: '蝴蝶结', color: '#EAD9BE', w: 60, h: 44, shape: 'rect' },
  { type: '装饰', label: '吧唧托', sub: '吧唧托', color: '#DDD5EE', w: 66, h: 66, shape: 'circle' },
  { type: '装饰', label: '吧唧托', sub: '吧唧托', color: '#D1E1EE', w: 66, h: 66, shape: 'circle' },
  { type: '装饰', label: '花边', sub: '花边', color: '#EFE6C9', w: 72, h: 26, shape: 'rect' },
  { type: '装饰', label: '花边', sub: '花边', color: '#E9DCCF', w: 72, h: 26, shape: 'rect' },
  { type: '装饰', label: '丝带', sub: '丝带', color: '#D7E6F0', w: 64, h: 32, shape: 'rect' },
  { type: '装饰', label: '丝带', sub: '丝带', color: '#DDD5EE', w: 64, h: 32, shape: 'rect' },
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
