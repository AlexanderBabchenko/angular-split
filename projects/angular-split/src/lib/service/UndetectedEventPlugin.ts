import { Injectable} from '@angular/core';
import { EventManager} from '@angular/platform-browser';

/**
 * Credit to Michael Strobel from:
 * https://github.com/kryops/ng2-events
 */
@Injectable()
export class UndetectedEventPlugin {
    manager: EventManager;

    supports(eventName: string): boolean {
        console.log('SUPPROT ? eventName', eventName)
        return eventName.indexOf('undetected.') === 0;
    }

    addEventListener(element: HTMLElement, eventName: string, handler: Function): Function {
        console.log('addEventListener > eventName', eventName)
        const realEventName = eventName.slice(11);

        return this.manager.getZone().runOutsideAngular(() => this.manager.addEventListener(element, realEventName, handler));
    }
}