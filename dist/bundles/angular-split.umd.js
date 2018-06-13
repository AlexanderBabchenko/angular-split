(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@angular/core'), require('@angular/common'), require('rxjs/Subject'), require('rxjs/add/operator/debounceTime')) :
	typeof define === 'function' && define.amd ? define(['exports', '@angular/core', '@angular/common', 'rxjs/Subject', 'rxjs/add/operator/debounceTime'], factory) :
	(factory((global['angular-split'] = global['angular-split'] || {}),global.ng.core,global.ng.common,global.Rx));
}(this, (function (exports,_angular_core,_angular_common,rxjs_Subject) { 'use strict';

var SplitComponent = (function () {
    function SplitComponent(cdRef, elementRef, renderer) {
        this.cdRef = cdRef;
        this.elementRef = elementRef;
        this.renderer = renderer;
        this.direction = 'horizontal';
        this.gutterSize = 10;
        this.gutterInvisible = false;
        this.disabled = false;
        this.visibleTransition = false;
        this.dragStart = new _angular_core.EventEmitter(false);
        this.dragProgress = new _angular_core.EventEmitter(false);
        this.dragEnd = new _angular_core.EventEmitter(false);
        this.visibleTransitionEndInternal = new rxjs_Subject.Subject();
        this.visibleTransitionEnd = this.visibleTransitionEndInternal.asObservable().debounceTime(20);
        this.gutterClick = new _angular_core.EventEmitter(false);
        this.areas = [];
        this.minPercent = 5;
        this.isDragging = false;
        this.containerSize = 0;
        this.areaASize = 0;
        this.areaBSize = 0;
        this.eventsDragFct = [];
        this.draggingWithoutMove = false;
        this.currentGutterNum = 0;
    }
    Object.defineProperty(SplitComponent.prototype, "styleFlexDirection", {
        get: function () {
            return this.direction === 'vertical';
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitComponent.prototype, "styleFlexDirectionStyle", {
        get: function () {
            return this.direction === 'horizontal' ? 'row' : 'column';
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitComponent.prototype, "dragging", {
        get: function () {
            // prevent animation of areas when visibleTransition is false, or resizing
            return !this.visibleTransition || this.isDragging;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitComponent.prototype, "styleWidth", {
        get: function () {
            return (this.width && !isNaN(this.width) && this.width > 0) ? this.width + 'px' : '100%';
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitComponent.prototype, "styleHeight", {
        get: function () {
            return (this.height && !isNaN(this.height) && this.height > 0) ? this.height + 'px' : '100%';
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitComponent.prototype, "visibleAreas", {
        get: function () {
            return this.areas.filter(function (a) { return a.component.visible; });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitComponent.prototype, "nbGutters", {
        get: function () {
            return this.visibleAreas.length - 1;
        },
        enumerable: true,
        configurable: true
    });
    SplitComponent.prototype.ngOnChanges = function (changes) {
        if (changes['gutterSize'] || changes['disabled']) {
            this.refresh();
        }
    };
    SplitComponent.prototype.addArea = function (component, orderUser, autoSize, sizeUser, sizePixelUser, minPixel, minPercent) {
        this.areas.push({
            component: component,
            orderUser: orderUser,
            order: -1,
            autoSize: autoSize,
            sizeUser: sizeUser,
            sizePixelUser: sizePixelUser,
            size: -1,
            minPixel: minPixel,
            minPercent: minPercent || this.minPercent
        });
        this.refresh();
    };
    SplitComponent.prototype.updateArea = function (component, orderUser, autoSize, sizeUser, sizePixelUser, minPixel, minPercent) {
        var item = this.areas.find(function (a) { return a.component === component; });
        if (item) {
            item.orderUser = orderUser;
            item.autoSize = autoSize;
            item.sizeUser = sizeUser;
            item.sizePixelUser = sizePixelUser,
                item.minPixel = minPixel;
            item.minPercent = minPercent || this.minPercent;
            this.refresh();
        }
    };
    SplitComponent.prototype.removeArea = function (area) {
        var item = this.areas.find(function (a) { return a.component === area; });
        if (item) {
            var index = this.areas.indexOf(item);
            this.areas.splice(index, 1);
            this.areas.forEach(function (a, i) { return a.order = i * 2; });
            this.refresh();
        }
    };
    SplitComponent.prototype.hideArea = function (area) {
        var item = this.areas.find(function (a) { return a.component === area; });
        if (item) {
            this.refresh();
        }
    };
    SplitComponent.prototype.showArea = function (area) {
        var item = this.areas.find(function (a) { return a.component === area; });
        if (item) {
            this.refresh();
        }
    };
    SplitComponent.prototype.isLastVisibleArea = function (area) {
        var visibleAreas = this.visibleAreas;
        return visibleAreas.length > 0 ? area === visibleAreas[visibleAreas.length - 1] : false;
    };
    SplitComponent.prototype.refresh = function () {
        this.stopDragging();
        var visibleAreas = this.visibleAreas;
        // ORDERS: Set css 'order' property depending on user input or added order
        var nbCorrectOrder = this.areas.filter(function (a) { return a.orderUser !== null && !isNaN(a.orderUser); }).length;
        if (nbCorrectOrder === this.areas.length) {
            this.areas.sort(function (a, b) { return +a.orderUser - +b.orderUser; });
        }
        this.areas.forEach(function (a, i) {
            a.order = i * 2;
            a.component.setStyle('order', a.order);
        });
        // PIXEL SIZES: update minPercent size if minPixel size set. And calculate persent size according to specified pixel size
        var prop = (this.direction === 'horizontal') ? 'offsetWidth' : 'offsetHeight';
        var containerSize = this.elementRef.nativeElement[prop];
        this.areas.forEach(function (a) {
            a.sizeUser = a.sizePixelUser ? a.sizePixelUser / containerSize * 100 : a.sizeUser;
            a.minPercent = a.minPixel ? a.minPixel / containerSize * 100 : a.minPercent;
        });
        // SIZES: Set css 'flex-basis' property depending on user input or equal sizes
        var autoSizedAreasCount = visibleAreas.filter(function (a) { return a.autoSize; }).length;
        if (autoSizedAreasCount > 0) {
            var presetSize_1 = visibleAreas.filter(function (a) { return !a.autoSize; }).map(function (a) { return a.sizeUser; }).reduce(function (acc, s) { return acc + s; }, 0);
            visibleAreas.forEach(function (a) {
                a.sizeUser = a.autoSize ? (100 - presetSize_1) / autoSizedAreasCount : a.sizeUser;
            });
        }
        var totalSize = visibleAreas.map(function (a) { return a.sizeUser; }).reduce(function (acc, s) { return acc + s; }, 0);
        var nbCorrectSize = visibleAreas.filter(function (a) { return a.sizeUser !== null && !isNaN(a.sizeUser) && a.sizeUser >= a.minPercent; }).length;
        if (totalSize < 99.99 || totalSize > 100.01 || nbCorrectSize !== visibleAreas.length) {
            var size_1 = Number((100 / visibleAreas.length).toFixed(3));
            visibleAreas.forEach(function (a) { return a.size = size_1; });
        }
        else {
            visibleAreas.forEach(function (a) { return a.size = Number(a.sizeUser); });
        }
        this.refreshStyleSizes();
        this.cdRef.markForCheck();
    };
    SplitComponent.prototype.refreshStyleSizes = function () {
        var visibleAreas = this.visibleAreas;
        if (this.gutterInvisible) {
            visibleAreas.forEach(function (a) {
                a.component.setStyle('flex-basis', a.size + "%");
            });
        }
        else {
            var f_1 = this.gutterSize * this.nbGutters / visibleAreas.length;
            visibleAreas.forEach(function (a) {
                a.component.setStyle('flex-basis', "calc( " + a.size + "% - " + f_1 + "px )");
            });
        }
    };
    SplitComponent.prototype.startDragging = function (startEvent, gutterOrder) {
        var _this = this;
        startEvent.preventDefault();
        this.currentGutterNum = gutterOrder;
        this.draggingWithoutMove = true;
        if (this.disabled) {
            return;
        }
        var areaA = this.areas.find(function (a) { return a.order === gutterOrder - 1; });
        var areaB = this.areas.find(function (a) { return a.order === gutterOrder + 1; });
        if (!areaA || !areaB) {
            return;
        }
        var prop = (this.direction === 'horizontal') ? 'offsetWidth' : 'offsetHeight';
        this.containerSize = this.elementRef.nativeElement[prop];
        this.areaASize = this.containerSize * areaA.size / 100;
        this.areaBSize = this.containerSize * areaB.size / 100;
        var start;
        if (startEvent instanceof MouseEvent) {
            start = {
                x: startEvent.screenX,
                y: startEvent.screenY
            };
        }
        else if (startEvent instanceof TouchEvent) {
            start = {
                x: startEvent.touches[0].screenX,
                y: startEvent.touches[0].screenY
            };
        }
        else {
            return;
        }
        this.eventsDragFct.push(this.renderer.listenGlobal('document', 'mousemove', function (e) { return _this.dragEvent(e, start, areaA, areaB); }));
        this.eventsDragFct.push(this.renderer.listenGlobal('document', 'touchmove', function (e) { return _this.dragEvent(e, start, areaA, areaB); }));
        this.eventsDragFct.push(this.renderer.listenGlobal('document', 'mouseup', function (e) { return _this.stopDragging(); }));
        this.eventsDragFct.push(this.renderer.listenGlobal('document', 'touchend', function (e) { return _this.stopDragging(); }));
        this.eventsDragFct.push(this.renderer.listenGlobal('document', 'touchcancel', function (e) { return _this.stopDragging(); }));
        areaA.component.lockEvents();
        areaB.component.lockEvents();
        this.isDragging = true;
        this.notify('start');
    };
    SplitComponent.prototype.dragEvent = function (event, start, areaA, areaB) {
        if (!this.isDragging) {
            return;
        }
        var end;
        if (event instanceof MouseEvent) {
            end = {
                x: event.screenX,
                y: event.screenY
            };
        }
        else if (event instanceof TouchEvent) {
            end = {
                x: event.touches[0].screenX,
                y: event.touches[0].screenY
            };
        }
        else {
            return;
        }
        this.draggingWithoutMove = false;
        this.drag(start, end, areaA, areaB);
    };
    SplitComponent.prototype.drag = function (start, end, areaA, areaB) {
        var offsetPixel = (this.direction === 'horizontal') ? (start.x - end.x) : (start.y - end.y);
        var newSizePixelA = this.areaASize - offsetPixel;
        var newSizePixelB = this.areaBSize + offsetPixel;
        if (areaA.minPixel) {
            areaA.minPercent = areaA.minPixel / this.containerSize * 100;
        }
        if (areaB.minPixel) {
            areaB.minPercent = areaB.minPixel / this.containerSize * 100;
        }
        var newSizePercentA = newSizePixelA / this.containerSize * 100;
        var newSizePercentB = newSizePixelB / this.containerSize * 100;
        if (newSizePercentA <= areaA.minPercent) {
            newSizePercentA = areaA.minPercent;
            newSizePercentB = areaA.size + areaB.size - areaA.minPercent;
        }
        else if (newSizePercentB <= areaB.minPercent) {
            newSizePercentB = areaB.minPercent;
            newSizePercentA = areaA.size + areaB.size - areaB.minPercent;
        }
        else {
            newSizePercentA = Number(newSizePercentA.toFixed(3));
            newSizePercentB = Number((areaA.size + areaB.size - newSizePercentA).toFixed(3));
        }
        areaA.size = newSizePercentA;
        areaB.size = newSizePercentB;
        this.refreshStyleSizes();
        this.notify('progress');
    };
    SplitComponent.prototype.stopDragging = function () {
        if (!this.isDragging) {
            return;
        }
        this.areas.forEach(function (a) { return a.component.unlockEvents(); });
        while (this.eventsDragFct.length > 0) {
            var fct = this.eventsDragFct.pop();
            if (fct) {
                fct();
            }
        }
        this.containerSize = 0;
        this.areaASize = 0;
        this.areaBSize = 0;
        if (this.draggingWithoutMove === true) {
            this.gutterClick.emit(this.currentGutterNum);
        }
        else {
            this.notify('end');
        }
        this.isDragging = false;
        this.draggingWithoutMove = false;
    };
    SplitComponent.prototype.notify = function (type) {
        var data = this.visibleAreas.map(function (a) { return a.size; });
        switch (type) {
            case 'start':
                return this.dragStart.emit(data);
            case 'progress':
                return this.dragProgress.emit(data);
            case 'end':
                return this.dragEnd.emit(data);
            case 'visibleTransitionEnd':
                return this.visibleTransitionEndInternal.next(data);
        }
    };
    SplitComponent.prototype.ngOnDestroy = function () {
        this.stopDragging();
    };
    return SplitComponent;
}());
SplitComponent.decorators = [
    { type: _angular_core.Component, args: [{
                selector: 'split',
                changeDetection: _angular_core.ChangeDetectionStrategy.OnPush,
                styles: ["\n        :host {\n            display: flex;\n            flex-wrap: nowrap;\n            justify-content: flex-start;\n            align-items: stretch;\n            flex-direction: row;\n        }\n\n        :host.vertical {\n            flex-direction: column;\n        }\n\n        split-gutter {\n            flex-grow: 0;\n            flex-shrink: 0;\n            background-color: #eeeeee;\n            background-position: center center;\n            background-repeat: no-repeat;\n        }\n\n        :host.vertical split-gutter {\n            width: 100%;\n        }\n\n        :host /deep/ split-area {\n            transition: flex-basis 0.3s;\n        }  \n\n        :host.notransition /deep/ split-area {\n            transition: none !important;\n        }      \n\n        :host /deep/ split-area.hided {\n            flex-basis: 0 !important;\n            overflow: hidden !important;\n        }      \n\n        :host.vertical /deep/ split-area.hided {\n            max-width: 0;\n        }\n    "],
                template: "\n        <ng-content></ng-content>\n        <ng-template ngFor let-area [ngForOf]=\"areas\" let-index=\"index\" let-last=\"last\">\n            <split-gutter *ngIf=\"last === false && area.component.visible === true && !isLastVisibleArea(area)\" \n                          [order]=\"index*2+1\"\n                          [direction]=\"direction\"\n                          [size]=\"gutterSize\"\n                          [disabled]=\"disabled\"\n                          (mousedown)=\"startDragging($event, index*2+1)\"\n                          (touchstart)=\"startDragging($event, index*2+1)\"></split-gutter>\n        </ng-template>",
            },] },
];
/** @nocollapse */
SplitComponent.ctorParameters = function () { return [
    { type: _angular_core.ChangeDetectorRef, },
    { type: _angular_core.ElementRef, },
    { type: _angular_core.Renderer, },
]; };
SplitComponent.propDecorators = {
    'direction': [{ type: _angular_core.Input },],
    'width': [{ type: _angular_core.Input },],
    'height': [{ type: _angular_core.Input },],
    'gutterSize': [{ type: _angular_core.Input },],
    'gutterInvisible': [{ type: _angular_core.Input },],
    'disabled': [{ type: _angular_core.Input },],
    'visibleTransition': [{ type: _angular_core.Input },],
    'dragStart': [{ type: _angular_core.Output },],
    'dragProgress': [{ type: _angular_core.Output },],
    'dragEnd': [{ type: _angular_core.Output },],
    'visibleTransitionEnd': [{ type: _angular_core.Output },],
    'gutterClick': [{ type: _angular_core.Output },],
    'styleFlexDirection': [{ type: _angular_core.HostBinding, args: ['class.vertical',] },],
    'styleFlexDirectionStyle': [{ type: _angular_core.HostBinding, args: ['style.flex-direction',] },],
    'dragging': [{ type: _angular_core.HostBinding, args: ['class.notransition',] },],
    'styleWidth': [{ type: _angular_core.HostBinding, args: ['style.width',] },],
    'styleHeight': [{ type: _angular_core.HostBinding, args: ['style.height',] },],
};

var SplitAreaDirective = (function () {
    function SplitAreaDirective(elementRef, renderer, split) {
        this.elementRef = elementRef;
        this.renderer = renderer;
        this.split = split;
        this._order = null;
        this._autoSize = false;
        this._size = null;
        this._sizePixel = null;
        this._minSizePixel = 0;
        this._minSizePercent = 0;
        this._visible = true;
        this.visibility = "block";
        this.eventsLockFct = [];
    }
    Object.defineProperty(SplitAreaDirective.prototype, "order", {
        set: function (v) {
            this._order = !isNaN(v) ? v : null;
            this.updateArea();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitAreaDirective.prototype, "autoSize", {
        set: function (v) {
            this._autoSize = !isNaN(v) ? v : false;
            this._size = null;
            this._sizePixel = null;
            this.updateArea();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitAreaDirective.prototype, "size", {
        set: function (v) {
            this._size = !isNaN(v) && !this._autoSize ? v : null;
            this.updateArea();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitAreaDirective.prototype, "sizePixel", {
        set: function (v) {
            this._sizePixel = !isNaN(v) && !this._autoSize ? v : null;
            this.updateArea();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitAreaDirective.prototype, "minSizePixel", {
        set: function (v) {
            this._minSizePixel = (!isNaN(v) && v > 0) ? v : 0;
            this.updateArea();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitAreaDirective.prototype, "minSizePercent", {
        set: function (v) {
            this._minSizePercent = (!isNaN(v) && v > 0) ? v : 0;
            this.updateArea();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitAreaDirective.prototype, "visible", {
        get: function () {
            return this._visible;
        },
        set: function (v) {
            this.visibility = v ? "block" : "none";
            this._visible = v;
            if (this.visible) {
                this.split.showArea(this);
            }
            else {
                this.split.hideArea(this);
            }
        },
        enumerable: true,
        configurable: true
    });
    SplitAreaDirective.prototype.updateArea = function () {
        this.split.updateArea(this, this._order, this._autoSize, this._size, this._sizePixel, this._minSizePixel, this._minSizePercent);
    };
    SplitAreaDirective.prototype.ngOnInit = function () {
        this.split.addArea(this, this._order, this._autoSize, this._size, this._sizePixel, this._minSizePixel, this._minSizePercent);
    };
    SplitAreaDirective.prototype.lockEvents = function () {
        this.eventsLockFct.push(this.renderer.listen(this.elementRef.nativeElement, 'selectstart', function (e) { return false; }));
        this.eventsLockFct.push(this.renderer.listen(this.elementRef.nativeElement, 'dragstart', function (e) { return false; }));
    };
    SplitAreaDirective.prototype.unlockEvents = function () {
        while (this.eventsLockFct.length > 0) {
            var fct = this.eventsLockFct.pop();
            if (fct) {
                fct();
            }
        }
    };
    SplitAreaDirective.prototype.setStyle = function (key, value) {
        this.renderer.setElementStyle(this.elementRef.nativeElement, key, value);
    };
    SplitAreaDirective.prototype.ngOnDestroy = function () {
        this.split.removeArea(this);
    };
    SplitAreaDirective.prototype.onTransitionEnd = function (evt) {
        // Limit only flex-basis transition to trigger the event
        if (evt.propertyName === 'flex-basis')
            this.split.notify('visibleTransitionEnd');
    };
    return SplitAreaDirective;
}());
SplitAreaDirective.decorators = [
    { type: _angular_core.Directive, args: [{
                selector: 'split-area',
                host: {
                    '[style.flex-grow]': '"0"',
                    '[style.flex-shrink]': '"0"',
                    '[style.overflow-x]': '"hidden"',
                    '[style.overflow-y]': '"auto"',
                    '[style.height]': '"100%"',
                    '[class.hided]': '!visible',
                    '(transitionend)': 'onTransitionEnd($event)'
                }
            },] },
];
/** @nocollapse */
SplitAreaDirective.ctorParameters = function () { return [
    { type: _angular_core.ElementRef, },
    { type: _angular_core.Renderer, },
    { type: SplitComponent, },
]; };
SplitAreaDirective.propDecorators = {
    'order': [{ type: _angular_core.Input },],
    'autoSize': [{ type: _angular_core.Input },],
    'size': [{ type: _angular_core.Input },],
    'sizePixel': [{ type: _angular_core.Input },],
    'minSizePixel': [{ type: _angular_core.Input },],
    'minSizePercent': [{ type: _angular_core.Input },],
    'visible': [{ type: _angular_core.Input },],
};

var SplitGutterDirective = (function () {
    function SplitGutterDirective(elementRef, renderer) {
        this.elementRef = elementRef;
        this.renderer = renderer;
        this._disabled = false;
    }
    Object.defineProperty(SplitGutterDirective.prototype, "order", {
        set: function (v) {
            this.setStyle('order', v);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitGutterDirective.prototype, "direction", {
        set: function (v) {
            this._direction = v;
            this.refreshStyle();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitGutterDirective.prototype, "size", {
        set: function (v) {
            this._size = v;
            this.refreshStyle();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SplitGutterDirective.prototype, "disabled", {
        set: function (v) {
            this._disabled = v;
            this.refreshStyle();
        },
        enumerable: true,
        configurable: true
    });
    SplitGutterDirective.prototype.refreshStyle = function () {
        this.setStyle('flex-basis', this._size + "px");
        // fix safari bug about gutter height when direction is horizontal
        this.setStyle('height', (this._direction === 'vertical') ? this._size + "px" : "100%");
        var state = (this._disabled === true) ? 'disabled' : this._direction;
        this.setStyle('cursor', this.getCursor(state));
        this.setStyle('background-image', "url(\"" + this.getImage(state) + "\")");
    };
    SplitGutterDirective.prototype.setStyle = function (key, value) {
        this.renderer.setElementStyle(this.elementRef.nativeElement, key, value);
    };
    SplitGutterDirective.prototype.getCursor = function (state) {
        switch (state) {
            case 'disabled':
                return 'default';
            case 'vertical':
                return 'row-resize';
            case 'horizontal':
                return 'col-resize';
        }
    };
    SplitGutterDirective.prototype.getImage = function (state) {
        switch (state) {
            case 'disabled':
                return '';
            case 'vertical':
                return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAFCAMAAABl/6zIAAAABlBMVEUAAADMzMzIT8AyAAAAAXRSTlMAQObYZgAAABRJREFUeAFjYGRkwIMJSeMHlBkOABP7AEGzSuPKAAAAAElFTkSuQmCC';
            case 'horizontal':
                return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg==';
        }
    };
    return SplitGutterDirective;
}());
SplitGutterDirective.decorators = [
    { type: _angular_core.Directive, args: [{
                selector: 'split-gutter'
            },] },
];
/** @nocollapse */
SplitGutterDirective.ctorParameters = function () { return [
    { type: _angular_core.ElementRef, },
    { type: _angular_core.Renderer, },
]; };
SplitGutterDirective.propDecorators = {
    'order': [{ type: _angular_core.Input },],
    'direction': [{ type: _angular_core.Input },],
    'size': [{ type: _angular_core.Input },],
    'disabled': [{ type: _angular_core.Input },],
};

var AngularSplitModule = (function () {
    function AngularSplitModule() {
    }
    return AngularSplitModule;
}());
AngularSplitModule.decorators = [
    { type: _angular_core.NgModule, args: [{
                imports: [
                    _angular_common.CommonModule
                ],
                declarations: [
                    SplitComponent,
                    SplitAreaDirective,
                    SplitGutterDirective
                ],
                exports: [
                    SplitComponent,
                    SplitAreaDirective,
                    SplitGutterDirective
                ]
            },] },
];
/** @nocollapse */
AngularSplitModule.ctorParameters = function () { return []; };

exports.AngularSplitModule = AngularSplitModule;
exports.SplitComponent = SplitComponent;
exports.SplitAreaDirective = SplitAreaDirective;
exports.SplitGutterDirective = SplitGutterDirective;

Object.defineProperty(exports, '__esModule', { value: true });

})));
