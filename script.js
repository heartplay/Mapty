'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
    #map;
    #mapEvent;
    constructor() {
        this._getPosition();
        form.addEventListener(`submit`, this._newWorkout.bind(this));
        // Toggling cadence/elevation inputs after selecting running/cycling
        inputType.addEventListener(`change`, this._toggleCadenceElevationInput);
    }

    _getPosition() {
        // Browser geolocation API
        if (navigator.geolocation)
            // Getting current coordinates from browser
            navigator.geolocation.getCurrentPosition(
                // If coordinates is recieved
                this._loadMap.bind(this),
                // No coordinates
                () => alert(`Could not get your position.`)
            );
    }

    _loadMap(position) {
        const { latitude, longitude } = position.coords;
        // Loading leaflet styled map according to coordinates
        this.#map = L.map('map', { attributionControl: false }).setView([latitude, longitude], 13);
        // Link to leaflet and openstreetmap
        L.control.attribution().setPrefix('<a href="https://leafletjs.com/">Leaflet</a>').addTo(this.#map);
        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(this.#map);
        // Leaflet event listener method for click on map
        this.#map.on(`click`, this._showForm.bind(this));
    }

    _showForm(mapE) {
        // Getting leaflet event object
        this.#mapEvent = mapE;
        // Show form with inputs
        form.classList.remove(`hidden`);
        // Focus on distance input
        inputDistance.focus();
    }

    _toggleCadenceElevationInput() {
        // Toggling cadence/elevation inputs
        inputCadence.closest(`.form__row`).classList.toggle(`form__row--hidden`);
        inputElevation.closest(`.form__row`).classList.toggle(`form__row--hidden`);
    }

    _newWorkout(e) {
        // Prevent from reload page after submitting
        e.preventDefault();
        // Getting coordinates of click on map
        const { lat, lng } = this.#mapEvent.latlng;
        // Putting marker on map according to coordinates
        L.marker([lat, lng])
            .addTo(this.#map)
            .bindPopup(
                L.popup({
                    maxWidth: 250, // max width of mark popup
                    minWidth: 100, // min width of mark popup
                    autoClose: false, // prevent closing popup when another popup is opened
                    closeOnClick: false, // prevent closing popup when click on map
                    className: `running-popup`, // assigning css class name to popup
                })
            )
            .setPopupContent(`Workout`) // setting popup content
            .openPopup();
        // Clear all inputs after submitting
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = ``;
        inputDistance.focus();
    }
}

// Workout class
class Workout {
    // workout date
    date = new Date();
    // workout id
    id = crypto.randomUUID();
    constructor(coords, distance, duration) {
        // workout coords, latitude and longitude
        this.coords = coords;
        // workout distance in km
        this.distance = distance;
        // workout duration in min
        this.duration = duration;
    }
}

// Running workout class
class Running extends Workout {
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        // running workout cadence
        this.cadence = cadence;
        // running workout pace
        this.calcPace();
    }

    // Calculate pace, min/km
    calcPace() {
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

// Cycling workout class
class Cycling extends Workout {
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        // cycling workout elevation
        this.elevationGain = elevationGain;
        // cycling workout speed
        this.calcSpeed();
    }

    // Calculate speed, km/h
    calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

// Init app
const app = new App();
