<template>
  <view
    class="page"
    :class="{ 'has-selection': selected, 'pure-view': materialCollapsed, 'stage-zoomed': stageZoomed }"
    :style="{ backgroundImage: `url(${appWaterBg})` }"
  >
    <EditorTopbar
      :can-undo="canUndo"
      :can-redo="canRedo"
      @undo="undo"
      @redo="redo"
      @history="openExportHistory"
      @export="exportImage"
    />

    <view class="stage-wrap" @tap="onStageWrapTap">
      <StageToolRail
        :stage-zoomed="stageZoomed"
        :show-grid="showGrid"
        :layer-drawer-open="showLayerDrawer"
        :dragging="layerButtonMoving"
        :collapsed="materialCollapsed"
        :rail-style="layerButtonStyle"
        @toggle-zoom="runRailAction(toggleStageZoom)"
        @toggle-grid="runRailAction(toggleGrid)"
        @fit-selection="runRailAction(fitSelection)"
        @toggle-layers="onLayerButtonTap"
        @touch-start="onLayerButtonTouchStart"
        @touch-move="onLayerButtonTouchMove"
        @touch-end="onLayerButtonTouchEnd"
        @mouse-down="onLayerButtonMouseDown"
      />
      <view class="stage" :style="{ width: cw + 'px', height: ch + 'px' }" @tap.stop="onStageTap">
        <view
          class="window"
          :class="{ grid: showGrid }"
          :style="{ left: win.x + 'px', top: win.y + 'px', width: win.w + 'px', height: win.h + 'px' }"
        >
          <image
            class="fill bag-back-fill"
            :src="bags[curBag].back"
            mode="scaleToFill"
            :style="bagBackFillStyle"
          />
          <view
            v-if="hasBoardLayer"
            class="layer board-edit-layer"
            :class="{ selected: selectedId === BOARD_LAYER_ID, locked: boardLayer.locked }"
            :style="layerStyle(boardLayer, -9)"
            @tap.stop="onLayerTap(boardLayer)"
            @touchstart.stop="onTouchStart($event, boardLayer)"
            @touchmove.stop="onTouchMove($event, boardLayer)"
            @touchend.stop="onTouchEnd"
            @mousedown.stop="onMouseDown($event, boardLayer)"
          >
            <view
              class="layer-inner board-layer-inner"
              :style="boardLayerInnerStyle"
            />
          </view>
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
        <SelectionOverlay
          v-if="selected"
          :selected="selected"
          :dragging="layerDragging"
          :overlay-style="selectedHandleStyle(selected)"
          @duplicate="duplicateLayer"
          @remove="removeLayer"
          @mirror="mirrorLayer"
          @rotate-touch-start="onRotateHandleTouchStart"
          @rotate-touch-move="onRotateHandleTouchMove"
          @rotate-touch-end="onRotateHandleTouchEnd"
          @rotate-mouse-down="onRotateHandleMouseDown"
        />
      </view>

    </view>

    <view class="bottom-dock" :class="{ collapsed: materialCollapsed, dragging: sheetDragging }">
      <NudgeInspector
        :selected="selected"
        :scale-field-value="scaleFieldValue"
        :rotation-field-value="rotationFieldValue"
        @scale-step-touch-start="(dir) => startStepHold(applyScaleStep, dir)"
        @rotate-step-touch-start="(dir) => startStepHold(applyRotateStep, dir)"
        @step-touch-end="stopStepHold"
        @scale-step-mouse-down="(dir) => onStepMouseDown(applyScaleStep, dir)"
        @rotate-step-mouse-down="(dir) => onStepMouseDown(applyRotateStep, dir)"
        @nudge-focus="onNudgeFocus"
        @scale-input="onScaleInput"
        @rotation-input="onRotationInput"
        @commit-input="commitNudgeInput"
      />

      <MaterialShelf
        :panel-style="materialPanelStyle"
        :cats="cats"
        :category="category"
        :sub-cats="subCats"
        :sub-cat="subCat"
        :row-items="rowItems"
        @toggle-collapsed="toggleMaterialCollapsed"
        @touch-start="onSheetTouchStart"
        @touch-move="onSheetTouchMove"
        @touch-end="onSheetTouchEnd"
        @mouse-down="onSheetMouseDown"
        @set-category="setCategory"
        @set-subcat="subCat = $event"
        @select-item="onItem"
        @material-long-press="openMaterialAssetActions"
        @material-drag-start="onMaterialDragStart"
        @material-drag-move="onMaterialDragMove"
        @material-drag-end="onMaterialDragEnd"
      />
    </view>

    <view
      v-if="materialDragGhost.visible"
      class="material-drag-ghost"
      :style="{
        left: materialDragGhost.x + 'px',
        top: materialDragGhost.y + 'px',
        width: materialDragGhost.w + 'px',
        height: materialDragGhost.h + 'px',
      }"
    >
      <view
        class="material-drag-piece"
        :class="materialDragGhost.shape"
        :style="{ background: materialDragGhost.color }"
      >
        <image v-if="materialDragGhost.src" :src="materialDragGhost.src" class="material-drag-img" mode="aspectFill" />
        <text v-else class="material-drag-label">{{ materialDragGhost.label }}</text>
      </view>
    </view>

    <LayerDrawer
      :open="showLayerDrawer"
      :dragging="drawerDragging"
      :drawer-style="drawerStyle"
      :layers="visibleLayerList"
      :selected-id="selectedId"
      :reorder-id="reorderId"
      :reorder-target-vis="reorderTargetVis"
      :settled-reorder-id="settledReorderId"
      :layer-order-label="layerOrderLabel"
      :layer-row-style="layerRowStyle"
      @close="toggleLayerDrawer"
      @touch-start="onDrawerTouchStart"
      @touch-move="onDrawerTouchMove"
      @touch-end="onDrawerTouchEnd"
      @mouse-down="onDrawerMouseDown"
      @select-layer="selectLayer"
      @toggle-lock="toggleLayerLock"
      @row-drag-touch-start="onRowDragTouchStart"
      @row-drag-touch-move="onRowDragTouchMove"
      @row-drag-touch-end="onRowDragTouchEnd"
      @row-drag-mouse-down="onRowDragMouseDown"
    />

    <view v-if="materialAssetActionOpen" class="asset-action-mask" @tap="closeMaterialAssetActions">
      <view class="asset-action-panel" @tap.stop>
        <view class="asset-action-title">{{ materialAssetActionLabel }}</view>
        <view class="asset-action-row" @tap="editMaterialAsset">编辑</view>
        <view class="asset-action-row danger" @tap="deleteMaterialAsset">删除</view>
        <view class="asset-action-cancel" @tap="closeMaterialAssetActions">取消</view>
      </view>
    </view>

    <canvas type="2d" id="exportCanvas" class="export-canvas" />
    <view v-if="exportHistoryOpen" class="export-history-mask" @tap="closeExportHistory">
      <view class="export-history-panel" @tap.stop>
        <view class="export-history-head">
          <view>
            <text class="export-history-title">导出历史</text>
            <text class="export-history-subtitle">最近 {{ exportHistory.length }} 张</text>
          </view>
          <text class="export-history-close" @tap="closeExportHistory">×</text>
        </view>
        <view v-if="exportHistory.length" class="export-history-list">
          <view
            v-for="record in exportHistory"
            :key="record.id"
            class="export-history-item"
            @tap="previewExportHistory(record)"
          >
            <image :src="record.src" mode="aspectFill" class="export-history-thumb" />
            <view class="export-history-meta">
              <text class="export-history-name">{{ record.name }}</text>
              <text class="export-history-time">{{ record.timeText }}</text>
            </view>
            <text class="export-history-arrow">查看</text>
          </view>
        </view>
        <view v-else class="export-history-empty">
          <text>还没有导出记录</text>
        </view>
      </view>
    </view>
    <view v-if="importEditorOpen" class="import-editor-mask" @tap="cancelImportEditor">
      <view class="import-editor-panel" @tap.stop>
        <view class="import-editor-head">
          <view>
            <text class="import-editor-title">编辑导入素材</text>
            <text class="import-editor-subtitle">先归类，再放进谷子池</text>
          </view>
          <text class="import-editor-close" @tap="cancelImportEditor">×</text>
        </view>
        <view class="import-editor-body">
          <image :src="importDraft.storedSrc || importDraft.src" mode="aspectFit" class="import-editor-preview" />
          <view class="import-editor-field">
            <text class="import-editor-label">名称</text>
            <input
              class="import-editor-input"
              type="text"
              maxlength="12"
              :value="importDraft.label"
              @input="onImportLabelInput"
            />
          </view>
          <view class="import-editor-field">
            <text class="import-editor-label">类型</text>
            <view class="import-editor-types">
              <view
                v-for="item in importDraftSubcats"
                :key="item"
                class="import-editor-type"
                :class="{ on: importDraft.sub === item }"
                @tap="setImportDraftSub(item)"
              >{{ item }}</view>
            </view>
          </view>
        </view>
        <view class="import-editor-actions">
          <view class="import-editor-btn ghost" @tap="cancelImportEditor">取消</view>
          <view class="import-editor-btn" @tap="confirmImportEditor">导入</view>
        </view>
      </view>
    </view>
    <view v-if="resultPreviewOpen && resultSrc" class="export-preview-mask" @tap="closeExportPreview">
      <view class="export-preview" @tap.stop>
        <view class="export-preview-head">
          <text class="export-preview-title">导出结果</text>
          <text class="export-preview-close" @tap="closeExportPreview">×</text>
        </view>
        <image :src="resultSrc" mode="aspectFit" class="export-preview-img" />
        <view class="export-preview-actions">
          <view class="export-save-btn" @tap="saveExportImage">保存图片</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import Taro from '@tarojs/taro'
import EditorTopbar from './components/EditorTopbar.vue'
import StageToolRail from './components/StageToolRail.vue'
import SelectionOverlay from './components/SelectionOverlay.vue'
import NudgeInspector from './components/NudgeInspector.vue'
import MaterialShelf from './components/MaterialShelf.vue'
import LayerDrawer from './components/LayerDrawer.vue'
import { exportEditorImage } from './editor-export'
import {
  STORAGE_KEY, STORAGE_VERSION, EXPORT_SIZE, BAG_RATIO, BOARD_LAYER_ID, WIN, ROW_PITCH,
  boards, bags, cats, decor, SUBCATS,
  clamp, dist, ang,
} from './editor-core'
import type { Mat, Layer, Snapshot, RowItem, CatName, BoardTransform } from './editor-core'
import appWaterBg from '../../assets/app-water-bg.jpg'

const MIN_SCALE = 0.1
const MAX_SCALE = 3
const LAYER_LONG_PRESS_MS = 1600
const MATERIAL_COLLAPSED_PEEK = 86
const LAYER_RAIL_TOP_GUARD = 98
const EXPORT_HISTORY_KEY = `${STORAGE_KEY}-export-history`
const EXPORT_HISTORY_LIMIT = 8
const EXPORT_HISTORY_DB_NAME = 'gooda-export-history'
const EXPORT_HISTORY_STORE = 'exports'
const USER_ASSETS_KEY = `${STORAGE_KEY}-user-assets`
const USER_ASSETS_DB_NAME = 'gooda-user-assets'
const USER_ASSETS_STORE = 'images'

const sys = Taro.getSystemInfoSync()
function viewportSize() {
  if (typeof window !== 'undefined') return { w: window.innerWidth || 375, h: window.innerHeight || 760 }
  return { w: sys.windowWidth || 375, h: sys.windowHeight || 760 }
}
const vp = viewportSize()
const cw = Math.min(vp.w - 8, Math.floor((vp.h - 300) * 0.84), 430)
const ch = Math.round(cw * BAG_RATIO)
const win = reactive({
  x: WIN.l * cw, y: WIN.t * ch,
  w: (WIN.r - WIN.l) * cw, h: (WIN.b - WIN.t) * ch,
})

const curBoard = ref(-1)
const curBag = ref(0)
const showGrid = ref(false)
const stageZoomed = ref(false)
const category = ref<CatName>('谷子')
const subCat = ref('全部')
const subCats = computed(() => SUBCATS[category.value] || ['全部'])
function setCategory(c: CatName) {
  category.value = c
  subCat.value = '全部'
  if (materialCollapsed.value) materialCollapsed.value = false
}
const doc = reactive<{ layers: Layer[] }>({ layers: [] })
const selectedId = ref('')
const resultSrc = ref('')
const resultPreviewOpen = ref(false)
const exportHistoryOpen = ref(false)
const importEditorOpen = ref(false)
const importDraft = reactive({
  src: '',
  storedSrc: '',
  editAssetId: '',
  type: '谷子' as '谷子' | '装饰',
  sub: '其他',
  label: '',
})
const importDraftSubcats = computed(() => (SUBCATS[importDraft.type] || ['全部']).filter((item) => item !== '全部'))
type UserAsset = {
  id: string
  type: '谷子' | '装饰'
  sub: string
  label: string
  color: string
  w: number
  h: number
  shape: 'rect' | 'circle'
  src: string
  source: 'import' | 'spu'
  spuId?: string
  createdAt: number
  updatedAt: number
}
type StoredUserAsset = Omit<UserAsset, 'src'> & { src?: string }
type ExportHistoryRecord = { id: string; src: string; createdAt: number; name: string; timeText: string }
type StoredExportHistoryRecord = Omit<ExportHistoryRecord, 'src'> & { src?: string }
const userAssets = ref<UserAsset[]>([])
const exportHistory = ref<ExportHistoryRecord[]>([])
const materialAssetActionOpen = ref(false)
const materialAssetActionId = ref('')
const materialAssetActionLabel = computed(() => {
  const asset = userAssets.value.find((item) => item.id === materialAssetActionId.value)
  return asset?.label || '素材'
})
const history = ref<Snapshot[]>([])
const redoStack = ref<Snapshot[]>([])
const showLayerDrawer = ref(false)
const layerButtonMoving = ref(false)
const layerDragging = ref(false)
const materialCollapsed = ref(false)
const sheetDragging = ref(false)
const sheetDragY = ref(0)
const drawerDragging = ref(false)
const drawerDragY = ref(0)
const materialDragGhost = reactive({
  visible: false,
  x: 0,
  y: 0,
  w: 56,
  h: 56,
  color: '#fff',
  label: '',
  shape: 'rect',
  src: '',
})
const layerButton = reactive({ x: 0, y: 0 })
const reorderId = ref('')
const editingField = ref<'' | 'scale' | 'rotation'>('')
const editingText = ref('')
const reorderTargetVis = ref(-1)
const reorderOffsetY = ref(0)
const reorderDragY = ref(0)
const settledReorderId = ref('')
const boardTransform = reactive<BoardTransform>({
  x: win.w / 2,
  y: win.h / 2,
  scale: 1,
  rotation: 0,
  opacity: 1,
  locked: true,
  flipX: false,
})

const boardLayer = reactive<Layer>({
  type: '底板',
  label: '底板',
  color: '#fff',
  w: win.w,
  h: win.h,
  shape: 'rect',
  id: BOARD_LAYER_ID,
  x: boardTransform.x,
  y: boardTransform.y,
  scale: boardTransform.scale,
  rotation: boardTransform.rotation,
  opacity: boardTransform.opacity,
  locked: boardTransform.locked,
  flipX: boardTransform.flipX,
  fixed: true,
})
const hasBoardLayer = computed(() => curBoard.value >= 0)
const selected = computed(() => selectedId.value === BOARD_LAYER_ID && hasBoardLayer.value ? boardLayer : doc.layers.find((l) => l.id === selectedId.value))
const canUndo = computed(() => history.value.length > 1)
const canRedo = computed(() => redoStack.value.length > 0)
const visibleLayerList = computed(() => {
  const list = [...doc.layers].reverse()
  if (hasBoardLayer.value) list.push(boardLayer)
  return list
})
const layerButtonStyle = computed(() => ({
  transform: `translate3d(${materialCollapsed.value ? layerButtonHiddenX() : layerButton.x}px, ${layerButton.y}px, 0)`,
}))
const materialPanelStyle = computed(() => {
  if (!sheetDragging.value) return {}
  if (materialCollapsed.value) {
    return { transform: `translateY(calc(100% - ${MATERIAL_COLLAPSED_PEEK}PX + ${sheetDragY.value}px))` }
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
function boardBaseSize() {
  const aspect = curBoard.value >= 0 ? boards[curBoard.value].aspect || 426 / 300 : 426 / 300
  return { w: win.h * aspect, h: win.h }
}
function boardCoverScale() {
  const base = boardBaseSize()
  return Math.max(win.w / base.w, win.h / base.h)
}
const boardLayerInnerStyle = computed(() => ({
  background: boardLayer.src ? undefined : boardLayer.color,
  backgroundImage: boardLayer.src ? `url(${boardLayer.src})` : undefined,
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  backgroundSize: '100% 100%',
  opacity: boardLayer.opacity,
  transform: boardLayer.flipX ? 'scaleX(-1)' : 'none',
}))
const bagBackFillStyle = computed(() => {
  const crop = bags[curBag.value]?.backCrop
  if (!crop) return {}
  const left = -(crop.x / crop.w) * 100
  const top = -(crop.y / crop.h) * 100
  const width = (EXPORT_SIZE / crop.w) * 100
  const height = (EXPORT_SIZE / crop.h) * 100
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    height: `${height}%`,
  }
})

function syncWindowFromBag(rescaleContent = false) {
  const old = { w: win.w, h: win.h }
  const frame = bags[curBag.value]?.win || WIN
  win.x = frame.l * cw
  win.y = frame.t * ch
  win.w = (frame.r - frame.l) * cw
  win.h = (frame.b - frame.t) * ch
  if (rescaleContent && old.w > 0 && old.h > 0) {
    const rx = win.w / old.w
    const ry = win.h / old.h
    doc.layers.forEach((ly) => {
      ly.x *= rx
      ly.y *= ry
    })
    boardTransform.x *= rx
    boardTransform.y *= ry
  }
}

function syncBoardLayerFromTransform() {
  if (curBoard.value >= 0) {
    const b = boards[curBoard.value]
    boardLayer.label = b.label || '底板'
    boardLayer.color = b.color || '#fff'
    boardLayer.src = b.src
  } else {
    boardLayer.label = '底板'
    boardLayer.color = '#fff'
    boardLayer.src = undefined
  }
  const base = boardBaseSize()
  boardLayer.w = base.w
  boardLayer.h = base.h
  boardLayer.x = boardTransform.x
  boardLayer.y = boardTransform.y
  boardLayer.scale = boardTransform.scale
  boardLayer.rotation = boardTransform.rotation
  boardLayer.opacity = boardTransform.opacity
  boardLayer.locked = boardTransform.locked
  boardLayer.flipX = boardTransform.flipX
}

function syncBoardTransformFromLayer() {
  boardTransform.x = boardLayer.x
  boardTransform.y = boardLayer.y
  boardTransform.scale = boardLayer.scale
  boardTransform.rotation = boardLayer.rotation
  boardTransform.opacity = boardLayer.opacity
  boardTransform.locked = boardLayer.locked
  boardTransform.flipX = boardLayer.flipX
}

function resetBoardTransform(locked = true) {
  boardTransform.x = win.w / 2
  boardTransform.y = win.h / 2
  boardTransform.scale = boardCoverScale()
  boardTransform.rotation = 0
  boardTransform.opacity = 1
  boardTransform.locked = locked
  boardTransform.flipX = false
  syncBoardLayerFromTransform()
}

function assetToMat(asset: UserAsset): Mat {
  return {
    type: asset.type,
    label: asset.label,
    color: asset.color,
    w: asset.w,
    h: asset.h,
    shape: asset.shape,
    src: asset.src,
    assetId: asset.id,
    sub: asset.sub,
    spuId: asset.spuId,
  }
}

function guessAssetShape(type: UserAsset['type'], sub: string) {
  return type === '谷子' && sub === '吧唧' ? 'circle' : 'rect'
}
function defaultAssetSize(sub: string, shape: 'rect' | 'circle') {
  if (shape === 'circle') return { w: 56, h: 56 }
  if (sub === '立牌') return { w: 48, h: 70 }
  if (sub === '小卡') return { w: 48, h: 66 }
  if (sub === '色纸') return { w: 60, h: 60 }
  return { w: 60, h: 60 }
}
function categorySubcats(type: UserAsset['type']) {
  return (SUBCATS[type] || ['全部']).filter((item) => item !== '全部')
}
function placeholderColor(type: UserAsset['type'], sub: string) {
  const guziColors: Record<string, string> = {
    吧唧: '#E9C7CF',
    立牌: '#BCDAD1',
    小卡: '#E8D2B2',
    色纸: '#C7DCE8',
    其他: '#D8CFEA',
  }
  const decorColors: Record<string, string> = {
    蝴蝶结: '#EBC4CC',
    吧唧托: '#D7CEE9',
    花边: '#EFE0BC',
    丝带: '#C7DAE8',
    其他: '#CFE0D7',
  }
  return type === '谷子' ? guziColors[sub] || '#E7D4DA' : decorColors[sub] || '#E3D9EC'
}
function categoryPlaceholder(type: UserAsset['type'], sub: string): RowItem | undefined {
  if (sub === '全部') return undefined
  const shape = guessAssetShape(type, sub)
  const size = defaultAssetSize(sub, shape)
  const mat: Mat = {
    type,
    label: sub,
    color: placeholderColor(type, sub),
    w: size.w,
    h: size.h,
    shape,
    sub,
  }
  return { kind: 'mat', label: sub, color: mat.color, shape: mat.shape, mat }
}

const rowItems = computed<RowItem[]>(() => {
  const sc = subCat.value
  const flt = (arr: Mat[]) => (sc === '全部' ? arr : arr.filter((m) => (m.sub || '其他') === sc))
  const fltAssets = (type: UserAsset['type']) => userAssets.value.filter((asset) => asset.type === type && (sc === '全部' || (asset.sub || '其他') === sc))
  const placeholders = (type: UserAsset['type']) => {
    const subs = sc === '全部' ? categorySubcats(type) : [sc]
    return subs
      .map((sub) => categoryPlaceholder(type, sub))
      .filter((item): item is RowItem => !!item)
  }
  if (category.value === '谷子')
    return [
      { kind: 'plus', label: '导入' },
      ...placeholders('谷子'),
      ...fltAssets('谷子').map((asset) => {
        const mat = assetToMat(asset)
        return { kind: 'mat', label: mat.label, color: mat.color, shape: mat.shape, img: mat.src, mat } as RowItem
      }),
    ]
  if (category.value === '装饰')
    return [
      { kind: 'plus', label: '导入' },
      ...placeholders('装饰'),
      ...fltAssets('装饰').map((asset) => {
        const mat = assetToMat(asset)
        return { kind: 'mat', label: mat.label, color: mat.color, shape: mat.shape, img: mat.src, mat } as RowItem
      }),
      ...flt(decor).map((m) => ({ kind: 'mat', label: m.label, color: m.color, shape: m.shape, mat: m } as RowItem)),
    ]
  if (category.value === '底板')
    return [
      { kind: 'none', label: '无底板' } as RowItem,
      ...boards
        .map((b, i) => ({ b, i }))
        .filter(({ b }) => sc === '全部' || (b.sub || '其他') === sc)
        .map(({ b, i }) => ({ kind: 'board', label: b.label, img: b.src, color: b.color, idx: i } as RowItem)),
    ]
  return bags.map((b, i) => ({ kind: 'bag', label: b.label, img: b.preview || b.front, idx: i } as RowItem))
})

let seq = 0
let lastLayerTs = 0
let lastBackgroundTapTs = 0
let lastBackgroundTapHadSelection = false
let dragged = false
let layerButtonSuppressTap = false
let suppressHistory = false
let g = { id: '', mode: '' as '' | 'move' | 'pinch', sx: 0, sy: 0, lx: 0, ly: 0, sd: 0, sa: 0, ss: 1, sr: 0 }
let bg = { sx: 0, sy: 0, x: 0, y: 0, moved: false }
let rg = { id: '', cx: 0, cy: 0, startDist: 1, startAngle: 0, startScale: 1, startRotation: 0, moved: false }
let sg = { sy: 0, moved: false }
let dg = { sy: 0, moved: false }
let sheetSuppressTap = false
let nudgeInputDirty = false
let lr = { id: '', fromVis: 0, startY: 0, base: [] as string[], active: false, moved: false }
let layerLongPressTimer: any = 0
let layerLongPress = { id: '', sx: 0, sy: 0, fired: false }
const lockedDragFailures = new Map<string, number>()

onMounted(async () => {
  resetLayerButton()
  syncWindowFromBag()
  syncBoardLayerFromTransform()
  await loadUserAssets()
  loadWork()
  loadExportHistory()
  pushHistory()
})

function cloneLayers() {
  return doc.layers.map((l) => ({ ...l }))
}
function snapshot(): Snapshot {
  syncBoardTransformFromLayer()
  return {
    layers: cloneLayers(),
    curBoard: curBoard.value,
    curBag: curBag.value,
    showGrid: showGrid.value,
    boardTransform: { ...boardTransform },
  }
}
function storageSnapshot() {
  const s = snapshot()
  return {
    ...s,
    layers: s.layers.map((layer) => {
      const next = { ...layer }
      if (next.assetId) delete next.src
      return next
    }),
  }
}
function applySnapshot(s: Snapshot) {
  suppressHistory = true
  doc.layers = hydrateLayerAssetSources(s.layers.map((l) => ({ ...l })))
  curBoard.value = s.curBoard
  curBag.value = s.curBag
  showGrid.value = s.showGrid
  syncWindowFromBag()
  Object.assign(boardTransform, s.boardTransform || {
    x: win.w / 2,
    y: win.h / 2,
    scale: boardCoverScale(),
    rotation: 0,
    opacity: 1,
    locked: true,
    flipX: false,
  })
  syncBoardLayerFromTransform()
  if (selectedId.value === BOARD_LAYER_ID) {
    if (curBoard.value < 0) selectedId.value = ''
  } else if (selectedId.value && !doc.layers.find((l) => l.id === selectedId.value)) selectedId.value = ''
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
function collapseMaterialDrawer() {
  if (!materialCollapsed.value) materialCollapsed.value = true
  showLayerDrawer.value = false
}
function expandMaterialDrawer() {
  if (materialCollapsed.value) materialCollapsed.value = false
  showLayerDrawer.value = false
}
function onBackgroundTap() {
  const now = Date.now()
  const hadSelection = !!selected.value
  const isDoubleTap = now - lastBackgroundTapTs < 320
  const previousHadSelection = lastBackgroundTapHadSelection
  lastBackgroundTapTs = now
  lastBackgroundTapHadSelection = hadSelection

  if (materialCollapsed.value) {
    if (hadSelection) {
      selectedId.value = ''
      return
    }
    expandMaterialDrawer()
    return
  }
  if (hadSelection) {
    selectedId.value = ''
    if (isDoubleTap) collapseMaterialDrawer()
    return
  }
  if (isDoubleTap && previousHadSelection) {
    collapseMaterialDrawer()
    return
  }
  collapseMaterialDrawer()
}
function onStageTap() {
  if (Date.now() - lastLayerTs < 350) return
  onBackgroundTap()
}
function onStageWrapTap() {
  onBackgroundTap()
}
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
function runRailAction(action: () => void) {
  if (layerButtonSuppressTap) {
    layerButtonSuppressTap = false
    return
  }
  action()
}
function layerOrderLabel(idx: number) { return String(visibleLayerList.value.length - idx) }
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
  const { h: wh } = viewportSize()
  const railH = 188
  const topMin = layerButtonTopMin()
  const topLimit = Math.max(topMin, wh - railH - 330)
  layerButton.x = 14
  layerButton.y = clamp(92, topMin, topLimit)
}
function layerButtonTopMin() {
  return Math.max(LAYER_RAIL_TOP_GUARD, (sys.statusBarHeight || 0) + 66)
}
function layerButtonHiddenX() {
  const { w: ww } = viewportSize()
  return layerButton.x + 25 < ww / 2 ? -68 : ww + 18
}
function clampLayerButton() {
  const { w: ww, h: wh } = viewportSize()
  const railH = 188
  const topMin = layerButtonTopMin()
  layerButton.x = clamp(layerButton.x, 10, ww - 60)
  layerButton.y = clamp(layerButton.y, topMin, wh - railH - 28)
}
function snapLayerButton() {
  const { w: ww } = viewportSize()
  layerButton.x = layerButton.x + 25 < ww / 2 ? 14 : ww - 64
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
  if (materialCollapsed.value) showLayerDrawer.value = false
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
    if (dy > 18) {
      materialCollapsed.value = true
      showLayerDrawer.value = false
    }
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
function addLayer(m: Mat, position?: { x: number; y: number }) {
  const id = nextId()
  doc.layers.push({
    ...m,
    id,
    x: position?.x ?? win.w / 2,
    y: position?.y ?? win.h / 2,
    scale: 1,
    rotation: 0,
    opacity: 1,
    locked: false,
    flipX: false,
  })
  selectedId.value = id
  commit()
}
function clientPointToWindowPoint(clientX: number, clientY: number) {
  if (typeof document === 'undefined') return undefined
  const stage = document.querySelector('.stage')
  if (!stage) return undefined
  const rect = stage.getBoundingClientRect()
  const scaleX = cw / rect.width
  const scaleY = ch / rect.height
  const x = (clientX - rect.left) * scaleX - win.x
  const y = (clientY - rect.top) * scaleY - win.y
  if (x < 0 || x > win.w || y < 0 || y > win.h) return undefined
  return { x, y }
}
function onItem(it: RowItem) {
  if (it.kind === 'mat') addLayer(it.mat)
  else if (it.kind === 'plus') chooseImageLayer()
  else if (it.kind === 'none') {
    curBoard.value = -1
    if (selectedId.value === BOARD_LAYER_ID) selectedId.value = ''
    syncBoardLayerFromTransform()
    commit()
  }
  else if (it.kind === 'board') {
    curBoard.value = it.idx
    resetBoardTransform(true)
    selectedId.value = BOARD_LAYER_ID
    commit()
  }
  else if (it.kind === 'bag') {
    syncBoardTransformFromLayer()
    curBag.value = it.idx
    syncWindowFromBag(true)
    if (curBoard.value >= 0) resetBoardTransform(true)
    syncBoardLayerFromTransform()
    commit()
  }
}
function updateMaterialDragGhost(it: RowItem, clientX: number, clientY: number, visible = true) {
  if (it.kind !== 'mat') return
  materialDragGhost.visible = visible
  materialDragGhost.x = clientX
  materialDragGhost.y = clientY
  materialDragGhost.w = it.mat.w
  materialDragGhost.h = it.mat.h
  materialDragGhost.color = it.mat.color
  materialDragGhost.label = it.mat.label
  materialDragGhost.shape = it.mat.shape
  materialDragGhost.src = it.mat.src || ''
}
function onMaterialDragStart(it: RowItem, clientX: number, clientY: number) {
  updateMaterialDragGhost(it, clientX, clientY, true)
}
function onMaterialDragMove(it: RowItem, clientX: number, clientY: number) {
  updateMaterialDragGhost(it, clientX, clientY, true)
}
function onMaterialDragEnd(it: RowItem, clientX: number, clientY: number, moved: boolean) {
  materialDragGhost.visible = false
  if (!moved || it.kind !== 'mat') return
  const point = clientPointToWindowPoint(clientX, clientY)
  if (!point) return
  addLayer(it.mat, point)
}
function closeMaterialAssetActions() {
  materialAssetActionOpen.value = false
  materialAssetActionId.value = ''
}
function openMaterialAssetActions(it: RowItem) {
  if (it.kind !== 'mat' || it.mat.type !== '谷子' || !it.mat.assetId) return
  materialDragGhost.visible = false
  materialAssetActionId.value = it.mat.assetId
  materialAssetActionOpen.value = true
}
function editMaterialAsset() {
  const asset = userAssets.value.find((item) => item.id === materialAssetActionId.value)
  closeMaterialAssetActions()
  if (!asset) return
  openImportEditorFromAsset(asset)
}
function deleteMaterialAsset() {
  const id = materialAssetActionId.value
  const asset = userAssets.value.find((item) => item.id === id)
  closeMaterialAssetActions()
  if (!asset) {
    return
  }
  Taro.showModal({
    title: '删除素材',
    content: `确定删除「${asset.label}」吗？画布中使用它的图层也会移除。`,
    confirmText: '删除',
    confirmColor: '#d14343',
    success: async (res) => {
      if (!res.confirm) return
      userAssets.value = userAssets.value.filter((item) => item.id !== id)
      doc.layers = doc.layers.filter((layer) => layer.assetId !== id)
      if (selected.value?.assetId === id) selectedId.value = ''
      await deleteUserAssetSource(id)
      await persistUserAssets()
      commit()
      Taro.showToast({ title: '已删除', icon: 'none' })
    },
  })
}
function removeLayer() {
  if (selectedId.value === BOARD_LAYER_ID) {
    curBoard.value = -1
    selectedId.value = ''
    syncBoardLayerFromTransform()
    commit()
    return
  }
  doc.layers = doc.layers.filter((l) => l.id !== selectedId.value)
  selectedId.value = ''
  commit()
}
function duplicateLayer() {
  const l = selected.value
  if (!l) return
  if (l.id === BOARD_LAYER_ID) {
    Taro.showToast({ title: '底板不可复制', icon: 'none' })
    return
  }
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
function openLayerDrawerForUnlock(ly: Layer) {
  selectedId.value = ly.id
  markLayer()
  showLayerDrawer.value = true
  Taro.showToast({ title: '在图层面板解锁', icon: 'none' })
}
function recordLockedDragAttempt(ly: Layer) {
  const count = (lockedDragFailures.get(ly.id) || 0) + 1
  if (count >= 3) {
    lockedDragFailures.set(ly.id, 0)
    openLayerDrawerForUnlock(ly)
    return
  }
  lockedDragFailures.set(ly.id, count)
  lockedToast()
}
function clearLayerLongPress() {
  if (layerLongPressTimer) {
    clearTimeout(layerLongPressTimer)
    layerLongPressTimer = 0
  }
}
function startLayerLongPress(ly: Layer, x: number, y: number) {
  clearLayerLongPress()
  layerLongPress = { id: ly.id, sx: x, sy: y, fired: false }
  layerLongPressTimer = setTimeout(() => {
    if (layerLongPress.id !== ly.id) return
    layerLongPress.fired = true
    selectedId.value = ly.id
    markLayer()
    showLayerDrawer.value = true
  }, LAYER_LONG_PRESS_MS)
}
function cancelLayerLongPressIfMoved(x: number, y: number) {
  if (!layerLongPress.id || layerLongPress.fired) return
  if (Math.abs(x - layerLongPress.sx) + Math.abs(y - layerLongPress.sy) > 8) clearLayerLongPress()
}
function finishLayerLongPress() {
  clearLayerLongPress()
  layerLongPress.id = ''
}
const SCALE_STEP = 0.05
const ROTATE_STEP = 1
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
  const stage = typeof document !== 'undefined' ? document.querySelector('.stage') : undefined
  const rect = stage?.getBoundingClientRect()
  const cx = rect ? rect.left + ((win.x + ly.x) / cw) * rect.width : x
  const cy = rect ? rect.top + ((win.y + ly.y) / ch) * rect.height : y
  const dx = x - cx
  const dy = y - cy
  rg = {
    id: ly.id,
    cx,
    cy,
    startDist: Math.max(1, Math.hypot(dx, dy)),
    startAngle: Math.atan2(dy, dx),
    startScale: ly.scale,
    startRotation: ly.rotation,
    moved: false,
  }
}
function moveRotateHandle(x: number, y: number, ly: Layer) {
  if (rg.id !== ly.id || ly.locked) return
  const dx = x - rg.cx
  const dy = y - rg.cy
  const distRatio = Math.hypot(dx, dy) / rg.startDist
  const angleDelta = Math.atan2(dy, dx) - rg.startAngle
  ly.scale = boundedScale(rg.startScale * distRatio)
  ly.rotation = normalizeRotation(rg.startRotation + (angleDelta * 180) / Math.PI)
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
  if (id === BOARD_LAYER_ID) {
    boardLayer.locked = !boardLayer.locked
    syncBoardTransformFromLayer()
    if (!boardLayer.locked) lockedDragFailures.delete(id)
    commit()
    return
  }
  const l = doc.layers.find((x) => x.id === id)
  if (!l) return
  l.locked = !l.locked
  if (!l.locked) lockedDragFailures.delete(id)
  commit()
}
function startReorder(id: string, visIdx: number, y: number) {
  if (id === BOARD_LAYER_ID) return
  lr = { id, fromVis: visIdx, startY: y, base: visibleLayerList.value.filter((l) => !l.fixed).map((l) => l.id), active: true, moved: false }
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
function toggleStageZoom() { stageZoomed.value = !stageZoomed.value }
function clampLayer(ly: Layer) {
  const visiblePad = Math.min(28, Math.max(14, Math.min(win.w, win.h) * 0.16))
  // 旋转感知：用旋转后包围盒的半宽高
  const rad = (ly.rotation * Math.PI) / 180
  const c = Math.abs(Math.cos(rad))
  const s = Math.abs(Math.sin(rad))
  const w = ly.w * ly.scale
  const h = ly.h * ly.scale
  const halfW = (w * c + h * s) / 2
  const halfH = (w * s + h * c) / 2
  const minX = -halfW + visiblePad
  const maxX = win.w + halfW - visiblePad
  const minY = -halfH + visiblePad
  const maxY = win.h + halfH - visiblePad
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
    '--handle-rotation': '0deg',
    '--handle-scale': `${1 / ly.scale}`,
    transform: `translate(-50%,-50%) rotate(${ly.rotation}deg) scale(${ly.scale})`,
  }
}

function onTouchStart(e: any, ly: Layer) {
  selectedId.value = ly.id
  markLayer()
  const t = e.touches || []
  if (t.length) startLayerLongPress(ly, t[0].clientX, t[0].clientY)
  if (ly.locked) { recordLockedDragAttempt(ly); return }
  dragged = false
  layerDragging.value = false
  if (t.length >= 2) g = { id: ly.id, mode: 'pinch', sx: 0, sy: 0, lx: 0, ly: 0, sd: dist(t[0], t[1]), sa: ang(t[0], t[1]), ss: ly.scale, sr: ly.rotation }
  else if (t.length) g = { id: ly.id, mode: 'move', sx: t[0].clientX, sy: t[0].clientY, lx: ly.x, ly: ly.y, sd: 0, sa: 0, ss: 1, sr: 0 }
}
function onTouchMove(e: any, ly: Layer) {
  const t = e.touches || []
  if (t.length) cancelLayerLongPressIfMoved(t[0].clientX, t[0].clientY)
  if (g.id !== ly.id || ly.locked) return
  if (e.preventDefault) e.preventDefault()
  dragged = true
  layerDragging.value = true
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
  finishLayerLongPress()
  if (dragged) commit()
  dragged = false
  layerDragging.value = false
  g.mode = ''
}
function onMouseDown(e: any, ly: Layer) {
  selectedId.value = ly.id
  markLayer()
  startLayerLongPress(ly, e.clientX, e.clientY)
  if (ly.locked) {
    recordLockedDragAttempt(ly)
    const clearLockedPress = () => {
      if (typeof window !== 'undefined') window.removeEventListener('mouseup', clearLockedPress)
      finishLayerLongPress()
    }
    if (typeof window !== 'undefined') window.addEventListener('mouseup', clearLockedPress)
    return
  }
  const sx = e.clientX, sy = e.clientY, lx = ly.x, lyy = ly.y
  let moved = false
  const move = (ev: any) => {
    cancelLayerLongPressIfMoved(ev.clientX, ev.clientY)
    moved = true
    layerDragging.value = true
    ly.x = lx + (ev.clientX - sx)
    ly.y = lyy + (ev.clientY - sy)
    clampLayer(ly)
  }
  const up = () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    finishLayerLongPress()
    if (moved) commit()
    layerDragging.value = false
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }
}

function canUseUserAssetsDb() {
  return process.env.TARO_ENV === 'h5' && typeof indexedDB !== 'undefined'
}
function openUserAssetsDb(): Promise<IDBDatabase | undefined> {
  if (!canUseUserAssetsDb()) return Promise.resolve(undefined)
  return new Promise((resolve) => {
    const req = indexedDB.open(USER_ASSETS_DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(USER_ASSETS_STORE)) db.createObjectStore(USER_ASSETS_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(undefined)
  })
}
async function putUserAssetSource(id: string, src: string) {
  const db = await openUserAssetsDb()
  if (!db) return false
  return new Promise<boolean>((resolve) => {
    const tx = db.transaction(USER_ASSETS_STORE, 'readwrite')
    tx.objectStore(USER_ASSETS_STORE).put(src, id)
    tx.oncomplete = () => { db.close(); resolve(true) }
    tx.onerror = () => { db.close(); resolve(false) }
  })
}
async function getUserAssetSource(id: string) {
  const db = await openUserAssetsDb()
  if (!db) return ''
  return new Promise<string>((resolve) => {
    const tx = db.transaction(USER_ASSETS_STORE, 'readonly')
    const req = tx.objectStore(USER_ASSETS_STORE).get(id)
    req.onsuccess = () => resolve(typeof req.result === 'string' ? req.result : '')
    req.onerror = () => resolve('')
    tx.oncomplete = () => db.close()
    tx.onerror = () => db.close()
  })
}
async function deleteUserAssetSource(id: string) {
  const db = await openUserAssetsDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    const tx = db.transaction(USER_ASSETS_STORE, 'readwrite')
    tx.objectStore(USER_ASSETS_STORE).delete(id)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); resolve() }
  })
}
function hydrateLayerAssetSources(layers: Layer[]) {
  return layers.map((layer) => {
    if (!layer.assetId || layer.src) return layer
    const asset = userAssets.value.find((item) => item.id === layer.assetId)
    return asset?.src ? { ...layer, src: asset.src } : layer
  })
}
async function imageSourceToDataUrl(src: string) {
  if (src.startsWith('data:')) return src
  if (typeof fetch === 'undefined' || typeof FileReader === 'undefined') return src
  try {
    const res = await fetch(src)
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || src))
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (_) {
    if (typeof document === 'undefined') return src
    return await new Promise<string>((resolve) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth || img.width
          canvas.height = img.naturalHeight || img.height
          const ctx = canvas.getContext('2d')
          if (!ctx) { resolve(src); return }
          ctx.drawImage(img, 0, 0)
          resolve(canvas.toDataURL('image/png'))
        } catch (_) {
          resolve(src)
        }
      }
      img.onerror = () => resolve(src)
      img.src = src
    })
  }
}
async function persistUserAssets() {
  const useDb = canUseUserAssetsDb()
  if (useDb) {
    await Promise.all(userAssets.value.map((asset) => putUserAssetSource(asset.id, asset.src)))
  }
  const stored: StoredUserAsset[] = userAssets.value.map((asset) => ({
    id: asset.id,
    type: asset.type,
    sub: asset.sub,
    label: asset.label,
    color: asset.color,
    w: asset.w,
    h: asset.h,
    shape: asset.shape,
    source: asset.source,
    spuId: asset.spuId,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    src: useDb ? undefined : asset.src,
  }))
  try {
    Taro.setStorageSync(USER_ASSETS_KEY, stored)
  } catch (_) {}
}
async function loadUserAssets() {
  try {
    const records = Taro.getStorageSync(USER_ASSETS_KEY)
    if (!Array.isArray(records)) return
    const hydrated = await Promise.all(records.map(async (record: Partial<StoredUserAsset>) => {
      if (!record?.id || !record.createdAt) return undefined
      const src = record.src || await getUserAssetSource(record.id)
      if (!src) return undefined
      const sub = record.sub || '其他'
      const shape = record.shape || guessAssetShape((record.type as UserAsset['type']) || '谷子', sub)
      const size = defaultAssetSize(sub, shape)
      return {
        id: record.id,
        type: (record.type as UserAsset['type']) || '谷子',
        sub,
        label: record.label || sub,
        color: record.color || '#fff',
        w: record.w || size.w,
        h: record.h || size.h,
        shape,
        src,
        source: record.source || 'import',
        spuId: record.spuId,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt || record.createdAt,
      } as UserAsset
    }))
    userAssets.value = hydrated
      .filter((asset): asset is UserAsset => !!asset)
      .sort((a, b) => b.createdAt - a.createdAt)
  } catch (_) {}
}
async function createImportedAsset(src: string, options?: { type?: UserAsset['type']; sub?: string; label?: string }) {
  const type: UserAsset['type'] = options?.type || (category.value === '装饰' ? '装饰' : '谷子')
  const sub = options?.sub || (subCat.value === '全部' ? '其他' : subCat.value)
  const shape = guessAssetShape(type, sub)
  const size = defaultAssetSize(sub, shape)
  const createdAt = Date.now()
  const id = `asset_${createdAt}_${Math.random().toString(36).slice(2, 7)}`
  const storedSrc = await imageSourceToDataUrl(src)
  const asset: UserAsset = {
    id,
    type,
    sub,
    label: (options?.label || '').trim() || (sub === '其他' ? '导入图片' : sub),
    color: '#fff',
    w: size.w,
    h: size.h,
    shape,
    src: storedSrc,
    source: 'import',
    createdAt,
    updatedAt: createdAt,
  }
  userAssets.value = [asset, ...userAssets.value]
  await persistUserAssets()
  return asset
}
function resetImportDraft() {
  importDraft.src = ''
  importDraft.storedSrc = ''
  importDraft.editAssetId = ''
  importDraft.type = '谷子'
  importDraft.sub = '其他'
  importDraft.label = ''
}
async function openImportEditor(src: string) {
  const type: UserAsset['type'] = category.value === '装饰' ? '装饰' : '谷子'
  const subOptions = (SUBCATS[type] || ['全部']).filter((item) => item !== '全部')
  const sub = subCat.value !== '全部' && subOptions.includes(subCat.value) ? subCat.value : (subOptions[0] || '其他')
  let storedSrc = src
  try {
    Taro.showLoading({ title: '准备图片' })
    storedSrc = await imageSourceToDataUrl(src)
  } catch (_) {
    Taro.showToast({ title: '图片读取异常，已尝试继续', icon: 'none' })
  } finally {
    Taro.hideLoading()
  }
  importDraft.src = src
  importDraft.storedSrc = storedSrc
  importDraft.editAssetId = ''
  importDraft.type = type
  importDraft.sub = sub
  importDraft.label = sub === '其他' ? '导入图片' : sub
  importEditorOpen.value = true
}
function openImportEditorFromAsset(asset: UserAsset) {
  importDraft.src = asset.src
  importDraft.storedSrc = asset.src
  importDraft.editAssetId = asset.id
  importDraft.type = asset.type
  importDraft.sub = asset.sub
  importDraft.label = asset.label
  importEditorOpen.value = true
}
function onImportLabelInput(event: any) {
  importDraft.label = event?.detail?.value || ''
}
function setImportDraftSub(sub: string) {
  importDraft.sub = sub
  if (!importDraft.label || importDraftSubcats.value.includes(importDraft.label)) importDraft.label = sub
}
function cancelImportEditor() {
  importEditorOpen.value = false
  resetImportDraft()
}
async function confirmImportEditor() {
  if (!importDraft.storedSrc && !importDraft.src) return
  if (importDraft.editAssetId) {
    const index = userAssets.value.findIndex((item) => item.id === importDraft.editAssetId)
    if (index < 0) return
    const src = importDraft.storedSrc || importDraft.src
    const sub = importDraft.sub
    const shape = guessAssetShape(importDraft.type, sub)
    const size = defaultAssetSize(sub, shape)
    const updated: UserAsset = {
      ...userAssets.value[index],
      type: importDraft.type,
      sub,
      label: importDraft.label.trim() || (sub === '其他' ? '导入图片' : sub),
      w: size.w,
      h: size.h,
      shape,
      src,
      updatedAt: Date.now(),
    }
    userAssets.value = [
      updated,
      ...userAssets.value.slice(0, index),
      ...userAssets.value.slice(index + 1),
    ]
    doc.layers = doc.layers.map((layer) => {
      if (layer.assetId !== updated.id) return layer
      return {
        ...layer,
        type: updated.type,
        sub: updated.sub,
        label: updated.label,
        w: updated.w,
        h: updated.h,
        shape: updated.shape,
        src: updated.src,
      }
    })
    await persistUserAssets()
    importEditorOpen.value = false
    resetImportDraft()
    commit()
    Taro.showToast({ title: '已更新', icon: 'none' })
    return
  }
  await createImportedAsset(importDraft.storedSrc || importDraft.src, {
    type: importDraft.type,
    sub: importDraft.sub,
    label: importDraft.label,
  })
  importEditorOpen.value = false
  resetImportDraft()
  Taro.showToast({ title: '已导入', icon: 'none' })
}

function chooseImageLayer() {
  Taro.chooseImage({
    count: 1,
    sizeType: ['compressed', 'original'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const src = res.tempFilePaths && res.tempFilePaths[0]
      if (!src) return
      await openImportEditor(src)
    },
    fail: () => Taro.showToast({ title: '未选择图片', icon: 'none' }),
  })
}

function saveWork(showToast = true) {
  const data = { version: STORAGE_VERSION, ...storageSnapshot(), selectedId: selectedId.value, seq }
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
      boardTransform: data.version === STORAGE_VERSION ? data.boardTransform : undefined,
    })
    if (data.version !== STORAGE_VERSION && curBoard.value >= 0) resetBoardTransform(true)
    selectedId.value = data.selectedId || ''
    seq = data.seq || data.layers.length
  } catch (_) {}
}

function formatExportHistoryTime(ts: number) {
  const d = new Date(ts)
  const pad = (n: number) => `${n}`.padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function normalizeExportRecord(r: Partial<StoredExportHistoryRecord>, i: number, src = r.src): ExportHistoryRecord | undefined {
  if (!r || !src || !r.createdAt) return undefined
  return {
    id: r.id || `${r.createdAt}-${i}`,
    src,
    createdAt: r.createdAt,
    name: r.name || '导出图',
    timeText: formatExportHistoryTime(r.createdAt),
  }
}
function canUseExportHistoryDb() {
  return process.env.TARO_ENV === 'h5' && typeof indexedDB !== 'undefined'
}
function openExportHistoryDb(): Promise<IDBDatabase | undefined> {
  if (!canUseExportHistoryDb()) return Promise.resolve(undefined)
  return new Promise((resolve) => {
    const req = indexedDB.open(EXPORT_HISTORY_DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(EXPORT_HISTORY_STORE)) db.createObjectStore(EXPORT_HISTORY_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(undefined)
  })
}
async function putExportHistorySource(id: string, src: string) {
  const db = await openExportHistoryDb()
  if (!db) return false
  return new Promise<boolean>((resolve) => {
    const tx = db.transaction(EXPORT_HISTORY_STORE, 'readwrite')
    tx.objectStore(EXPORT_HISTORY_STORE).put(src, id)
    tx.oncomplete = () => { db.close(); resolve(true) }
    tx.onerror = () => { db.close(); resolve(false) }
  })
}
async function getExportHistorySource(id: string) {
  const db = await openExportHistoryDb()
  if (!db) return ''
  return new Promise<string>((resolve) => {
    const tx = db.transaction(EXPORT_HISTORY_STORE, 'readonly')
    const req = tx.objectStore(EXPORT_HISTORY_STORE).get(id)
    req.onsuccess = () => resolve(typeof req.result === 'string' ? req.result : '')
    req.onerror = () => resolve('')
    tx.oncomplete = () => db.close()
    tx.onerror = () => db.close()
  })
}
async function deleteExportHistorySource(id: string) {
  const db = await openExportHistoryDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    const tx = db.transaction(EXPORT_HISTORY_STORE, 'readwrite')
    tx.objectStore(EXPORT_HISTORY_STORE).delete(id)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); resolve() }
  })
}
async function persistExportHistory() {
  const useDb = canUseExportHistoryDb()
  if (useDb) {
    await Promise.all(exportHistory.value.map((record) => putExportHistorySource(record.id, record.src)))
  }
  const keepIds = new Set(exportHistory.value.map((record) => record.id))
  const storedRecords: StoredExportHistoryRecord[] = exportHistory.value.map((record) => ({
    id: record.id,
    createdAt: record.createdAt,
    name: record.name,
    timeText: record.timeText,
    src: useDb ? undefined : record.src,
  }))
  try {
    Taro.setStorageSync(EXPORT_HISTORY_KEY, storedRecords)
  } catch (_) {}
  if (useDb) {
    // Best-effort pruning; old inline-storage records are harmless if they were never mirrored.
    const records = Taro.getStorageSync(EXPORT_HISTORY_KEY)
    if (Array.isArray(records)) {
      await Promise.all(records.filter((r) => r?.id && !keepIds.has(r.id)).map((r) => deleteExportHistorySource(r.id)))
    }
  }
}
async function loadExportHistory() {
  try {
    const records = Taro.getStorageSync(EXPORT_HISTORY_KEY)
    if (!Array.isArray(records)) return
    const hydrated = await Promise.all(records.map(async (r, i) => {
      const src = r?.src || await getExportHistorySource(r?.id || '')
      return normalizeExportRecord(r, i, src)
    }))
    exportHistory.value = hydrated
      .filter((r): r is ExportHistoryRecord => !!r)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, EXPORT_HISTORY_LIMIT)
  } catch (_) {}
}
async function addExportHistory(src: string) {
  const createdAt = Date.now()
  const record: ExportHistoryRecord = {
    id: `${createdAt}-${Math.random().toString(36).slice(2, 7)}`,
    src,
    createdAt,
    name: `${bags[curBag.value].label}导出图`,
    timeText: formatExportHistoryTime(createdAt),
  }
  exportHistory.value = [record, ...exportHistory.value].slice(0, EXPORT_HISTORY_LIMIT)
  await persistExportHistory()
}
async function openExportHistory() {
  await loadExportHistory()
  resultPreviewOpen.value = false
  exportHistoryOpen.value = true
}
function closeExportHistory() {
  exportHistoryOpen.value = false
}
async function previewExportHistory(record: ExportHistoryRecord) {
  const src = record.src || await getExportHistorySource(record.id)
  if (!src) {
    Taro.showToast({ title: '历史图片已失效', icon: 'none' })
    return
  }
  resultSrc.value = src
  exportHistoryOpen.value = false
  resultPreviewOpen.value = true
}

async function exportImage() {
  resultSrc.value = ''
  resultPreviewOpen.value = false
  exportHistoryOpen.value = false
  syncBoardTransformFromLayer()
  saveWork(false)
  const src = await exportEditorImage({
    canvasId: 'exportCanvas',
    cw,
    ch,
    win,
    curBoard: curBoard.value,
    curBag: curBag.value,
    boardLayer: hasBoardLayer.value ? { ...boardLayer } : undefined,
    layers: cloneLayers(),
  })
  if (src) {
    resultSrc.value = src
    await addExportHistory(src)
    resultPreviewOpen.value = true
  }
}
function closeExportPreview() {
  resultPreviewOpen.value = false
}
const EXPORT_FILE_NAME = 'gooda-export.png'

function dataUrlToFile(dataUrl: string, fileName = EXPORT_FILE_NAME) {
  if (typeof atob === 'undefined' || typeof File === 'undefined') return undefined
  const parts = dataUrl.split(',')
  if (parts.length < 2) return undefined
  const mime = parts[0].match(/data:([^;]+);base64/)?.[1] || 'image/png'
  const binary = atob(parts[1])
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], fileName, { type: mime })
}

function triggerH5Download(src: string, file?: File) {
  if (typeof document === 'undefined') return false
  let href = src
  let objectUrl = ''
  if (file && typeof URL !== 'undefined' && URL.createObjectURL) {
    objectUrl = URL.createObjectURL(file)
    href = objectUrl
  }
  const a = document.createElement('a')
  a.href = href
  a.download = `gooda-export-${Date.now()}.png`
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 1200)
  return true
}

async function saveH5ExportImage(src: string) {
  const file = src.startsWith('data:') ? dataUrlToFile(src) : undefined
  const nav = typeof navigator !== 'undefined' ? (navigator as any) : undefined
  if (file && nav?.share && nav?.canShare?.({ files: [file] })) {
    try {
      await nav.share({
        files: [file],
        title: '谷搭导出图',
      })
      Taro.showToast({ title: '已打开保存面板', icon: 'none' })
      return
    } catch (err: any) {
      if (err?.name === 'AbortError') return
    }
  }
  if (triggerH5Download(src, file)) {
    Taro.showToast({ title: '如未保存，请长按图片', icon: 'none' })
    return
  }
  Taro.showToast({ title: '请长按图片保存', icon: 'none' })
}

async function saveExportImage() {
  if (!resultSrc.value) return
  if (process.env.TARO_ENV === 'h5') {
    await saveH5ExportImage(resultSrc.value)
    return
  }
  Taro.saveImageToPhotosAlbum({
    filePath: resultSrc.value,
    success: () => Taro.showToast({ title: '已保存图片', icon: 'none' }),
    fail: () => Taro.showToast({ title: '保存失败，请检查相册权限', icon: 'none' }),
  })
}
</script>

<style src="../../styles/gooda-theme.css"></style>
