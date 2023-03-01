import * as pdfjsLib from "pdfjs-dist/webpack"

class PDFView {
  constructor(pdfDoc, scale = 0.8) {
    this.scale = scale
    this.pdfDoc = pdfDoc
    this._totalPageNum = pdfDoc.numPages
    console.log(pdfDoc)

    this._$("prev").addEventListener("click", this.onPrevPage.bind(this))
    this._$("next").addEventListener("click", this.onNextPage.bind(this))
    this._$("zoom_out").addEventListener("click", this.handleZoomOut.bind(this))
    this._$("zoo_in").addEventListener("click", this.handleZoomIn.bind(this))
    this._$("page_num").textContent = this._pageNum
    this._$("page_total").textContent = this._totalPageNum
    this._$("download").addEventListener(
      "click",
      this.handleDownload.bind(this)
    )

    this.init()
    this.renderPage(this._pageNum)
  }

  _pageNum = 1
  _totalPageNum = null
  _pageRendering = false
  _pageNumPending = null
  _canvas = null
  _ctx = null
  _isClick = null
  _ol = null
  _ot = null
  _urlCache = null

  init() {
    this._canvas = this._$("the-canvas")
    this._ctx = this._canvas.getContext("2d")
    this._canvas.addEventListener("wheel", this.handleWheel.bind(this))
    this._canvas.addEventListener("mousedown", this.handleMouseDown.bind(this))
    this._canvas.addEventListener("mousemove", this.handleMouseMove.bind(this))
    this._canvas.addEventListener("mouseup", this.handleMouseUp.bind(this))
  }

  _$(id) {
    try {
      let el = document.getElementById(id)
      if (!el) {
        throw new Error(`can't find the element by id: ${id}`)
      }
      return el
    } catch (error) {
      console.log(error)
    }
  }

  renderPage(num) {
    this._pageRendering = true
    this.pdfDoc.getPage(num).then((page) => {
      let viewport = page.getViewport({ scale: this.scale })
      let outputScale = window.devicePixelRatio || 1

      this._canvas.width = Math.floor(viewport.width * outputScale)
      this._canvas.height = Math.floor(viewport.height * outputScale)
      this._canvas.style.width = Math.floor(viewport.width) + "px"
      this._canvas.style.height = Math.floor(viewport.height) + "px"

      let transform =
        outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null

      let renderContext = {
        canvasContext: this._ctx,
        viewport: viewport,
        transform: transform
      }
      let renderTask = page.render(renderContext)

      renderTask.promise.then(() => {
        this._pageRendering = false
        if (this._pageNumPending !== null) {
          this.renderPage(this._pageNumPending)
          this._pageNumPending = null
        }
      })
    })

    this._$("page_num").textContent = num
  }

  queueRenderPage(num) {
    if (this._pageRendering) {
      this._pageNumPending = num
    } else {
      this.renderPage(num)
    }
  }

  onPrevPage() {
    if (this._pageNum <= 1) {
      return
    }
    this._pageNum--
    this.queueRenderPage(this._pageNum)
  }

  onNextPage() {
    if (this._pageNum >= this._totalPageNum) {
      return
    }
    this._pageNum++
    this.queueRenderPage(this._pageNum)
  }

  handleZoomIn() {
    this.scale += 0.1
    this.queueRenderPage(this._pageNum)
  }

  handleZoomOut() {
    this.scale -= 0.1
    this.queueRenderPage(this._pageNum)
  }

  handleWheel(e) {
    if (e.altKey) {
      if (e.wheelDelta > 0 && this.scale < 2) {
        this.handleZoomIn()
      } else if (e.wheelDelta < 0 && this.scale > 0.5) {
        this.handleZoomOut()
      }
    }
  }

  handleMouseDown(e) {
    this._isClick = true
    this._ol = e.clientX - this._canvas.offsetLeft
    this._ot = e.clientY - this._canvas.offsetTop
  }

  handleMouseMove(e) {
    if (this._isClick) {
      this._canvas.style.left = e.clientX - this._ol + "px"
      this._canvas.style.top = e.clientY - this._ot + "px"
    }
  }

  handleMouseUp() {
    this._isClick = false
  }

  handleDownload() {
    this._canvas.toBlob((data) => {
      const fileUrl = this.makeImgFileUrl(data)
      const link = this._$("downloadlink")
      link.href = fileUrl
      link.click()
    })
  }

  makeImgFileUrl(data) {
    // const img = new Blob([data], { type: "image/png" })
    if (this._urlCache !== null) {
      window.URL.revokeObjectURL(this._urlCache)
    }
    this._urlCache = window.URL.createObjectURL(data)
    return this._urlCache
  }
}

pdfjsLib.getDocument("test.pdf").promise.then((pdf) => {
  const pdfView = new PDFView(pdf)
})
