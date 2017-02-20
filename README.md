# Lisa

Lisa is an autonomous assistant which talks with you.

# Installation

## Ready-to-use web interface

**NOTE :** You can also try Lisa [at this adress](https://clementnerma.github.io/Lisa).  

To set up a ready-to-use interface with an input field and a discussion area, just clone this repository and open the `index.html` page in your browser (due to the LICENSE described below, you can modify the Lisa's code for private use but you can't modify it if you want to publish it) :

```bash
git clone https://github.com/ClementNerma/Lisa
cd Lisa
<your-browser> index.html
```

You're ready to use Lisa!

## Node.js

This part allows you to set up the Lisa's program in a Node.js application. First, install the [`lisa-node`](https://www.npmjs.com/package/lisa-node) package from [NPM](https://www.npmjs.com).  
Then, you can use the module to interact with Lisa using the module's object:

```bash
# Install Lisa locally
npm install lisa-node
```

```javascript
// Require the 'Lisa' module
const Lisa = require('lisa-node');
// (Optionnal) Load the LIS parser
Lisa.loadParser();
// You can use the 'Lisa' object below
```

# How to use ?

Lisa is a robot that works with I/A (Input/Answer) couples. Couples can be registered in the Lisa's program and she will be able to understand some inputs and answer to them. Answers are provided as JavaScript functions which gets the input's analysis (like numbers, dates, etc.) and provide the answer. Let's take an example :

```javascript
// Register a handler (a kind of regular expression with allows Lisa to understand some inputs)
// Ex: "Repeat "I love cats" 5 times
Lisa.understands(`Repeat "{*}" {integer} times`, (request) => {
  // The text to repeated
  let text = request.caught[0] + ' '; // Plus a single space
  // How many times the text should be repeated
  let times = parseInt(request.caught[1]);
  // Repeat it
  return text.repeat(times);
});
```

In this code, the taken input is `Repeat "I love cats" 5 times`. You can put (or not) a point at the end of the text, put as many spaces as you want to. This is a very simple example, but Lisa is really more powerful than that.  

For example, she can understand sentences using locales' patterns, such as `'d` is an equivalent of `would`. Also, she can take optionnal pieces of text, formats dates and times for a simplier manipulation, and memorize informations to use it again:  

```javascript
// Register a locale's pattern
// The '_' symbol significates "I need a word before me" if the symbol is placed at the beginning of the text or
// "I need a word after me" if the symbol is placed at the end. That also works if the string begins/ends just before/after this text.
Lisa.learnsLocaleTexts('en', [ "'d_", "_would_" ]);

// Register a handler
// Here, the '!' symbol is optionnal (put after the '?' symbol means that you may not input it).
Lisa.understands(`My birthday is on {short_date}{?!}`, (request) => {
  // If user already said its birthday...
  if (Lisa.knows('birthday'))
    // If the birthday is different this time...
    // (The .getStandrd() function formats the date is any form to make a string with the 'dd/mm' form)
    // request.formatted[0] contains the caught date (request.caught[0]) after the use of .getStandard()
    if (Lisa.getStandard(Lisa.thinksTo('birthday'), 'short_date') !== request.formatted[0])
      // Display an answer
      return `Are you sure? Last time, you said me it was on ${Lisa.thinksTo('birthday')}...`;

  // Memorize the information
  Lisa.learns('birthday', request.caught[0]);
  // Display the answer
  return `Okay, I remembered it's on ${request.formatted[0]}!`;
});

// Register another handler
Lisa.understands(`I'd like to know when is my birthday?`, (request) => {
  // If she knows it...
  if (Lisa.knows('birthday'))
    // Display the answer
    return `I know! It's on ${Lisa.thinksTo('birthday')}!`;

  // Else, display a "sorry" message
  return `I'm sorry, I don't know that. Do you want to tell me when it is?`;
});
```

This code will accept inputs such as `My birthday is 28.03.2000` or `My birthday is 28 / 03 / 2000`, and the JavaScript function can see what's the syntax used by the user by using `request.caught[0]` which will give respectively `28.03.2000` and `28 / 03 / 2000`. But, in the both cases, the `request.formatted[0]` will output `28/03/2000`, the date's standard format for Lisa. That makes manipulations on it easier.

# LIS programs

LIS (for Lisa's Interface Script) is a programming language designed to fit with how Lisa works. It is compiled in JavaScript lambda functions (functions without name) and aims to permit a simplier approach of Lisa. Here is the code we've seen above, this time written in LIS:

```coffeescript
in locale "en" use { ''d_ | _would_ }

for "My birthday is on {short_date}{?!}" =>
  if knows birthday
    if standard(birthday, "short_date") isnt ^0
      end "Are you sure? Last time, you said me it was on %birthday%..."

  store _0 => birthday
  end "Okay, I remembered it's on %^0%!"

for "I'd like to know when is my birthday?" =>
  if knows birthday
    end "I know! It's on %birthday%!"

  end "I'm sorry, I don't know that. Do you want to tell me when it is?"
```

It's exactly the same script. Here is the result:  

![Example of Lisa](https://s21.postimg.org/b5g2jdtwn/Demo_of_Lisa.png)

You see how simple this is? Just with one script, we made a robot that can answer smartly to your requests about its birthday. Sure, it's a very simple approach, but it works fine and the robot is able to ignore symbols like `!` or `?` (you can avoid to type these symbols when you input your request), it's case-insensitive, it supports multiple spaces, a locale pattern we set up ('d <=> would).  

There's a lot of other features that won't be detailled here but in the documentation, which permit to make more complex programs for Lisa.  

# Privacy

## Public data

Until you input a specific request that requires Lisa to request pages from the web, there's no connection between Lisa and Internet. In any cases, be assured the messages you typed and the Lisa's answers will **never** be transmitted to Internet until it's required by Lisa in explicit requests (like: Search the definition of "<word>", in that case the <word> will be sent to the web to get its definition).  
In all cases, none of your message will be stored in our servers. You can also check out the source code in this repository, that's one of the reasons it is published here :-).

## Local storage

When you refresh the page, your messages are displayed again. Lisa remembers them as long as you won't forbid it. The saved data is a reversed string that is not redeable by malwares until they try to reverse the string, and if you have many messages (> 100 Kb of data) if will be reversed, compressed using the [LZString](http://pieroxy.net/blog/pages/lz-string/index.html) library and reversed again to make it completely unreadable.  

If you want to remove all the messages she remembered, you need to clean the entire Lisa's state, including its memory. For that, type: `localStorage.clear();` and refresh the page immediatly.
If you want to forbid Lisa from remembering your messages, open the developper's console and type : `Lisa.remembersMessages = false;`. She won't remember your messages anymore.
**IMPORTANT :** This last command must be runned AFTER the local storage is cleared, else Lisa will forgets you asked her to not remember your messages.

# License

This project is released under the [Creative Commons Attribution BY-NC-ND 4.0 International](https://creativecommons.org/licenses/by-nc-nd/4.0/) license.
The license of the project may change on the future and it will maybe release using the GPL license in a future version.

# Disclaimer

The software is provided "as is" and the author disclaims all warranties
with regard to this software including all implied warranties of
merchantability and fitness. In no event shall the author be liable for
any special, direct, indirect, or consequential damages or any damages
whatsoever resulting from loss of use, data or profits, whether in an action
of contract, negligence or other tortious action, arising out of or in
connection with the use or performance of this software.
