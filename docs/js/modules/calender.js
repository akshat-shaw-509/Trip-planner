// js/modules/calender.js
// Calendar Module - Handles Flatpickr initialization and date selection
export class Calender {
    constructor(elementOrId, options = {}) {
        if (typeof elementOrId === 'string') {
            this.element = document.getElementById(elementOrId);
            this.elementId = elementOrId;
        } else {
            this.element = elementOrId;
            this.elementId = this.element && this.element.id ? this.element.id : null;
        }
        this.instance = null;
        this.selectedDates = [];
        this.options = options || {};
    }

    init(overrideOptions = {}) {
        if (!this.element) {
            console.error('Calendar element not found');
            return;
        }

        const today = new Date();
        const isInput = this.element.tagName === 'INPUT' || this.element.tagName === 'TEXTAREA';

        // sensible defaults
        const baseOptions = {
            mode: 'range',
            dateFormat: 'Y-m-d',
            minDate: 'today',
            defaultDate: [today],
            showMonths: 1,
            onChange: (selectedDates, dateStr, instance) => {
                this.selectedDates = selectedDates;
                this.onDateChange(selectedDates, dateStr);
            }
        };

        // adapt for inline vs input
        if (isInput) {
            // Inline false for input, allow altInput for nicer display if desired
            Object.assign(baseOptions, {
                inline: false,
                allowInput: true,
                // keep default date format fine for forms
            });
        } else {
            // for non-input elements (div), use inline calendar
            Object.assign(baseOptions, {
                inline: true
            });
        }

        // merge user options: constructor options -> init override -> call-time override
        const merged = Object.assign({}, baseOptions, this.options || {}, overrideOptions || {});
        this.instance = flatpickr(this.element, merged);

        // keep selectedDates up to date with flatpickr
        this.selectedDates = this.instance.selectedDates || [];

        return this;
    }

    onDateChange(selectedDates, dateStr) {
        // update internal state
        this.selectedDates = selectedDates || [];

        // Dispatch both events for compatibility:
        // 1) Detailed calendarChange with dates array and dateStr
        const calendarChangeEvent = new CustomEvent('calendarChange', {
            detail: { dates: selectedDates, dateStr: dateStr }
        });
        document.dispatchEvent(calendarChangeEvent);

        // 2) Backwards-compatible event many other modules rely on:
        //    'dateSelected' with detail.date being a Date (first selected date or today)
        const firstDate = (selectedDates && selectedDates.length > 0) ? selectedDates[0] : new Date();
        const dateSelectedEvent = new CustomEvent('dateSelected', {
            detail: { date: firstDate }
        });
        // use window.dispatchEvent to match previous file's behavior
        window.dispatchEvent(dateSelectedEvent);
    }

    getSelectedDates() {
        return this.selectedDates || [];
    }

    getSelectedDate() {
        return (this.getSelectedDates()[0] || null);
    }

    clear() {
        if (this.instance) {
            this.instance.clear();
            this.selectedDates = [];
        }
    }

    destroy() {
        if (this.instance) {
            this.instance.destroy();
            this.instance = null;
        }
    }
}

// Helper to init a calendar instance and register it globally.
// Usage: import { initCalendar } from './calender.js'; initCalendar('calender');
export function initCalendar(elementOrId, options) {
    const cal = new Calender(elementOrId, options);
    cal.init();
    // register in a global registry keyed by element id (or generated id)
    if (!window.travelCalendars) window.travelCalendars = {};
    const key = cal.elementId || (`cal-${Object.keys(window.travelCalendars).length + 1}`);
    window.travelCalendars[key] = cal;
    return cal;
}

// small compatibility helpers (do not overwrite if already present)
if (!window.initCalendar) {
    window.initCalendar = initCalendar;
}
if (!window.getSelectedDate) {
    window.getSelectedDate = function (elementId) {
        if (elementId && window.travelCalendars && window.travelCalendars[elementId]) {
            return window.travelCalendars[elementId].getSelectedDate() || new Date();
        }
        // fallback to the first registered calendar
        const keys = window.travelCalendars ? Object.keys(window.travelCalendars) : [];
        if (keys.length > 0) {
            const cal = window.travelCalendars[keys[0]];
            return cal.getSelectedDate() || new Date();
        }
        return new Date();
    };
}