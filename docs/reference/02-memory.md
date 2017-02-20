# Lisa's Memory

Now we've seen [how to make handlers](01-handlers.md), it would be great to store informations. Because, if user gives informations, they must be remembered, else it won't be an A.I. but a simple robot. For that, there's two ways:

* Use a versatile memory, such as the [RAM](https://en.wikipedia.org/wiki/Random-access_memory)
* Use a non-versatile memory, so the data won't be lost each time Lisa starts

The both ways use a memory, so that makes Lisa a real A.I. But the first one, even if it's the simpliest one (it just requires to use an object and store keys and values inside), is not really useful because Lisa will forget everything she know each time she "wakes up".

So we'll use the second one: a persistent memory. Lisa has built-in tools to manage a persistent memory, so we'll detail this all here.

## Handler's stores

First of all, let's see how is built the Lisa's memory. It's a simple object, which can store booleans, strings or numbers. So it's a versatile memory, but which is saved to and loaded from the local storage by the [Web Interface](../../src/es6/web-interface.js) coupled with the [State Manager](../../src/es6/localdata.js) module.

You can use the memory this way:

```javascript
Lisa.understands('My birthday is on {short_date}', p => {
  return 'Mee too!';
}, /* The store */ { birthday: '%_0%' });
```

This last object is the handler's *store*, which means it shows what content must be assigned to what **cell** (a cell is a part of the memory which can contain a single value). It's written in the following form `{ <cell>: <value> }`. So here, it means the `birthday` cell will receive the `_0` value, which is the standardly-formatted value of the first handler. All contents between purcents refers to a memory's cell, excepted those which starts by a `_` or a `^`.

For the notation, it's quite simple: `_<number>` refers to a caught data (from 0 to infinity), and `^<number>` refers to a standardly-formatted data (from 0 to infinity too).

If we try this with `My birthday is on 23 june`, it will store `23 june` in the `birthday` cell. We can use it to change the Lisa's answer depending on if she knows the user's birthday or not.

```javascript
Lisa.understands('My birthday is on {short_date}', p => {
  // If Lisa knows the user's birthday...
  if (Lisa.knows('birthday'))
    // Say she already knows it
    return 'I already know your birthday';

  // Else, give the first answer.
  return 'Mee too!';
}, /* The store */ { birthday: '%_0%' });
```

As you can see, there's a `if` block that doesn't always run, so this handler became **non-linear** (that means it will return a different answer depending on parameters). If you refresh the web page, TADA! The data were saved. So the memory is persistent.

We can now display the user's birthday, if Lisa knows it:

```javascript
Lisa.understands('My birthday is on {short_date}', p => {
  // If Lisa knows the user's birthday...
  if (Lisa.knows('birthday'))
    // Say she already knows it
    return 'I already know your birthday, it\'s on %birthday%';
    // OR
    //return 'I already know your birthday, it\'s on ' + Lisa.thinksTo('birthday') + '.';

  // Else, give the first answer.
  return 'Mee too!';
}, /* The store */ { birthday: '%_0%' });
```

**NOTE :** In the first syntax for the `return` statement, the displayed birthday will be the one user inputted just now, because the answer is formatted after the cell are updated. But in the second one, the result will be the last memorized birthday. So be careful with that!

There's another problem now: The `birthday` cell is updated each time the user inputs `My birthday is on 23 june` for example, so the birthday in the Lisa's memory can change. To avoid that, we can't use the store anymore, we'll have to assign ourselves the right values to the memory's cells.

## Plain values

The function to use is [`learns(cell, value)`](../API/core.md#lisalearnscell-value). Here is the code:

```javascript
Lisa.understands('My birthday is on {short_date}', p => {
  // If Lisa knows the user's birthday...
  if (Lisa.knows('birthday'))
    // Say she already knows it
    return 'I already know your birthday, it\'s on %birthday%';

  // Else, store the birthday in the memory
  Lisa.learns('birthday', p.caught[0]);
  // Return the answer
  return 'Mee too!';
} /* No store anymore */);
```

And the magic operates :tada: The birthday will be constant, it won't change each time user inputs something anymore.

**NOTE :** There's no difference anymore between the first and second syntax for the `return` statement, because we don't use a store anymore. You see, stores are only a good idea to store updatable data without checking.

## Lists

That's pretty good, but know we want to work with numbers. Let's imagine the user wants to remember the list of its last transactions. How to do this?

The solution is: lists! Lisa supports typed lists, which means she can manipulate lists that always contain the same kind of data. Four type are supported : *integer* lists, *floating number* lists, *boolean* lists and *string* lists.

Let's set up a list:

```javascript
Lisa.learnsFloatList('amounts', []);
// Exactly the same than
Lisa.learnsList('amounts', [], 'float');
```

Now, we can set up a handler to add an amount to the list :

```javascript
Lisa.understands('I purchased for {number} dollars', p => {
  // The `caught` field gives a list of strings
  // Parse the amount as a number
  let amount = parseFloat(p.caught[0]);
  // Add it to the list
  Lisa.learnsListValue('amounts', amount);
  // Answer
  return 'It\'s done';
});
```

The amounts will be pushed in the list as floating numbers. We also have to register a handler to display the transactions:

```javascript
Lisa.understands('Give me the list of the amounts I\'ve spent', p =>
  // Get the list and display it
  Lisa.thinksToListLength('amounts') ? Lisa.thinksToList('amounts').join(' $ ; ') + ' $' : 'You didn\'t spend anything'
);
```

The `thinksTo(cell)` function returns the list as a string, elements are separated by the `;` symbol. To get it as an array of values, use the `thinksToList(list)` function instead.

The user may want to get the sum of its transaction :

```javascript
Lisa.understands('{?What is|Calculate} the sum of {?my|the} transactions{? I\'ve made}', p => {
  // Get the list of transactions
  let amounts = Lisa.thinksToList('amounts');
  // Define a variable to calcule its sum
  let total = 0;

  // For each transaction done...
  for (let amount of amounts)
    // Add it to the total
    total += amount;

  // Answer
  return `The sum of your transactions is ${total} dollars.`;
});
```

Also, he may wants to sort the transaction in the ascending order (the [`thinksToListLength(list)`](../API/core.md#lisathinkstolistlengthcell) function returns the length of any list) :

```javascript
Lisa.understands('Sort my transactions', p =>
  // Sort the list of transactions, then answer
  Lisa.thinksToListLength('amounts') ? Lisa.sortsList('amounts').join(' $ ; ') + ' $' : 'You didn\'t spend anything'
);
```

We made it :smile:! Here is the full code:

```javascript
// If the 'amounts' list is not defined...
// This condition is needed because the list may be already existing if the web
// page was loaded with data.
if (!Lisa.knows('amounts'))
  // Define it
  Lisa.learnsFloatList('amounts', []);

// Add a transaction
Lisa.understands('I purchased for {number} dollars', p => {
  // The `caught` field gives a list of strings
  // Parse the amount as a number
  let amount = parseFloat(p.caught[0]);
  // Add it to the list
  Lisa.learnsListValue('amounts', amount)
  // Answer
  return 'It\'s done';
});

// Get the list of transactions
Lisa.understands('Give me the list of the amounts I\'ve spent', p =>
  // Get the list and display it
  Lisa.thinksToListLength('amounts') ? Lisa.thinksToList('amounts').join(' $ ; ') + ' $' : 'You didn\'t spend anything'
);

// Calcule its sum
Lisa.understands('{?What is|Calculate} the sum of {?my|the} transactions{? I\'ve made}', p => {
  // Get the list of transactions
  let amounts = Lisa.thinksToList('amounts');
  // Define a variable to calcule its sum
  let total = 0;

  // For each transaction done...
  for (let amount of amounts)
    // Add it to the total
    total += amount;

  // Answer
  return `The sum of your transactions is ${total} dollars.`;
});

// Sort the transactions
Lisa.understands('Sort my transactions', p =>
  // Sort the list of transactions, then answer
  Lisa.thinksToListLength('amounts') ? Lisa.sortsList('amounts').join(' $ ; ') + ' $' : 'You didn\'t spend anything'
);
```

And here is a test of it:

```
Give me the list of the amounts I've spent
> You didn't spend anything

Calculate the sum of my transactions
> The sum of your transactions is 0 dollars.

I purchased for 20 dollars
> It's done

I purchased for 12.50 dollars
> It's done

I purchased for 30 dollars
> It's done

I purchased for 8.59 dollars
> It's done

Give me the list of the amounts I've spent
> 20 $ ; 12.5 $ ; 30 $ ; 8.59 $

Calculate the sum of my transactions
> The sum of your transactions is 71.09 dollars.

Sort my transactions
> 8.59 $ ; 12.5 $ ; 20 $ ; 30 $
```
