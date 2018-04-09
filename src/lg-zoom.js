var getUseLeft = function() {
    var useLeft = false;
    var isChrome = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
    if (isChrome && parseInt(isChrome[2], 10) < 54) {
        useLeft = true;
    }

    return useLeft;
};

var zoomDefaults = {
    scale: 1,
    zoom: true,
    actualSize: true,
    enableZoomAfter: 300,
    useLeftForZoom: getUseLeft()
};

var Zoom = function(element) {

    this.el = element;

    this.core = window.lgData[this.el.getAttribute('lg-uid')];
    this.core.s = Object.assign({}, zoomDefaults, this.core.s);

    if (this.core.s.zoom && this.core.doCss()) {
        this.init();

        // Store the zoomable timeout value just to clear it while closing
        this.zoomabletimeout = false;

        // Set the initial value center
        this.pageX = window.innerWidth;
        this.pageY = window.innerHeight + (document.documentElement.scrollTop || document.body.scrollTop);
		}
		
		this.currentX = 0;
		this.currentY = 0;

    return this;
};

Zoom.prototype.init = function() {

    var _this = this;
    var zoomIcons = '<span id="lg-zoom-in" class="lg-icon"></span><span id="lg-zoom-out" class="lg-icon"></span>';

    if (_this.core.s.actualSize) {
        zoomIcons += '<span id="lg-actual-size" class="lg-icon"></span>';
    }


    if (_this.core.s.useLeftForZoom) {
        utils.addClass(_this.core.outer, 'lg-use-left-for-zoom');
    } else {
        utils.addClass(_this.core.outer, 'lg-use-transition-for-zoom');
    }

    this.core.outer.querySelector('.lg-toolbar').insertAdjacentHTML('beforeend', zoomIcons);

    // Add zoomable class
    utils.on(_this.core.el, 'onSlideItemLoad.lgtmzoom', function(event) {

        // delay will be 0 except first time
        var _speed = _this.core.s.enableZoomAfter + event.detail.delay;

        // set _speed value 0 if gallery opened from direct url and if it is first slide
        if (utils.hasClass(document.body, 'lg-from-hash') && event.detail.delay) {

            // will execute only once
            _speed = 0;
        } else {

            // Remove lg-from-hash to enable starting animation.
            utils.removeClass(document.body, 'lg-from-hash');
        }

        _this.zoomabletimeout = setTimeout(function() {
            utils.addClass(_this.core.___slide[event.detail.index], 'lg-zoomable');
        }, _speed + 30);
    });

    var scale = 1;
    /**
     * @desc Image zoom
     * Translate the wrap and scale the image to get better user experience
     *
     * @param {String} scaleVal - Zoom decrement/increment value
     */
    var zoom = function(scaleVal) {

				var image = _this.core.outer.querySelector('.lg-current .lg-image');
				// Set this each zoom, because changing slides wipes out the style of the element
				// So we'd lose it if we set it only when the slide is first loaded
				image.style['transform-origin'] = '50%';

				var imageWrap = image.parentElement;

        var x = parseInt(imageWrap.getAttribute('data-x'), 10) || 0;
        var y = parseInt(imageWrap.getAttribute('data-y'), 10) || 0;

				var oldWidth = image.getBoundingClientRect().width;
				var oldHeight = image.getBoundingClientRect().height;
				var oldScale = parseInt(image.getAttribute('data-scale'), 10);
        utils.setVendor(image, 'Transform', 'scale3d(' + scaleVal + ', ' + scaleVal + ', 1)');
				image.setAttribute('data-scale', scaleVal);
				var newWidth = oldWidth + ((oldScale > scale) ? -image.offsetWidth : image.offsetWidth);
				var newHeight = oldHeight + ((oldScale > scale) ? -image.offsetHeight : image.offsetHeight);

				var oldXAsPercentOfOldWidth = (x / oldWidth) * 100;
				var newX = ((newWidth / 100) * oldXAsPercentOfOldWidth) || 0;
				var oldYAsPercentOfOldHeight = (y / oldHeight) * 100;
				var newY = ((newHeight / 100) * oldYAsPercentOfOldHeight) || 0;

				if (Math.abs(newX) > newWidth / 2) {
						newX = (newX < 0 ? -newWidth : newWidth) / 2;
				}

				if (Math.abs(newY) > newHeight / 2) {
						newY = (newY < 0 ? -newHeight : newHeight) / 2;
				}

        if (_this.core.s.useLeftForZoom) {
            imageWrap.style.left = newX + 'px';
            imageWrap.style.top = newY + 'px';
        } else {
            utils.setVendor(imageWrap, 'Transform', 'translate3d(' + newX + 'px, ' + newY + 'px, 0)');
        }

        imageWrap.setAttribute('data-x', newX);
        imageWrap.setAttribute('data-y', newY);
    };

    var callScale = function() {
        if (scale > 1) {
            utils.addClass(_this.core.outer, 'lg-zoomed');
        } else {
            _this.resetZoom();
        }

        if (scale < 1) {
            scale = 1;
        }

        zoom(scale);
    };

    var actualSize = function(event, image, index, fromIcon) {
        var w = image.clientWidth;
        var nw;
        if (_this.core.s.dynamic) {
            nw = _this.core.s.dynamicEl[index].width || image.naturalWidth || w;
        } else {
            nw = _this.core.items[index].getAttribute('data-width') || image.naturalWidth || w;
        }

        var _scale;

        if (utils.hasClass(_this.core.outer, 'lg-zoomed')) {
            scale = 1;
        } else {
            if (nw > w) {
                _scale = nw / w;
                scale = _scale || 2;
            }
        }

        if (fromIcon) {
            _this.pageX = window.innerWidth;
            _this.pageY = (window.innerHeight) + (document.documentElement.scrollTop || document.body.scrollTop);
        } else {
            _this.pageX = event.pageX || event.targetTouches[0].pageX;
            _this.pageY = event.pageY || event.targetTouches[0].pageY;
        }

        callScale();
        setTimeout(function() {
            utils.removeClass(_this.core.outer, 'lg-grabbing');
            utils.addClass(_this.core.outer, 'lg-grab');
        }, 10);
    };

    var tapped = false;

    // event triggered after appending slide content
    utils.on(_this.core.el, 'onAferAppendSlide.lgtmzoom', function(event) {

        var index = event.detail.index;

        // Get the current element
        var image = _this.core.___slide[index].querySelector('.lg-image');

        if (!_this.core.isTouch) { 
            utils.on(image, 'dblclick', function(event) {
                actualSize(event, image, index);
            });
        }

        if (_this.core.isTouch) { 
            utils.on(image, 'touchstart', function(event) {
                if (!tapped) {
                    tapped = setTimeout(function() {
                        tapped = null;
                    }, 300);
                } else {
                    clearTimeout(tapped);
                    tapped = null;
                    actualSize(event, image, index);
                }

                event.preventDefault();
            });
        }

    });

    // Update zoom on resize and orientationchange
    utils.on(window, 'resize.lgzoom scroll.lgzoom orientationchange.lgzoom', function() {
        _this.pageX = window.innerWidth;
        _this.pageY = (window.innerHeight) + (document.documentElement.scrollTop || document.body.scrollTop);
        zoom(scale);
    });

    utils.on(document.getElementById('lg-zoom-out'), 'click.lg', function() {
        if (_this.core.outer.querySelector('.lg-current .lg-image')) {
            scale -= _this.core.s.scale;
            callScale();
        }
    });

    utils.on(document.getElementById('lg-zoom-in'), 'click.lg', function() {
        if (_this.core.outer.querySelector('.lg-current .lg-image')) {
            scale += _this.core.s.scale;
            callScale();
        }
    });

    utils.on(document.getElementById('lg-actual-size'), 'click.lg', function(event) {
        actualSize(event, _this.core.___slide[_this.core.index].querySelector('.lg-image'), _this.core.index, true);
    });

    // Reset zoom on slide change
    utils.on(_this.core.el, 'onBeforeSlide.lgtm', function() {
        scale = 1;
        _this.resetZoom();
    });

    // Drag option after zoom
    if (!_this.core.isTouch) {
        _this.zoomDrag();
    }

    if (_this.core.isTouch) {
        _this.zoomSwipe();
    }

};

// Reset zoom effect
Zoom.prototype.resetZoom = function() {
    utils.removeClass(this.core.outer, 'lg-zoomed');
    for (var i = 0; i < this.core.___slide.length; i++) {
        if (this.core.___slide[i].querySelector('.lg-img-wrap')) {
            this.core.___slide[i].querySelector('.lg-img-wrap').removeAttribute('style');
            this.core.___slide[i].querySelector('.lg-img-wrap').removeAttribute('data-x');
            this.core.___slide[i].querySelector('.lg-img-wrap').removeAttribute('data-y');
        }
    }

    for (var j = 0; j < this.core.___slide.length; j++) {
        if (this.core.___slide[j].querySelector('.lg-image')) {
            this.core.___slide[j].querySelector('.lg-image').removeAttribute('style');
            this.core.___slide[j].querySelector('.lg-image').removeAttribute('data-scale');
        }
    }

    // Reset pageX pageY values to center
    this.pageX = window.innerWidth;
    this.pageY = (window.innerHeight) + (document.documentElement.scrollTop || document.body.scrollTop);
};

Zoom.prototype.zoomSwipe = function() {
    var _this = this;
    var startCoords = {};
    var endCoords = {};
    var isMoved = false;

    // Allow x direction drag
    var allowX = false;

    // Allow Y direction drag
    var allowY = false;

    for (var i = 0; i < _this.core.___slide.length; i++) {

        /*jshint loopfunc: true */
        utils.on(_this.core.___slide[i], 'touchstart.lg', function(e) {

            if (utils.hasClass(_this.core.outer, 'lg-zoomed')) {
                var image = _this.core.___slide[_this.core.index].querySelector('.lg-object');

                allowY = image.offsetHeight * image.getAttribute('data-scale') > _this.core.outer.querySelector('.lg').clientHeight;
                allowX = image.offsetWidth * image.getAttribute('data-scale') > _this.core.outer.querySelector('.lg').clientWidth;
                if ((allowX || allowY)) {
                    e.preventDefault();
                    startCoords = {
                        x: e.targetTouches[0].pageX,
                        y: e.targetTouches[0].pageY
                    };
                }
            }

        });
    }

    for (var j = 0; j < _this.core.___slide.length; j++) {

        /*jshint loopfunc: true */
        utils.on(_this.core.___slide[j], 'touchmove.lg', function(e) {

            if (utils.hasClass(_this.core.outer, 'lg-zoomed')) {

                var _el = _this.core.___slide[_this.core.index].querySelector('.lg-img-wrap');
                var distanceX;
                var distanceY;

                e.preventDefault();
                isMoved = true;

                endCoords = {
                    x: e.targetTouches[0].pageX,
                    y: e.targetTouches[0].pageY
                };

                // reset opacity and transition duration
                utils.addClass(_this.core.outer, 'lg-zoom-dragging');

                if (allowY) {
                    distanceY = (-Math.abs(_el.getAttribute('data-y'))) + (endCoords.y - startCoords.y);
                } else {
                    distanceY = -Math.abs(_el.getAttribute('data-y'));
                }

                if (allowX) {
                    distanceX = (-Math.abs(_el.getAttribute('data-x'))) + (endCoords.x - startCoords.x);
                } else {
                    distanceX = -Math.abs(_el.getAttribute('data-x'));
                }

                if ((Math.abs(endCoords.x - startCoords.x) > 15) || (Math.abs(endCoords.y - startCoords.y) > 15)) {

                    if (_this.core.s.useLeftForZoom) {
                        _el.style.left = distanceX + 'px';
                        _el.style.top = distanceY + 'px';
                    } else {
                        utils.setVendor(_el, 'Transform', 'translate3d(' + distanceX + 'px, ' + distanceY + 'px, 0)');
                    }

                }

            }

        });
    }

    for (var k = 0; k < _this.core.___slide.length; k++) {

        /*jshint loopfunc: true */
        utils.on(_this.core.___slide[k], 'touchend.lg', function() {
            if (utils.hasClass(_this.core.outer, 'lg-zoomed')) {
                if (isMoved) {
                    isMoved = false;
                    utils.removeClass(_this.core.outer, 'lg-zoom-dragging');
                    _this.touchendZoom(allowX, allowY);

                }
            }
        });
    }

};

Zoom.prototype.zoomDrag = function() {

    var _this = this;
    var startCoords = {};
    var endCoords = {};
    var isDraging = false;
    var isMoved = false;

    // Allow x direction drag
    var allowX = false;

    // Allow Y direction drag
    var allowY = false;

    for (var i = 0; i < _this.core.___slide.length; i++) {

        /*jshint loopfunc: true */
        utils.on(_this.core.___slide[i], 'mousedown.lgzoom', function(e) {

            // execute only on .lg-object
            var image = _this.core.___slide[_this.core.index].querySelector('.lg-object');

            allowY = image.offsetHeight * image.getAttribute('data-scale') > _this.core.outer.querySelector('.lg').clientHeight;
            allowX = image.offsetWidth * image.getAttribute('data-scale') > _this.core.outer.querySelector('.lg').clientWidth;

            if (utils.hasClass(_this.core.outer, 'lg-zoomed')) {
                if (utils.hasClass(e.target, 'lg-object') && (allowX || allowY)) {
                    e.preventDefault();
                    startCoords = {
                        x: e.pageX,
                        y: e.pageY
                    };

                    isDraging = true;

                    // ** Fix for webkit cursor issue https://code.google.com/p/chromium/issues/detail?id=26723
                    _this.core.outer.scrollLeft += 1;
                    _this.core.outer.scrollLeft -= 1;

                    utils.removeClass(_this.core.outer, 'lg-grab');
                    utils.addClass(_this.core.outer, 'lg-grabbing');
                }
            }
        });
    }

    utils.on(window, 'mousemove.lgzoom', function(e) {
        if (isDraging) {
            var _el = _this.core.___slide[_this.core.index].querySelector('.lg-img-wrap');
            var distanceX;
            var distanceY;

            isMoved = true;
            endCoords = {
                x: e.pageX,
                y: e.pageY
            };

            // reset opacity and transition duration
            utils.addClass(_this.core.outer, 'lg-zoom-dragging');

						var nextY = (parseInt(_el.getAttribute('data-y'), 10)) + (endCoords.y - startCoords.y);
						if (allowY) {
								distanceY = nextY;
						} else {
								distanceY = _this.currentY;
						}

						var nextX = (parseInt(_el.getAttribute('data-x'), 10)) + (endCoords.x - startCoords.x);
						if (allowX) {
								distanceX = nextX;
						} else {
								distanceX = _this.currentX;
						}

            if (_this.core.s.useLeftForZoom) {
                _el.style.left = distanceX + 'px';
                _el.style.top = distanceY + 'px';
            } else {
                utils.setVendor(_el, 'Transform', 'translate3d(' + distanceX + 'px, ' + distanceY + 'px, 0)');
						}
						
						_this.currentX = distanceX;
						_this.currentY = distanceY;
        }
    });

    utils.on(window, 'mouseup.lgzoom', function(e) {

        if (isDraging) {
            isDraging = false;
            utils.removeClass(_this.core.outer, 'lg-zoom-dragging');

            // Fix for chrome mouse move on click
            if (isMoved && ((startCoords.x !== endCoords.x) || (startCoords.y !== endCoords.y))) {
                endCoords = {
                    x: e.pageX,
                    y: e.pageY
                };
                _this.touchendZoom(allowX, allowY);

            }

            isMoved = false;
        }

        utils.removeClass(_this.core.outer, 'lg-grabbing');
        utils.addClass(_this.core.outer, 'lg-grab');

    });
};

Zoom.prototype.touchendZoom = function(allowX, allowY) {

    var _this = this;
    var _el = _this.core.___slide[_this.core.index].querySelector('.lg-img-wrap');
		var image = _this.core.___slide[_this.core.index].querySelector('.lg-object');
		var distanceX = _this.currentX;
		var distanceY = _this.currentY;
		var minY = ((image.offsetHeight * Math.abs(image.getAttribute('data-scale'))) - _this.core.outer.querySelector('.lg').clientHeight) / 2;
		var maxY = -minY;
		var minX = ((image.offsetWidth * Math.abs(image.getAttribute('data-scale'))) - _this.core.outer.querySelector('.lg').clientWidth) / 2;
		var maxX = -minX;

		if (allowY) {
				if (distanceY <= maxY) {
						distanceY = maxY;
				} else if (distanceY >= minY) {
						distanceY = minY;
				}
				_el.setAttribute('data-y', distanceY);
		}

		if (allowX) {
				if (distanceX <= maxX) {
						distanceX = maxX;
				} else if (distanceX >= minX) {
						distanceX = minX;
				}
				_el.setAttribute('data-x', distanceX);
		}

		if (_this.core.s.useLeftForZoom) {
				_el.style.left = distanceX + 'px';
				_el.style.top = distanceY + 'px';
		} else {
				utils.setVendor(_el, 'Transform', 'translate3d(' + distanceX + 'px, ' + distanceY + 'px, 0)');
		}
};

Zoom.prototype.destroy = function() {

    var _this = this;

    // Unbind all events added by lightGallery zoom plugin
    utils.off(_this.core.el, '.lgzoom');
    utils.off(window, '.lgzoom');
    for (var i = 0; i < _this.core.___slide.length; i++) {
        utils.off(_this.core.___slide[i], '.lgzoom');
    }

    utils.off(_this.core.el, '.lgtmzoom');
    _this.resetZoom();
    clearTimeout(_this.zoomabletimeout);
    _this.zoomabletimeout = false;
};

window.lgModules.zoom = Zoom;
