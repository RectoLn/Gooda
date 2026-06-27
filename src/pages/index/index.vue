<template>
  <view class="page" :class="{ 'has-selection': selected, 'pure-view': materialCollapsed }">
    <view class="topbar">
      <view class="brand">
        <image class="brand-logo" :src="brandLogo" mode="aspectFit" />
        <image class="brand-wordmark" :src="brandWordmark" mode="aspectFit" />
      </view>
      <view class="top-actions">
        <view class="icon-btn" :class="{ disabled: !canUndo }" @tap="undo">
          <image class="top-icon-img" :src="undoIcon" mode="aspectFit" />
        </view>
        <view class="icon-btn" :class="{ disabled: !canRedo }" @tap="redo">
          <image class="top-icon-img" :src="redoIcon" mode="aspectFit" />
        </view>
        <view class="btn ghost" @tap="saveWork">保存</view>
        <view class="btn" @tap="exportImage">导出</view>
      </view>
    </view>

    <view class="stage-wrap">
      <view v-if="!materialCollapsed" class="stage-tools">
        <view class="tool-pill" :class="{ on: showGrid }" @tap="toggleGrid">网格</view>
        <view class="tool-pill" @tap="fitSelection">居中</view>
      </view>

      <view class="stage" :style="{ width: cw + 'px', height: ch + 'px' }" @tap="onStageTap">
        <view
          class="window"
          :class="{ grid: showGrid }"
          :style="{ left: win.x + 'px', top: win.y + 'px', width: win.w + 'px', height: win.h + 'px' }"
        >
          <image
            v-if="curBoard >= 0"
            class="fill"
            :src="boards[curBoard].src"
            mode="aspectFill"
          />
          <view v-else class="fill empty-board" />
          <view
            v-for="(ly, i) in doc.layers"
            :key="ly.id"
            class="layer"
            :class="{ selected: ly.id === selectedId, locked: ly.locked }"
            :style="layerStyle(ly, i)"
            @tap.stop="onLayerTap(ly)"
            @touchstart.stop="onTouchStart($event, ly)"
            @touchmove.stop="onTouchMove($event, ly)"
            @touchend.stop="onTouchEnd"
            @mousedown.stop="onMouseDown($event, ly)"
          >
            <view
              class="layer-inner"
              :class="ly.shape"
              :style="{ background: ly.color, opacity: ly.opacity, transform: ly.flipX ? 'scaleX(-1)' : 'none' }"
            >
              <image v-if="ly.src" :src="ly.src" class="layer-img" mode="aspectFill" />
              <text v-else class="layer-label">{{ ly.label }}</text>
            </view>
          </view>
        </view>

        <image class="bag-front" :src="bags[curBag].front" mode="scaleToFill" />
        <view
          v-if="selected && !materialCollapsed"
          class="selection-overlay"
          :style="selectedHandleStyle(selected)"
          @tap.stop
        >
          <view class="layer-handle handle-copy" @tap.stop="duplicateLayer">
            <image class="handle-icon" :src="copyHandleIcon" mode="aspectFit" />
          </view>
          <view class="layer-handle handle-delete" @tap.stop="removeLayer">
            <image class="handle-icon" :src="deleteHandleIcon" mode="aspectFit" />
          </view>
          <view class="layer-handle handle-mirror" @tap.stop="mirrorLayer">
            <image class="handle-icon" :src="mirrorHandleIcon" mode="aspectFit" />
          </view>
          <view
            class="layer-handle handle-rotate"
            @tap.stop
            @touchstart.stop="onRotateHandleTouchStart($event, selected)"
            @touchmove.stop="onRotateHandleTouchMove($event, selected)"
            @touchend.stop="onRotateHandleTouchEnd"
            @mousedown.stop="onRotateHandleMouseDown($event, selected)"
          >
            <image class="handle-icon" :src="rotateHandleIcon" mode="aspectFit" />
          </view>
        </view>
      </view>

    </view>

    <view
      v-if="!materialCollapsed"
      class="floating-layers"
      :class="{ active: showLayerDrawer, dragging: layerButtonMoving }"
      :style="layerButtonStyle"
      @tap="onLayerButtonTap"
      @touchstart.stop="onLayerButtonTouchStart"
      @touchmove.stop="onLayerButtonTouchMove"
      @touchend.stop="onLayerButtonTouchEnd"
      @mousedown.stop="onLayerButtonMouseDown"
      @dragstart.stop.prevent
    >
      <image class="floating-icon-img" :src="layerIcon" mode="aspectFit" :draggable="false" @dragstart.stop.prevent />
      <text class="floating-count">{{ doc.layers.length }}</text>
    </view>

    <view class="bottom-dock" :class="{ collapsed: materialCollapsed, dragging: sheetDragging }">
      <view v-if="selected && !materialCollapsed" class="inspector">
        <view class="nudge-row">
          <view class="nudge-group">
            <view
              class="nudge-btn zoom-btn"
              @touchstart.stop.prevent="startStepHold(applyScaleStep, -1)"
              @touchend.stop="stopStepHold"
              @touchcancel.stop="stopStepHold"
              @mousedown.stop="onStepMouseDown(applyScaleStep, -1)"
            >⊖</view>
            <input
              class="nudge-input"
              type="text"
              :value="scaleFieldValue"
              @focus="onNudgeFocus('scale')"
              @input="onScaleInput"
              @blur="commitNudgeInput"
              @confirm="commitNudgeInput"
            />
            <view
              class="nudge-btn zoom-btn"
              @touchstart.stop.prevent="startStepHold(applyScaleStep, 1)"
              @touchend.stop="stopStepHold"
              @touchcancel.stop="stopStepHold"
              @mousedown.stop="onStepMouseDown(applyScaleStep, 1)"
            >⊕</view>
          </view>
          <view class="nudge-group">
            <view
              class="nudge-btn"
              @touchstart.stop.prevent="startStepHold(applyRotateStep, -1)"
              @touchend.stop="stopStepHold"
              @touchcancel.stop="stopStepHold"
              @mousedown.stop="onStepMouseDown(applyRotateStep, -1)"
            >↺</view>
            <input
              class="nudge-input"
              type="text"
              :value="rotationFieldValue"
              @focus="onNudgeFocus('rotation')"
              @input="onRotationInput"
              @blur="commitNudgeInput"
              @confirm="commitNudgeInput"
            />
            <view
              class="nudge-btn"
              @touchstart.stop.prevent="startStepHold(applyRotateStep, 1)"
              @touchend.stop="stopStepHold"
              @touchcancel.stop="stopStepHold"
              @mousedown.stop="onStepMouseDown(applyRotateStep, 1)"
            >↻</view>
          </view>
        </view>
      </view>

      <view class="panel material-panel" :style="materialPanelStyle">
        <view
          class="sheet-grabber"
          @tap.stop="toggleMaterialCollapsed"
          @touchstart.stop="onSheetTouchStart"
          @touchmove.stop="onSheetTouchMove"
          @touchend.stop="onSheetTouchEnd"
          @mousedown.stop="onSheetMouseDown"
        />
        <view class="panel-head">
          <view class="panel-title-wrap">
            <text class="panel-title">素材选择</text>
            <text class="sparkle">✦</text>
          </view>
          <view class="import-pill" @tap="chooseImageLayer">
            <text class="import-icon">▧</text>
            <text>导入图片</text>
          </view>
        </view>
        <view class="cats">
          <view
            v-for="c in cats"
            :key="c"
            class="cat"
            :class="{ on: category === c }"
            @tap="category = c"
          >{{ c }}</view>
        </view>
        <scroll-view :scroll-x="true" class="row">
          <view class="row-inner">
            <view v-for="(it, i) in rowItems" :key="i" class="cell" @tap="onItem(it)">
              <view class="cell-card">
                <view v-if="it.kind === 'none'" class="cell-none">
                  <image class="cell-none-icon" :src="noneBoardIcon" mode="aspectFit" />
                </view>
                <image v-else-if="it.img" :src="it.img" class="cell-thumb" mode="aspectFill" />
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
    </view>

    <view v-if="showLayerDrawer" class="drawer-mask" @tap="toggleLayerDrawer" />
    <view
      class="layer-drawer"
      :class="{ open: showLayerDrawer, dragging: drawerDragging }"
      :style="drawerStyle"
    >
      <view
        class="drawer-handle"
        @touchstart.stop="onDrawerTouchStart"
        @touchmove.stop="onDrawerTouchMove"
        @touchend.stop="onDrawerTouchEnd"
        @mousedown.stop="onDrawerMouseDown"
      />
      <view class="panel-head drawer-head">
        <text class="panel-title">图层</text>
        <view class="drawer-actions">
          <text class="panel-link">{{ doc.layers.length }} 个元素</text>
          <text class="drawer-close" @tap="toggleLayerDrawer">×</text>
        </view>
      </view>
      <view v-if="!doc.layers.length" class="empty-layers">
        <text>还没有元素</text>
      </view>
      <scroll-view v-else :scroll-y="true" class="layer-scroll">
        <view class="layer-list" :class="{ reordering: reorderId }">
          <view
            v-for="(ly, idx) in visibleLayerList"
            :key="ly.id"
            class="layer-slot"
          >
            <text class="layer-rank">{{ layerOrderLabel(idx) }}</text>
            <view
              class="layer-row"
              :class="{ on: ly.id === selectedId, lifting: ly.id === reorderId, insert: idx === reorderTargetVis && ly.id !== reorderId, settled: ly.id === settledReorderId }"
              :style="layerRowStyle(ly, idx)"
              @tap="selectLayer(ly.id)"
            >
              <view
                class="row-drag"
                @tap.stop
                @touchstart.stop="onRowDragTouchStart($event, ly, idx)"
                @touchmove.stop="onRowDragTouchMove($event)"
                @touchend.stop="onRowDragTouchEnd"
                @mousedown.stop="onRowDragMouseDown($event, ly, idx)"
              ><text class="row-drag-icon">≡</text></view>
              <view class="layer-dot" :class="ly.shape" :style="{ background: ly.color }" />
              <text class="layer-row-name">{{ ly.label }}</text>
              <view class="row-lock" :class="{ on: ly.locked }" @tap.stop="toggleLayerLock(ly.id)">
                <image class="row-lock-icon" :src="ly.locked ? lockStateIcon : unlockStateIcon" mode="aspectFit" />
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <canvas type="2d" id="exportCanvas" class="export-canvas" />
    <view v-if="resultSrc" class="result">
      <text class="panel-title">导出结果</text>
      <image :src="resultSrc" mode="widthFix" class="result-img" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import Taro from '@tarojs/taro'
import {
  STORAGE_KEY, STORAGE_VERSION, EXPORT_SIZE, BAG_RATIO, WIN, ROW_PITCH,
  boards, bags, cats, guzi, decor,
  clamp, dist, ang, roundRectPath, drawRoundedImage, loadImg,
} from './editor-core'
import type { Mat, Layer, Snapshot, RowItem, CatName } from './editor-core'
import layerIcon from '../../assets/layer-icon.png'
import undoIcon from '../../assets/undo-icon.png'
import redoIcon from '../../assets/redo-icon.png'
import rotateHandleIcon from '../../assets/rotate-handle-icon.png'
import copyHandleIcon from '../../assets/copy-handle-icon.png'
import mirrorHandleIcon from '../../assets/mirror-handle-icon.png'
import deleteHandleIcon from '../../assets/delete-handle-icon.png'
import noneBoardIcon from '../../assets/none-board-icon.png'
import brandLogo from '../../assets/brand-logo.png'
import brandWordmark from '../../assets/brand-wordmark.png'
import lockStateIcon from '../../assets/lock-state-locked.png'
import unlockStateIcon from '../../assets/lock-state-unlocked.png'

const MIN_SCALE = 0.1
const MAX_SCALE = 3

const sys = Taro.getSystemInfoSync()
function viewportSize() {
  if (typeof window !== 'undefined') return { w: window.innerWidth || 375, h: window.innerHeight || 760 }
  return { w: sys.windowWidth || 375, h: sys.windowHeight || 760 }
}
const vp = viewportSize()
const cw = Math.min(vp.w - 8, Math.floor((vp.h - 260) * 0.75), 400)
const ch = Math.round(cw * BAG_RATIO)
const win = {
  x: WIN.l * cw, y: WIN.t * ch,
  w: (WIN.r - WIN.l) * cw, h: (WIN.b - WIN.t) * ch,
}

const curBoard = ref(-1)
const curBag = ref(0)
const showGrid = ref(false)
const category = ref<CatName>('谷子')
const doc = reactive<{ layers: Layer[] }>({ layers: [] })
const selectedId = ref('')
const resultSrc = ref('')
const history = ref<Snapshot[]>([])
const redoStack = ref<Snapshot[]>([])
const showLayerDrawer = ref(false)
const layerButtonMoving = ref(false)
const materialCollapsed = ref(false)
const sheetDragging = ref(false)
const sheetDragY = ref(0)
const drawerDragging = ref(false)
const drawerDragY = ref(0)
const layerButton = reactive({ x: 0, y: 0 })
const reorderId = ref('')
const editingField = ref<'' | 'scale' | 'rotation'>('')
const editingText = ref('')
const reorderTargetVis = ref(-1)
const reorderOffsetY = ref(0)
const reorderDragY = ref(0)
const settledReorderId = ref('')

const selected = computed(() => doc.layers.find((l) => l.id === selectedId.value))
const canUndo = computed(() => history.value.length > 1)
const canRedo = computed(() => redoStack.value.length > 0)
const visibleLayerList = computed(() => [...doc.layers].reverse())
const layerButtonStyle = computed(() => ({
  transform: `translate3d(${layerButton.x}px, ${layerButton.y}px, 0)`,
}))
const materialPanelStyle = computed(() => {
  if (!sheetDragging.value) return {}
  if (materialCollapsed.value) {
    return { transform: `translateY(calc(100% - 34PX + ${sheetDragY.value}px))` }
  }
  return { transform: `translateY(${sheetDragY.value}px)` }
})
const drawerStyle = computed(() => {
  if (!drawerDragging.value) return {}
  return { transform: `translateY(${drawerDragY.value}px)` }
})
const scaleFieldValue = computed(() =>
  editingField.value === 'scale' ? editingText.value : selected.value ? formatScale(selected.value.scale) : '',
)
const rotationFieldValue = computed(() =>
  editingField.value === 'rotation' ? editingText.value : selected.value ? formatRotation(selected.value.rotation) : '',
)

const rowItems = computed<RowItem[]>(() => {
  if (category.value === '谷子')
    return [...guzi.map((m) => ({ kind: 'mat', label: m.label, color: m.color, shape: m.shape, mat: m } as RowItem)), { kind: 'plus', label: '导入' }]
  if (category.value === '装饰')
    return [...decor.map((m) => ({ kind: 'mat', label: m.label, color: m.color, shape: m.shape, mat: m } as RowItem)), { kind: 'plus', label: '导入' }]
  if (category.value === '底板')
    return [{ kind: 'none', label: '无底板' } as RowItem, ...boards.map((b, i) => ({ kind: 'board', label: b.label, img: b.src, idx: i } as RowItem))]
  return bags.map((b, i) => ({ kind: 'bag', label: b.label, img: b.front, idx: i } as RowItem))
})

let seq = 0
let lastLayerTs = 0
let dragged = false
let layerButtonSuppressTap = false
let suppressHistory = false
let g = { id: '', mode: '' as '' | 'move' | 'pinch', sx: 0, sy: 0, lx: 0, ly: 0, sd: 0, sa: 0, ss: 1, sr: 0 }
let bg = { sx: 0, sy: 0, x: 0, y: 0, moved: false }
let rg = { id: '', cx: 0, cy: 0, corner: 0, moved: false }
let sg = { sy: 0, moved: false }
let dg = { sy: 0, moved: false }
let sheetSuppressTap = false
let nudgeInputDirty = false
let lr = { id: '', fromVis: 0, startY: 0, base: [] as string[], active: false, moved: false }

onMounted(() => {
  resetLayerButton()
  loadWork()
  pushHistory()
})

function cloneLayers() {
  return doc.layers.map((l) => ({ ...l }))
}
function snapshot(): Snapshot {
  return { layers: cloneLayers(), curBoard: curBoard.value, curBag: curBag.value, showGrid: showGrid.value }
}
function applySnapshot(s: Snapshot) {
  suppressHistory = true
  doc.layers = s.layers.map((l) => ({ ...l }))
  curBoard.value = s.curBoard
  curBag.value = s.curBag
  showGrid.value = s.showGrid
  if (selectedId.value && !doc.layers.find((l) => l.id === selectedId.value)) selectedId.value = ''
  suppressHistory = false
}
function pushHistory() {
  if (suppressHistory) return
  history.value.push(snapshot())
  if (history.value.length > 50) history.value.shift()
  redoStack.value = []
}
function commit() {
  pushHistory()
  saveWork(false)
}
function undo() {
  if (!canUndo.value) return
  const cur = history.value.pop()
  if (cur) redoStack.value.push(cur)
  const prev = history.value[history.value.length - 1]
  if (prev) applySnapshot(prev)
}
function redo() {
  const next = redoStack.value.pop()
  if (!next) return
  applySnapshot(next)
  history.value.push(snapshot())
}

function markLayer() { lastLayerTs = Date.now() }
function onLayerTap(ly: Layer) { selectedId.value = ly.id; markLayer() }
function onStageTap() { if (Date.now() - lastLayerTs < 350) return; selectedId.value = '' }
function clearSelection() { selectedId.value = '' }
function selectLayer(id: string) { selectedId.value = id; markLayer() }
function toggleLayerDrawer() { showLayerDrawer.value = !showLayerDrawer.value }
function onLayerButtonTap() {
  if (layerButtonSuppressTap) {
    layerButtonSuppressTap = false
    return
  }
  toggleLayerDrawer()
}
function layerOrderLabel(idx: number) { return String(doc.layers.length - idx) }
function boundedScale(v: number) {
  return Number.isFinite(v) ? clamp(v, MIN_SCALE, MAX_SCALE) : 1
}
function normalizeRotation(v: number) {
  if (!Number.isFinite(v)) return 0
  const wrapped = ((((v + 180) % 360) + 360) % 360) - 180
  return Object.is(wrapped, -0) ? 0 : wrapped
}
function displayRotation(v: number) {
  return Math.round(normalizeRotation(v))
}
function formatScale(v: number) {
  return `${Math.round(boundedScale(v) * 100)}%`
}
function formatRotation(v: number) {
  return `${displayRotation(v)}°`
}
function resetLayerButton() {
  const { w: ww, h: wh } = viewportSize()
  layerButton.x = ww - 64
  layerButton.y = clamp(wh - 480, 82, wh - 74)
}
function clampLayerButton() {
  const { w: ww, h: wh } = viewportSize()
  layerButton.x = clamp(layerButton.x, 10, ww - 58)
  layerButton.y = clamp(layerButton.y, 72, wh - 64)
}
function snapLayerButton() {
  const { w: ww } = viewportSize()
  layerButton.x = layerButton.x + 24 < ww / 2 ? 10 : ww - 58
  clampLayerButton()
}
function startLayerButtonDrag(x: number, y: number) {
  layerButtonMoving.value = true
  showLayerDrawer.value = false
  bg = { sx: x, sy: y, x: layerButton.x, y: layerButton.y, moved: false }
}
function moveLayerButton(x: number, y: number) {
  const dx = x - bg.sx
  const dy = y - bg.sy
  if (Math.abs(dx) + Math.abs(dy) > 6) bg.moved = true
  layerButton.x = bg.x + dx
  layerButton.y = bg.y + dy
  clampLayerButton()
}
function endLayerButtonDrag() {
  if (bg.moved) {
    layerButtonSuppressTap = true
    layerButtonMoving.value = false
    snapLayerButton()
    return
  }
  layerButtonMoving.value = false
}
function onLayerButtonTouchStart(e: any) {
  const t = e.touches && e.touches[0]
  if (!t) return
  startLayerButtonDrag(t.clientX, t.clientY)
}
function onLayerButtonTouchMove(e: any) {
  const t = e.touches && e.touches[0]
  if (!t) return
  if (e.preventDefault) e.preventDefault()
  moveLayerButton(t.clientX, t.clientY)
}
function onLayerButtonTouchEnd() { endLayerButtonDrag() }
function onLayerButtonMouseDown(e: any) {
  if (e.preventDefault) e.preventDefault()
  startLayerButtonDrag(e.clientX, e.clientY)
  const move = (ev: any) => {
    if (ev.preventDefault) ev.preventDefault()
    moveLayerButton(ev.clientX, ev.clientY)
  }
  const up = () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    endLayerButtonDrag()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }
}
function toggleMaterialCollapsed() {
  if (sheetSuppressTap) {
    sheetSuppressTap = false
    return
  }
  materialCollapsed.value = !materialCollapsed.value
}
function suppressNextSheetTap() {
  sheetSuppressTap = true
  if (typeof window !== 'undefined') window.setTimeout(() => { sheetSuppressTap = false }, 120)
}
function startSheetDrag(y: number) {
  sheetDragging.value = true
  sheetDragY.value = 0
  sg = { sy: y, moved: false }
}
function moveSheetDrag(y: number) {
  const dy = y - sg.sy
  if (Math.abs(dy) > 8) sg.moved = true
  if (materialCollapsed.value) sheetDragY.value = clamp(dy, -170, 18)
  else sheetDragY.value = clamp(dy, -16, 190)
}
function endSheetDrag(y?: number) {
  const dy = typeof y === 'number' ? y - sg.sy : 0
  if (sg.moved) {
    suppressNextSheetTap()
    if (dy > 18) materialCollapsed.value = true
    else if (dy < -18) materialCollapsed.value = false
  }
  sheetDragging.value = false
  sheetDragY.value = 0
  sg.moved = false
}
function onSheetTouchStart(e: any) {
  const t = e.touches && e.touches[0]
  if (!t) return
  startSheetDrag(t.clientY)
}
function onSheetTouchMove(e: any) {
  const t = e.touches && e.touches[0]
  if (!t) return
  if (e.preventDefault) e.preventDefault()
  moveSheetDrag(t.clientY)
}
function onSheetTouchEnd(e: any) {
  const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0])
  endSheetDrag(t && t.clientY)
}
function onSheetMouseDown(e: any) {
  if (e.preventDefault) e.preventDefault()
  startSheetDrag(e.clientY)
  const move = (ev: any) => {
    if (ev.preventDefault) ev.preventDefault()
    moveSheetDrag(ev.clientY)
  }
  const up = (ev: any) => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    endSheetDrag(ev.clientY)
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }
}

function startDrawerDrag(y: number) {
  drawerDragging.value = true
  drawerDragY.value = 0
  dg = { sy: y, moved: false }
}
function moveDrawerDrag(y: number) {
  const dy = y - dg.sy
  if (Math.abs(dy) > 8) dg.moved = true
  drawerDragY.value = clamp(dy, -18, 260)
}
function endDrawerDrag(y?: number) {
  const dy = typeof y === 'number' ? y - dg.sy : 0
  if (dg.moved && dy > 56) showLayerDrawer.value = false
  drawerDragging.value = false
  drawerDragY.value = 0
  dg.moved = false
}
function onDrawerTouchStart(e: any) {
  const t = e.touches && e.touches[0]
  if (!t) return
  startDrawerDrag(t.clientY)
}
function onDrawerTouchMove(e: any) {
  const t = e.touches && e.touches[0]
  if (!t) return
  if (e.preventDefault) e.preventDefault()
  moveDrawerDrag(t.clientY)
}
function onDrawerTouchEnd(e: any) {
  const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0])
  endDrawerDrag(t && t.clientY)
}
function onDrawerMouseDown(e: any) {
  if (e.preventDefault) e.preventDefault()
  startDrawerDrag(e.clientY)
  const move = (ev: any) => {
    if (ev.preventDefault) ev.preventDefault()
    moveDrawerDrag(ev.clientY)
  }
  const up = (ev: any) => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    endDrawerDrag(ev.clientY)
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }
}

function nextId() { return 'L' + ++seq }
function addLayer(m: Mat) {
  const id = nextId()
  doc.layers.push({
    ...m,
    id,
    x: win.w / 2,
    y: win.h / 2,
    scale: 1,
    rotation: 0,
    opacity: 1,
    locked: false,
    flipX: false,
  })
  selectedId.value = id
  commit()
}
function onItem(it: RowItem) {
  if (it.kind === 'mat') addLayer(it.mat)
  else if (it.kind === 'plus') chooseImageLayer()
  else if (it.kind === 'none') { curBoard.value = -1; commit() }
  else if (it.kind === 'board') { curBoard.value = it.idx; commit() }
  else if (it.kind === 'bag') { curBag.value = it.idx; commit() }
}
function removeLayer() {
  doc.layers = doc.layers.filter((l) => l.id !== selectedId.value)
  selectedId.value = ''
  commit()
}
function duplicateLayer() {
  const l = selected.value
  if (!l) return
  const copy = { ...l, id: nextId(), x: clamp(l.x + 16, 0, win.w), y: clamp(l.y + 16, 0, win.h), locked: false }
  doc.layers.push(copy)
  selectedId.value = copy.id
  commit()
}
function toFront() {
  const l = selected.value
  if (!l) return
  doc.layers = doc.layers.filter((x) => x.id !== l.id)
  doc.layers.push(l)
  commit()
}
function toBack() {
  const l = selected.value
  if (!l) return
  doc.layers = doc.layers.filter((x) => x.id !== l.id)
  doc.layers.unshift(l)
  commit()
}
let lastLockToast = 0
function lockedToast() {
  const now = Date.now()
  if (now - lastLockToast < 800) return
  lastLockToast = now
  Taro.showToast({ title: '图层已锁定', icon: 'none' })
}
const SCALE_STEP = 0.05
const ROTATE_STEP = 6
function applyScaleStep(dir: number) {
  const l = selected.value
  if (!l) return false
  if (l.locked) { lockedToast(); return false }
  l.scale = boundedScale(l.scale + dir * SCALE_STEP)
  clampLayer(l)
  return true
}
function applyRotateStep(dir: number) {
  const l = selected.value
  if (!l) return false
  if (l.locked) { lockedToast(); return false }
  l.rotation = normalizeRotation(l.rotation + dir * ROTATE_STEP)
  clampLayer(l)
  return true
}
// 长按连续微调：按住先单步，停顿后开始重复；整段只提交一次历史
let holdT: any = 0
let holdI: any = 0
let holdDirty = false
function clearStepTimers() {
  if (holdT) { clearTimeout(holdT); holdT = 0 }
  if (holdI) { clearInterval(holdI); holdI = 0 }
}
function startStepHold(apply: (d: number) => boolean, dir: number) {
  const ok = apply(dir)
  if (!ok) return
  holdDirty = true
  clearStepTimers()
  holdT = setTimeout(() => { holdI = setInterval(() => { if (!apply(dir)) clearStepTimers() }, 80) }, 360)
}
function stopStepHold() {
  clearStepTimers()
  if (holdDirty) { holdDirty = false; commit() }
}
function onStepMouseDown(apply: (d: number) => boolean, dir: number) {
  startStepHold(apply, dir)
  const up = () => { if (typeof window !== 'undefined') window.removeEventListener('mouseup', up); stopStepHold() }
  if (typeof window !== 'undefined') window.addEventListener('mouseup', up)
}
function inputValue(e: any) {
  return String((e && e.detail && e.detail.value) ?? (e && e.target && e.target.value) ?? '')
}
function numericInputValue(e: any) {
  return inputValue(e).replace(/[^\d.-]/g, '')
}
function onNudgeFocus(field: 'scale' | 'rotation') {
  const l = selected.value
  if (!l) return
  if (l.locked) { lockedToast(); return }
  editingField.value = field
  editingText.value = field === 'scale'
    ? String(Math.round(boundedScale(l.scale) * 100))
    : String(displayRotation(l.rotation))
}
// 编辑期只缓存原始字符串，不实时 clamp/回写，避免受控输入打架
function onScaleInput(e: any) { editingText.value = inputValue(e) }
function onRotationInput(e: any) { editingText.value = inputValue(e) }
function commitNudgeInput() {
  const l = selected.value
  const field = editingField.value
  editingField.value = ''
  const raw = editingText.value.replace(/[^\d.-]/g, '').trim()
  editingText.value = ''
  if (!l || l.locked || !field) return
  if (raw === '') return
  const value = Number(raw)
  if (!Number.isFinite(value)) return
  if (field === 'scale') {
    const nv = boundedScale(value / 100)
    if (nv === l.scale) return
    l.scale = nv
  } else {
    const nv = normalizeRotation(value)
    if (nv === l.rotation) return
    l.rotation = nv
  }
  clampLayer(l)
  commit()
}
function startRotateHandle(x: number, y: number, ly: Layer) {
  if (ly.locked) { selectedId.value = ly.id; markLayer(); lockedToast(); return }
  selectedId.value = ly.id
  markLayer()
  // 以图层中心为锚，让被拖的右下角跟随手指（方向符合直觉）
  const halfW = (ly.w * ly.scale) / 2
  const halfH = (ly.h * ly.scale) / 2
  const rCorner = Math.hypot(halfW, halfH)
  const corner = Math.atan2(halfH, halfW)
  const theta = (ly.rotation * Math.PI) / 180 + corner
  rg = {
    id: ly.id,
    cx: x - rCorner * Math.cos(theta),
    cy: y - rCorner * Math.sin(theta),
    corner,
    moved: false,
  }
}
function moveRotateHandle(x: number, y: number, ly: Layer) {
  if (rg.id !== ly.id || ly.locked) return
  const a = Math.atan2(y - rg.cy, x - rg.cx)
  ly.rotation = normalizeRotation(((a - rg.corner) * 180) / Math.PI)
  rg.moved = true
  clampLayer(ly)
}
function endRotateHandle() {
  if (rg.moved) commit()
  rg.id = ''
  rg.moved = false
}
function onRotateHandleTouchStart(e: any, ly: Layer) {
  const t = e.touches && e.touches[0]
  if (!t) return
  startRotateHandle(t.clientX, t.clientY, ly)
}
function onRotateHandleTouchMove(e: any, ly: Layer) {
  const t = e.touches && e.touches[0]
  if (!t) return
  if (e.preventDefault) e.preventDefault()
  moveRotateHandle(t.clientX, t.clientY, ly)
}
function onRotateHandleTouchEnd() { endRotateHandle() }
function onRotateHandleMouseDown(e: any, ly: Layer) {
  startRotateHandle(e.clientX, e.clientY, ly)
  const move = (ev: any) => moveRotateHandle(ev.clientX, ev.clientY, ly)
  const up = () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    endRotateHandle()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }
}
function toggleLock() {
  const l = selected.value
  if (!l) return
  l.locked = !l.locked
  commit()
}
function toggleLayerLock(id: string) {
  const l = doc.layers.find((x) => x.id === id)
  if (!l) return
  l.locked = !l.locked
  commit()
}
function startReorder(id: string, visIdx: number, y: number) {
  lr = { id, fromVis: visIdx, startY: y, base: visibleLayerList.value.map((l) => l.id), active: true, moved: false }
  reorderId.value = id
  reorderTargetVis.value = visIdx
  reorderOffsetY.value = 0
  reorderDragY.value = 0
}
function moveReorder(y: number) {
  if (!lr.active) return
  const dy = y - lr.startY
  if (Math.abs(dy) > 4) lr.moved = true
  const n = lr.base.length
  const maxUp = -lr.fromVis * ROW_PITCH
  const maxDown = (n - 1 - lr.fromVis) * ROW_PITCH
  reorderDragY.value = clamp(dy, maxUp, maxDown)
  const target = clamp(lr.fromVis + Math.round(reorderDragY.value / ROW_PITCH), 0, n - 1)
  reorderTargetVis.value = target
  reorderOffsetY.value = reorderDragY.value
}
function endReorder() {
  if (lr.active && lr.moved) {
    const order = lr.base.slice()
    const target = clamp(reorderTargetVis.value, 0, order.length - 1)
    const [m] = order.splice(lr.fromVis, 1)
    order.splice(target, 0, m)
    const byId = new Map(doc.layers.map((l) => [l.id, l]))
    doc.layers = order.reverse().map((id) => byId.get(id)).filter(Boolean) as Layer[]
    commit()
  }
  if (lr.active && lr.moved) {
    settledReorderId.value = lr.id
    if (typeof window !== 'undefined') window.setTimeout(() => { settledReorderId.value = '' }, 220)
    else settledReorderId.value = ''
  }
  lr.active = false
  reorderId.value = ''
  reorderTargetVis.value = -1
  reorderOffsetY.value = 0
  reorderDragY.value = 0
}
function onRowDragTouchStart(e: any, ly: Layer, idx: number) {
  const t = e.touches && e.touches[0]
  if (!t) return
  startReorder(ly.id, idx, t.clientY)
}
function onRowDragTouchMove(e: any) {
  const t = e.touches && e.touches[0]
  if (!t) return
  if (e.preventDefault) e.preventDefault()
  moveReorder(t.clientY)
}
function onRowDragTouchEnd() { endReorder() }
function onRowDragMouseDown(e: any, ly: Layer, idx: number) {
  if (e.preventDefault) e.preventDefault()
  startReorder(ly.id, idx, e.clientY)
  const move = (ev: any) => { if (ev.preventDefault) ev.preventDefault(); moveReorder(ev.clientY) }
  const up = () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    endReorder()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }
}
function mirrorLayer() {
  const l = selected.value
  if (!l) return
  l.flipX = !l.flipX
  commit()
}
function centerLayer() {
  const l = selected.value
  if (!l) return
  l.x = win.w / 2
  l.y = win.h / 2
  commit()
}
function fitSelection() { centerLayer() }
function toggleGrid() { showGrid.value = !showGrid.value; commit() }
function clampLayer(ly: Layer) {
  const pad = 6
  // 旋转感知：用旋转后包围盒的半宽高
  const rad = (ly.rotation * Math.PI) / 180
  const c = Math.abs(Math.cos(rad))
  const s = Math.abs(Math.sin(rad))
  const w = ly.w * ly.scale
  const h = ly.h * ly.scale
  const halfW = (w * c + h * s) / 2
  const halfH = (w * s + h * c) / 2
  const minX = halfW + pad
  const maxX = win.w - halfW - pad
  const minY = halfH + pad
  const maxY = win.h - halfH - pad
  ly.x = minX <= maxX ? clamp(ly.x, minX, maxX) : win.w / 2
  ly.y = minY <= maxY ? clamp(ly.y, minY, maxY) : win.h / 2
}

function layerStyle(ly: Layer, i: number) {
  return {
    left: ly.x + 'px',
    top: ly.y + 'px',
    width: ly.w + 'px',
    height: ly.h + 'px',
    zIndex: String(10 + i),
    transform: `translate(-50%,-50%) rotate(${ly.rotation}deg) scale(${ly.scale})`,
  }
}
function layerRowStyle(ly: Layer, idx: number) {
  if (!reorderId.value || !lr.active) return {}
  if (ly.id === reorderId.value) return { '--row-shift': `${reorderOffsetY.value}px` }
  const from = lr.fromVis
  const target = reorderTargetVis.value
  if (target > from && idx > from && idx <= target) return { '--row-shift': `${-ROW_PITCH}px` }
  if (target < from && idx >= target && idx < from) return { '--row-shift': `${ROW_PITCH}px` }
  return {}
}
function selectedHandleStyle(ly: Layer) {
  return {
    left: win.x + ly.x + 'px',
    top: win.y + ly.y + 'px',
    width: ly.w + 'px',
    height: ly.h + 'px',
    '--handle-rotation': `${-ly.rotation}deg`,
    '--handle-scale': `${1 / ly.scale}`,
    transform: `translate(-50%,-50%) rotate(${ly.rotation}deg) scale(${ly.scale})`,
  }
}

function onTouchStart(e: any, ly: Layer) {
  selectedId.value = ly.id
  markLayer()
  if (ly.locked) { lockedToast(); return }
  dragged = false
  const t = e.touches || []
  if (t.length >= 2) g = { id: ly.id, mode: 'pinch', sx: 0, sy: 0, lx: 0, ly: 0, sd: dist(t[0], t[1]), sa: ang(t[0], t[1]), ss: ly.scale, sr: ly.rotation }
  else if (t.length) g = { id: ly.id, mode: 'move', sx: t[0].clientX, sy: t[0].clientY, lx: ly.x, ly: ly.y, sd: 0, sa: 0, ss: 1, sr: 0 }
}
function onTouchMove(e: any, ly: Layer) {
  if (g.id !== ly.id || ly.locked) return
  if (e.preventDefault) e.preventDefault()
  dragged = true
  const t = e.touches || []
  if (g.mode === 'pinch' && t.length >= 2) {
    ly.scale = boundedScale(g.ss * (dist(t[0], t[1]) / g.sd))
    ly.rotation = normalizeRotation(g.sr + (ang(t[0], t[1]) - g.sa))
    clampLayer(ly)
  } else if (g.mode === 'move' && t.length) {
    ly.x = g.lx + (t[0].clientX - g.sx)
    ly.y = g.ly + (t[0].clientY - g.sy)
    clampLayer(ly)
  }
}
function onTouchEnd() {
  if (dragged) commit()
  dragged = false
  g.mode = ''
}
function onMouseDown(e: any, ly: Layer) {
  selectedId.value = ly.id
  markLayer()
  if (ly.locked) { lockedToast(); return }
  const sx = e.clientX, sy = e.clientY, lx = ly.x, lyy = ly.y
  let moved = false
  const move = (ev: any) => {
    moved = true
    ly.x = lx + (ev.clientX - sx)
    ly.y = lyy + (ev.clientY - sy)
    clampLayer(ly)
  }
  const up = () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    if (moved) commit()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }
}

function chooseImageLayer() {
  Taro.chooseImage({
    count: 1,
    sizeType: ['compressed', 'original'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const src = res.tempFilePaths && res.tempFilePaths[0]
      if (!src) return
      addLayer({ type: '图片', label: '导入图片', color: '#fff', w: 72, h: 72, shape: 'rect', src })
    },
    fail: () => Taro.showToast({ title: '未选择图片', icon: 'none' }),
  })
}

function saveWork(showToast = true) {
  const data = { version: STORAGE_VERSION, ...snapshot(), selectedId: selectedId.value, seq }
  try {
    Taro.setStorageSync(STORAGE_KEY, data)
    if (showToast) Taro.showToast({ title: '已保存', icon: 'none' })
  } catch (_) {
    if (showToast) Taro.showToast({ title: '保存失败', icon: 'none' })
  }
}
function loadWork() {
  try {
    const data = Taro.getStorageSync(STORAGE_KEY)
    if (!data || !Array.isArray(data.layers)) return
    applySnapshot({
      layers: data.layers,
      curBoard: typeof data.curBoard === 'number' ? data.curBoard : -1,
      curBag: data.curBag || 0,
      showGrid: data.version === STORAGE_VERSION && typeof data.showGrid === 'boolean' ? data.showGrid : false,
    })
    selectedId.value = data.selectedId || ''
    seq = data.seq || data.layers.length
  } catch (_) {}
}

function exportImage() {
  saveWork(false)
  const q = Taro.createSelectorQuery()
  q.select('#exportCanvas').fields({ node: true }).exec(async (res) => {
    let node: any = res && res[0] && res[0].node
    // H5 回退：Taro node 查询为空时，直接取真实 canvas DOM
    if ((!node || !node.getContext) && typeof document !== 'undefined') {
      const el: any = document.querySelector('#exportCanvas')
      node = el && (el.tagName === 'CANVAS' ? el : el.querySelector && el.querySelector('canvas'))
    }
    if (!node || !node.getContext) { Taro.showToast({ title: '画布未就绪', icon: 'none' }); return }
    const scale = EXPORT_SIZE / cw
    node.width = EXPORT_SIZE
    node.height = EXPORT_SIZE
    const ctx = node.getContext('2d')
    ctx.clearRect(0, 0, EXPORT_SIZE, EXPORT_SIZE)
    ctx.save()
    ctx.scale(scale, scale)
    try {
      ctx.save()
      ctx.beginPath()
      ctx.rect(win.x, win.y, win.w, win.h)
      ctx.clip()
      ctx.fillStyle = '#f8f1e5'
      ctx.fillRect(win.x, win.y, win.w, win.h)
      if (curBoard.value >= 0) {
        const base = await loadImg(node, boards[curBoard.value].src)
        const bw = base.width || 1, bh = base.height || 1
        const bs = Math.max(win.w / bw, win.h / bh)
        const dw = bw * bs, dh = bh * bs
        ctx.drawImage(base, win.x + (win.w - dw) / 2, win.y + (win.h - dh) / 2, dw, dh)
      }
      for (const ly of doc.layers) {
        ctx.save()
        ctx.translate(win.x + ly.x, win.y + ly.y)
        ctx.rotate((ly.rotation * Math.PI) / 180)
        ctx.scale(ly.flipX ? -ly.scale : ly.scale, ly.scale)
        ctx.globalAlpha = ly.opacity
        if (ly.src) {
          const img = await loadImg(node, ly.src)
          drawRoundedImage(ctx, img, -ly.w / 2, -ly.h / 2, ly.w, ly.h, ly.shape === 'circle' ? ly.w / 2 : 8)
        } else {
          ctx.fillStyle = ly.color
          roundRectPath(ctx, -ly.w / 2, -ly.h / 2, ly.w, ly.h, ly.shape === 'circle' ? ly.w / 2 : 8)
          ctx.fill()
          ctx.fillStyle = '#333'
          ctx.font = '13px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(ly.label, 0, 0)
        }
        ctx.restore()
      }
      ctx.restore()
      const front = await loadImg(node, bags[curBag.value].front)
      ctx.drawImage(front, 0, 0, cw, ch)
    } catch (e) {
      Taro.showToast({ title: '合成失败', icon: 'none' })
      ctx.restore()
      return
    }
    ctx.restore()
    // H5 直接用 toDataURL（可靠）；weapp 走 canvasToTempFilePath
    if (process.env.TARO_ENV === 'h5' && typeof node.toDataURL === 'function') {
      try {
        resultSrc.value = node.toDataURL('image/png')
        Taro.showToast({ title: '已导出', icon: 'none' })
        return
      } catch (_) {}
    }
    Taro.canvasToTempFilePath({
      canvas: node,
      success: (r) => { resultSrc.value = r.tempFilePath; Taro.showToast({ title: '已导出', icon: 'none' }) },
      fail: () => { try { resultSrc.value = (node as any).toDataURL('image/png') } catch (_) {} },
    })
  })
}
</script>

<style>
.page { height: 100vh; height: 100dvh; background: radial-gradient(circle at 50% 18%, #fff 0%, #f8f5f0 42%, #f4f5f7 100%); color: #1d1d1f; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif; }
.topbar { flex: 0 0 52PX; display: flex; align-items: center; justify-content: space-between; padding: 12PX 14PX 7PX; gap: 12PX; background: transparent; border-bottom: 0; backdrop-filter: none; box-sizing: border-box; }
.brand { height: 32PX; min-width: 0; display: flex; align-items: center; gap: 6PX; }
.brand-logo { width: 25PX; height: 25PX; display: block; }
.brand-wordmark { width: 48PX; height: 22PX; display: block; }
.title { display: block; font-size: 17PX; font-weight: 750; color: #1d1d1f; line-height: 22PX; letter-spacing: 0; }
.subtitle { display: block; margin-top: 1PX; font-size: 11PX; color: #86868b; }
.top-actions { display: flex; align-items: center; gap: 7PX; }
.btn, .icon-btn { height: 30PX; min-width: 30PX; padding: 0 12PX; border-radius: 10PX; background: #1d1d1f; color: #fff; font-size: 13PX; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.btn.ghost, .icon-btn { background: rgba(255,255,255,.76); color: #1d1d1f; border: 1PX solid rgba(60,60,67,.12); }
.icon-btn.disabled { opacity: .35; }
.icon-btn { position: relative; padding: 0; }
.top-icon-img { width: 18PX; height: 18PX; display: block; }
.stage-wrap { position: relative; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; justify-content: center; padding: 2PX 0 8PX; box-sizing: border-box; }
.stage-wrap::before { content: ""; position: absolute; left: 6PX; right: 6PX; top: -2PX; bottom: 4PX; border-radius: 24PX; background: radial-gradient(circle at 50% 34%, rgba(255,255,255,.88), rgba(249,244,237,.76) 52%, rgba(244,242,240,.60)); border: 1PX solid rgba(255,255,255,.66); box-shadow: inset 0 1PX 0 rgba(255,255,255,.58), 0 14PX 34PX rgba(60,60,67,.05); pointer-events: none; }
.stage-tools { position: absolute; z-index: 5; top: 10PX; right: 14PX; display: flex; justify-content: flex-end; gap: 8PX; }
.tool-pill { height: 28PX; padding: 0 13PX; border-radius: 999PX; background: rgba(255,255,255,.58); border: 1PX solid rgba(255,255,255,.82); color: #6e6e73; font-size: 12PX; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(22PX) saturate(1.35); box-shadow: 0 8PX 24PX rgba(60,60,67,.08); }
.tool-pill.on { background: #1d1d1f; color: #fff; border-color: #1d1d1f; }
.stage { position: relative; z-index: 1; margin: 0 auto; background: transparent; }
.floating-layers { position: fixed; left: 0; top: 0; z-index: 1100; width: 52PX; height: 52PX; border-radius: 26PX; background: rgba(255,255,255,.78); border: 1PX solid rgba(255,255,255,.9); box-shadow: 0 16PX 34PX rgba(60,60,67,.16), inset 0 1PX 0 rgba(255,255,255,.8); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #1d1d1f; touch-action: none; will-change: transform; backdrop-filter: blur(24PX) saturate(1.45); cursor: grab; -webkit-user-select: none; user-select: none; -webkit-user-drag: none; transition: transform .34s cubic-bezier(.18,.89,.32,1.12), opacity .18s ease, box-shadow .18s ease, background .18s ease; }
.floating-layers.active { background: rgba(255,255,255,.9); color: #0071e3; border-color: rgba(0,113,227,.24); box-shadow: 0 18PX 38PX rgba(0,113,227,.18), inset 0 1PX 0 rgba(255,255,255,.86); }
.floating-layers.dragging { transition: none; opacity: .92; cursor: grabbing; transform-origin: center; box-shadow: 0 22PX 44PX rgba(60,60,67,.20), inset 0 1PX 0 rgba(255,255,255,.8); }
.floating-icon-img { width: 25PX; height: 25PX; display: block; pointer-events: none; user-select: none; -webkit-user-drag: none; }
.floating-count { margin-top: 2PX; font-size: 11PX; line-height: 11PX; font-weight: 650; pointer-events: none; user-select: none; }
.window { position: absolute; overflow: hidden; background: #f3efe7; border-radius: 7PX; }
.window.grid::after { content: ""; position: absolute; inset: 0; pointer-events: none; background-image: linear-gradient(rgba(17,24,39,.10) 1PX, transparent 1PX), linear-gradient(90deg, rgba(17,24,39,.10) 1PX, transparent 1PX); background-size: 24PX 24PX; opacity: .35; z-index: 8; }
.fill { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
.board-fill { background-position: center; background-repeat: no-repeat; background-size: cover; }
.empty-board { background: linear-gradient(180deg, #fbf6eb 0%, #f4eadb 100%); }
.bag-front { position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: 999; pointer-events: none; }
.selection-overlay { position: absolute; z-index: 1200; pointer-events: none; touch-action: none; }
.layer { position: absolute; touch-action: none; }
.layer.locked { opacity: .86; }
.layer-inner { width: 100%; height: 100%; border-radius: 9PX; display: flex; align-items: center; justify-content: center; box-shadow: 0 5PX 14PX rgba(15,23,42,.14); overflow: hidden; }
.layer-inner.circle, .cell-block.circle, .layer-dot.circle { border-radius: 999PX; }
.layer.selected .layer-inner { outline: 2PX dashed rgba(0,113,227,.9); outline-offset: 2PX; }
.layer.locked.selected .layer-inner { outline-style: solid; }
.layer-label { font-size: 12PX; color: #333; }
.layer-img { width: 100%; height: 100%; }
.layer-handle { position: absolute; z-index: 40; width: 22PX; height: 22PX; border-radius: 999PX; background: rgba(255,255,255,.74); border: 1PX solid rgba(255,255,255,.86); box-shadow: 0 6PX 16PX rgba(15,23,42,.14); color: #1d1d1f; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%) rotate(var(--handle-rotation)) scale(var(--handle-scale)); touch-action: none; backdrop-filter: blur(18PX) saturate(1.42); pointer-events: auto; overflow: hidden; }
.handle-icon { width: 12PX; height: 12PX; display: block; opacity: .88; pointer-events: none; }
.handle-copy .handle-icon { width: 13PX; height: 13PX; }
.handle-mirror .handle-icon { width: 13PX; height: 13PX; }
.handle-delete .handle-icon { width: 11PX; height: 11PX; }
.handle-rotate .handle-icon { width: 13PX; height: 13PX; }
.handle-copy { left: -6PX; top: -6PX; color: #0071e3; }
.handle-delete { left: calc(100% + 6PX); top: -6PX; }
.handle-mirror { left: -6PX; top: calc(100% + 6PX); }
.handle-rotate { left: calc(100% + 6PX); top: calc(100% + 6PX); cursor: grab; }
.bottom-dock { position: relative; flex: 0 0 auto; padding: 0 0 max(8PX, env(safe-area-inset-bottom)); transition: flex-basis .24s ease; }
.bottom-dock.dragging { transition: none; }
.bottom-dock.collapsed { flex: 0 0 38PX; }
.inspector, .panel { margin: 0 10PX; background: rgba(255,255,255,.78); border: 1PX solid rgba(255,255,255,.88); border-radius: 24PX; padding: 10PX 12PX; box-sizing: border-box; backdrop-filter: blur(26PX) saturate(1.38); box-shadow: 0 -12PX 34PX rgba(60,60,67,.10), inset 0 1PX 0 rgba(255,255,255,.75); }
.inspector { position: absolute; left: 0; right: 0; bottom: calc(218PX + 18PX); z-index: 900; min-height: 0; padding: 0; display: flex; justify-content: center; pointer-events: none; border: 0; background: transparent; box-shadow: none; overflow: visible; }
.material-panel { height: 218PX; min-height: 0; border-radius: 26PX 26PX 18PX 18PX; display: flex; flex-direction: column; transition: transform .32s cubic-bezier(.18,.89,.32,1.08), opacity .2s ease; will-change: transform; }
.bottom-dock.dragging .material-panel { transition: none; }
.bottom-dock.collapsed .material-panel { position: absolute; left: 0; right: 0; bottom: max(8PX, env(safe-area-inset-bottom)); transform: translateY(calc(100% - 34PX)); opacity: .9; pointer-events: none; }
.bottom-dock.collapsed .sheet-grabber { pointer-events: auto; margin-top: 2PX; }
.bottom-dock.collapsed .panel-head, .bottom-dock.collapsed .cats, .bottom-dock.collapsed .row { opacity: 0; pointer-events: none; }
.inspector-head, .panel-head { display: flex; align-items: center; justify-content: space-between; gap: 10PX; }
.inspector-head { grid-row: 1 / 3; grid-column: 1; align-self: stretch; align-items: flex-start; padding-top: 2PX; }
.ctrl-name { font-size: 13PX; font-weight: 700; color: #242733; line-height: 17PX; display: block; max-width: 50PX; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ctrl-meta, .panel-link { font-size: 12PX; color: #7c8190; }
.ctrl-scroll { grid-column: 2; grid-row: 1; width: 100%; min-width: 0; height: 26PX; white-space: nowrap; overflow-x: auto; overflow-y: hidden; }
.ctrl-row { display: inline-flex; flex-wrap: nowrap; gap: 6PX; }
.cbtn { flex: 0 0 auto; height: 26PX; background: #f1f5f9; color: #334155; padding: 0 10PX; border-radius: 7PX; font-size: 12PX; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.cbtn.primary { background: #eef2ff; color: #3730a3; }
.cbtn.danger { background: #fee2e2; color: #b91c1c; }
.nudge-row { display: flex; gap: 6PX; overflow: hidden; pointer-events: auto; padding: 4PX 6PX; border-radius: 999PX; background: rgba(255,255,255,.60); border: 1PX solid rgba(255,255,255,.72); box-shadow: 0 10PX 24PX rgba(60,60,67,.08), inset 0 1PX 0 rgba(255,255,255,.72); backdrop-filter: blur(22PX) saturate(1.4); }
.nudge-group { width: 112PX; height: 28PX; border-radius: 999PX; background: rgba(255,255,255,.32); display: grid; grid-template-columns: 28PX minmax(54PX, 1fr) 28PX; align-items: center; overflow: hidden; border: 1PX solid rgba(255,255,255,.38); box-shadow: inset 0 1PX 0 rgba(255,255,255,.52); backdrop-filter: blur(18PX) saturate(1.3); }
.nudge-group:nth-child(2) { width: 108PX; grid-template-columns: 30PX minmax(48PX, 1fr) 30PX; }
.nudge-label { display: none; }
.nudge-value { color: #1d1d1f; font-size: 13PX; font-weight: 650; text-align: center; font-variant-numeric: tabular-nums; text-shadow: 0 1PX 6PX rgba(255,255,255,.8); }
.nudge-input { width: 100%; height: 28PX; min-width: 0; padding: 0 2PX; border: 0; outline: 0; background: transparent; color: #1d1d1f; font-size: 13PX; line-height: 28PX; font-weight: 650; text-align: center; font-variant-numeric: tabular-nums; text-shadow: 0 1PX 6PX rgba(255,255,255,.8); box-sizing: border-box; display: flex; align-items: center; justify-content: center; }
.nudge-btn { height: 27PX; width: 27PX; border-radius: 0; display: flex; align-items: center; justify-content: center; color: #1d1d1f; font-size: 16PX; border-left: 1PX solid rgba(60,60,67,.08); background: transparent; text-shadow: 0 1PX 6PX rgba(255,255,255,.8); }
.nudge-btn:first-child { border-left: 0; }
.zoom-btn { font-size: 16PX; }
.sheet-grabber { width: 72PX; height: 22PX; border-radius: 999PX; margin: -10PX auto 0; flex: 0 0 auto; position: relative; touch-action: none; cursor: grab; transition: background .16s ease, box-shadow .16s ease; }
.sheet-grabber::after { content: ""; position: absolute; left: 15PX; right: 15PX; top: 9PX; height: 4PX; border-radius: 999PX; background: rgba(60,60,67,.24); transition: background .16s ease, transform .16s ease; }
.bottom-dock.dragging .sheet-grabber { background: rgba(60,60,67,.10); box-shadow: inset 0 1PX 0 rgba(255,255,255,.35); }
.bottom-dock.dragging .sheet-grabber::after { background: rgba(60,60,67,.34); transform: scaleX(1.16); }
.panel-title-wrap { display: flex; align-items: center; gap: 8PX; }
.panel-title { font-size: 17PX; color: #1d1d1f; font-weight: 760; }
.sparkle { color: #b8bcc4; font-size: 14PX; }
.import-pill { height: 30PX; padding: 0 12PX; border-radius: 999PX; background: rgba(255,255,255,.58); border: 1PX solid rgba(60,60,67,.08); color: #6e6e73; font-size: 12PX; display: flex; align-items: center; gap: 5PX; box-shadow: inset 0 1PX 0 rgba(255,255,255,.78); }
.import-icon { font-size: 14PX; }
.cats { display: flex; gap: 9PX; margin: 12PX 0 12PX; overflow-x: auto; flex: 0 0 auto; }
.cat { flex: 0 0 auto; min-width: 56PX; height: 30PX; padding: 0 12PX; border-radius: 999PX; background: rgba(242,242,247,.82); color: #7b7784; font-size: 14PX; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.cat.on { background: rgba(255,222,112,.74); color: #1d1d1f; font-weight: 760; box-shadow: inset 0 1PX 0 rgba(255,255,255,.65); }
.row { width: 100%; white-space: nowrap; flex: 1 1 auto; min-height: 0; }
.row-inner { height: 100%; display: inline-flex; align-items: stretch; gap: 12PX; padding: 0 2PX 2PX; box-sizing: border-box; }
.cell { width: 90PX; display: inline-flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 6PX; }
.cell-card { position: relative; width: 90PX; height: 90PX; border-radius: 20PX; background: rgba(248,249,251,.84); border: 1PX solid rgba(255,255,255,.72); display: flex; align-items: center; justify-content: center; box-shadow: 0 10PX 22PX rgba(60,60,67,.08), inset 0 1PX 0 rgba(255,255,255,.82); overflow: hidden; }
.cell-thumb { width: 78PX; height: 78PX; border-radius: 16PX; border: 1PX solid rgba(60,60,67,.08); object-fit: cover; }
.cell-block { position: relative; width: 68PX; height: 68PX; border-radius: 16PX; box-shadow: 0 8PX 16PX rgba(60,60,67,.12), inset 0 1PX 0 rgba(255,255,255,.55); }
.cell-block::before { content: ""; position: absolute; inset: 3PX; border-radius: inherit; border: 1PX solid rgba(255,255,255,.54); pointer-events: none; }
.cell-heart { position: absolute; right: 6PX; bottom: 4PX; color: rgba(255,255,255,.48); font-size: 13PX; line-height: 13PX; }
.cell-none { width: 68PX; height: 68PX; border-radius: 16PX; border: 1PX solid rgba(60,60,67,.10); background: rgba(242,242,247,.85); display: flex; align-items: center; justify-content: center; }
.cell-none-icon { width: 42PX; height: 42PX; display: block; opacity: .82; }
.cell-plus { width: 68PX; height: 68PX; border-radius: 16PX; border: 1PX dashed #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 25PX; color: #8e99a8; background: rgba(255,255,255,.5); }
.cell-label { font-size: 13PX; color: #1d1d1f; max-width: 90PX; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.drawer-mask { position: fixed; inset: 0; z-index: 1250; background: rgba(15, 23, 42, .18); }
.layer-drawer { position: fixed; left: 0; right: 0; bottom: 0; height: 48vh; z-index: 1300; padding: 8PX 12PX max(14PX, env(safe-area-inset-bottom)); border-radius: 18PX 18PX 0 0; background: rgba(255,255,255,.88); border: 1PX solid rgba(255,255,255,.82); box-shadow: 0 -16PX 40PX rgba(15, 23, 42, .18); transform: translateY(110%); transition: transform .32s cubic-bezier(.18,.89,.32,1.08); box-sizing: border-box; backdrop-filter: blur(28PX) saturate(1.35); will-change: transform; }
.layer-drawer.open { transform: translateY(0); }
.layer-drawer.dragging { transition: none; }
.drawer-handle { width: 74PX; height: 22PX; border-radius: 999PX; margin: -2PX auto 4PX; position: relative; touch-action: none; cursor: grab; transition: background .16s ease, box-shadow .16s ease; }
.drawer-handle::after { content: ""; position: absolute; left: 15PX; right: 15PX; top: 8PX; height: 4PX; border-radius: 999PX; background: rgba(60,60,67,.24); transition: background .16s ease, transform .16s ease; }
.layer-drawer.dragging .drawer-handle { background: rgba(60,60,67,.10); box-shadow: inset 0 1PX 0 rgba(255,255,255,.35); }
.layer-drawer.dragging .drawer-handle::after { background: rgba(60,60,67,.34); transform: scaleX(1.16); }
.drawer-head { padding: 0 2PX; }
.drawer-actions { display: flex; align-items: center; gap: 14PX; }
.drawer-close { width: 28PX; height: 28PX; border-radius: 14PX; background: #f1f5f9; color: #334155; font-size: 20PX; line-height: 26PX; text-align: center; }
.layer-scroll { height: calc(48vh - 82PX); margin-top: 10PX; }
.empty-layers { height: 160PX; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 13PX; }
.layer-list { margin-top: 10PX; display: flex; flex-direction: column; gap: 6PX; }
.layer-slot { height: 36PX; display: grid; grid-template-columns: 24PX 1fr; align-items: center; gap: 6PX; }
.layer-rank { color: rgba(60,60,67,.48); font-size: 12PX; font-weight: 650; line-height: 36PX; text-align: center; font-variant-numeric: tabular-nums; pointer-events: none; }
.layer-row { position: relative; height: 36PX; display: grid; grid-template-columns: 26PX 18PX 1fr 24PX; align-items: center; gap: 8PX; border-radius: 10PX; padding: 0 7PX 0 4PX; background: rgba(248,250,252,.82); transform: translate3d(0, var(--row-shift, 0), 0); transition: transform .24s cubic-bezier(.2,.85,.2,1), background .18s ease, box-shadow .18s ease, opacity .18s ease; will-change: transform; }
.layer-row.on { background: rgba(238,242,255,.86); color: #3730a3; }
.layer-list.reordering .layer-row:not(.lifting) { transition: transform .26s cubic-bezier(.16,1,.3,1), background .18s ease; }
.layer-row.lifting { z-index: 3; transform: translate3d(0, var(--row-shift, 0), 0) scale(1.018); background: rgba(255,255,255,.96); box-shadow: 0 14PX 30PX rgba(15,23,42,.18), inset 0 1PX 0 rgba(255,255,255,.82); opacity: .96; transition: transform .02s linear, background .18s ease, box-shadow .18s ease; }
.layer-row.insert::before { content: ""; position: absolute; left: 12PX; right: 12PX; top: -4PX; height: 3PX; border-radius: 999PX; background: rgba(0,113,227,.72); box-shadow: 0 0 0 3PX rgba(0,113,227,.10); }
.layer-row.settled { animation: rowSettle .22s cubic-bezier(.2,.8,.2,1); }
@keyframes rowSettle {
  0% { transform: scale(.985); background: rgba(229,241,255,.94); }
  100% { transform: scale(1); }
}
.row-drag { width: 26PX; height: 36PX; display: flex; align-items: center; justify-content: center; color: #b6bdca; touch-action: none; cursor: grab; }
.row-drag-icon { font-size: 15PX; line-height: 15PX; }
.layer-dot { width: 18PX; height: 18PX; border-radius: 5PX; border: 1PX solid rgba(0,0,0,.08); }
.layer-row-name { font-size: 13PX; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.row-lock { width: 24PX; height: 32PX; display: flex; align-items: center; justify-content: center; background: transparent; border: 0; box-shadow: none; }
.row-lock.on { background: transparent; border: 0; }
.row-lock-icon { width: 16PX; height: 16PX; display: block; opacity: .42; }
.row-lock.on .row-lock-icon { opacity: .9; filter: none; }
.export-canvas { position: fixed; left: -9999PX; top: -9999PX; width: 1280PX; height: 1280PX; }
.result { margin: 12PX 16PX; }
.result-img { width: 100%; border-radius: 8PX; border: 1PX solid #e5e7eb; }
</style>
