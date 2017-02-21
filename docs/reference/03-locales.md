# Locales

In every language, there are multiple ways to say the same thing. For example, in english, writing any pronoun and `'d` is the same thing than writing this pronoun and ` would` after. Because we want our handlers to recognize the most requests as possible, we'll use *locales* to manage that. Here we go:

```javascript
Lisa.learnsLocaleTexts('en', [ `'d_`, `_would_` ]);
```

As you can see, we register the texts for the `en` locale, which is the default one. The `_` symbol, written at the beginning at the string, significates that a word (or the beginning of the string) must be placed before it. If it's written at the end, it significates that a word (or the end of the string) must be placed after it.

In this example, any `'d` followed by a word will be equivalent to any word, followed by `would`, then another word. If we compile a handler regex using `makeHandlerRegex("I'd like to know you more")`, here are the result:

```javascript
// Before registering the locale's texts
/^I'd +like +to +know +you +more(?: *[!\.])*$/i
// ... and after ...
/^I(?:'d +| +would +)like +to +know +you +more(?: *[!\.])*$/i
```

The regex changed. This handler will now recognize `I'd like to know you more` like before (with as many spaces as needed, plus optionnal points and exclamation points) but also `I would like to know you more`.

You can register as many locale as you want, and set the locale using `Lisa.usesLocale()`..
