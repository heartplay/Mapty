'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const btnDeleteAllWork = document.querySelector(`.btn--delete-all-workouts`);

class App {
    // Loaded leaflet map
    #map;
    // Click event on leaflet map
    #mapEvent;
    // Workout array
    #workouts = [];
    // Zoom level on map
    #mapZoomLevel = 15;
    #markers = [];
    constructor() {
        // Get from local storage all workouts
        this._getLocalStorage();
        // Show delete all workouts button if workouts array is not empty
        if (this.#workouts.length) btnDeleteAllWork.classList.remove(`hidden`);
        // Get position
        this._getPosition();
        // Set event listeners
        // Event listener for submit on input form
        form.addEventListener(`submit`, this._newWorkout.bind(this));
        // Toggling cadence/elevation inputs after selecting running/cycling
        inputType.addEventListener(`change`, this._toggleCadenceElevationInput);
        // Click handler for workouts container
        containerWorkouts.addEventListener(`click`, this._workClickHandler.bind(this));
        // Delete all workouts
        btnDeleteAllWork.addEventListener(`click`, this._deleteAllWorkouts.bind(this));
        // Hide form on pressing "Esc" button
        document.addEventListener(`keydown`, (e) => {
            if (e.key == `Escape` && !form.classList.contains(`hidden`)) this._hideForm();
        });
        document.addEventListener(`keydown`, (e) => {
            if (e.key == `Delete`) this.reset();
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
        // Getting latitude and longitude from geolocation coordinates
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
        // Render all workout markers from local storage
        this.#workouts.forEach((workout) => {
            this._renderWorkoutMarker(workout);
        });
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
        // form.style.display = `none`;
        form.classList.add(`hidden`);
        // setTimeout(() => (form.style.display = `grid`), 1000);
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

        // Set local storage for all workouts
        this._setLocalStorage();

        // Show delete all workouts button if hidden
        if (btnDeleteAllWork.classList.contains(`hidden`)) btnDeleteAllWork.classList.remove(`hidden`);
    }

    // Rendering workout marker on map
    _renderWorkoutMarker(workout) {
        // Putting marker on map according to coordinates
        const marker = L.marker(workout.coords)
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
        // Add new marker on markers array
        this.#markers.push(marker);
    }

    // Rendering workout on list in form
    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <button class="btn--delete-workout">&times;</button>
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

    // Handler for workout container
    _workClickHandler(e) {
        // Select clicked element
        const targetElement = e.target.closest(`.workout`);
        // Guard clause
        if (!targetElement) return;
        // Find workout according to clicked element
        const workout = this.#workouts.find((work) => work.id == targetElement.dataset.id);
        // If delete button is clicked
        if (e.target.classList.contains(`btn--delete-workout`)) {
            this._deleteWorkout.call(this, targetElement, workout);
            // Focusing map view on workout marker
        } else {
            this._moveToWorkout.call(this, workout);
        }
    }

    // Delete workout from list, locale storage, array and delete workout marker from map and array
    _deleteWorkout(targetElement, workout) {
        // Find index of workout
        const workInd = this.#workouts.indexOf(workout);
        // Find workout marker on map
        const workMark = this.#markers.find((mark) => {
            const { lat, lng } = mark._latlng;
            if (lat == workout.coords[0] && lng == workout.coords[1]) return mark;
        });
        // Find index of workout marker
        const workMarkInd = this.#markers.indexOf(workMark);
        // Find all next siblings of deleted workout
        const siblings = this._getWorkoutNextSiblings(targetElement);

        // Delete workout from array
        this.#workouts.splice(workInd, 1);
        // Delete workout marker from map
        this.#map.removeLayer(workMark);
        // Delete workout marker from array
        this.#markers.splice(workMarkInd, 1);
        // Set local storage for remaining workouts
        this._setLocalStorage();

        // Delete workout animation
        targetElement.classList.add('workout--deleting');
        // Animate hiding delete all workouts button
        if (!this.#workouts.length) btnDeleteAllWork.classList.add(`btn--delete-all-workouts--deleting`);
        // Deleted workout next siblings animation
        if (siblings) {
            // Calc offset for animation
            const margin = Number.parseFloat(getComputedStyle(targetElement).marginBottom);
            const offset = targetElement.offsetHeight + margin;
            // Animation for each deleted element sibling
            siblings.forEach((sibling) => {
                // Reposition
                sibling.style.transform = `translateY(-${offset}px)`;
                // Add class for animation
                sibling.classList.add('workout--shifting');
            });
        }

        // Delete workout after delete animation
        setTimeout(() => {
            // Delete workout element in list
            targetElement.remove();
            // Hide delete all workouts button if no workouts
            if (!this.#workouts.length) {
                btnDeleteAllWork.classList.remove(`btn--delete-all-workouts--deleting`);
                btnDeleteAllWork.classList.add(`hidden`);
            }
            // End of animation for deleted workout siblings
            if (siblings) {
                siblings.forEach((sibling) => {
                    sibling.style.transform = '';
                    sibling.classList.remove('workout--shifting');
                });
            }
        }, 500);
    }

    _getWorkoutNextSiblings(targetElement) {
        const nextSibling = targetElement.nextElementSibling;
        if (!nextSibling) return null;
        let nextSiblings = [...containerWorkouts.querySelectorAll(`.workout`)].reduce(
            (acc, el) => {
                if (el == acc.at(-1).nextElementSibling) acc.push(el);
                return acc;
            },
            [nextSibling]
        );
        return nextSiblings;
    }

    // Delete all workouts
    _deleteAllWorkouts() {
        if (confirm(`Are you sure you want to delete all workouts?`)) {
            // Delete all workouts animation
            const removedElements = containerWorkouts.querySelectorAll(`.workout`);
            removedElements.forEach((el) => el.classList.add('workout--deleting'));
            btnDeleteAllWork.classList.add(`btn--delete-all-workouts--deleting`);

            // Delete all workout markers on map
            this.#markers.forEach((marker) => this.#map.removeLayer(marker));

            // Delete all workout markers from array
            this.#markers = [];
            // Delete all workouts
            this.#workouts = [];
            // Delete local storage
            localStorage.removeItem(`workouts`);

            setTimeout(() => {
                // Delete all workout elements from list
                removedElements.forEach((el) => el.remove());
                // Hide delete all button
                btnDeleteAllWork.classList.remove(`btn--delete-all-workouts--deleting`);
                btnDeleteAllWork.classList.add(`hidden`);
            }, 500);
        }
    }

    // Focusing on clicked workout in list
    _moveToWorkout(workout) {
        // Focusing map view on workout marker
        this.#map.setView(workout.coords, this.#mapZoomLevel + 1, {
            animate: true, // Animation of focusing
            pan: {
                duration: 1, // Duration of animation
            },
        });

        workout.click();
    }

    // Set local storage for all workouts
    _setLocalStorage() {
        localStorage.setItem(`workouts`, JSON.stringify(this.#workouts));
    }

    // Get local storage with all workouts
    _getLocalStorage() {
        // Converting strings from locale storage to workout objects
        const data = JSON.parse(localStorage.getItem(`workouts`));

        // Guard clause
        if (!data) return;

        // Re-create workout objects
        this._recreateWorkouts(data);

        // Render all workouts from local storage in list
        this.#workouts.forEach((workout) => {
            this._renderWorkout(workout);
        });
    }

    // Re-creating workout objects from local storage
    _recreateWorkouts(data) {
        let workout;
        data.forEach((el) => {
            // Re-creating running workout
            if (el.type == `running`) {
                workout = new Running(el.coords, el.distance, el.duration, el.cadence, el.id, el.date);
            }
            // Re-creating cycling workout
            if (el.type == `cycling`) {
                workout = new Cycling(el.coords, el.distance, el.duration, el.elevationGain, el.id, el.date);
            }
            // Add workout object to workout array
            this.#workouts.push(workout);
        });
    }

    // Delete local storage for workouts
    reset() {
        // Delete local storage
        localStorage.removeItem(`workouts`);
        // Reload page
        location.reload();
    }
}

// Workout class
class Workout {
    // Testing
    clicks = 0;
    constructor(coords, distance, duration, id = crypto.randomUUID(), date = new Date().toISOString()) {
        // Workout coords, latitude and longitude
        this.coords = coords;
        // Workout distance in km
        this.distance = distance;
        // Workout duration in min
        this.duration = duration;
        // Workout id
        this.id = id;
        // Workout date
        this.date = date;
    }

    // Setting formatted description string for workout
    _setDescription() {
        // Formatted months for description string
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        // Convert ISO string date to normal date
        const workoutDate = new Date(this.date);
        // Setting description for workout
        this.description = `${this.type.at(0).toUpperCase()}${this.type.slice(1)} on ${months.at(
            workoutDate.getMonth()
        )} ${workoutDate.getDate()}`;
    }

    // Testing
    click() {
        this.clicks++;
        console.log(this.clicks);
    }
}

// Running workout class
class Running extends Workout {
    // Workout type running
    type = `running`;
    constructor(coords, distance, duration, cadence, id, date) {
        super(coords, distance, duration, id, date);
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
    constructor(coords, distance, duration, elevationGain, id, date) {
        super(coords, distance, duration, id, date);
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

// FUTURE FEATURES

// EASY
// 1) Edit a workout
// 2) Delete a workout   -
// 3) Delete all workouts   -
// 4) Sort all workouts by certain parameter
// 5) Re-build workout objects from local storage  -
// 6) More realistic error and confirmation messages

// HARD
// 1) Position map to show all workouts
// 2) Draw lines and shapes instead of points

// AFTER ASYNC JS
// 1) Geocode location from coordinates
// 2) Display weather data for workout time and place
