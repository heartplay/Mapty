'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const btnDeleteAllWork = document.querySelector(`.btn--delete-all-workouts`);
const modal = document.querySelector(`.modal`);
const overlay = document.querySelector(`.overlay`);
const btnCloseModal = document.querySelector(`.btn--close-modal`);
const btnSave = document.querySelector(`.btn--edit-save`);

const inputTypeForm = form.querySelector('.form__input--type');
const inputDistanceForm = form.querySelector('.form__input--distance');
const inputDurationForm = form.querySelector('.form__input--duration');
const inputCadenceForm = form.querySelector('.form__input--cadence');
const inputElevationForm = form.querySelector('.form__input--elevation');

const inputTypeModal = modal.querySelector('.form__input--type');
const inputDistanceModal = modal.querySelector('.form__input--distance');
const inputDurationModal = modal.querySelector('.form__input--duration');
const inputCadenceModal = modal.querySelector('.form__input--cadence');
const inputElevationModal = modal.querySelector('.form__input--elevation');

const sortForm = document.querySelector(`.filter-sort`);
const selectType = sortForm.querySelector(`.filter-sort__select--type`);
const selectSort = sortForm.querySelector(`.filter-sort__select--sort`);

class App {
    // Loaded leaflet map
    #map;
    // Click event on leaflet map
    #mapEvent;
    // Workout array
    #workouts = [];
    // Zoom level on map
    #mapZoomLevel = 15;
    // Workout markers on map
    #markers = [];
    // Current workout for editing/deleting/moving to
    #targetWorkout;
    // Current workout element
    #targetWorkoutElement;

    constructor() {
        // Get from local storage all workouts
        this._getLocalStorage();

        // Get position
        this._getPosition();

        // Show sort workouts form
        if (this.#workouts.length) this._showSort();

        ////////////////// Set event listeners

        // Toggling parameters for sort workouts
        // Sort by workout type
        selectType.addEventListener(`change`, this._selectSort.bind(this));
        // Sort workouts by certain parameter
        selectSort.addEventListener(`change`, this._renderSortedWorkouts.bind(this));

        // Event listener for submit on input form
        form.addEventListener(`submit`, this._newWorkout.bind(this));

        // Toggling cadence/elevation inputs after selecting running/cycling
        inputTypeForm.addEventListener(`change`, (e) => this._toggleCadenceElevationInput(e));
        inputTypeModal.addEventListener(`change`, (e) => this._toggleCadenceElevationInput(e));

        // Delete all workouts button
        btnDeleteAllWork.addEventListener(`click`, this._deleteAllWorkouts.bind(this));

        ////////////////// Set event listener helpers

        // Keydown handler for document
        document.addEventListener(`keydown`, this._documentKeyDownHandler.bind(this));

        // Click handler for document
        document.addEventListener(`click`, this._documentClickHandler.bind(this));

        // Click handler for editing workout form
        modal.addEventListener(`click`, this._modalClickHandler.bind(this));

        // Click handler for workouts container
        containerWorkouts.addEventListener(`click`, this._workClickHandler.bind(this));
    }

    ///////////////////////////////////////////// MAP

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

        // Render all workouts and workout markers sorted by default(all workouts sorted by date)
        if (this.#workouts.length) this._renderDefaultSortWorkouts();
    }

    // Focusing map view on workout marker
    _moveToWorkout() {
        this.#map.setView(this.#targetWorkout.coords, this.#mapZoomLevel + 1, {
            animate: true, // Animation of focusing
            pan: {
                duration: 1, // Duration of animation
            },
        });
        // Test
        this.#targetWorkout.click();
    }

    ///////////////////////////////////////////// EVENT HANDLERS

    // Handler click for workout container
    _workClickHandler(e) {
        // Select clicked element
        this.#targetWorkoutElement = e.target.closest(`.workout`);
        // Guard clause
        if (!this.#targetWorkoutElement) return;

        // Find workout according to clicked element
        this.#targetWorkout = this.#workouts.find((work) => work.id == this.#targetWorkoutElement.dataset.id);

        // If delete button is clicked
        if (e.target.classList.contains(`btn--delete-workout`)) {
            // Delete workout
            this._deleteWorkout();
            return;
        }

        // If edit buttom is clicked
        if (e.target.classList.contains(`btn--edit-workout`)) {
            // Show editing workout form
            this._openModal();
            return;
        }

        // Focusing map view on workout marker
        this._moveToWorkout();

        // Delete current workout
        this.#targetWorkout = null;

        // Delete current workout element
        this.#targetWorkoutElement = null;
    }

    // Handler click for editing workout form
    _modalClickHandler(e) {
        e.preventDefault();
        // If close button is clicked
        if (e.target.classList.contains(`btn--close-modal`)) {
            // Hide editing workout form
            this._hideModal();
        }
        if (e.target.classList.contains(`btn--edit-save`)) {
            // Save edited workout
            this._editWorkout();
        }
    }

    // Handler click for document
    _documentClickHandler(e) {
        // Hide create workout form if click not on form and map
        if (!(form.contains(e.target) || e.target.closest(`#map`))) this._hideForm();
    }

    // Handler keydown for document
    _documentKeyDownHandler(e) {
        // Hide create new workout form on pressing "Esc" button
        if (e.key == `Escape` && !form.classList.contains(`hidden`)) this._hideForm();
        // Reset app for testing
        if (e.key == `Delete`) this.reset();
    }

    ///////////////////////////////////////////// CREATE WORKOUT

    // Show create new workout form after clicking on map
    _showForm(mapE) {
        // Getting leaflet event object
        this.#mapEvent = mapE;
        // Show form with inputs
        form.classList.remove(`hidden`);
        // Set workout type to running
        inputTypeForm.value = `running`;
        // Focus on distance input
        inputDistanceForm.focus();
    }

    // Getting workout and rendering
    _newWorkout(e) {
        // Prevent from reload page after submitting
        e.preventDefault();

        // If creating new workout form is hidden
        if (form.classList.contains(`hidden`)) return;

        // Get data from form(workout type, distance, duration, cadence and elevation)
        const type = inputTypeForm.value;
        const distance = +inputDistanceForm.value;
        const duration = +inputDurationForm.value;
        const cadence = +inputCadenceForm.value;
        const elevation = +inputElevationForm.value;
        // Getting coordinates of click on map
        const { lat, lng } = this.#mapEvent.latlng;

        // Check if data is valid
        if (!this._validData(type, distance, duration, cadence, elevation))
            return alert(`Inputs have to be positive numbers!`);

        // Create new workout object
        const workout = this._createWorkout(type, [lat, lng], distance, duration, cadence, elevation);

        // Add new object to workout array
        this.#workouts.push(workout);

        // Set local storage for all workouts
        this._setLocalStorage();

        // Show sort workouts form
        if (sortForm.classList.contains(`hidden`)) this._showSort();

        // Render all workouts including new workout sorted by default(by date)
        this._renderDefaultSortWorkouts();

        // Hide form, clear inputs
        this._hideForm();

        // Show delete all workouts button if hidden
        if (btnDeleteAllWork.classList.contains(`hidden`)) this._showDeleteAll();
    }

    // Hide create new workout form
    _hideForm() {
        // Clear all inputs
        inputDistanceForm.value = inputDurationForm.value = inputCadenceForm.value = inputElevationForm.value = ``;

        // Hide input form
        // form.style.display = `none`;
        form.classList.add(`hidden`);
        // setTimeout(() => (form.style.display = `grid`), 1000);
    }

    ///////////////////////////////////////////// EDIT WORKOUT

    // Show workout edit form and overlay
    _openModal() {
        // Show workout edit form
        modal.classList.remove(`hidden`);
        // Show overlay
        overlay.classList.remove(`hidden`);

        // Show current workout distance, duration, type and cadence/elevation gain according to type
        inputDistanceModal.value = this.#targetWorkout.distance;
        inputDurationModal.value = this.#targetWorkout.duration;
        inputTypeModal.value = this.#targetWorkout.type;

        // Show/hide cadence/elevation input
        inputCadenceModal.closest(`.form__row`).classList.remove(`form__row--hidden`);
        inputElevationModal.closest(`.form__row`).classList.remove(`form__row--hidden`);
        if (this.#targetWorkout.type == `running`) {
            inputElevationModal.closest(`.form__row`).classList.add(`form__row--hidden`);
            inputCadenceModal.value = this.#targetWorkout.cadence;
        }
        if (this.#targetWorkout.type == `cycling`) {
            inputCadenceModal.closest(`.form__row`).classList.add(`form__row--hidden`);
            inputElevationModal.value = this.#targetWorkout.elevationGain;
        }
    }

    // Edit workout
    _editWorkout() {
        // Hide input form for creating new workouts
        this._hideForm();

        // Edited workout type, distance, duration, cadence and elevation
        const type = inputTypeModal.value;
        const distance = +inputDistanceModal.value;
        const duration = +inputDurationModal.value;
        const cadence = +inputCadenceModal.value;
        const elevation = +inputElevationModal.value;

        // Check if data is valid
        if (!this._validData(type, distance, duration, cadence, elevation))
            return alert(`Inputs have to be positive numbers!`);

        // Create new edited workout object
        const newWorkout = this._createWorkout(
            type,
            this.#targetWorkout.coords,
            distance,
            duration,
            cadence,
            elevation,
            this.#targetWorkout.id,
            this.#targetWorkout.date
        );

        /////////////////
        // // Create new workout marker
        // this._renderWorkoutMarker(newWorkout);

        // // Re-rendering edited workout in list
        // const editedWorkout = this._createWorkoutElement(newWorkout);
        // // Replace edited workout element
        // this.#targetWorkoutElement.replaceWith(editedWorkout);
        /////////////////

        // Find index of edited workout
        const index = this.#workouts.findIndex((el) => el.id == this.#targetWorkout.id);

        // Replace edited workout with new workout
        this.#workouts.splice(index, 1, newWorkout);

        // Set local storage for all workouts
        this._setLocalStorage();

        // Delete old workout marker
        this._deleteWorkoutMarker(this.#targetWorkout);

        /////////////////
        // Render all workouts sorted by default(by date)
        this._renderDefaultSortWorkouts();
        /////////////////

        // Hide edit workout form
        this._hideModal();
    }

    // Hide workout edit form and overlay
    _hideModal() {
        // Hide workout edit form
        modal.classList.add(`hidden`);
        // Hide overlay
        overlay.classList.add(`hidden`);
        // Delete current workout
        this.#targetWorkout = null;
        // Delete current workout element
        this.#targetWorkoutElement = null;
    }

    ///////////////////////////////////////////// DELETE WORKOUT

    // Show delete all workouts button
    _showDeleteAll() {
        // Show button
        btnDeleteAllWork.classList.remove(`hidden`);
        // Showing animation
        btnDeleteAllWork.classList.add(`slide-in-top`);
        // Remove animation
        setTimeout(() => {
            btnDeleteAllWork.classList.remove(`slide-in-top`);
        }, 500);
    }

    // Delete workout from list, locale storage, array and delete workout marker from map and array
    _deleteWorkout() {
        // Find index of workout
        const workInd = this.#workouts.indexOf(this.#targetWorkout);

        // Delete workout marker from map and array
        this._deleteWorkoutMarker(this.#targetWorkout);

        // Find all next siblings of deleted workout
        const siblings = this._getWorkoutNextSiblings(this.#targetWorkoutElement);

        // Delete workout from array
        this.#workouts.splice(workInd, 1);

        // Delete current workout
        this.#targetWorkout = null;

        // Set local storage for remaining workouts
        this._setLocalStorage();

        // Delete workout animation
        this.#targetWorkoutElement.classList.add('workout--deleting');

        // If no workouts
        if (!this.#workouts.length) {
            // Delete local storage
            localStorage.removeItem(`workouts`);

            // Hide delete all workouts button
            this._hideDeleteAll();

            // Hide sort workouts form
            this._hideSort();
        }
        // Deleted workout next siblings animation
        if (siblings) {
            // Calc offset for animation
            const margin = Number.parseFloat(getComputedStyle(this.#targetWorkoutElement).marginBottom);
            const offset = this.#targetWorkoutElement.offsetHeight + margin;
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
            this.#targetWorkoutElement.remove();
            // Delete current workout element
            this.#targetWorkoutElement = null;

            // End of animation for deleted workout siblings
            if (siblings) {
                siblings.forEach((sibling) => {
                    sibling.style.transform = '';
                    sibling.classList.remove('workout--shifting');
                });
            }
        }, 500);
    }

    // Delete all workouts
    _deleteAllWorkouts() {
        if (confirm(`Are you sure you want to delete all workouts?`)) {
            // Delete all workouts animation
            const removedElements = containerWorkouts.querySelectorAll(`.workout`);
            removedElements.forEach((el) => el.classList.add('workout--deleting'));

            // Delete all workout markers on map
            this.#markers.forEach((marker) => this.#map.removeLayer(marker));

            // Delete all workout markers from array
            this.#markers = [];
            // Delete all workouts
            this.#workouts = [];
            // Delete local storage
            localStorage.removeItem(`workouts`);

            // Hide delete all button
            this._hideDeleteAll();

            // Hide sort workouts form
            this._hideSort();

            // Delete workout elements after buttons hiding animation
            setTimeout(() => {
                // Delete all workout elements from list
                removedElements.forEach((el) => el.remove());
            }, 500);
        }
    }

    // Delete workout marker from map
    _deleteWorkoutMarker(workout) {
        // Find workout marker on map
        const workMark = this.#markers.find((mark) => {
            const { lat, lng } = mark._latlng;
            if (lat == workout.coords[0] && lng == workout.coords[1]) return mark;
        });
        // Find index of workout marker
        const workMarkInd = this.#markers.indexOf(workMark);
        // Delete workout marker from map
        this.#map.removeLayer(workMark);
        // Delete workout marker from array
        this.#markers.splice(workMarkInd, 1);
    }

    // Hide delete all workouts button
    _hideDeleteAll() {
        // Hiding animation
        btnDeleteAllWork.classList.add(`slide-out-top`);
        // Hide button after animation
        setTimeout(() => {
            // Hide button
            btnDeleteAllWork.classList.add(`hidden`);
            // Remove animation
            btnDeleteAllWork.classList.remove(`slide-out-top`);
        }, 500);
    }

    ///////////////////////////////////////////// SORT WORKOUT

    // Show sort workouts form
    _showSort() {
        // Show form
        sortForm.classList.remove(`hidden`);
        // Showing animation
        sortForm.classList.add(`slide-in-top`);
        // Remove animation after showing
        setTimeout(() => {
            sortForm.classList.remove(`slide-in-top`);
        }, 500);
    }

    // Render all workouts and workout markers sorted by date
    _renderDefaultSortWorkouts() {
        selectType.value = `all`;
        this._selectSort();
    }

    // Select parameters for sorting workouts
    _selectSort() {
        // All sorting parameters
        const sortOptions = {
            all: [`date`, `distance`, `duration`],
            running: [`date`, `distance`, `duration`, `pace`, `cadence`],
            cycling: [`date`, `distance`, `duration`, `speed`, `elevation`],
        };
        // Chosed workout type for show and sorting parameters according to type
        const sortOption = sortOptions[selectType.value];

        // Clear sorting option elements
        selectSort.innerHTML = ``;
        // Adding sort options to select sort element
        sortOption.forEach((option) => {
            const optionElement = document.createElement(`option`);
            optionElement.value = option;
            optionElement.textContent = option;
            selectSort.append(optionElement);
        });

        // Render workouts according to chosed workout type
        this._renderSortedWorkouts();
    }

    // Render sorted workouts
    _renderSortedWorkouts() {
        // Sort inputs
        const type = selectType.value;
        const sort = selectSort.value;

        // Clear workout container
        containerWorkouts.querySelectorAll(`.workout`).forEach((workout) => workout.remove());
        // Remove all workout markers from map
        this.#markers.forEach((marker) => this.#map.removeLayer(marker));
        // Clear markers array
        this.#markers = [];

        // Sorted workouts array
        let sortedWorkouts;

        // Filter workouts by type
        if (type === `all`) sortedWorkouts = this.#workouts.slice();
        else sortedWorkouts = this.#workouts.filter((workout) => workout.type == `${selectType.value}`);

        // Sort workouts by chosen parameters
        if (sort === `date`) sortedWorkouts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        else if (sort === `elevation`) sortedWorkouts.sort((a, b) => a.elevationGain - b.elevationGain);
        else sortedWorkouts.sort((a, b) => a[sort] - b[sort]);

        // Render sorted workouts and workout markers
        sortedWorkouts.forEach((workout) => {
            this._renderWorkout(workout);
            this._renderWorkoutMarker(workout);
        });
    }

    // Hide sort workouts form
    _hideSort() {
        // Hiding animation
        sortForm.classList.add(`slide-out-top`);

        // Hide sort workouts form after animation
        setTimeout(() => {
            // Hide form
            sortForm.classList.add(`hidden`);
            // Remove animation
            sortForm.classList.remove(`slide-out-top`);
        }, 500);
    }

    ///////////////////////////////////////////// RENDER WORKOUT

    // Create html element for workout
    _createWorkoutElement(workout) {
        // Create html element
        const workoutElement = document.createElement(`li`);

        // Styling htlm element
        workoutElement.classList.add(`workout`, `workout--${workout.type}`);
        // Set id for element according to workout id
        workoutElement.setAttribute(`data-id`, workout.id);

        // Create content for html element
        const innerHTML = this._workoutInnerHTML(workout);
        workoutElement.insertAdjacentHTML(`afterbegin`, innerHTML);

        return workoutElement;
    }

    // Content for workout element
    _workoutInnerHTML(workout) {
        let html = `
          <h2 class="workout__title">${workout.description}</h2>
          <button class="btn--edit-workout">✎</button>
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
            `;
        }
        return html;
    }

    // Render workout on list
    _renderWorkout(workout) {
        const workoutElement = this._createWorkoutElement(workout);
        form.insertAdjacentElement(`afterend`, workoutElement);
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

    ///////////////////////////////////////////// CREATE OBJECT

    // Create workout object
    _createWorkout(type, coords, distance, duration, cadence, elevation, id, date) {
        if (type === `running`) {
            return new Running(coords, distance, duration, cadence, id, date);
        }
        if (type === `cycling`) {
            return new Cycling(coords, distance, duration, elevation, id, date);
        }
    }

    // Re-creating workout objects from local storage
    _recreateWorkouts(data) {
        let workout;
        data.forEach((el) => {
            workout = this._createWorkout(
                el.type,
                el.coords,
                el.distance,
                el.duration,
                el.cadence,
                el.elevationGain,
                el.id,
                el.date
            );
            this.#workouts.push(workout);
        });
    }

    ///////////////////////////////////////////// LOCAL STORAGE

    // Set local storage for all workouts
    _setLocalStorage() {
        localStorage.setItem(`workouts`, JSON.stringify(this.#workouts));
    }

    // Get local storage with all workouts
    _getLocalStorage() {
        // Converting strings from locale storage to workout objects
        const data = JSON.parse(localStorage.getItem(`workouts`));

        // If no data from local storage
        if (!data) return;

        // Re-create workout objects
        this._recreateWorkouts(data);

        // Show delete all workouts button
        this._showDeleteAll();
    }

    ///////////////////////////////////////////// HANDLER METHODS

    // Toggling cadence/elevation inputs after selecting running/cycling
    _toggleCadenceElevationInput(e) {
        // Toggling cadence/elevation inputs
        const targetElement = e.target.closest(`form[data-workout="inputs"]`);

        // Find cadence/elevation inputs
        const inputCadence = targetElement.querySelector(`.form__input--cadence`);
        const inputElevation = targetElement.querySelector(`.form__input--elevation`);

        // Styling form according to cadence/elevation input
        inputCadence.closest(`.form__row`).classList.toggle(`form__row--hidden`);
        inputElevation.closest(`.form__row`).classList.toggle(`form__row--hidden`);

        // Show cadence/elevation of current workout for editing workout form
        if (this.#targetWorkout) {
            if (this.#targetWorkout.type == `running`) {
                inputCadence.value = this.#targetWorkout.cadence;
                inputElevation.value = ``;
            }
            if (this.#targetWorkout.type == `cycling`) {
                inputElevation.value = this.#targetWorkout.elevationGain;
                inputCadence.value = ``;
            }
        }
        // Focusing on distance input in create new workout form
        if (targetElement.classList.contains(`form`)) targetElement.querySelector(`.form__input--distance`).focus();
    }

    // Check if input data is valid
    _validData(type, distance, duration, cadence, elevation) {
        // Handler functions for checking data
        const validInputs = (...inputs) => inputs.every((input) => Number.isFinite(input));
        const allPositive = (...inputs) => inputs.every((input) => input > 0);

        // Checking data according to workout type
        if (type === `running`) {
            return validInputs(distance, duration, cadence) && allPositive(distance, duration, cadence);
        }
        if (type === `cycling`) {
            return validInputs(distance, duration, elevation) && allPositive(distance, duration);
        }
    }

    // Getting all next siblings of workout element
    _getWorkoutNextSiblings(targetElement) {
        // Find next sibling
        const nextSibling = targetElement.nextElementSibling;
        // Guard clause
        if (!nextSibling) return null;
        // Find all next siblings
        let nextSiblings = [...containerWorkouts.querySelectorAll(`.workout`)].reduce(
            (acc, el) => {
                if (el == acc.at(-1).nextElementSibling) acc.push(el);
                return acc;
            },
            [nextSibling]
        );
        return nextSiblings;
    }

    ///////////////////////////////////////////// TEST

    // Delete local storage for workouts
    reset() {
        // Delete local storage
        localStorage.removeItem(`workouts`);
        // Reload page
        location.reload();
    }
}

///////////////////////////////////////////// WORKOUT CLASSES

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

// PHP, VIEW, CATS PLACEHOLDER

// EASY
// 1) Edit a workout  +
// 2) Delete a workout   +
// 3) Delete all workouts   +
// 4) Sort all workouts by certain parameter  +
// 5) Re-build workout objects from local storage  +
// 6) More realistic error and confirmation messages

// HARD
// 1) Position map to show all workouts
// 2) Draw lines and shapes instead of points

// AFTER ASYNC JS
// 1) Geocode location from coordinates
// 2) Display weather data for workout time and place
