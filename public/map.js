// This file is optional since map/detection logic is included in app.js checkout form.
// If you want a separate file for geolocation and reverse geocoding, you can keep this:

function detectCurrentLocation(callback) {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      const { latitude, longitude } = position.coords;
      // Use OpenStreetMap Nominatim for reverse geocoding
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
        .then(response => response.json())
        .then(data => {
          if (data && data.display_name) {
            callback(null, data.display_name);
          } else {
            callback('Could not find address');
          }
        })
        .catch(err => callback(err));
    },
    error => {
      callback('Error getting location: ' + error.message);
    }
  );
}
