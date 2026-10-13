# Generates src/core/fixtures/adapter-parity.json: the ids and token strings that the
# Rust-backed Python "tokenizers" library produces for GPT-2 and BERT (uncased) on 28
# inputs. The TypeScript adapter tests compare the JavaScript library's output to this
# reference, so a library bump that changes behaviour fails a test (D-11, T-02-06).
#
# Run once, by hand. It is NOT a project dependency and nothing in the build runs it:
#   uv run --no-project --with tokenizers==0.23.2 python scripts/gen-adapter-parity.py > src/core/fixtures/adapter-parity.json
# The version uv actually resolves is written into the output header.
#
# The first six cases repeat src/core/examples.ts (five examples and the default text);
# the test file checks that they still match. The UDHR Article 1 strings come from
# un.org (see 02-RESEARCH.md Gap 3). Every encode uses add_special_tokens=False, the same
# as the adapter.
import datetime
import json
import sys

import tokenizers
from tokenizers import Tokenizer

COMMAND = (
    "uv run --no-project --with tokenizers==0.23.2 "
    "python scripts/gen-adapter-parity.py"
)

CASES = [
    ("example-rare-word", "The word floccinaucinihilipilification is almost never used."),
    ("example-numbers-dates", "On 2026-10-03 I paid $1,234.56 for 3 tickets."),
    ("example-emoji", "Great job \U0001F389 see you soon \U0001F642"),
    (
        "example-literature",
        "Happy families are all alike; every unhappy family is unhappy in its own way.",
    ),
    ("example-non-english", "長男は昨年、第一志望の国立大学に合格した。"),
    ("default-text", "Tokenization splits unusual words into pieces, but common words stay whole."),
    (
        "udhr-en",
        "All human beings are born free and equal in dignity and rights. They are endowed with reason and conscience and should act towards one another in a spirit of brotherhood.",
    ),
    (
        "udhr-es",
        "Todos los seres humanos nacen libres e iguales en dignidad y derechos y, dotados como están de razón y conciencia, deben comportarse fraternalmente los unos con los otros.",
    ),
    (
        "udhr-fr",
        "Tous les êtres humains naissent libres et égaux en dignité et en droits. Ils sont doués de raison et de conscience et doivent agir les uns envers les autres dans un esprit de fraternité.",
    ),
    (
        "udhr-ru",
        "Все люди рождаются свободными и равными в своем достоинстве и правах. Они наделены разумом и совестью и должны поступать в отношении друг друга в духе братства.",
    ),
    (
        "udhr-ar",
        "يولد جميع الناس أحراراً ومتساوين في الكرامة والحقوق. وهم قد وهبوا العقل والوجدان وعليهم أن يعاملوا بعضهم بعضاً بروح الإخاء.",
    ),
    (
        "udhr-zh",
        "人人生而自由，在尊严和权利上一律平等。他们赋有理性和良心，并应以兄弟关系的精神相对待。",
    ),
    ("edge-spaces", "   leading and trailing spaces   "),
    ("edge-newlines-tabs", "line one\nline two\r\n\tindented\t\ttabs\n\n\nend"),
    ("edge-accents-ligatures", "café naïve Ångström ﬁnance œuvre"),
    ("edge-combining-marks", "é ä ñ ụ̂"),
    (
        "edge-zwj-family",
        "\U0001F468‍\U0001F469‍\U0001F467‍\U0001F466",
    ),
    ("edge-flags", "\U0001F1EB\U0001F1F7 \U0001F1E9\U0001F1EA \U0001F1EF\U0001F1F5"),
    ("edge-apostrophes", "don't can’t it's O'Neil 'quoted' \"double\""),
    ("edge-control-characters", "a\x00b\x07c\x1fd\x7fe"),
    ("edge-repeated-letters", "a" * 300),
    ("edge-special-markers", "[CLS] [SEP] [UNK] <|endoftext|>"),
    ("edge-word-pieces", "tokenization embeddings unaffordable misunderstandings"),
    ("edge-empty", ""),
    ("edge-single-space", " "),
    ("edge-digit-run", "3141592653589793238462643383279502884197169399375105820974944592"),
    ("edge-wow-emoji", "wow\U0001F389 unbelievable\U0001F389"),
    ("edge-uppercase", "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG. NASA AND IBM"),
]

FILES = {"gpt2": "public/tokenizers/gpt2.json", "bert": "public/tokenizers/bert-uncased.json"}


def main() -> None:
    assert len(CASES) == 28, f"expected 28 cases, have {len(CASES)}"
    loaded = {name: Tokenizer.from_file(path) for name, path in FILES.items()}
    cases = []
    for name, text in CASES:
        entry = {"name": name, "text": text}
        for key, tok in loaded.items():
            enc = tok.encode(text, add_special_tokens=False)
            entry[key] = {"ids": enc.ids, "tokens": enc.tokens}
        cases.append(entry)
    header = {
        "generator": COMMAND,
        "tokenizers": tokenizers.__version__,
        "python": sys.version.split()[0],
        "date": datetime.date.today().isoformat(),
        "addSpecialTokens": False,
        "files": FILES,
    }
    out = ['{', ' "header": ' + json.dumps(header) + ',', ' "cases": [']
    out += [
        "  " + json.dumps(c, ensure_ascii=True) + ("," if i < len(cases) - 1 else "")
        for i, c in enumerate(cases)
    ]
    out += [" ]", "}"]
    sys.stdout.write("\n".join(out) + "\n")


if __name__ == "__main__":
    main()
