# Lisa's Core

Lisa is built around modules, and modules are built around the **core** ([core.js file](../../src/es6/core.js)). It includes the sentence analysis engine and manages the Lisa's memory.  

## Explanations about handlers

Lisa uses some *handlers*, which are kinds of regex to handle user's requests. Handlers use *catchers* to ask for a specific kind of data. Here is the syntax :  

```
1. Text is written like this
2. You can also put{? some optionnal texts}
3. You can ask for an integer {integer} or any floating number {number}
4. You can also catch anything like {*}
```

In these lines, `?`, `integer` and `number` are *catchers*. This significates that a request will only be recognized by this handler if a valid data is provided (`integer` asks for an integer number, `?` for an optionnal text...).  

The first handler will only recognize the specific request `Text is written like this`. The second handler will recognize `You can also put` and `You can also put some optionnal texts`. The third one will recognize anything than contains its text and the number it asks for. Finally, the last one will accept any request which starts by `You can also catch anything ` and any content after.

## Handlers' specificities

Handlers are transformed to regex using the [`makeHandlerRegex()`](../API/core.md#lisamakehandlerregexhandler-getcatchers-tolerant-locale) function.

If you look at the generated regex, you'll see something like that for the third handler :

```javascript
/^You +can +ask +for +an +integer +(\d+) +or +any +floating +number +(\d+[.]?|\d*\.\d+)(?: *[!\.])*$/i
```

Catchers are made to avoid developpers having to write again and again the same complicated regex. For example, the `I work from {date} to {date}` gives the following regex:


```javascript
/^I +work +from +((?:[1-9]|0[1-9]|[12]\d|3[01])(?: *[\/\-\.] *(?:[1-9]|0[1-9]|1[0-2]) *[\/\-\.] *| +(?:january|february|march|april|may|june|july|august|september|october|november|december) +)\d{4}) +to +((?:[1-9]|0[1-9]|[12]\d|3[01])(?: *[\/\-\.] *(?:[1-9]|0[1-9]|1[0-2]) *[\/\-\.] *| +(?:january|february|march|april|may|june|july|august|september|october|november|december) +)\d{4})(?: *[!\.])*$/i
```

Ugly, right? That's because this regex doesn't allow days like `32` or `00`, but allow months to be written using their name, writing as many spaces as required between the separation symbol (`.`, `-` or `!`). This is the reason why catchers are used as often as possible in handlers.

Knowing requests are trimmed (spaces are removed on the left and right side of the string), this handler supports multiple spacing before each word (` +`) and optionnaly an exclamation point or a point, separated by multiple spaces, just one space or no space, repeated multiple times. That means you can type this : `You     can  ask for    an integer 7 or any floating number 8.5 ! ! !`  

The texts between parenthesis in the regex are *capturing groups*. They memorize the text they caught, in our example it will match `7` and `8.5`. The third group is not a capturing group because it starts by `?:`, which means it doesn't memorize what it catches.  

Each catcher has one and only one capturing group, which contains the extracted data. In `My birthday is on 28.03`, handler `My birthday is on {short_date}` will catch `28.03` as a data.

## Register a handler

Once you've set up Lisa in a [Web Interface](../README.md#ready-to-use-web-interface) or in a [Node.js application](../README.md#nodejs), you can use the `Lisa` object to interact with the AI.  

First, let's define a handler. Lisa's aim is to allow very natural writing, we use the [`understands()`](../API/core.md#lisaunderstandshandler-callback-store-helptexts) function, like this :

```javascript
Lisa.understands('My birthday is on {short_date}', () => {
  // Write code here.
});
```

In this code we define a lambda function (a function without a name), which is called when Lisa receives a request matching with this handler. Also, we use the `short_date` catcher to catch dates using the `dd/MM` form (that works with dashes, points, with or without spacing, or with months names, for more details see `RegexCatchers`).
Lisa works on *Request-Answer* couples : we have the request, now we must return the answer. It looks that way :

```javascript
Lisa.understands('My birthday is on {short_date}', () => {
  return 'Mee too!';
});
```

See? It's just about a `return` statement. Note that you must return a string, else Lisa will say she encountered an error.

**NOTE :** You can also return an HTML element (instanciated by `document.createElement(...)`), and the `.innerHTML` property will be displayed as an HTML message. But be careful, it will also include `<script>`, `<style>` and `<iframe>` tags!

But, now we have a problem: how can we know what date inputted the user? We'll use the only argument given to the callback by the engine, which contains lots of data, including the caught texts. To see what contains this object, simply log it into the console. You will obtain a result like that:

```javascript
{
  request: "My birthday is on 28 may",
  requestWithSpaces: "My birthday is on 28 may",
  caught: [   "28 may" ],
  formatted: [ "28/05" ],
  handlerRegex: /^My +birthday +is +on +(.*?)(?: *[!\.])*$/i,
  handlerStrictRegex: /^My +birthday +is +on +((?:[1-9]|0[1-9]|[12]\d|3[01])(?: *[\/\-\.] *(?:[1-9]|0[1-9]|1[0-2]) *| +(?:january|february|march|april|may|june|july|august|september|october|november|december)))(?: *[!\.])*$/i,
  catchers: [ "short_date" ],
  help: null,
  handler: "My birthday is on {short_date}",
  display: true
}
```

Let's detail this:

* `request`: Contains the request recognized by Lisa using the handler.
* `requestWithSpaces`: The request, without trimming (it conserves the spaces at the beginning and end of the string)
* `caught`: All data caught by the catchers
* `formatted`: The `caught` field, standardly-formatted
* `handlerRegex`: The handler's tolerant regex
* `handlerStrictRegex`: The regex used to match this request (that's the output of `makeHandlerRegex(handler)`)
* `catchers`: The list of catchers used by the handler
* `help`: The help texts provided for this handler (it's an array given as a fourth argument to `understands()`)
* `handler`: The handler used to recognize the request
* `display`: Will be the answer displayed on the screen (Sometimes, requests are made in background) ?

So, if we want to get the date given by the user, we have to use the first value of the `caught` field. Arrays starts at index 0 in JavaScript, so we get `p.caught[0]`. Here we go:

```javascript
Lisa.understands('My birthday is on {short_date}', p => {
  return `Really? It's on ${p.caught[0]}?`;
});
```

It's kind of magic, right? So, that's pretty useful to display and remember the user's input, but that's not easy to use: User can input multiple forms with the `short_date` catcher: `28.03`, `28 / 03` or `28  march` will all work, so the easiest thing seems to be a regex performed on the string to get the day's number and the month's one. But if we do that, we get a really big code (and that's worse with `date`, which supports the year).

In order to avoid that, we'll use the catcher's *standard format*. It's a data representation that depends on the catcher, for this one it's `dd/mm`. It means that in the three inputs written above the standardly-formatted string will be `28/03`. That makes data manipulation easier, if you want to extract the day and month.

To get the standardly-formatted string, we'll use the `formatted` field, like this:

```javascript
Lisa.understands('My birthday is on {short_date}', p => {
  return `The formatted date is: ${p.formatted[0]}`;
});
```

This will display `The formatted date is: 28/03`.

## Tolerant regex

The handlers can recognize requests that aren't exactly how they want, for example `I work from {date} to {date}` will recognize `I work from 28 to 30`. That's possible because of the way Lisa use handlers: When a handler is registered, two regex are made: a "strict" regex (the very large regex we've seen) and a "tolerant" regex, which simply replace all catchers in the handler by the *tolerant catcher* (The `*` catcher, which match any content with any length), which can be seen in the `handlerRegex` field. When a request is submitted to Lisa, the tolerant regex is used to recognize it. If the request matches with the tolerant regex, it is submitted to the "strict" regex, which will check if the data are valid. In our example, it will check if the date is valid. If not, an error message will be displayed, saying one of the data are not valid. That permit two things :

1. When there's multiple handlers to check, it makes recognition faster because a small regex is really faster than a large one
2. It permit to indicates to the user that his request have been recognized, but there's only a part which is not valid ; instead of saying "this request is not valid" without knowing if the command is unknown or if there is just an invalid part.

## Help texts

You can submit help texts when registering a handler. It's done that way:

```javascript
Lisa.understands('My birthday is on {short_date}', p => {
  return `The formatted date is: ${p.formatted[0]}`;
}, null, [ 'birthday' ]);
```

For each catcher, we add a string in the array to explain what is is. Then, we can use the [`helpsAbout()`](../API/core.md#lisahelpsabouthandler-getarray) to get the help text about this handler:

```javascript
console.log(Lisa.helpsAbout('My birthday is on {short_date}'));
// Says: "My birthday is on [birthday]"
console.log(Lisa.helpsAbout('My birthday is on {short_date}'), true);
// Says: [ "birthday" ]
```

It can be useful is you implement a help handler to know how a command works.

## Handler's priority

Handlers are tested on requests by the order they were registered. For example, in this code:

```javascript
// Handler A
Lisa.understands('My name is {*}', p => `Nice to meet you, ${p.caught[0]}!`);
// Handler B
Lisa.understands('My name is {*} and I am {integer} years old', p => parseInt(p.caught[0]) > 50 ? 'You\'re old' : 'You\'re young!');
```

The 'B' handler will never be runned, because the `*` catcher catches **everything**, including spaces, until the end of the request's string. That's why, if you type `My name is John and I am 54 years old` you'll see `Nice to meet you, John and I am 54 years old!`. Pretty ugly, right?

To avoid this kind of problem, handlers must be registered in the right order. Here, the 'B' handler should be registered before the 'A' one.

### [Next part: The Memory](02-memory.md)
