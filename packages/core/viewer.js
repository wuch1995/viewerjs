import ViewerImage from './viewer-image'
import {
  addClass,
  setStyle,
  removeClass,
  addEventListener
} from '../helpers/dom'

import {
  getDist,
  getPointersCenter,
  damping,
  getOverflow,
  getTouches,
  removeTouches
} from '../helpers/util'

import ViewerContainer from './viewer-container'

import {
  MARGIN,
  MIN_TRANSFORM_DIFF
} from '../shared/constants'

export default class Viewer {
  constructor (source, options) {
    this.images = []
    this.zooming = false
    this.zoomMoving = false
    this.lastClickTime = 0
    this.mutipleZooming = false
    this.mutiZoom = false
    this.action = ''
    this.viewer = {
      el: null,
      height: window.innerHeight,
      width: window.innerWidth,
      contentWidth: 0
    }
    this.touch = {
      pageX: 0,
      pageY: 0,
      diff: 0,
      currentLeft: 0,
      currentIndex: 0
    }
    this.imageZoom = {
      left: 0,
      top: 0,
      diffX: 0,
      diffY: 0,
      pageX: 0,
      pageY: 0,
      pointer: {}
    }
    this.mutipleZoom = {
      diffX: 0,
      diffY: 0,
      dist: 0
    }
    this.touches = []
    this.ids = new Set()
    this.container = new ViewerContainer()
    this.initViewer()
    this.initImage(source)
  }

  initImage (source) {
    // isElement
    // todo element or Array[img]
    const isImg = source && source.tagName.toLowerCase() === 'img'
    let images = isImg ? [source] : source.querySelectorAll('img')
    images.forEach((image, index) => {
      this.images.push(new ViewerImage(image, index, this.viewer))
    })
    this.viewer.contentWidth = this.viewer.width * this.images.length + (this.images.length - 1) * MARGIN
    this.image = this.images[this.touch.currentIndex]
  }

  initViewer () {
    const { el: container } = this.container
    this.viewer.el = container.querySelector('.viewer-wrap')
    addEventListener(this.viewer.el, 'touchstart', this.onTouchStart.bind(this))
    addEventListener(this.viewer.el, 'touchmove', this.onTouchMove.bind(this))
    addEventListener(this.viewer.el, 'touchend', this.onTouchEnd.bind(this))
    addEventListener(this.viewer.el, 'click', this.onClick.bind(this))
    // addEventListener(window, 'gesturestart', (e) => { e.preventDefault() })
    // addEventListener(window, 'gesturemove', (e) => { e.preventDefault() })
    // addEventListener(window, 'gestureend', (e) => { e.preventDefault() })
  }

  show () {
    const { container } = this
    container.show()
  }

  hide () {
    const { container } = this
    container.hide()
  }

  onTouchStart (e) {
    getTouches(e, this.touches)
    console.log(e)
    if (this.touches.length === 1) {
      if (this.zooming) {
        this.handleImageZoomStart(e)
      } else if (!this.zooming && !this.mutipleZooming){
        this.handleWrapPointerStart(e)
      }
    } else {
      this.handleMutipleZoomStart(e)
    }
  }

  onTouchMove (e) {
    console.log(e)
    if (this.touches.length === 1) {
      if (this.zooming) {
        this.handleImageZoomMove(e)
      } else if (!this.zooming && !this.mutipleZooming) {
        this.handleWrapPointerMove(e)
      }
    } else {
      this.handleMutipleZoomMove(e)
    }
  }

  onTouchEnd (e) {
    if (this.touches.length === 1) {
      if (this.mutipleZooming) return
      if (this.zooming) {
        this.handleImageZoomEnd(e)
      } else if (!this.zooming) {
        this.handleWrapPointerEnd(e)
      }
    } else {
      this.handleMutipleZoomEnd(e)
    }
    removeTouches(e, this.touches)
    if (this.touches.length === 1) {
      let id = this.touches[0].identifier
      let allTouches = e.touches
      let i = 0
      while (i < allTouches.length) {
        if (id === allTouches[i].identifier) {
          this.touch.pageX = allTouches[i].pageX
          this.touch.pageY = allTouches[i].pageY
          this.imageZoom.pageX = allTouches[i].pageX
          this.imageZoom.pageY = allTouches[i].pageY
          this.imageZoom.timerready = true
          this.imageZoom.startX = allTouches[i].pageX
          this.imageZoom.startY = allTouches[i].pageY
          return
        }
        i++
      }
    }
  }

  onClick (e) {
    // if (this.image.transitioning) return
    // ios div pointer

    //todo handle pointer
    let pointer = [{
      pageX: e.pageX,
      pageY: e.pageY
    }]
    if (e.target === this.image.el) {
      let now = Date.now()
      if (now - this.lastClickTime < 300) {
        if (this.zoomMoving) return
        if (this.mutiZoom) {
          this.image.resetInit()
          this.zooming = false
          this.mutiZoom = false
        } else if (this.zooming) {
          this.zoom(this.image.scale, this.imageZoom.pointer)
          this.zooming = false
        } else {
          this.zoom(2, (this.imageZoom.pointer = pointer))
          this.zooming = true
        }
      }
      this.lastClickTime = now
    }
  }

  handleMutipleZoomStart (e) {
    removeClass(this.image.el, 'viewer-image-zoom')
    this.mutipleZooming = true
    this.mutiZoom = true
    this.zooming = true
    let pointers = this.touches
    let pointer1 = pointers[0]
    let pointer2 = pointers[1]

    let diffX = Math.abs(pointer1.pageX - pointer2.pageX)
    let diffY = Math.abs(pointer1.pageY - pointer2.pageY)

    this.mutipleZoom.dist = getDist(diffX, diffY)
    this.mutipleZoom.diff = this.mutipleZoom.dist - 0
  }

  handleMutipleZoomMove (e) {
    console.log('handleMutipleZoomMove')
    removeClass(this.image.el, 'viewer-image-zoom')
    let pointers = e.touches
    let pointer1 = pointers[0]
    let pointer2 = pointers[1]

    let diffX = Math.abs(pointer1.pageX - pointer2.pageX)
    let diffY = Math.abs(pointer1.pageY - pointer2.pageY)

    let dist = getDist(diffX, diffY)
    let diff = dist - this.mutipleZoom.diff

    const {
      width,
      height,
      left,
      top
    } = this.image

    let newWidth = diff + width
    let newHeight = diff + height

    const center = getPointersCenter(pointers)
    let newLeft = left - diff * (center.pageX - left) / width
    let newTop = top - diff * (center.pageY - top) / height

    this.mutipleZoom.width = newWidth
    this.mutipleZoom.height = newHeight
    this.mutipleZoom.left = newLeft
    this.mutipleZoom.top = newTop

    setStyle(this.image.el, {
      width: newWidth + 'px',
      height: newHeight + 'px',
      marginLeft: newLeft + 'px',
      marginTop: newTop + 'px'
    })
  }

  handleMutipleZoomEnd (e) {
    console.log('handleMutipleZoomEnd')
    addClass(this.image.el, 'viewer-image-zoom')
    this.mutipleZooming = false

    const {
      init,
    } = this.image

    if (this.mutipleZoom.width < init.width || this.mutipleZoom.height < init.height) {
      this.zooming = false
      this.mutiZoom = false
      this.image.width = init.width
      this.image.height = init.height
      this.image.left = init.left
      this.image.top = init.top
      this.imageZoom.left = init.left
      this.imageZoom.top = init.top
      this.image.reset()
    } else {
      this.image.width = this.mutipleZoom.width
      this.image.height = this.mutipleZoom.height
      this.image.left = this.mutipleZoom.left
      this.image.top = this.mutipleZoom.top
      this.imageZoom.left = this.mutipleZoom.left
      this.imageZoom.top = this.mutipleZoom.top
    }
  }

  zoom (ratio, pointers) {
    addClass(this.image.el, 'viewer-image-zoom')
    // setStyle(this.image.el, {
    //   'willChange': 'transform'
    // })
    const {
      naturalWidth,
      naturalHeight,
      width,
      height,
      left,
      top
    } = this.image

    const newWidth = naturalWidth * ratio
    const newHeight = naturalHeight * ratio
    const offsetWidth = newWidth - width
    const offsetHeight = newHeight - height
    this.image.scale = Number((width / naturalWidth).toFixed(2))

    if (pointers) {
      // todo bugfix imageZoom.left image.left
      const center = getPointersCenter(pointers)
      this.image.left -= offsetWidth * (center.pageX - left) / width
      this.image.top -= offsetHeight * (center.pageY - top) / height
    } else {
      this.image.left -= offsetWidth / 2
      this.image.top -= offsetHeight / 2
    }
    this.image.width = newWidth
    this.image.height = newHeight
    
    this.imageZoom.left = this.image.left
    this.imageZoom.top = this.image.top

    // setStyle(this.image.el, {
    //   width: this.image.width + 'px',
    //   height: this.image.height + 'px',
    //   transform: `translate3d(${this.image.left}px, ${this.image.top}px) scale(${ratio})`
    // })
    this.image.reset()
  }

  handleWrapPointerStart (e) {
    console.log('handleWrapPointerStart')
    const touch = this.touches
    if (touch && touch.length === 1) {
      this.touch.pageX = touch[0].pageX
      this.touch.pageY = touch[0].pageY
    }
  }

  handleWrapPointerMove (e) {
    console.log('handleWrapPointerMove')
    console.log(this.touches)
    const touch = e.touches
    const { currentLeft } = this.touch
    const { contentWidth, width: transformWidth } = this.viewer
    let diff = touch[0].pageX - this.touch.pageX
    let left = currentLeft + diff
    console.log(left)
    let absLeft = Math.abs(left)
    if (left > 0) {
      left = damping(left)
    } else if (absLeft > contentWidth - transformWidth) {
      let d = damping(absLeft - contentWidth + transformWidth)
      left = -(contentWidth - transformWidth + d)
    }
    setStyle(this.viewer.el, {
      transform: `translate3d(${left}px, 0, 0)`,
      transitionDuration: '0ms'
    })
    this.touch.diff = diff
  }

  handleWrapPointerEnd (e) {
    console.log('handleWrapPointerEnd')
    const { touch } = this
    const { el, width: transformWidth } = this.viewer
    let left = touch.diff + touch.currentLeft
    if (Math.abs(touch.diff) > MIN_TRANSFORM_DIFF) {
      if(touch.diff > 0) {
        if (touch.currentIndex === 0) {
          left = touch.currentLeft
        } else {
          touch.currentIndex --
          left = touch.currentLeft + transformWidth + MARGIN
        }
      } else {
        if (touch.currentIndex === this.images.length - 1) {
          left = touch.currentLeft
        } else {
          touch.currentIndex ++
          left = touch.currentLeft - transformWidth - MARGIN
        }
      }
    } else {
      left = touch.currentLeft
    }
    setStyle(el, {
      transform: `translate3d(${left}px, 0, 0)`,
      transitionDuration: '300ms'
    })
    this.image = this.images[touch.currentIndex]
    touch.currentLeft = left
    touch.diff = 0
  }

  handleImageZoomStart (e) {
    console.log('handleImageZoomStart')
    const touch = this.touches
    if (touch && touch.length === 1) {
      this.imageZoom.pageX = touch[0].pageX
      this.imageZoom.pageY = touch[0].pageY
      this.imageZoom.timerready = true
      this.imageZoom.startX = touch[0].pageX
      this.imageZoom.startY = touch[0].pageY
    }
  }

  handleImageZoomMove (e) {
    console.log('handleImageZoomMove')
    removeClass(this.image.el, 'viewer-image-zoom')
    this.zoomMoving = true

    if (this.imageZoom.timerready) {
      this.imageZoom.startTime = +new Date()
      this.imageZoom.timerready = false
    }

    const touch = e.touches
    const {
      left,
      top,
      pageX,
      pageY
    } = this.imageZoom

    // const {
    //   width: imageWidth,
    //   height: imageHeight,
    //   left: imageLeft,
    //   top: imageTop
    // } = this.image

    // const {
    //   width: viewerWidth,
    //   height: viewerHeight
    // } = this.viewer

    // const isWidthOverflow = imageWidth > viewerWidth
    // const isHeightOverflow = imageHeight > viewerHeight
    // const topMin = isHeightOverflow ? (viewerHeight - imageHeight) : imageTop
    // const leftMin = isWidthOverflow ? (viewerWidth - imageWidth) : imageLeft
    // const topMax = isHeightOverflow ? 0 : imageTop
    // const leftMax = isWidthOverflow ? 0 : imageLeft

    let newDiffX = touch[0].pageX - pageX
    let newDiffY = touch[0].pageY - pageY
    let newLeft = left + newDiffX
    let newTop = top + newDiffY
    // let overLeft, overTop, t = false
    // if (newLeft < leftMin) {
      
    //   let over = leftMin - newLeft
    //   // console.log(over)
    //   over = damping(over)
    //   overLeft = leftMin - over
    //   t = true
    // }
    // if (newLeft > leftMax) {
    //   let over = newLeft - leftMax
    //   over = damping(over)
    //   overLeft = leftMax + over
    //   t = true
    // }
    // if (newTop < topMin) {
    //   let over = topMin - newTop
    //   over = damping(over)
    //   overTop = topMin - over
    //   t = true
    // }
    // if (newTop > topMax) {
    //   let over = newTop - topMax
    //   over = damping(over)
    //   overTop = topMax + over
    //   t = true
    // }
    // if (t) {
    //   setStyle(this.image.el, {
    //     marginLeft: overLeft + 'px',
    //     marginTop: overTop + 'px'
    //   })
    // } else {
    //   setStyle(this.image.el, {
    //     marginLeft: newLeft + 'px',
    //     marginTop: newTop + 'px'
    //   })
    // }

    setStyle(this.image.el, {
      marginLeft: newLeft + 'px',
      marginTop: newTop + 'px'
    })

    this.imageZoom.diffX = newDiffX
    this.imageZoom.diffY = newDiffY
    this.imageZoom.left = newLeft
    this.imageZoom.top = newTop
    this.imageZoom.pageX = touch[0].pageX
    this.imageZoom.pageY = touch[0].pageY
    // this.image.left = newLeft
    // this.image.top = newTop
  }
  handleImageZoomEnd (e) {
    removeClass(this.image.el, 'viewer-image-zoom')
    console.log('handleImageZoomEnd')
    if (!this.zoomMoving) {
      return
    }

    this.zoomMoving = false

    const {
      width: viewerWidth,
      height: viewerHeight
    } = this.viewer

    const {
      width: imageWidth,
      height: imageHeight,
      left: imageLeft,
      top: imageTop
    } = this.image

    this.imageZoom.endTime = +new Date()

    // 移动范围
    // topMax -> 0 -> topMin
    // leftMax -> 0 -> leftMin
    const isWidthOverflow = imageWidth > viewerWidth
    const isHeightOverflow = imageHeight > viewerHeight
    const topMin = isHeightOverflow ? (viewerHeight - imageHeight) : imageTop
    const leftMin = isWidthOverflow ? (viewerWidth - imageWidth) : imageLeft
    const topMax = isHeightOverflow ? 0 : imageTop
    const leftMax = isWidthOverflow ? 0 : imageLeft

    const {
      pageX,
      pageY,
      startX,
      startY,
      startTime,
      endTime
    } = this.imageZoom

    let distanceX = startX - pageX
    let distanceY = startY - pageY
    let distance = getDist(distanceX, distanceY)
    let speed = distance / (endTime - startTime) * 16.67
    let rate = Math.min(10, speed)
    let self = this
    let over = false
    function step () {
      speed -= speed / rate
      let moveX = speed * distanceX / distance
      let moveY = speed * distanceY / distance
      // self.imageZoom.left = getOverflow(leftMin, leftMax, self.imageZoom.left + moveX)
      // self.imageZoom.top = getOverflow(topMin, topMax, self.imageZoom.top + moveY)
      self.imageZoom.left -= moveX
      self.imageZoom.top -= moveY

      if (self.imageZoom.left >= leftMax || self.imageZoom.left <= leftMin) {
        self.imageZoom.left = Math.max(Math.min(self.imageZoom.left, leftMax), leftMin)
        over = true
      }
      if (self.imageZoom.top >= topMax || self.imageZoom.top <= topMin) {
        self.imageZoom.top = Math.max(Math.min(self.imageZoom.top, topMax), topMin)
        over = true
      }
      
      if (over) {
        addClass(self.image.el, 'viewer-image-zoom')
        speed = 0
        over = false
      }
      self.image.move(self.imageZoom.left, self.imageZoom.top)
      if (speed < 0.1) {
        speed = 0
        // self.imageZoom.left = Math.min(Math.max(self.imageZoom.left, leftMax), leftMin)
        // self.imageZoom.top = Math.min(Math.max(self.imageZoom.top, topMax), topMin)
        // self.image.move(self.imageZoom.left, self.imageZoom.top)
      } else {
        requestAnimationFrame(step)
      }
    }

    step()

    // const {
    //   left: zoomLeft,
    //   top: zoomTop
    // } = this.imageZoom

    // let newZoomLeft = Math.min(Math.max(zoomLeft, leftMax), leftMin)
    // let newZoomTop = Math.min(Math.max(zoomTop, topMax), topMin)

    // // setStyle(this.image.el, {
    // //   transform: `translate3d(${newZoomLeft}px, ${newZoomTop}px, 0)`,
    // //   transitionDuration: '500ms'
    // // })

    // this.imageZoom.left = newZoomLeft
    // this.imageZoom.top = newZoomTop

    // requestAnimationFrame(() => {
    //   this.image.move(this.imageZoom.left, this.imageZoom.top)
    // })
  }
  
}
