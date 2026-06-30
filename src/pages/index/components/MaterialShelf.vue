<template>
  <view class="panel material-panel" :style="panelStyle">
    <view
      class="sheet-grabber"
      @tap.stop="$emit('toggle-collapsed')"
      @touchstart.stop="$emit('touch-start', $event)"
      @touchmove.stop="$emit('touch-move', $event)"
      @touchend.stop="$emit('touch-end', $event)"
      @mousedown.stop="$emit('mouse-down', $event)"
    />
    <view class="cats">
      <view
        v-for="c in cats"
        :key="c"
        class="cat"
        :class="[{ on: category === c }, catClass[c]]"
        @tap="$emit('set-category', c)"
      >
        <image class="cat-handwriting" :src="catHandwriting[c]" mode="aspectFit" />
        <text class="cat-label">{{ c }}</text>
        <template v-if="category === c">
          <image class="cat-underline" :src="catUnderline" mode="aspectFit" />
          <text class="cat-sparkle">✦</text>
        </template>
      </view>
    </view>
    <view v-if="subCats.length > 1" class="subcats">
      <view
        v-for="s in subCats"
        :key="s"
        class="subcat"
        :class="{ on: subCat === s }"
        @tap="$emit('set-subcat', s)"
      >{{ s }}</view>
    </view>
    <scroll-view :scroll-y="true" class="grid">
      <view class="grid-inner">
        <view
          v-for="(it, i) in rowItems"
          :key="i"
          class="cell"
        >
          <view
            class="cell-card"
            @tap="onCellTap(it)"
            @touchstart="onCellTouchStart($event, it)"
            @touchmove="onCellTouchMove($event, it)"
            @touchend="onCellTouchEnd($event, it)"
            @touchcancel="onCellTouchCancel"
            @contextmenu.stop.prevent="onCellContextMenu($event, it)"
            @mousedown="onCellMouseDown($event, it)"
          >
            <view v-if="it.kind === 'none'" class="cell-none">
              <image class="cell-none-icon" :src="noneBoardIcon" mode="aspectFit" />
            </view>
            <image
              v-else-if="it.img"
              :src="it.img"
              class="cell-thumb"
              :class="{ 'bag-thumb': it.kind === 'bag' }"
              :mode="it.kind === 'bag' ? 'aspectFit' : 'aspectFill'"
              :draggable="false"
              @contextmenu.stop.prevent
              @dragstart.stop.prevent
            />
            <view v-else-if="it.color" class="cell-block" :class="it.shape" :style="{ background: it.color }">
              <text class="cell-heart">♥</text>
            </view>
            <view v-else class="cell-plus"><text>＋</text></view>
          </view>
          <text class="cell-label">{{ it.label }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import type { CatName, RowItem } from '../editor-core'
import noneBoardIcon from '../../../assets/none-board-icon.png'
import catTongbao from '../../../assets/tab-hand-tongbao.png'
import catGuzi from '../../../assets/tab-hand-guzi.png'
import catDiban from '../../../assets/tab-hand-diban.png'
import catZhuangshi from '../../../assets/tab-hand-zhuangshi.png'
import catUnderline from '../../../assets/tab-hand-underline.png'

const catHandwriting: Record<CatName, string> = {
  痛包: catTongbao,
  谷子: catGuzi,
  底板: catDiban,
  装饰: catZhuangshi,
}

const catClass: Record<CatName, string> = {
  痛包: 'cat-tongbao',
  谷子: 'cat-guzi',
  底板: 'cat-diban',
  装饰: 'cat-zhuangshi',
}

defineProps<{
  panelStyle: Record<string, string | number>
  cats: readonly CatName[]
  category: CatName
  subCats: string[]
  subCat: string
  rowItems: RowItem[]
}>()

const emit = defineEmits<{
  (e: 'toggle-collapsed'): void
  (e: 'touch-start', event: any): void
  (e: 'touch-move', event: any): void
  (e: 'touch-end', event: any): void
  (e: 'mouse-down', event: any): void
  (e: 'set-category', category: CatName): void
  (e: 'set-subcat', subCat: string): void
  (e: 'select-item', item: RowItem): void
  (e: 'material-long-press', item: RowItem): void
  (e: 'material-drag-start', item: RowItem, x: number, y: number): void
  (e: 'material-drag-move', item: RowItem, x: number, y: number): void
  (e: 'material-drag-end', item: RowItem, x: number, y: number, moved: boolean): void
}>()

const LONG_PRESS_MS = 628
const DRAG_HOLD_MS = 180
const DRAG_MOVE_THRESHOLD = 16
const EARLY_SCROLL_THRESHOLD = 9

let dragState = {
  item: null as RowItem | null,
  sx: 0,
  sy: 0,
  startedAt: 0,
  moved: false,
  longPressed: false,
  scrollIntent: false,
  suppressTap: false,
}
let longPressTimer: ReturnType<typeof setTimeout> | undefined

function canDragItem(item: RowItem) {
  return item.kind === 'mat'
}
function onCellTap(item: RowItem) {
  if (dragState.suppressTap) {
    dragState.suppressTap = false
    return
  }
  emit('select-item', item)
}
function canEditItem(item: RowItem) {
  return item.kind === 'mat' && item.mat.type === '谷子' && !!item.mat.assetId
}
function clearLongPressTimer() {
  if (!longPressTimer) return
  clearTimeout(longPressTimer)
  longPressTimer = undefined
}
function scheduleLongPress(item: RowItem) {
  clearLongPressTimer()
  if (!canEditItem(item)) return
  longPressTimer = setTimeout(() => {
    if (dragState.scrollIntent || dragState.moved) return
    dragState.longPressed = true
    dragState.suppressTap = true
    emit('material-long-press', item)
  }, LONG_PRESS_MS)
}
function startMaterialDrag(item: RowItem, x: number, y: number) {
  if (!canDragItem(item)) return
  dragState = {
    item,
    sx: x,
    sy: y,
    startedAt: Date.now(),
    moved: false,
    longPressed: false,
    scrollIntent: false,
    suppressTap: false,
  }
  scheduleLongPress(item)
}
function moveMaterialDrag(item: RowItem, x: number, y: number) {
  if (dragState.item !== item || !canDragItem(item)) return
  if (dragState.longPressed || dragState.scrollIntent) return
  const dx = x - dragState.sx
  const dy = y - dragState.sy
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  const elapsed = Date.now() - dragState.startedAt
  if (!dragState.moved && elapsed < DRAG_HOLD_MS && ax + ay > EARLY_SCROLL_THRESHOLD) {
    dragState.scrollIntent = true
    clearLongPressTimer()
    return
  }
  if (!dragState.moved && elapsed < DRAG_HOLD_MS) return
  if (ax + ay > DRAG_MOVE_THRESHOLD) {
    if (!dragState.moved) emit('material-drag-start', item, dragState.sx, dragState.sy)
    dragState.moved = true
    clearLongPressTimer()
  }
  if (dragState.moved) emit('material-drag-move', item, x, y)
}
function endMaterialDrag(item: RowItem, x: number, y: number) {
  if (dragState.item !== item || !canDragItem(item)) return
  const moved = dragState.moved
  const longPressed = dragState.longPressed
  const scrollIntent = dragState.scrollIntent
  clearLongPressTimer()
  if (moved || longPressed || scrollIntent) dragState.suppressTap = true
  if (moved && !longPressed && !scrollIntent) emit('material-drag-end', item, x, y, moved)
  dragState.item = null
}
function onCellTouchStart(event: any, item: RowItem) {
  const touch = event.touches && event.touches[0]
  if (touch) startMaterialDrag(item, touch.clientX, touch.clientY)
}
function onCellTouchMove(event: any, item: RowItem) {
  const touch = event.touches && event.touches[0]
  if (touch) moveMaterialDrag(item, touch.clientX, touch.clientY)
  if (dragState.moved && event.preventDefault) event.preventDefault()
}
function onCellTouchEnd(event: any, item: RowItem) {
  const touch = event.changedTouches && event.changedTouches[0]
  if (touch) endMaterialDrag(item, touch.clientX, touch.clientY)
}
function onCellTouchCancel() {
  clearLongPressTimer()
  dragState.item = null
}
function onCellMouseDown(event: any, item: RowItem) {
  if (!canDragItem(item) || typeof window === 'undefined') return
  if (event.preventDefault) event.preventDefault()
  startMaterialDrag(item, event.clientX, event.clientY)
  const move = (ev: MouseEvent) => moveMaterialDrag(item, ev.clientX, ev.clientY)
  const up = (ev: MouseEvent) => {
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
    clearLongPressTimer()
    endMaterialDrag(item, ev.clientX, ev.clientY)
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}
function onCellContextMenu(event: any, item: RowItem) {
  if (!canEditItem(item)) return
  if (event.preventDefault) event.preventDefault()
  if (event.stopPropagation) event.stopPropagation()
}
</script>
