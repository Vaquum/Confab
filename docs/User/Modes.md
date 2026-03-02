# Confab Reference

No prefix means normal chat (Claude Opus 4.6).

There are two kinds of prefix: `@` and `/`. 

`/` invokes modes and `@` invokes models.

## Using `@` to invoke models

- `@claude`: same as normal chat, but explicit.
- `@gpt`: invokes GPT.
- `@grok`: invokes Grok.
- `@gemini`: invokes Gemini.

**NOTE:** You can switch models mid-chat seamlessly.

## Using `/` to invoke modes

- `/doc`: to get the responsed in document mode.
- `/doc+`: same as `/doc` but with strong literary style control.
- `/consensus`: ask all four modes and get synthesized answer.
- `/pr <github-pr-url>`: get a pull-request review.
- `/help` or `/?`: show this reference.
  - Help is shown instantly and is not saved to chat history.

**NOTE:** `/doc` and `/doc+` modes enable collaborative document editing with the model. 

## Adding attachments

You can attach `.txt`, `.csv`, `.tsv`, and `.md` files from the composer.
