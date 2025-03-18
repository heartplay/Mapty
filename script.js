'use strict';

const overlay = document.querySelector(`.overlay`);
const sidebarOverlay = document.querySelector(`.sidebar-overlay`);
const containerWorkouts = document.querySelector('.workouts');
const btnDeleteAllWork = document.querySelector(`.btn--delete-all-workouts`);

const create = document.querySelector('.create');
const inputTypeCreate = create.querySelector('.form__input--type');
const inputDistanceCreate = create.querySelector('.form__input--distance');
const inputDurationCreate = create.querySelector('.form__input--duration');
const inputCadenceCreate = create.querySelector('.form__input--cadence');
const inputElevationCreate = create.querySelector('.form__input--elevation');

const edit = document.querySelector(`.edit`);
const inputTypeEdit = edit.querySelector('.form__input--type');
const inputDistanceEdit = edit.querySelector('.form__input--distance');
const inputDurationEdit = edit.querySelector('.form__input--duration');
const inputCadenceEdit = edit.querySelector('.form__input--cadence');
const inputElevationEdit = edit.querySelector('.form__input--elevation');

const sortForm = document.querySelector(`.filter-sort`);
const selectType = sortForm.querySelector(`.filter-sort__select--type`);
const selectSort = sortForm.querySelector(`.filter-sort__select--sort`);
const sortOrder = sortForm.querySelector(`.filter-sort__icon-container`);
const sortOrderIcon = sortOrder.querySelector(`img`);
const ascIconSrc = `img/sort-order/sort-ascending.png`;
const desIconSrc = `img/sort-order/sort-descending.png`;

const deleteWorkoutMessage = document.querySelector(`.delete-workout`);
const deleteAllWorkMessage = document.querySelector(`.delete--all`);

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
    // Default sort order
    #ascendingSort = true;

    constructor() {
        // Get from local storage all workouts
        this._getLocalStorage();

        // Get position
        this._getPosition();

        // Show sort workouts form
        if (this.#workouts.length) this._showSort();

        ////////////////// Attach event listeners

        // Toggling parameters for sort workouts
        // Sort by workout type
        selectType.addEventListener(`change`, this._selectSort.bind(this));
        // Sort workouts by certain parameter
        selectSort.addEventListener(`change`, this._renderSortedWorkouts.bind(this));
        // Sort workouts order
        sortOrder.addEventListener(`click`, this._toggleSortOrder.bind(this));

        // Event listener for submit on input form
        create.addEventListener(`submit`, this._newWorkout.bind(this));

        // Toggling cadence/elevation inputs after selecting running/cycling
        inputTypeCreate.addEventListener(`change`, (e) => this._toggleCadenceElevationInput(e));
        inputTypeEdit.addEventListener(`change`, (e) => this._toggleCadenceElevationInput(e));

        // Delete all workouts button
        btnDeleteAllWork.addEventListener(`click`, this._showDeleteAllMessage.bind(this));

        ////////////////// Attach event listener helpers

        // Keydown handler for document
        document.addEventListener(`keydown`, this._documentKeyDownHandler.bind(this));

        // Click handler for document
        document.addEventListener(`click`, this._documentClickHandler.bind(this));

        // Click handler for editing workout form
        edit.addEventListener(`click`, this._editClickHandler.bind(this));

        // Click handler for workouts container
        containerWorkouts.addEventListener(`click`, this._workClickHandler.bind(this));

        // Click handler for delete confirm window
        deleteWorkoutMessage.addEventListener(`click`, this._deleteClickHandler.bind(this));

        // Click handler for delete all confirm window
        deleteAllWorkMessage.addEventListener(`click`, this._deleteAllClickHandler.bind(this));
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
        this.#map.on(`click`, this._showCreate.bind(this));

        // Default sidebar and map condition
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

    // Handler keydown for document
    _documentKeyDownHandler(e) {
        // Hide create new workout form on pressing "Esc" button
        if (e.key == `Escape` && !create.classList.contains(`hidden`)) this._hideCreate();
        // Reset app for testing
        if (e.key == `Delete`) this.reset();
    }

    // Handler click for workout container
    _workClickHandler(e) {
        // Select clicked element
        this.#targetWorkoutElement = e.target.closest(`.workout`);
        // Guard clause
        if (!this.#targetWorkoutElement) return;

        // Find workout according to clicked element
        this.#targetWorkout = this.#workouts.find((work) => work.id == this.#targetWorkoutElement.dataset.id);

        // Focusing map on current workout
        this._moveToWorkout();

        // If delete button is clicked
        if (e.target.classList.contains(`btn--delete-workout`)) {
            // Hide edit workout window and overlay if edit form is show
            if (!edit.classList.contains(`hidden`)) {
                overlay.classList.add(`hidden`);
                edit.classList.add(`hidden`);
            }
            // Show delete workout window
            this._showDeleteMessage(e);
            return;
        }

        // If edit buttom is clicked
        if (e.target.classList.contains(`btn--edit-workout`)) {
            // Hide delete workout window and sidebar overlay if delete message is show
            if (!deleteWorkoutMessage.classList.contains(`hidden`)) {
                deleteWorkoutMessage.classList.add(`hidden`);
                sidebarOverlay.classList.add(`hidden`);
            }
            // Show editing workout form
            this._showEdit();
            return;
        }

        // Delete current workout
        this.#targetWorkout = null;

        // Delete current workout element
        this.#targetWorkoutElement = null;
    }

    // Handler click for editing workout form
    _editClickHandler(e) {
        e.preventDefault();
        // If close button is clicked
        if (e.target.classList.contains(`btn--close-edit`)) {
            // Hide editing workout form
            this._hideEdit();
        }
        if (e.target.classList.contains(`btn--edit-save`)) {
            // Save edited workout
            this._editWorkout();
        }
    }

    // Handler click for delete workout confirm window
    _deleteClickHandler(e) {
        // Delete confirmed
        if (e.target.classList.contains(`yes`)) {
            // Delete current workout
            this._deleteWorkout();
            // Hide delete confirm window
            this._hideDeleteMessage();
        }
        // Not confirmed
        if (e.target.classList.contains(`no`)) {
            this._hideDeleteMessage();
        }
    }

    // Handler click for delete all workouts confirm window
    _deleteAllClickHandler(e) {
        // Delete all confirmed
        if (e.target.classList.contains(`yes`)) {
            // Hide delete all confirm window
            this._hideDeleteAllMessage();
            // Delete all workouts
            this._deleteAllWorkouts();
        }
        // Not confirmed
        if (e.target.classList.contains(`no`)) {
            this._hideDeleteAllMessage();
        }
    }

    // Handler click for document
    _documentClickHandler(e) {
        // Hide create workout form if click not on form and map
        if (!(create.contains(e.target) || e.target.closest(`#map`))) this._hideCreate();
    }

    ///////////////////////////////////////////// MESSAGE WINDOW

    // _showMessage() {
    //     deleteWorkoutMessage.classList.remove(`hidden`);
    //     overlay.classList.remove(`hidden`);
    // }

    // _hideMessage() {
    //     deleteWorkoutMessage.classList.add(`hidden`);
    //     overlay.classList.add(`hidden`);
    // }

    ///////////////////////////////////////////// CREATE WORKOUT

    // Show create new workout form after clicking on map
    _showCreate(mapE) {
        // mapE.preventDefault();
        // Getting leaflet event object
        this.#mapEvent = mapE;
        // Show form with inputs
        create.classList.remove(`hidden`);
        // Set inputs to default
        // Set workout type to running
        inputTypeCreate.value = `running`;
        // Remove hiding classes
        inputCadenceCreate.closest(`.form__row`).classList.remove(`form__row--hidden`);
        inputElevationCreate.closest(`.form__row`).classList.remove(`form__row--hidden`);
        // Hide elevation gain input
        inputElevationCreate.closest(`.form__row`).classList.add(`form__row--hidden`);
        // Focus on distance input
        inputDistanceCreate.focus();

        // Default sidebar and map condition
        this._renderDefaultSortWorkouts();

        // Getting coordinates of click on map
        const { lat, lng } = this.#mapEvent.latlng;
        // Getting current map zoom
        const currentZoom = this.#map.getZoom();
        // Setview on map click
        this.#map.setView([lat, lng], currentZoom);
    }

    // Getting workout and rendering
    _newWorkout(e) {
        // Prevent from reload page after submitting
        e.preventDefault();

        // If creating new workout form is hidden
        if (create.classList.contains(`hidden`)) return;

        // Get data from form(workout type, distance, duration, cadence and elevation)
        const type = inputTypeCreate.value;
        const distance = +inputDistanceCreate.value;
        const duration = +inputDurationCreate.value;
        const cadence = +inputCadenceCreate.value;
        const elevation = +inputElevationCreate.value;
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

        // Default sidebar and map condition
        this._renderDefaultSortWorkouts();

        // Hide form, clear inputs
        this._hideCreate();

        // Show delete all workouts button if hidden
        if (btnDeleteAllWork.classList.contains(`hidden`)) this._showDeleteAllBtn();
    }

    // Hide create new workout form
    _hideCreate() {
        // Clear all inputs
        inputDistanceCreate.value =
            inputDurationCreate.value =
            inputCadenceCreate.value =
            inputElevationCreate.value =
                ``;

        // Hide input form
        // form.style.display = `none`;
        create.classList.add(`hidden`);
        // setTimeout(() => (form.style.display = `grid`), 1000);
    }

    ///////////////////////////////////////////// EDIT WORKOUT

    // Show workout edit form and overlay
    _showEdit() {
        // If form is showing
        if (!edit.classList.contains(`hidden`)) return;
        // Select current workout element
        this.#targetWorkoutElement.classList.add(`active`);
        // Show workout edit form
        edit.classList.remove(`hidden`);
        // Show overlay
        overlay.classList.remove(`hidden`);

        // Show current workout distance, duration, type and cadence/elevation gain according to type
        inputDistanceEdit.value = this.#targetWorkout.distance;
        inputDurationEdit.value = this.#targetWorkout.duration;
        inputTypeEdit.value = this.#targetWorkout.type;

        // Show/hide cadence/elevation input
        inputCadenceEdit.closest(`.form__row`).classList.remove(`form__row--hidden`);
        inputElevationEdit.closest(`.form__row`).classList.remove(`form__row--hidden`);
        if (this.#targetWorkout.type == `running`) {
            inputElevationEdit.closest(`.form__row`).classList.add(`form__row--hidden`);
            inputCadenceEdit.value = this.#targetWorkout.cadence;
        }
        if (this.#targetWorkout.type == `cycling`) {
            inputCadenceEdit.closest(`.form__row`).classList.add(`form__row--hidden`);
            inputElevationEdit.value = this.#targetWorkout.elevationGain;
        }
    }

    // Edit workout
    _editWorkout() {
        // Hide input form for creating new workouts
        this._hideCreate();

        // Edited workout type, distance, duration, cadence and elevation
        const type = inputTypeEdit.value;
        const distance = +inputDistanceEdit.value;
        const duration = +inputDurationEdit.value;
        const cadence = +inputCadenceEdit.value;
        const elevation = +inputElevationEdit.value;

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

        // Default sidebar and map condition
        this._renderDefaultSortWorkouts();

        // Hide edit workout form
        this._hideEdit();
    }

    // Hide workout edit form and overlay
    _hideEdit() {
        // Hide workout edit form
        edit.classList.add(`hidden`);
        // Hide overlay
        overlay.classList.add(`hidden`);
        // Reset current workout
        this.#targetWorkout = null;
        // Remove current workout element selection
        this.#targetWorkoutElement.classList.remove(`active`);
        // Reset current workout element
        this.#targetWorkoutElement = null;
    }

    ///////////////////////////////////////////// DELETE WORKOUT

    // Show delete confirm window
    _showDeleteMessage(e) {
        // If window is showing
        if (!deleteWorkoutMessage.classList.contains(`hidden`)) return;
        // Select current workout element
        this.#targetWorkoutElement.classList.add(`active`);
        // Coordinates of mouse click
        const x = e.clientX;
        const y = e.clientY;

        // Show delete confirm window
        deleteWorkoutMessage.classList.remove(`hidden`);
        // Show overlay
        sidebarOverlay.classList.remove(`hidden`);

        // Height of delete confirm window
        const height = deleteWorkoutMessage.offsetHeight;
        // Move delete confirm window to mouse cursor
        deleteWorkoutMessage.style.left = `${x + 30}px`;
        deleteWorkoutMessage.style.top = `${y - height / 2}px`;
    }

    // Show delete all workouts confirm window
    _showDeleteAllMessage() {
        // Text for window according to type of workouts to be removed
        let innerText = `Are you sure you want to delete all ${
            selectType.value === `all` ? `` : selectType.value
        } workouts?`;
        // Set text for window
        deleteAllWorkMessage.querySelector(`.delete--all__header`).textContent = innerText;
        // Show delete all confirm window
        deleteAllWorkMessage.classList.remove(`hidden`);
        // Show overlay
        overlay.classList.remove(`hidden`);
    }

    // Show delete all workouts button
    _showDeleteAllBtn() {
        // Text for button according to type of workouts to be removed
        let innerText = `Delete all ${selectType.value === `all` ? `` : selectType.value} workouts`;
        // Set text for button
        btnDeleteAllWork.textContent = innerText;
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

        // Workout element to be deleted
        const workElToDelete = this.#targetWorkoutElement;

        // Find all next siblings of deleted workout
        const siblings = this._getWorkoutNextSiblings(workElToDelete);

        // Delete workout from array
        this.#workouts.splice(workInd, 1);

        // Set local storage for remaining workouts
        if (this.#workouts.length) {
            this._setLocalStorage();
        }

        // If no workouts
        if (!this.#workouts.length) {
            // Clear local storage
            localStorage.removeItem(`workouts`);
            // Hide delete all button
            this._hideDeleteAllBtn();
            // Hide sort form
            this._hideSort();
        }

        // If no filtered workouts remain after deleting
        if (selectType.value !== `all` && !this.#workouts.find((workout) => workout.type == selectType.value)) {
            this._hideDeleteAllBtn();
        }

        // Delete workout animation
        // this.#targetWorkoutElement.classList.add('workout--deleting');
        workElToDelete.classList.add('workout--deleting');

        // Deleted workout next siblings animation
        if (siblings) {
            // Calc offset for animation
            const margin = Number.parseFloat(getComputedStyle(workElToDelete).marginBottom);
            const offset = workElToDelete.offsetHeight + margin;
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
            workElToDelete.remove();

            // Remove animation for deleted workout siblings
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
        // Workout elements to be removed
        const elementsToRemove = containerWorkouts.querySelectorAll(`.workout`);
        // Delete workout elements animation
        elementsToRemove.forEach((el) => el.classList.add('workout--deleting'));

        // Workout type
        const type = selectType.value === `all` ? null : selectType.value;

        // If all workouts
        if (!type) {
            // Delete all workout markers on map
            this.#markers.forEach((marker) => this.#map.removeLayer(marker));
            // Delete all workout markers from array
            this.#markers = [];
            // Delete all workouts
            this.#workouts = [];
        }

        // If only running or cycling
        if (type) {
            // Filter all workouts by type
            const workoutsToRemove = this.#workouts.filter((workout) => workout.type == type);
            workoutsToRemove.forEach((workout) => {
                // Find workout index
                const workInd = this.#workouts.indexOf(workout);
                // Delete workout from all workouts
                this.#workouts.splice(workInd, 1);
                // Delete workout marker
                this._deleteWorkoutMarker(workout);
            });
        }

        // If no remaining workouts
        if (!this.#workouts.length) {
            // Clear local storage
            localStorage.removeItem(`workouts`);
            // Hide sort workouts form
            this._hideSort();
        }

        // Hide delete all button
        this._hideDeleteAllBtn();

        // Delete workout elements after buttons hiding animation
        setTimeout(() => {
            // Delete all workout elements from list
            elementsToRemove.forEach((el) => el.remove());
        }, 500);
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

    // Hide delete confirm window
    _hideDeleteMessage() {
        // Hide window
        deleteWorkoutMessage.classList.add(`hidden`);
        // Hide overlay
        sidebarOverlay.classList.add(`hidden`);
        // Remove current workout element selection
        this.#targetWorkoutElement.classList.remove(`active`);
        // Reset current workout
        this.#targetWorkout = null;
        // Reset current workout element
        this.#targetWorkoutElement = null;
    }

    // Hide delete all confirm window
    _hideDeleteAllMessage() {
        // Hide delete all confirm window
        deleteAllWorkMessage.classList.add(`hidden`);
        // Hide overlay
        overlay.classList.add(`hidden`);
    }

    // Hide delete all workouts button
    _hideDeleteAllBtn() {
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

    // Render all workouts in list and workout markers sorted by date, default sidebar and map condition
    _renderDefaultSortWorkouts() {
        // Set type to all
        selectType.value = `all`;
        // Render workouts by default
        this._selectSort();
        // Set sort order to default
        this.#ascendingSort = true;
        // Set sort order icon to default
        sortOrderIcon.setAttribute(`src`, ascIconSrc);
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

        // Filter workouts by type
        let sortedWorkouts =
            type === `all` ? this.#workouts.slice() : this.#workouts.filter((workout) => workout.type == `${type}`);

        // Sort workouts by chosen parameters
        if (sort === `date`) sortedWorkouts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        if (sort === `elevation`) sortedWorkouts.sort((a, b) => a.elevationGain - b.elevationGain);
        if (sort !== `date` && sort !== `elevation`) sortedWorkouts.sort((a, b) => a[sort] - b[sort]);

        // If no filtered workouts hide delete all button
        if (!sortedWorkouts.length) this._hideDeleteAllBtn();
        else this._showDeleteAllBtn();

        // Sort order
        sortedWorkouts = this.#ascendingSort ? sortedWorkouts : sortedWorkouts.reverse();

        // Render sorted workouts and workout markers
        sortedWorkouts.forEach((workout) => {
            this._renderWorkout(workout);
            this._renderWorkoutMarker(workout);
        });
    }

    // Toggle sort order
    _toggleSortOrder() {
        // Toggle sort order icon
        sortOrderIcon.setAttribute(`src`, sortOrderIcon.getAttribute(`src`) === ascIconSrc ? desIconSrc : ascIconSrc);
        // Toggle sort order
        this.#ascendingSort = !this.#ascendingSort;
        // Render ordered workouts
        this._renderSortedWorkouts();
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
        create.insertAdjacentElement(`afterend`, workoutElement);
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
        this._showDeleteAllBtn();
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
        if (targetElement.classList.contains(`create`)) targetElement.querySelector(`.form__input--distance`).focus();
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

    // Clear local storage and reload page
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
// 7) Show/hide scroll bar for workout container  +
// 8) Delete workout confirmation  +
// 9) Delete all workouts button for filtered workouts  +
// 10) Workout selection in list when editing and deleting  +

// HARD
// 1) Position map to show all workouts
// 2) Draw lines and shapes instead of points

// AFTER ASYNC JS
// 1) Geocode location from coordinates
// 2) Display weather data for workout time and place
