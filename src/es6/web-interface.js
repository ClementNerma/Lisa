// Set an ID to the Lisa's DOM discussion area (DDA)
Lisa.dom.setAttribute('id', 'discuss');
// Append it to the web page
document.body.appendChild(Lisa.dom);

// Here we can talk
// Create an input field to allow user talking with Lisa
let input = document.createElement('input');
// Set it an ID
input.setAttribute('id', 'input');
// When something is typed in the input...
input.addEventListener('keydown', e => {
  // If the key pressed is 'Return' (Enter)...
  if (e.keyCode === 13) {
    // If there is no text in the input...
    if (!input.value.length)
      // Don't transmit it to Lisa
      return ;

    // Get the text
    let request = input.value;
    // Clear the input field
    input.value = '';
    // Display the request
    Lisa.hears(request);
    // Perform the request
    Lisa.does(request);
  }
});
// Display the input field into the web page
document.body.appendChild(input);

// Get the Lisa's state from the local storage
let data = localStorage.getItem('lisa_state');

// If a data is found in the local storage...
if (data)
  // Convert it to a save object
  Lisa.State.convertPlainSave(data, out => Lisa.State.load(out), err => {
    if (err === 'lzstring')
      // If errors can be logged into a console...
      if (typeof console === 'object' && typeof console.error === 'function')
        // Log the error
        console.error('Found compressed data, but the LZString library was not found.');

    // That's an unknown kind of data
    // If the 'console' object is defined...
    if (typeof console === 'object' && typeof console.error === 'function')
      // Log an error into it
      console.error('Corrupted data found in localStorage');

    // Declare a global variable with the corrupted data
    // That permits for developpers who wants to test data corruption to get
    // the corrupted data after detection instead of losing it each time
    (typeof window === 'object' ? window : typeof global === 'object' ? global :
     typeof this === 'object' ? this : {}).corrupted_local_lisa_state = data;

    // Remove the corrupted data
    localStorage.removeItem('lisa_state');
  });

// Save the Lisa's state...
// When a message is displayed
Lisa.when('message', () => localStorage.setItem('lisa_state', Lisa.State.convertObjectSave(Lisa.State.save())));
// When Lisa answered to a request
Lisa.when('did', () => localStorage.setItem('lisa_state', Lisa.State.convertObjectSave(Lisa.State.save())));
// When Lisa understood a new request (@.understands())
Lisa.when('understood', () => localStorage.setItem('lisa_state', Lisa.State.convertObjectSave(Lisa.State.save())));

// NOTE: This condition permit  to avoid Node.js applications to be slowed
// down by the automatic call of the 'save' function.
// NOTE: In a previous version, a save of the Lisa's state was performed
// after she learnt or forgot something. But, that made Lisa saving its state
// even while scripts where running ; and because that uses synchronous methods
// the performances were terribly down.
// The removing of these two handlers permitted to increase performances, in
// this simple test :
//
// var a = performance.now();
// for (var i = 0; i < 10000; i++)
//  Lisa.learns('something', 'strange');
// performance.now() - a;
//
// On my low-end computer it takes more than 2000 miliseconds to run in that
// previous version, after the events' handlers removing it takes only about
// 4 ms to run. See the improvement?
