// src/context/useRedraw.js
import { useEffect, useRef, useState } from 'react'

import getCanvasSize from '../utils/getCanvasSize'
import getPointSizeOnCanvas from '../utils/getPointSizeOnCanvas'
import useZoom from './useZoom'
import { useDashboard } from '.'

const cornerSize = 5

/**
 * Check if the point { x, y } is inside a box [bx, by, bx2, by2]
 */
function isInside(x, y, bx, by, bx2, by2, pad = 0) {
  return (
    Math.min(bx - pad, bx2 + pad, x) !== x &&
    Math.max(bx - pad, bx2 + pad, x) !== x &&
    Math.min(by - pad, by2 + pad, y) !== y &&
    Math.max(by - pad, by2 + pad, y) !== y
  )
}

function arc(ctx, x, y) {
  ctx.beginPath()
  ctx.arc(x, y, cornerSize, 0, 2 * Math.PI)
  ctx.closePath()
  ctx.fill()
}

export default function useRedraw() {
  const { boxes, state, imgRef, canvasRef, ctxRef } = useDashboard()

  function redraw() {
    const img = imgRef.current
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!img || !canvas || !ctx) return

    const ratio = img.width / img.height
    let width = canvas.width
    let height = width / ratio

    if (height > canvas.height) {
      height = canvas.height
      width = height * ratio
    }

    // Clear canvas
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()

    // Draw image
    ctx.drawImage(
      img,
      canvas.width / 2 - width / 2,
      canvas.height / 2 - height / 2,
      width,
      height
    )

    // Draw boxes
    boxes.forEach(([startX, startY, mouseX, mouseY], index) => {
      const imgSize = { w: img.width, h: img.height }
      const [x, y] = getPointSizeOnCanvas(startX, startY, imgSize)
      const [mx, my] = getPointSizeOnCanvas(mouseX, mouseY, imgSize)

      const color = index === state.selectedBox ? '#64b5f6' : '#aed581'
      ctx.beginPath()
      ctx.fillStyle = color + '44' // opacity
      ctx.lineWidth = 2
      ctx.fillRect(x, y, mx - x, my - y)
      ctx.fillStyle = color
      arc(ctx, x, y)
      arc(ctx, x + (mx - x), y)
      arc(ctx, x, y + (my - y))
      arc(ctx, mx, my)
    })
  }

  return redraw
}

export function useLoadImage() {
  const { state, boxes, imgRef, canvasRef, ctxRef, dispatch } = useDashboard()
  const redraw = useRedraw()
  const onZoom = useZoom()
  const oldIndex = useRef()
  const createdObjectUrlRef = useRef(null) // щоб коректно revoкати тільки локальні URL
  const [imgRes, setImgRes] = useState()
  const file = state.files[state.fileIndex]

  useEffect(() => {
    let img

    if (!file) return

    const handler = () => {
      if (img) setImgRes({ w: img.width, h: img.height })
      // скидаємо зум при зміні файлу (як і було)
      onZoom(-state.zoom)
      dispatch({ type: 'set-size', data: getCanvasSize() })
      requestAnimationFrame(redraw)
    }

    // Завантажуємо нове зображення лише коли змінився індекс файлу
    if (oldIndex.current !== state.fileIndex) {
      // почистимо попередній objectURL (якщо був створений)
      if (createdObjectUrlRef.current) {
        URL.revokeObjectURL(createdObjectUrlRef.current)
        createdObjectUrlRef.current = null
      }

      img = new Image()
      img.crossOrigin = 'anonymous' // на випадок, якщо remoteUrl віддається з іншого origin з CORS

      // Порядок пріоритетів: remoteUrl → dataUrl → File (Blob)
      if (file && typeof file.remoteUrl === 'string') {
        img.src = file.remoteUrl
      } else if (file && typeof file.dataUrl === 'string') {
        img.src = file.dataUrl
      } else if (file instanceof File || (file && typeof file === 'object' && file.size && file.slice)) {
        const objUrl = URL.createObjectURL(file)
        createdObjectUrlRef.current = objUrl
        img.src = objUrl
      } else if (typeof file === 'string') {
        // рідкісний випадок: якщо десь у локальному режимі зберігається шляхом-рядком
        img.src = file
      } else {
        // fallback — нічого не робимо
        return
      }

      img.onload = handler
      imgRef.current = img
      ctxRef.current = canvasRef.current.getContext('2d')
    }

    oldIndex.current = state.fileIndex
    window.addEventListener('resize', handler)

    return () => {
      window.removeEventListener('resize', handler)
      // objectURL revoкнемо при наступному завантаженні/зміні індексу
      // або при unmount, якщо хочеш:
      // if (createdObjectUrlRef.current) {
      //   URL.revokeObjectURL(createdObjectUrlRef.current)
      //   createdObjectUrlRef.current = null
      // }
    }
  // важливо: залежності, що справді впливають на завантаження
  }, [file, state.fileIndex, state.zoom, dispatch, onZoom, redraw])

  useEffect(() => {
    if (!file || !boxes || boxes.length === 0) return
    redraw()
  }, [file, boxes, redraw])

  return imgRes
}

export function useSelectBox() {
  const { state, canvasRef, boxes, dispatch } = useDashboard()
  const redraw = useRedraw()
  const needsRedraw = useRef(false)

  /**
   * Calculates if click corresponds to a box. If click is on a corner,
   * returns oppositeCorner to support resizing from the opposite side.
   */
  function selectBox(x, y, autoselect = false) {
    let selected, oppositeCorner
    const padding = cornerSize + 2 / 2

    for (let i = 0; i < boxes.length; i += 1) {
      const [startX, startY, mouseX, mouseY] = boxes[i]
      let c

      if (isInside(x, y, startX, startY, startX, startY, padding)) {
        c = oppositeCorner = [mouseX, mouseY]
      }
      if (
        isInside(
          x,
          y,
          startX + (mouseX - startX),
          startY,
          startX + (mouseX - startX),
          startY,
          padding
        )
      ) {
        c = oppositeCorner = [startX, startY + (mouseY - startY)]
      }
      if (
        isInside(
          x,
          y,
          startX,
          startY + (mouseY - startY),
          startX,
          startY + (mouseY - startY),
          padding
        )
      ) {
        c = oppositeCorner = [startX + (mouseX - startX), startY]
      }
      if (isInside(x, y, mouseX, mouseY, mouseX, mouseY, padding)) {
        c = oppositeCorner = [startX, startY]
      }
      if (c || isInside(x, y, startX, startY, mouseX, mouseY)) {
        selected = i
      }
    }

    if (autoselect && selected !== undefined) {
      dispatch({ type: 'select-box', data: selected })
    }

    return { selected, oppositeCorner }
  }

  // Redraw on select a box
  useEffect(() => {
    if (!canvasRef.current) return
    redraw()
  }, [state.selectedBox, canvasRef, redraw])

  return selectBox
}