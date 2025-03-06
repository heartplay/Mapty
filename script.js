'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
    // Loaded leaflet map
    #map;
    // Click event on leaflet map
    #mapEvent;
    // Workout array
    #workouts = [];
    // Zoom level on map
    #mapZoomLevel = 15;
    constructor() {
        this._getPosition();
        // Event listener for submit on input form
        form.addEventListener(`submit`, this._newWorkout.bind(this));
        // Toggling cadence/elevation inputs after selecting running/cycling
        inputType.addEventListener(`change`, this._toggleCadenceElevationInput);
        // Focusing on clicked workout
        containerWorkouts.addEventListener(`click`, this._moveToWorkout.bind(this));
        // Hide form on pressing "Esc" button
        document.addEventListener(`keydown`, (e) => {
            if (e.key == `Escape` && !form.classList.contains(`hidden`)) this._hideForm();
        });
    }

    // Getting coordinates and loading map according to coordinates
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

    // Loading map on page
    _loadMap(position) {
        // Getting latutude and longitude from geolocation coordinates
        const { latitude, longitude } = position.coords;
        // Loading leaflet styled map according to coordinates
        this.#map = L.map('map', { attributionControl: false }).setView([latitude, longitude], this.#mapZoomLevel);
        // Link to leaflet and openstreetmap
        L.control.attribution().setPrefix('<a href="https://leafletjs.com/">Leaflet</a>').addTo(this.#map);
        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(this.#map);
        // Leaflet event listener method for click on map
        this.#map.on(`click`, this._showForm.bind(this));
    }

    // Show input form after clicking on map
    _showForm(mapE) {
        // Getting leaflet event object
        this.#mapEvent = mapE;
        // Show form with inputs
        form.classList.remove(`hidden`);
        // Focus on distance input
        inputDistance.focus();
    }

    _hideForm() {
        // Clear all inputs
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = ``;

        // Hide input form
        form.style.display = `none`;
        form.classList.add(`hidden`);
        setTimeout(() => (form.style.display = `grid`), 1000);
    }

    // Toggling input
    _toggleCadenceElevationInput() {
        // Toggling cadence/elevation inputs
        inputCadence.closest(`.form__row`).classList.toggle(`form__row--hidden`);
        inputElevation.closest(`.form__row`).classList.toggle(`form__row--hidden`);
        // Focus on distance input
        inputDistance.focus();
    }

    // Getting workout and rendering
    _newWorkout(e) {
        // Prevent from reload page after submitting
        e.preventDefault();
        // Handler functions for checking data
        const validInputs = (...inputs) => inputs.every((input) => Number.isFinite(input));
        const allPositive = (...inputs) => inputs.every((input) => input > 0);

        // Get data from form(workout type, distance, duration, location)
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        // Getting coordinates of click on map
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;

        // If workout running, create running object
        if (type === `running`) {
            const cadence = +inputCadence.value;
            // Check if data is valid
            if (!(validInputs(distance, duration, cadence) && allPositive(distance, duration, cadence))) {
                return alert(`Inputs have to be positive numbers!`);
            }
            workout = new Running([lat, lng], distance, duration, cadence);
        }

        // If workout cycling, create cycling object
        if (type === `cycling`) {
            const elevation = +inputElevation.value;
            // Check if data is valid
            if (!(validInputs(distance, duration, elevation) && allPositive(distance, duration))) {
                return alert(`Inputs have to be positive numbers!`);
            }
            workout = new Cycling([lat, lng], distance, duration, elevation);
        }

        // Add new object to workout array
        this.#workouts.push(workout);

        // Render workout on map as marker
        this._renderWorkoutMarker(workout);

        // Render workout on list
        this._renderWorkout(workout);

        // Hide form, clear inputs
        this._hideForm();
    }

    // Rendering workout marker on map
    _renderWorkoutMarker(workout) {
        // Putting marker on map according to coordinates
        L.marker(workout.coords)
            .addTo(this.#map)
            .bindPopup(
                L.popup({
                    maxWidth: 250, // max width of mark popup
                    minWidth: 100, // min width of mark popup
                    autoClose: false, // prevent closing popup when another popup is opened
                    closeOnClick: false, // prevent closing popup when click on map
                    className: `${workout.type}-popup`, // assigning css class name to popup according to workout type
                })
            )
            .setPopupContent(`${workout.type == `running` ? `🏃‍♂️` : `🚴‍♀️`} ${workout.description}`) // setting popup content
            .openPopup();
    }

    // Rendering workout on list in form
    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type == `running` ? `🏃‍♂️` : `🚴‍♀️`}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏲️</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
        `;
        if (workout.type == `running`) {
            html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">👟</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
            `;
        }
        if (workout.type == `cycling`) {
            html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🏔️</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
            `;
        }
        form.insertAdjacentHTML(`afterend`, html);
    }

    // Focusing on clicked workout in list
    _moveToWorkout(e) {
        // Select clicked element
        const workoutElement = e.target.closest(`.workout`);
        // Guard clause
        if (!workoutElement) return;
        // Find workout according to clicked element
        const workout = this.#workouts.find((work) => work.id == workoutElement.dataset.id);
        // Focusing map view on workout marker
        this.#map.setView(workout.coords, this.#mapZoomLevel + 1, {
            animate: true, // Animation of focusing
            pan: {
                duration: 1, // Duration of animation
            },
        });
    }
}

// Workout class
class Workout {
    // Workout date
    date = new Date();
    // Workout id
    id = crypto.randomUUID();
    constructor(coords, distance, duration) {
        // Workout coords, latitude and longitude
        this.coords = coords;
        // Workout distance in km
        this.distance = distance;
        // Workout duration in min
        this.duration = duration;
    }

    // Setting formatted description string for workout
    _setDescription() {
        // Formatted months for description string
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        // Setting description for workout
        this.description = `${this.type.at(0).toUpperCase()}${this.type.slice(1)} on ${months.at(
            this.date.getMonth()
        )} ${this.date.getDate()}`;
    }
}

// Running workout class
class Running extends Workout {
    // Workout type running
    type = `running`;
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        // Running workout cadence
        this.cadence = cadence;
        // Running workout pace
        this.calcPace();
        // Running workout description
        this._setDescription();
    }

    // Calculate pace, min/km
    calcPace() {
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

// Cycling workout class
class Cycling extends Workout {
    // Workout type cycling
    type = `cycling`;
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        // Cycling workout elevation
        this.elevationGain = elevationGain;
        // Cycling workout speed
        this.calcSpeed();
        // Cycling workout description
        this._setDescription();
    }

    // Calculate speed, km/h
    calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

// Init app
const app = new App();
