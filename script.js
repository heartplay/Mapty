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

// Leaflet map, leaflet event on map
let map, mapEvent;

// browser geolocation API
if (navigator.geolocation)
    // Getting current coordinates from browser
    navigator.geolocation.getCurrentPosition(
        function (position) {
            const { latitude, longitude } = position.coords;
            const coords = [latitude, longitude];

            // Loading leaflet styled map according to coordinates
            map = L.map('map', { attributionControl: false }).setView(coords, 13);
            // Link to leaflet and openstreetmap
            L.control.attribution().setPrefix('<a href="https://leafletjs.com/">Leaflet</a>').addTo(map);
            L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(map);

            // Leaflet event listener for click on map
            map.on(`click`, function (mapE) {
                // Getting leaflet event object
                mapEvent = mapE;
                // Show form with inputs
                form.classList.remove(`hidden`);
                // Focus on distance input
                inputDistance.focus();
            });
        },
        // No coordinates
        function () {
            alert(`Could not get your position.`);
        }
    );

form.addEventListener(`submit`, function (e) {
    // Prevent from reload page after submitting
    e.preventDefault();
    // Getting coordinates of click on map
    const { lat, lng } = mapEvent.latlng;
    // Putting marker on map according to coordinates
    L.marker([lat, lng])
        .addTo(map)
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
});
