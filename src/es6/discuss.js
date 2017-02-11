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
