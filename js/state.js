class AppState {
    constructor() {
        this.matches = [];
        this.members = [];
        this.currentYear = '2026';
        this.currentIndex = 0;
    }
    
    updateYear(year) {
        this.currentYear = year;
        this.notifyObservers('yearChanged', year);
    }
}
