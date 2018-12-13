import { Component, Input, Output, ChangeDetectionStrategy, ChangeDetectorRef, Renderer2, AfterViewInit, OnDestroy, ElementRef, NgZone, ViewChildren, QueryList } from '@angular/core';
import { Observable, Subscriber, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { IArea, IPoint, ISplitSnapshot, IAreaSnapshot, ISplitSideAbsorptionCapacity, IOutputData, IOutputAreaSizes } from '../interface';
import { SplitAreaDirective } from '../directive/splitArea.directive';
import { getInputPositiveNumber, getInputBoolean, getPointFromEvent, getElementPixelSize, getAreaAbsorptionCapacity, updateAreaSize, isUserSizesValid } from '../utils';

/**
 * angular-split
 * 
 * Areas size are set in percentage of the split container.
 * Gutters size are set in pixels.
 * 
 * So we set css 'flex-basis' property like this (where 0 <= area.size <= 1): 
 *  calc( { area.size * 100 }% - { area.size * nbGutter * gutterSize }px );
 * 
 * Examples with 3 visible areas and 2 gutters: 
 * 
 * |                     10px                   10px                                  |
 * |---------------------[]---------------------[]------------------------------------|
 * |  calc(20% - 4px)          calc(20% - 4px)              calc(60% - 12px)          |
 * 
 * 
 * |                          10px                        10px                        |
 * |--------------------------[]--------------------------[]--------------------------|
 * |  calc(33.33% - 6.667px)      calc(33.33% - 6.667px)      calc(33.33% - 6.667px)  |
 * 
 * 
 * |10px                                                  10px                        |
 * |[]----------------------------------------------------[]--------------------------|
 * |0                 calc(66.66% - 13.333px)                  calc(33%% - 6.667px)   |
 * 
 * 
 *  10px 10px                                                                         |
 * |[][]------------------------------------------------------------------------------|
 * |0 0                               calc(100% - 20px)                               |
 * 
 */

@Component({
    selector: 'as-split',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: [`./split.component.scss`],
    template: `
        <ng-content></ng-content>
        <ng-template ngFor [ngForOf]="displayedAreas" let-index="index" let-last="last">
            <div *ngIf="last === false" 
                 #gutterEls
                 class="as-split-gutter"
                 [style.flex-basis.px]="gutterSize"
                 [style.order]="index*2+1"
                 (undetected.click)="clickGutter($event, index+1)"
                 (undetected.mousedown)="startDragging($event, index*2+1, index+1)"
                 (undetected.touchstart)="startDragging($event, index*2+1, index+1)">
                <div class="as-split-gutter-icon"></div>
            </div>
        </ng-template>`,
})
export class SplitComponent implements AfterViewInit, OnDestroy {

    private _direction: 'horizontal' | 'vertical' = 'horizontal';

    @Input() set direction(v: 'horizontal' | 'vertical') {
        this._direction = (v === 'vertical') ? 'vertical' : 'horizontal';
        
        this.renderer.addClass(this.elRef.nativeElement, `is-${ this._direction }`);
        this.renderer.removeClass(this.elRef.nativeElement, `is-${ (this._direction === 'vertical') ? 'horizontal' : 'vertical' }`);
        
        this.build(false, false);
    }
    
    get direction(): 'horizontal' | 'vertical' {
        return this._direction;
    }
    
    ////

    private _unit: 'percent' | 'pixel' = 'percent';

    @Input() set unit(v: 'percent' | 'pixel') {
        this._unit = (v === 'pixel') ? 'pixel' : 'percent';
        
        this.renderer.addClass(this.elRef.nativeElement, `is-${ this._unit }`);
        this.renderer.removeClass(this.elRef.nativeElement, `is-${ (this._unit === 'pixel') ? 'percent' : 'pixel' }`);
        
        this.build(false, true);
    }
    
    get unit(): 'percent' | 'pixel' {
        return this._unit;
    }
    
    ////

    private _gutterSize: number = 11;

    @Input() set gutterSize(v: number | null) {
        this._gutterSize = getInputPositiveNumber(v, 11);

        this.build(false, false);
    }
    
    get gutterSize(): number {
        return this._gutterSize;
    }
    
    ////

    private _gutterStep: number = 1;

    @Input() set gutterStep(v: number) {
        this._gutterStep = getInputPositiveNumber(v, 1);
    }
    
    get gutterStep(): number {
        return this._gutterStep;
    }
    
    ////

    private _useTransition: boolean = false;

    @Input() set useTransition(v: boolean) {
        this._useTransition = getInputBoolean(v);

        if(this._useTransition) this.renderer.addClass(this.elRef.nativeElement, 'is-transition');
        else                    this.renderer.removeClass(this.elRef.nativeElement, 'is-transition');
    }
    
    get useTransition(): boolean {
        return this._useTransition;
    }
    
    ////

    private _disabled: boolean = false;
    
    @Input() set disabled(v: boolean) {
        this._disabled = getInputBoolean(v);

        if(this._disabled)  this.renderer.addClass(this.elRef.nativeElement, 'is-disabled');
        else                this.renderer.removeClass(this.elRef.nativeElement, 'is-disabled');
    }
    
    get disabled(): boolean {
        return this._disabled;
    }

    ////

    private _dir: 'ltr' | 'rtl' = 'ltr';
    
    @Input() set dir(v: 'ltr' | 'rtl') {
        this._dir = (v === 'rtl') ? 'rtl' : 'ltr';
        
        this.renderer.setAttribute(this.elRef.nativeElement, 'dir', this._dir);
    }
    
    get dir(): 'ltr' | 'rtl' {
        return this._dir;
    }

    ////

    private dragStartSubscriber: Subscriber<IOutputData>
    @Output() get dragStart(): Observable<IOutputData> {
        return new Observable(subscriber => this.dragStartSubscriber = subscriber);
    }

    private dragEndSubscriber: Subscriber<IOutputData>
    @Output() get dragEnd(): Observable<IOutputData> {
        return new Observable(subscriber => this.dragEndSubscriber = subscriber);
    }

    private gutterClickSubscriber: Subscriber<IOutputData>
    @Output() get gutterClick(): Observable<IOutputData> {
        return new Observable(subscriber => this.gutterClickSubscriber = subscriber);
    }

    private transitionEndSubscriber: Subscriber<IOutputAreaSizes>
    @Output() get transitionEnd(): Observable<IOutputAreaSizes> {
        return new Observable(subscriber => this.transitionEndSubscriber = subscriber).pipe(
            debounceTime<IOutputAreaSizes>(20)
        );
    }
    
    private dragProgressSubject: Subject<IOutputData> = new Subject();
    dragProgress$: Observable<IOutputData> = this.dragProgressSubject.asObservable();

    ////

    private isDragging: boolean = false;
    private dragListeners: Array<Function> = [];
    private snapshot: ISplitSnapshot | null = null;
    private startPoint: IPoint | null = null;
    private endPoint: IPoint | null = null;

    public readonly displayedAreas: Array<IArea> = [];
    private readonly hidedAreas: Array<IArea> = [];

    @ViewChildren('gutterEls') private gutterEls: QueryList<ElementRef>;

    constructor(private ngZone: NgZone,
                private elRef: ElementRef,
                private cdRef: ChangeDetectorRef,
                private renderer: Renderer2) {
        // To force adding default class, could be override by user @Input() or not
        this.direction = this._direction;
    }

    public ngAfterViewInit() {
        this.ngZone.runOutsideAngular(() => {
            // To avoid transition at first rendering
            setTimeout(() => this.renderer.addClass(this.elRef.nativeElement, 'is-init'));
        });
    }
    
    private getNbGutters(): number {
        return (this.displayedAreas.length === 0) ? 0 : this.displayedAreas.length - 1;
    }

    public addArea(component: SplitAreaDirective): void {
        const newArea: IArea = {
            component, 
            order: 0, 
            size: 0,
            minSize: null,
            maxSize: null,
        };

        if(component.visible === true) {
            this.displayedAreas.push(newArea);

            this.build(true, true);
        }
        else {
            this.hidedAreas.push(newArea);
        }
    }

    public removeArea(component: SplitAreaDirective): void {
        if(this.displayedAreas.some(a => a.component === component)) {
            const area = this.displayedAreas.find(a => a.component === component);
            this.displayedAreas.splice(this.displayedAreas.indexOf(area), 1);

            this.build(true, true);
        }
        else if(this.hidedAreas.some(a => a.component === component)) {
            const area = this.hidedAreas.find(a => a.component === component);
            this.hidedAreas.splice(this.hidedAreas.indexOf(area), 1);
        }
    }

    public updateArea(component: SplitAreaDirective, resetOrders: boolean, resetSizes: boolean): void {
        if(component.visible === true) {
            this.build(resetOrders, resetSizes);
        }
    }

    public showArea(component: SplitAreaDirective): void {
        const area = this.hidedAreas.find(a => a.component === component);
        if(area === undefined) {
            return;
        }

        const areas = this.hidedAreas.splice(this.hidedAreas.indexOf(area), 1);
        this.displayedAreas.push(...areas);

        this.build(true, true);
    }

    public hideArea(comp: SplitAreaDirective): void {
        const area = this.displayedAreas.find(a => a.component === comp);
        if(area === undefined) {
            return;
        }

        const areas = this.displayedAreas.splice(this.displayedAreas.indexOf(area), 1);
        areas.forEach(area => {
            area.order = 0;
            area.size = 0;
        })
        this.hidedAreas.push(...areas);

        this.build(true, true);
    }

    public getVisibleAreaSizes(): IOutputAreaSizes {
        return this.displayedAreas.map(a => a.size || '*');
    }

    public setVisibleAreaSizes(sizes: IOutputAreaSizes): boolean {
        if(sizes.length !== this.displayedAreas.length) {
            return false;
        }

        const formatedSizes = sizes.map(s => getInputPositiveNumber(s, null));
        const isValid = isUserSizesValid(this.unit, formatedSizes);

        if(isValid === false) {
            return false;
        }

        // @ts-ignore
        this.displayedAreas.forEach((area, i) => area.component._size = formatedSizes[i]);

        this.build(false, true);
        return true;
    }

    private build(resetOrders: boolean, resetSizes: boolean): void {
        this.stopDragging();

        // ¤ AREAS ORDER
        
        if(resetOrders === true) {

            // If user provided 'order' for each area, use it to sort them.
            if(this.displayedAreas.every(a => a.component.order !== null)) {
                this.displayedAreas.sort((a, b) => (<number> a.component.order) - (<number> b.component.order));
            }
    
            // Then set real order with multiples of 2, numbers between will be used by gutters.
            this.displayedAreas.forEach((area, i) => {
                area.order = i * 2;
                area.component.setStyleOrder(area.order);
            });
        }

        // ¤ AREAS SIZE
        
        if(resetSizes === true) {
            const useUserSizes = isUserSizesValid(this.unit, this.displayedAreas.map(a => a.component.size));

            switch(this.unit) {
                case 'percent': {
                    const defaultSize = 100 / this.displayedAreas.length;
    
                    this.displayedAreas.forEach(area => {
                        area.size = useUserSizes ? <number> area.component.size : defaultSize;
                        
                        // Set min/max to area.size if size provided 'less than min'/'more than max'
                        area.minSize = (area.component.minSize === null) ? null : (area.component.minSize > area.size ? area.size : area.component.minSize);
                        area.maxSize = (area.component.maxSize === null) ? null : (area.component.maxSize < area.size ? area.size : area.component.maxSize);
                    });
                    break;
                }
                case 'pixel': {
                    if(useUserSizes) {
                        this.displayedAreas.forEach(area => {
                            area.size = area.component.size;
    
                            // Set min/max to area.size if size provided less than min/more than max
                            area.minSize = (area.component.minSize === null) ? null : (area.size !== null && area.component.minSize > area.size ? area.size : area.component.minSize);
                            area.maxSize = (area.component.maxSize === null) ? null : (area.size !== null && area.component.maxSize < area.size ? area.size : area.component.maxSize);
                        });
                    }
                    else {
                        const wildcardSizeAreas = this.displayedAreas.filter(a => a.component.size === null);
    
                        // No wildcard area > Need to select one arbitrarily
                        if(wildcardSizeAreas.length === 0) {
                            
                        }
                        // More than one wildcard area > Need to keep only one arbitrarily
                        else if(wildcardSizeAreas.length > 1) {
    
                        }
                    }
                    break;
                }
            }

            this.refreshStyleSizes();
        }

        this.cdRef.markForCheck();
    }

    private refreshStyleSizes(): void {
        if(this.displayedAreas.length === 1) {
            this.displayedAreas[0].component.setStyleFlex(`0 0 100%`);
        }
        else if(this.unit === 'percent') {
            const sumGutterSize = this.getNbGutters() * this.gutterSize;
            
            this.displayedAreas.forEach(area => {
                area.component.setStyleFlex(`0 0 calc( ${ area.size }% - ${ <number> area.size / 100 * sumGutterSize }px )`);
            });
        }
        else if(this.unit === 'pixel') {
            this.displayedAreas.forEach(area => {
                if(area.size === null) {
                    area.component.setStyleFlex(`1 1 auto`);
                }
                else {
                    area.component.setStyleFlex(`0 0 ${ area.size }px`);
                }
            });
        }
        
        // TODO add or remove is-min / is-max CSS classes
        this.displayedAreas.forEach(area => {
            //
        });
    }

    public clickGutter(event: MouseEvent, gutterNum: number): void {
        event.preventDefault();
        event.stopPropagation();

        if(this.startPoint && this.startPoint.x === event.clientX && this.startPoint.y === event.clientY) {
            this.notify('click', gutterNum);
        }
    }

    public startDragging(event: MouseEvent | TouchEvent, gutterOrder: number, gutterNum: number): void {
        event.preventDefault();
        event.stopPropagation();

        this.startPoint = getPointFromEvent(event);
        if(this.startPoint === null || this.disabled === true) {
            return;
        }

        this.snapshot = {
            gutterNum,
            lastSteppedOffset: 0,
            containerSizePixel: getElementPixelSize(this.elRef, this.direction),
            areasBeforeGutter: [],
            areasAfterGutter: [],
        };

        this.displayedAreas.forEach(area => {
            const areaSnapshot: IAreaSnapshot = {
                area,
                sizePixelAtStart: getElementPixelSize(area.component.elRef, this.direction),
                sizePercentAtStart: area.size // If pixel mode, anyway, will not be used.
            };

            if(area.order < gutterOrder) {
                this.snapshot.areasBeforeGutter.unshift(areaSnapshot);
            }
            else if(area.order > gutterOrder) {
                this.snapshot.areasAfterGutter.push(areaSnapshot);
            }
        });
        
        if(this.snapshot.areasBeforeGutter.length === 0 || this.snapshot.areasAfterGutter.length === 0) {
            return;
        }

        this.ngZone.runOutsideAngular(() => {
            this.dragListeners.push( this.renderer.listen('document', 'mouseup', this.stopDragging.bind(this)) );
            this.dragListeners.push( this.renderer.listen('document', 'touchend', this.stopDragging.bind(this)) );
            this.dragListeners.push( this.renderer.listen('document', 'touchcancel', this.stopDragging.bind(this)) );
            
            this.dragListeners.push( this.renderer.listen('document', 'mousemove', this.dragEvent.bind(this)) );
            this.dragListeners.push( this.renderer.listen('document', 'touchmove', this.dragEvent.bind(this)) );
        });

        this.displayedAreas.forEach(area => area.component.lockEvents());

        this.isDragging = true;
        this.renderer.addClass(this.elRef.nativeElement, 'is-dragging');
        this.renderer.addClass(this.gutterEls.toArray()[this.snapshot.gutterNum - 1].nativeElement, 'is-dragged');
        
        this.notify('start', this.snapshot.gutterNum);
    }

    private dragEvent(event: MouseEvent | TouchEvent): void {
        event.preventDefault();
        event.stopPropagation();

        if(this.isDragging === false) {
            return;
        }

        this.endPoint = getPointFromEvent(event);
        if(this.endPoint === null) {
            return;
        }

        // Calculate steppedOffset

        let offset = (this.direction === 'horizontal') ? (this.startPoint.x - this.endPoint.x) : (this.startPoint.y - this.endPoint.y);
        if(this.dir === 'rtl') {
            offset = -offset;
        }
        const steppedOffset = Math.round(offset / this.gutterStep) * this.gutterStep;

        if(steppedOffset === this.snapshot.lastSteppedOffset) {
            return;
        }

        this.snapshot.lastSteppedOffset = steppedOffset;
        
        // Need to know if each gutter side areas could reacts to steppedOffset

        const areasBefore: ISplitSideAbsorptionCapacity = this.snapshot.areasBeforeGutter.reduce((acc, area) => {
            const res = getAreaAbsorptionCapacity(this.unit, area, acc.remain, this.snapshot.containerSizePixel);
            acc.list.push(res);
            acc.remain  = res.pixelRemain;
            return acc;
        }, {remain: -steppedOffset, list: []});

        const areasAfter: ISplitSideAbsorptionCapacity = this.snapshot.areasAfterGutter.reduce((acc, area) => {
            const res = getAreaAbsorptionCapacity(this.unit, area, acc.remain, this.snapshot.containerSizePixel);
            acc.list.push(res);
            acc.remain  = res.pixelRemain;
            return acc;
        }, {remain: steppedOffset, list: []});

        // Now we know areas could absorb steppedOffset, time to really update sizes

        console.log('A', areasBefore.list[0].pixelAbsorb, areasBefore.list[0].percentAfterAbsorption);
        console.log('B', areasAfter.list[0].pixelAbsorb, areasAfter.list[0].percentAfterAbsorption);
        areasBefore.list.forEach(item => updateAreaSize(this.unit, item));
        areasAfter.list.forEach(item => updateAreaSize(this.unit, item));

        this.refreshStyleSizes();
        this.notify('progress', this.snapshot.gutterNum);
    }

    private stopDragging(event?: Event): void {
        if(event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        if(this.isDragging === false) {
            return;
        }
        
        this.displayedAreas.forEach(area => area.component.unlockEvents());
        
        while(this.dragListeners.length > 0) {
            const fct = this.dragListeners.pop();
            if(fct) fct();
        }
        
        // If moved from starting point, notify end
        if(event && this.endPoint && (this.startPoint.x !== this.endPoint.x || this.startPoint.y !== this.endPoint.y)) {
            this.notify('end', this.snapshot.gutterNum);
        }
        
        this.renderer.removeClass(this.elRef.nativeElement, 'is-dragging');
        this.renderer.removeClass(this.gutterEls.toArray()[this.snapshot.gutterNum - 1].nativeElement, 'is-dragged');
        this.isDragging = false;
        this.snapshot = null;

        // Needed to let (click)="clickGutter(...)" event run and verify if mouse moved or not
        this.ngZone.runOutsideAngular(() => {
            setTimeout(() => {
                this.startPoint = null;
                this.endPoint = null;
            })
        });
    }

    public notify(type: 'start' | 'progress' | 'end' | 'click' | 'transitionEnd', gutterNum: number): void {
        const sizes = this.getVisibleAreaSizes();

        if(type === 'start') {
            if(this.dragStartSubscriber) {
                this.ngZone.run(() => this.dragStartSubscriber.next({gutterNum, sizes}));
            }
        }
        else if(type === 'end') {
            if(this.dragEndSubscriber) {
                this.ngZone.run(() => this.dragEndSubscriber.next({gutterNum, sizes}));
            }
        }
        else if(type === 'click') {
            if(this.gutterClickSubscriber) {
                this.ngZone.run(() => this.gutterClickSubscriber.next({gutterNum, sizes}));
            }
        }
        else if(type === 'transitionEnd') {
            if(this.transitionEndSubscriber) {
                this.ngZone.run(() => this.transitionEndSubscriber.next(sizes));
            }
        }
        else if(type === 'progress') {
            // Stay outside zone to allow users do what they want about change detection mechanism.
            this.dragProgressSubject.next({gutterNum, sizes});
        }
    }

    public ngOnDestroy(): void {
        this.stopDragging();
    }
}
