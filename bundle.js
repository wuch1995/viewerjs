'use strict';

function isObject (value) {
  return typeof value === 'object' && value !== null
}

function isFunction (value) {
  return typeof value === 'function'
}

function isNumber (value) {
  return typeof value === 'number' && !isNaN(value)
}

function forEach (value, callback) {
  if (value && isFunction(callback)) {
    if (Array.isArray(value) && isNumber(value.length)) {
      let length = value.length;
      for (let i = 0; i < length; i++) {
        if (callback.call(value, value[i], i, value) === false) {
          break
        }
      }
    } else if (isObject(value)) {
      Object.keys(value).forEach(key => {
        callback.call(value, value[key], key, value);
      });
    }
  }
}

function getPointersCenter (pointers) {
  let pageX = 0;
  let pageY = 0;
  let count = 0;

  forEach(pointers, (pointer) => {
    pageX += pointer.pageX;
    pageY += pointer.pageY;
    count ++;
  });

  pageX /= count;
  pageY /= count;

  return {
    pageX,
    pageY
  }
}

function getDist (x, y) {
  return Math.sqrt(x * x + y * y)
}

function damping (value) {
  var step = [20, 40, 60, 80, 100];
  var rate = [0.5, 0.4, 0.3, 0.2, 0.1];

  var scaleedValue = value;
  var valueStepIndex = step.length;

  while (valueStepIndex--) {
    if (value > step[valueStepIndex]) {
      scaleedValue = (value - step[valueStepIndex]) * rate[valueStepIndex];
      for (var i = valueStepIndex; i > 0; i--) {
        scaleedValue += (step[i] - step[i - 1]) * rate[i - 1];
      }
      scaleedValue += step[0] * 1;
      break
    }
  }

  return scaleedValue
}

function addClass (element, className) {
  if (element.classList) {
    element.classList.add(className);
  } else {
    let classNames = element.className;
    console.log(classNames);
    if (classNames.indexOf(className) < 0) {
      element.className = `${classNames} ${className}`;
    }
  }
}

function removeClass (element, className) {
  if (element.classList) {
    element.classList.remove(className);
  } else {
    let classNames = element.className.trim();
    if (classNames.indexOf(className) > -1) {
      classNames.replace(className, '');
      element.className = `${classNames}`;
    }
  }
}

function setStyle (element, styles) {
  Object.keys(styles).forEach(key => {
    element.style[key] = styles[key];
  });
}

function addEventListener (element, type, listener, options = {}) {
  element.addEventListener(type, listener, options);
}

const IS_BROWSER = typeof window !== 'undefined';
const WINDOW = IS_BROWSER ? window : {};
const IS_TOUCH_DEVICE = IS_BROWSER ? 'ontouchstart' in WINDOW.document.documentElement : false;

const MARGIN = 30;

const MIN_TRANSFORM_DIFF = 100;

class ViewerImage {
  constructor (image, index, viewer) {
    const { width: viewerWidth, height: viewerHeight } = viewer;
    // init render
    this.getImageNaturalSize(image, (image) => {
      this.naturalWidth = image.naturalWidth;
      this.naturalHeight = image.naturalHeight;
      this.ratio = image.naturalWidth / image.naturalHeight;
      this.oldRatio = image.naturalWidth / image.naturalHeight;
      this.src = image.src;
      this.width = viewerWidth;
      this.height = viewerHeight;
      this.index = index;
      this.transitioning = false;
      this.el = null;

      if (image.naturalHeight * this.ratio > viewerWidth) {
        this.height = viewerWidth / this.ratio;
      } else {
        this.width = viewerHeight * this.ratio;
      }

      this.width = Math.min(this.width, viewerWidth);
      this.height = Math.min(this.height, viewerHeight);

      this.left = (viewerWidth - this.width) / 2;
      this.top = (viewerHeight - this.height) / 2;

      this.init = {
        width: this.width,
        height: this.height,
        left: this.left,
        top: this.top
      };

      this.renderImage(viewer, index);
      this.initEvent();
    });
  }

  initEvent () {
    addEventListener(this.el, 'transitionend', () => {
      this.transitioning = false;
      console.log(`${this.index}:${this.transitioning}`);
    });
    addEventListener(this.el, 'transitionstart', () => {
      this.transitioning = true;
      console.log(`${this.index}:${this.transitioning}`);
    });
  }

  getImageNaturalSize (image, cb) {
    if (image.complete) {
      cb(image);
    } else {
      let newImage = document.createElement('img');
      newImage.src = image.src;
      newImage.onload = () => {
        cb(newImage);
      };
    }
  }

  renderImage (viewer, index) {
    let wrap = document.createElement('div');
    addClass(wrap, 'viewer-image-wrap');
    setStyle(wrap, {
      width: viewer.width + 'px',
      height: viewer.height + 'px',
      transform: `translate3d(${index * viewer.width + MARGIN * index}px, 0, 0)`
    });
    const img = document.createElement('img');
    img.src = this.src;
    wrap.appendChild(img);
    viewer.el.appendChild(wrap);
    this.el = img;
    this.reset();
    // addEventListener(img, 'click', this.onClick.bind(this))
  }

  reset () {
    setStyle(this.el, {
      width: this.width + 'px',
      height: this.height + 'px',
      marginLeft: this.left + 'px',
      marginTop: this.top + 'px'
    });
  }

  move (left, top) {
    setStyle(this.el, {
      marginLeft: left + 'px',
      marginTop: top + 'px'
    });
  }
}

var TEMPLATE = (
  `
    <div class="viewer-header">
      <span class="viewer-index">1/1</span>
      <span class="viewer-close">x</span>
    </div>
    <div class="viewer-wrap" touch-action="none"></div>
  `
);

class ViewerContainer {
  constructor () {
    this.parent = document.body;
    this.el = null;
    this.closeEl = null;
    this.display = false;

    this.init();
    this.initEvent();
  }

  init () {
    let container = document.createElement('div');
    addClass(container, 'viewer-container');
    container.innerHTML = TEMPLATE;
    this.parent.appendChild(container);

    this.el = container;
    this.closeEl = container.querySelector('.viewer-close');
  }

  initEvent () {
    const { el, closeEl } = this;
    addEventListener(el, 'transitionend', this.transitionEnd.bind(this));
    addEventListener(closeEl, 'click', this.hide.bind(this));
  }

  show () {
    const { el, parent } = this;
    addClass(el, 'viewer-show');
    addClass(parent, 'viewer-open');
    setTimeout(() => {
      addClass(el, 'viewer-fade-in');
      this.display = true;
    }, 20);
  }

  hide () {
    const { el } = this;
    removeClass(el, 'viewer-fade-in');
    this.display = false;
  }

  transitionEnd () {
    const { el } = this;
    if (!this.display) {
      removeClass(el, 'viewer-show');
    }
  }
}

class Viewer {
  constructor (source, options) {
    this.images = [];
    this.zooming = false;
    this.zoomMoving = false;
    this.lastClickTime = 0;
    this.mutipleZooming = false;
    this.viewer = {
      el: null,
      height: window.innerHeight,
      width: window.innerWidth,
      contentWidth: 0
    };
    this.touch = {
      pageX: 0,
      pageY: 0,
      diff: 0,
      currentLeft: 0,
      currentIndex: 0
    };
    this.imageZoom = {
      left: 0,
      top: 0,
      diffX: 0,
      diffY: 0,
      pageX: 0,
      pageY: 0,
      pointer: {}
    };
    this.mutipleZoom = {
      diffX: 0,
      diffY: 0,
      dist: 0
    };
    this.container = new ViewerContainer();
    this.initViewer();
    this.initImage(source);
  }

  initImage (source) {
    // isElement
    // todo element or Array[img]
    const isImg = source && source.tagName.toLowerCase() === 'img';
    let images = isImg ? [source] : source.querySelectorAll('img');
    images.forEach((image, index) => {
      this.images.push(new ViewerImage(image, index, this.viewer));
    });
    this.viewer.contentWidth = this.viewer.width * this.images.length + (this.images.length - 1) * MARGIN;
    this.image = this.images[this.touch.currentIndex];
  }

  initViewer () {
    const { el: container } = this.container;
    this.viewer.el = container.querySelector('.viewer-wrap');
    addEventListener(this.viewer.el, 'touchstart', this.onTouchStart.bind(this));
    addEventListener(this.viewer.el, 'touchmove', this.onTouchMove.bind(this));
    addEventListener(this.viewer.el, 'touchend', this.onTouchEnd.bind(this));
    addEventListener(this.viewer.el, 'click', this.onClick.bind(this));
    // addEventListener(window, 'gesturestart', (e) => { e.preventDefault() })
    // addEventListener(window, 'gesturemove', (e) => { e.preventDefault() })
    // addEventListener(window, 'gestureend', (e) => { e.preventDefault() })
  }

  show () {
    const { container } = this;
    container.show();
  }

  hide () {
    const { container } = this;
    container.hide();
  }

  onTouchStart (e) {
    if (e.touches.length <= 1) {
      if ((this.zooming || this.mutipleZooming) && e.target === this.image.el) {
        this.handleImageZoomStart(e);
      } else if (!this.zooming && !this.mutipleZooming){
        this.handleWrapPointerStart(e);
      }
    } else if (e.target === this.image.el) {
      this.handleMutipleZoomStart(e);
    }
  }

  onTouchMove (e) {
    if (e.touches.length <= 1) {
      if ((this.zooming || this.mutipleZooming) && e.target === this.image.el) {
        this.handleImageZoomMove(e);
      } else if (!this.zooming && !this.mutipleZooming){
        this.handleWrapPointerMove(e);
      }
    } else if (e.target === this.image.el) {
      this.handleMutipleZoomMove(e);
    }
  }

  onTouchEnd (e) {
    if (!this.zooming && !this.mutipleZooming) {
      this.handleWrapPointerEnd(e);
    } else if (this.zooming && this.mutipleZooming) {
      this.handleMutipleZoomEnd(e);
    } else if (this.zooming && !this.mutipleZooming) {
      this.handleImageZoomEnd(e);
    }
  }

  onClick (e) {
    if (this.image.transitioning) return
    // ios div pointer

    //todo handle pointer
    let pointer = [{
      pageX: e.pageX,
      pageY: e.pageY
    }];
    if (e.target === this.image.el) {
      let now = Date.now();
      if (now - this.lastClickTime < 300) {
        if (this.zoomMoving) return
        if (this.zooming) {
          this.zoom(this.image.oldRatio, this.imageZoom.pointer);
          this.zooming = false;
        } else {
          this.zoom(2, (this.imageZoom.pointer = pointer));
          this.zooming = true;
        }
      }
      this.lastClickTime = now;
    }
  }

  handleMutipleZoomStart (e) {
    removeClass(this.image.el, 'viewer-image-zoom');
    this.mutipleZooming = true;
    this.zooming = true;
    let pointers = e.targetTouches;
    let pointer1 = pointers[0];
    let pointer2 = pointers[1];

    let diffX = Math.abs(pointer1.pageX - pointer2.pageX);
    let diffY = Math.abs(pointer1.pageY - pointer2.pageY);

    this.mutipleZoom.dist = getDist(diffX, diffY);
    this.mutipleZoom.diff = this.mutipleZoom.dist - 0;
  }

  handleMutipleZoomMove (e) {
    removeClass(this.image.el, 'viewer-image-zoom');
    let pointers = e.targetTouches;
    let pointer1 = pointers[0];
    let pointer2 = pointers[1];

    let diffX = Math.abs(pointer1.pageX - pointer2.pageX);
    let diffY = Math.abs(pointer1.pageY - pointer2.pageY);

    let dist = getDist(diffX, diffY);
    let diff = dist - this.mutipleZoom.diff;

    const {
      width,
      height,
      left,
      top
    } = this.image;

    let newWidth = diff + width;
    let newHeight = diff + height;

    const center = getPointersCenter(pointers);
    let newLeft = left - diff * (center.pageX - left) / width;
    let newTop = top - diff * (center.pageY - top) / height;

    this.mutipleZoom.width = newWidth;
    this.mutipleZoom.height = newHeight;
    this.mutipleZoom.left = newLeft;
    this.mutipleZoom.top = newTop;

    setStyle(this.image.el, {
      width: newWidth + 'px',
      height: newHeight + 'px',
      marginLeft: newLeft + 'px',
      marginTop: newTop + 'px'
    });
  }

  handleMutipleZoomEnd (e) {
    addClass(this.image.el, 'viewer-image-zoom');
    this.mutipleZooming = false;

    const {
      init
    } = this.image;

    if (this.mutipleZoom.width < init.width || this.mutipleZoom.height < init.height) {
      this.zooming = false;
      this.image.width = init.width;
      this.image.height = init.height;
      this.image.left = init.left;
      this.image.top = init.top;

      this.image.reset();
    } else {
      this.image.width = this.mutipleZoom.width;
      this.image.height = this.mutipleZoom.height;
      this.image.left = this.mutipleZoom.left;
      this.image.top = this.mutipleZoom.top;
    }
  }

  zoom (ratio, pointers) {
    addClass(this.image.el, 'viewer-image-zoom');
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
    } = this.image;

    const newWidth = naturalWidth * ratio;
    const newHeight = naturalHeight * ratio;
    const offsetWidth = newWidth - width;
    const offsetHeight = newHeight - height;
    this.image.oldRatio = Number((width / naturalWidth).toFixed(2));

    if (pointers) {
      // todo bugfix imageZoom.left image.left
      const center = getPointersCenter(pointers);
      this.image.left -= offsetWidth * (center.pageX - left) / width;
      this.image.top -= offsetHeight * (center.pageY - top) / height;
    } else {
      this.image.left -= offsetWidth / 2;
      this.image.top -= offsetHeight / 2;
    }
    this.image.width = newWidth;
    this.image.height = newHeight;
    
    this.imageZoom.left = this.image.left;
    this.imageZoom.top = this.image.top;

    // setStyle(this.image.el, {
    //   width: this.image.width + 'px',
    //   height: this.image.height + 'px',
    //   transform: `translate3d(${this.image.left}px, ${this.image.top}px) scale(${ratio})`
    // })
    this.image.reset();
  }

  handleWrapPointerStart (e) {
    const touch = e.targetTouches;
    if (touch && touch.length === 1) {
      this.touch.pageX = touch[0].pageX;
      this.touch.pageY = touch[0].pageY;
    }
  }

  handleWrapPointerMove (e) {
    const touch = e.targetTouches;
    const { currentLeft } = this.touch;
    const { contentWidth, width: transformWidth } = this.viewer;
    let diff = touch[0].pageX - this.touch.pageX;
    let left = currentLeft + diff;
    let absLeft = Math.abs(left);
    if (left > 0) {
      left = damping(left);
    } else if (absLeft > contentWidth - transformWidth) {
      let d = damping(absLeft - contentWidth + transformWidth);
      left = -(contentWidth - transformWidth + d);
    }
    setStyle(this.viewer.el, {
      transform: `translate3d(${left}px, 0, 0)`,
      transitionDuration: '0ms'
    });
    this.touch.diff = diff;
  }

  handleWrapPointerEnd (e) {
    const { touch } = this;
    const { el, width: transformWidth } = this.viewer;
    let left = touch.diff + touch.currentLeft;
    if (Math.abs(touch.diff) > MIN_TRANSFORM_DIFF) {
      if(touch.diff > 0) {
        if (touch.currentIndex === 0) {
          left = touch.currentLeft;
        } else {
          touch.currentIndex --;
          left = touch.currentLeft + transformWidth + MARGIN;
        }
      } else {
        if (touch.currentIndex === this.images.length - 1) {
          left = touch.currentLeft;
        } else {
          touch.currentIndex ++;
          left = touch.currentLeft - transformWidth - MARGIN;
        }
      }
    } else {
      left = touch.currentLeft;
    }
    setStyle(el, {
      transform: `translate3d(${left}px, 0, 0)`,
      transitionDuration: '300ms'
    });
    this.image = this.images[touch.currentIndex];
    touch.currentLeft = left;
    touch.diff = 0;
  }

  handleImageZoomStart (e) {
    const touch = e.targetTouches;
    if (touch && touch.length === 1) {
      this.imageZoom.pageX = touch[0].pageX;
      this.imageZoom.pageY = touch[0].pageY;
      this.imageZoom.timerready = true;
      this.imageZoom.startX = touch[0].pageX;
      this.imageZoom.startY = touch[0].pageY;
    }
  }

  handleImageZoomMove (e) {
    removeClass(this.image.el, 'viewer-image-zoom');
    this.zoomMoving = true;

    if (this.imageZoom.timerready) {
      this.imageZoom.startTime = +new Date();
      this.imageZoom.timerready = false;
    }

    const touch = e.targetTouches;
    const {
      left,
      top,
      pageX,
      pageY
    } = this.imageZoom;
    let newDiffX = touch[0].pageX - pageX;
    let newDiffY = touch[0].pageY - pageY;
    let newLeft = left + newDiffX;
    let newTop = top + newDiffY;

    setStyle(this.image.el, {
      marginLeft: newLeft + 'px',
      marginTop: newTop + 'px'
    });

    this.imageZoom.diffX = newDiffX;
    this.imageZoom.diffY = newDiffY;
    this.imageZoom.left = newLeft;
    this.imageZoom.top = newTop;
    this.imageZoom.pageX = touch[0].pageX;
    this.imageZoom.pageY = touch[0].pageY;
    // this.image.left = newLeft
    // this.image.top = newTop
  }
  handleImageZoomEnd (e) {
    removeClass(this.image.el, 'viewer-image-zoom');
    if (!this.zoomMoving) {
      return
    }

    this.zoomMoving = false;

    const {
      width: viewerWidth,
      height: viewerHeight
    } = this.viewer;

    const {
      width: imageWidth,
      height: imageHeight,
      left: imageLeft,
      top: imageTop
    } = this.image;

    this.imageZoom.endTime = +new Date();

    // 移动范围
    // topMax -> 0 -> topMin
    // leftMax -> 0 -> leftMin
    const isWidthOverflow = imageWidth > viewerWidth;
    const isHeightOverflow = imageHeight > viewerHeight;
    const topMin = isHeightOverflow ? (viewerHeight - imageHeight) : imageTop;
    const leftMin = isWidthOverflow ? (viewerWidth - imageWidth) : imageLeft;
    const topMax = isHeightOverflow ? 0 : imageTop;
    const leftMax = isWidthOverflow ? 0 : imageLeft;

    const {
      pageX,
      pageY,
      startX,
      startY,
      startTime,
      endTime
    } = this.imageZoom;

    let distanceX = startX - pageX;
    let distanceY = startY - pageY;
    let distance = getDist(distanceX, distanceY);
    let speed = distance / (endTime - startTime) * 16.67;
    let rate = Math.min(10, speed);
    let self = this;
    let over = false;
    function step () {
      speed -= speed / rate;
      let moveX = speed * distanceX / distance;
      let moveY = speed * distanceY / distance;
      // self.imageZoom.left = getOverflow(leftMin, leftMax, self.imageZoom.left + moveX)
      // self.imageZoom.top = getOverflow(topMin, topMax, self.imageZoom.top + moveY)
      self.imageZoom.left -= moveX;
      self.imageZoom.top -= moveY;

      if (self.imageZoom.left >= leftMax || self.imageZoom.left <= leftMin) {
        self.imageZoom.left = Math.max(Math.min(self.imageZoom.left, leftMax), leftMin);
        over = true;
      }
      if (self.imageZoom.top >= topMax || self.imageZoom.top <= topMin) {
        self.imageZoom.top = Math.max(Math.min(self.imageZoom.top, topMax), topMin);
        over = true;
      }
      
      if (over) {
        addClass(self.image.el, 'viewer-image-zoom');
        speed = 0;
        over = false;
      }
      self.image.move(self.imageZoom.left, self.imageZoom.top);
      if (speed < 0.1) {
        speed = 0;
        // self.imageZoom.left = Math.min(Math.max(self.imageZoom.left, leftMax), leftMin)
        // self.imageZoom.top = Math.min(Math.max(self.imageZoom.top, topMax), topMin)
        // self.image.move(self.imageZoom.left, self.imageZoom.top)
      } else {
        requestAnimationFrame(step);
      }
    }

    step();

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

module.exports = Viewer;